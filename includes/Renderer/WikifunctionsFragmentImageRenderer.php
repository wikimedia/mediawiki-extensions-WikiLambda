<?php

/**
 * WikiLambda Commons image element renderer
 *
 * Converts a single <ext-wikilambda-image> custom element produced by Wikifunctions
 * function output into safe <figure> HTML, fetching metadata from the Commons API
 * and caching the results in MemcachedWrapper.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Renderer;

use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Html\Html;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Page\File\BadFileLookup;
use MediaWiki\Parser\Parser;
use Psr\Log\LoggerInterface;

class WikifunctionsFragmentImageRenderer {

	private const COMMONS_API_URL = 'https://commons.wikimedia.org/w/api.php';
	private const THUMB_SIZE_THUMB = 250;
	private const COMMONS_FILE_DATA_CACHE_KEY_PREFIX = 'WikiLambdaCommonsFileData';
	private const ALLOWED_THUMB_HOSTS = [ 'upload.wikimedia.org', 'thumb.wikimedia.org' ];
	private const SUPPORTED_SIZES = [ 'thumb' ];

	/** No leading zeros, so that each Commons page has one M-ID and one cache key. */
	private const MID_PATTERN = '/^M[1-9]\d*$/';

	/** The render or parse waits for the Commons API, so do not use the longer default timeout. */
	private const COMMONS_API_TIMEOUT_SECONDS = 2;

	/** The Commons API takes at most 50 page IDs, and scales at most 50 images, per request. */
	private const COMMONS_API_MAX_PAGE_IDS = 50;

	/**
	 * Sentinel returned by doFetchCommonsImageData() when the Commons page does not exist.
	 * Distinguished from null (API/network error) so the caller can show a more specific message.
	 */
	private const FETCH_NOT_FOUND = 'NOT_FOUND';

	/**
	 * Cached for a short time after an API/network error, so that every render during a
	 * Commons outage does not wait for the API again.
	 */
	private const FETCH_FAILED = 'FAILED';

	/**
	 * Maximum bytes of a rejected M-ID to log. A malformed M-ID is arbitrary function output
	 * and can be of any length, thus we shorten it to protect the logging system.
	 */
	private const MAX_LOGGED_MID_LENGTH = 100;

	public function __construct(
		private readonly LoggerInterface $logger,
		private readonly HttpRequestFactory $httpRequestFactory,
		private readonly MemcachedWrapper $objectCache,
		private readonly BadFileLookup $badFileLookup
	) {
	}

	/**
	 * Render a Commons image element to trusted <figure> HTML.
	 *
	 * Always returns a figure — either the rendered image or a placeholder figure with a
	 * figcaption describing the problem. Never throws; callers do not need a try/catch.
	 *
	 * @param string|null $mid Commons M-ID, e.g. "M68960758", or null when absent from the tag
	 * @param string $size Image size hint; currently only "thumb" is supported
	 * @param string|null $alt Explicit alt text; falls back to the Commons file title
	 * @param array $logContext Log context that identifies what produced this element, e.g. the
	 *   calling function and page. Empty if the caller has no such information.
	 * @return string Trusted figure HTML
	 */
	public function render( ?string $mid, string $size, ?string $alt, array $logContext = [] ): string {
		// A bad mid or size value comes from the function output, thus it is an authoring error
		// and we log it at info. Commons API and policy failures stay at warning.
		if ( $mid === null ) {
			$this->logger->info( __METHOD__ . ': No image selected', $logContext );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-no-image', 'warning', $alt );
		}

		if ( !preg_match( self::MID_PATTERN, $mid ) ) {
			$this->logger->info( __METHOD__ . ': Invalid M-ID format: {mid}', [
				// mb_strcut, not substr: the value is arbitrary function output, and a cut in the
				// middle of a multi-byte character makes the field invalid UTF-8 for the log pipeline.
				'mid' => mb_strcut( $mid, 0, self::MAX_LOGGED_MID_LENGTH ),
				'midLength' => strlen( $mid ),
			] + $logContext );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-invalid-mid', 'error', $alt );
		}

		if ( !in_array( $size, self::SUPPORTED_SIZES, true ) ) {
			$this->logger->info(
				__METHOD__ . ': Unsupported size value',
				[ 'mid' => $mid, 'size' => $size ] + $logContext
			);
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-invalid-size', 'error', $alt );
		}

		$fetchResult = $this->fetchCommonsImageData( [ $mid ], $size )[$mid];

		if ( $fetchResult === null ) {
			$this->logger->warning( __METHOD__ . ': Commons API request failed', [ 'mid' => $mid ] + $logContext );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-unavailable', 'error', $alt );
		}

		if ( $fetchResult === self::FETCH_NOT_FOUND ) {
			$this->logger->info( __METHOD__ . ': Commons page not found', [ 'mid' => $mid ] + $logContext );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-not-found', 'error', $alt );
		}

		$mime = $fetchResult['mime'] ?? '';
		if ( !str_starts_with( $mime, 'image/' ) ) {
			$this->logger->info( __METHOD__ . ': Skipping non-image MIME type', [
				'mid' => $mid,
				'mime' => $mime,
			] + $logContext );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-invalid-mime', 'error', $alt );
		}

		$thumbUrl = $fetchResult['thumbUrl'] ?? '';
		$parsedThumb = parse_url( $thumbUrl );
		if ( empty( $parsedThumb['host'] ) || !in_array( $parsedThumb['host'], self::ALLOWED_THUMB_HOSTS, true ) ) {
			$this->logger->warning( __METHOD__ . ': Thumbnail URL host not allowed', [
				'mid' => $mid,
				'thumbUrl' => $thumbUrl,
			] + $logContext );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-not-commons', 'error', $alt );
		}

		$title = $fetchResult['title'] ?? '';
		$fileName = preg_replace( '/^File:/i', '', $title );
		if ( $this->badFileLookup->isBadFile( $fileName, null ) ) {
			$this->logger->info( __METHOD__ . ': Image is on bad file list', [
				'mid' => $mid,
				'title' => $title,
			] + $logContext );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-blocked', 'error', $alt );
		}

		return $this->createImageFigure( $fetchResult, $alt );
	}

	/**
	 * Get the Commons file names for Commons M-IDs.
	 *
	 * This uses the same cached Commons data as render(), and makes one Commons API
	 * request for up to 50 M-IDs that are not in the cache.
	 *
	 * @param string[] $mids Commons M-IDs, e.g. "M68960758"
	 * @return array<string,string> File names without the namespace, e.g. "Example.jpg", keyed
	 *   by M-ID in the order of $mids. Leaves out M-IDs that are not valid, files that do not
	 *   exist, and M-IDs whose Commons API request failed.
	 */
	public function getFileNames( array $mids ): array {
		$validMids = array_filter( $mids, static fn ( $mid ) => preg_match( self::MID_PATTERN, $mid ) === 1 );

		// Use the default size of image elements. Then the cache key is the same as for a render,
		// e.g. the fragment preview in the editor.
		$fileNames = [];
		foreach ( $this->fetchCommonsImageData( $validMids, 'thumb' ) as $mid => $fetchResult ) {
			if ( is_array( $fetchResult ) && ( $fetchResult['title'] ?? '' ) !== '' ) {
				$fileNames[$mid] = preg_replace( '/^File:/i', '', $fetchResult['title'] );
			}
		}
		return $fileNames;
	}

	/**
	 * Fetch image metadata from the Commons API for the given M-IDs and size.
	 *
	 * Returns, for each M-ID, a data array on success, the FETCH_NOT_FOUND sentinel when the
	 * Commons page does not exist, or null on a transient API/network failure.
	 *
	 * Results are cached in MemcachedWrapper: successful results for one day, missing pages
	 * for one hour, and failures for one minute.
	 *
	 * @param string[] $mids e.g. [ "M68960758" ]
	 * @param string $size e.g. "thumb"
	 * @return array<string,array|string|null> Keyed by M-ID, in the order of $mids
	 */
	private function fetchCommonsImageData( array $mids, string $size ): array {
		$results = [];
		$cacheKeys = [];
		$uncachedPageIds = [];
		foreach ( $mids as $mid ) {
			$cacheKeys[$mid] = $this->objectCache->makeKey( self::COMMONS_FILE_DATA_CACHE_KEY_PREFIX, $mid, $size );
			$cached = $this->objectCache->get( $cacheKeys[$mid] );
			if ( $cached === false ) {
				$results[$mid] = null;
				$uncachedPageIds[$mid] = (int)substr( $mid, 1 );
			} else {
				$results[$mid] = ( is_array( $cached ) || $cached === self::FETCH_NOT_FOUND ) ? $cached : null;
			}
		}

		$thumbWidth = $this->thumbWidthForSize( $size );
		foreach ( array_chunk( $uncachedPageIds, self::COMMONS_API_MAX_PAGE_IDS, true ) as $pageIds ) {
			$fetchResults = $this->doFetchCommonsImageData( array_values( $pageIds ), $thumbWidth );
			foreach ( $pageIds as $mid => $pageId ) {
				$result = $fetchResults[$pageId] ?? null;
				$results[$mid] = $result;
				if ( is_array( $result ) ) {
					$this->objectCache->set( $cacheKeys[$mid], $result, MemcachedWrapper::TTL_DAY );
				} elseif ( $result === self::FETCH_NOT_FOUND ) {
					$this->objectCache->set( $cacheKeys[$mid], $result, MemcachedWrapper::TTL_HOUR );
				} else {
					$this->objectCache->set( $cacheKeys[$mid], self::FETCH_FAILED, MemcachedWrapper::TTL_MINUTE );
				}
			}
		}

		return $results;
	}

	/**
	 * Resolve the thumbnail pixel width for a named size.
	 *
	 * @param string $size
	 * @return int
	 */
	private function thumbWidthForSize( string $size ): int {
		return match ( $size ) {
			'thumb' => self::THUMB_SIZE_THUMB,
			default => self::THUMB_SIZE_THUMB,
		};
	}

	/**
	 * Make one HTTP request to the Commons API for several Commons pages.
	 *
	 * Uses imageinfo with iiurlwidth so the API computes the thumbnail URLs directly.
	 *
	 * Returns, keyed by page ID, a data array on success or FETCH_NOT_FOUND when the Commons
	 * page is missing or is not a file. Leaves out pages that have a network/API error.
	 *
	 * @param int[] $pageIds Numeric Commons page IDs, at most COMMONS_API_MAX_PAGE_IDS
	 * @param int $thumbWidth Desired thumbnail width in pixels
	 * @return array<int,array|string>
	 */
	private function doFetchCommonsImageData( array $pageIds, int $thumbWidth ): array {
		$url = wfAppendQuery( self::COMMONS_API_URL, [
			'action' => 'query',
			'pageids' => implode( '|', $pageIds ),
			'prop' => 'imageinfo',
			'iiprop' => 'url|size|mime',
			'iiurlwidth' => $thumbWidth,
			'format' => 'json',
			'formatversion' => '2',
		] );

		$request = $this->httpRequestFactory->create(
			$url, [ 'method' => 'GET', 'timeout' => self::COMMONS_API_TIMEOUT_SECONDS ], __METHOD__
		);
		$status = $request->execute();

		if ( !$status->isOK() ) {
			$this->logger->warning( __METHOD__ . ': Commons API request failed', [
				'pageIds' => implode( '|', $pageIds ),
				'httpStatus' => $request->getStatus(),
			] );
			return [];
		}

		$response = json_decode( $request->getContent(), true );
		if ( !is_array( $response ) ) {
			return [];
		}

		$results = [];
		foreach ( $response['query']['pages'] ?? [] as $page ) {
			$pageId = $page['pageid'] ?? null;
			if ( !is_int( $pageId ) ) {
				continue;
			}

			if ( isset( $page['missing'] ) || isset( $page['invalid'] ) ) {
				$results[$pageId] = self::FETCH_NOT_FOUND;
				continue;
			}

			// The page exists but is not a file, e.g. a gallery page
			$imageinfo = $page['imageinfo'][0] ?? null;
			if ( !$imageinfo ) {
				$results[$pageId] = self::FETCH_NOT_FOUND;
				continue;
			}

			$results[$pageId] = [
				'title' => $page['title'] ?? '',
				'descriptionUrl' => $imageinfo['descriptionurl'] ?? null,
				'thumbUrl' => $imageinfo['thumburl'] ?? null,
				'thumbWidth' => $imageinfo['thumbwidth'] ?? null,
				'thumbHeight' => $imageinfo['thumbheight'] ?? null,
				'mime' => $imageinfo['mime'] ?? '',
			];
		}
		return $results;
	}

	/**
	 * Create a <figure> HTML element from Commons image data.
	 *
	 * The returned HTML is generated from trusted Commons API data and is inserted after
	 * sanitisation, so it never passes through the HTML sanitiser.
	 *
	 * @param array $data As returned by doFetchCommonsImageData()
	 * @param string|null $alt Explicit alt text; falls back to the Commons file title
	 * @return string
	 */
	private function createImageFigure( array $data, ?string $alt ): string {
		$thumbWidth = $data['thumbWidth'] ? (int)$data['thumbWidth'] : null;
		$thumbHeight = $data['thumbHeight'] ? (int)$data['thumbHeight'] : null;
		$altText = ( $alt !== null && $alt !== '' ) ? $alt : ( $data['title'] ?? '' );

		$img = Html::element( 'img', [
			'src' => $data['thumbUrl'],
			'alt' => $altText,
			'width' => $thumbWidth,
			'height' => $thumbHeight,
			'decoding' => 'async',
			// The browser loads the image only when it comes near the viewport.
			'loading' => 'lazy',
			'class' => 'mw-file-element'
		] );

		if ( $data['descriptionUrl'] ) {
			$inner = Html::rawElement( 'a', [
				'href' => $data['descriptionUrl'],
				'target' => '_blank',
				'rel' => 'noopener noreferrer',
				'class' => 'mw-file-description'
			], $img );
		} else {
			$inner = $img;
		}

		$figcaption = Html::element( 'figcaption', [] );

		return Html::rawElement( 'figure', [
			'class' => 'ext-wikilambda-image ext-wikilambda-image--thumb mw-default-size',
			'typeof' => 'mw:File/Thumb',
		], $inner . $figcaption );
	}

	/**
	 * Build a placeholder figure for display when a Commons image cannot be rendered.
	 *
	 * @param string $errorKey i18n message key for the figcaption error text
	 * @param string $severity 'warning' for authoring problems, 'error' for system/policy failures
	 * @param string|null $altText Alt text from the source element; surfaced as aria-label on
	 *   the placeholder so assistive tech still knows what the missing image was meant to be
	 * @param int $width Placeholder width in pixels
	 * @param int $height Placeholder height in pixels
	 * @return string HTML string
	 */
	private function createImageErrorFigure(
		string $errorKey,
		string $severity = 'error',
		?string $altText = null,
		int $width = 250,
		int $height = 188
	): string {
		// The dimensional contract sits on the figure (see the figure element below),
		// not on this div: a <div> with explicit width pins the display:table figure's
		// min-content and breaks its max-width:50% cap. Here we only carry the aspect
		// ratio via padding-bottom %, which resolves against the cell width.
		$paddingBottom = round( ( $height / $width ) * 100, 4 );
		$placeholderAttrs = [
			'class' => 'ext-wikilambda-image__placeholder',
			'style' => "padding-bottom:{$paddingBottom}%;",
		];
		if ( $altText !== null && $altText !== '' ) {
			$placeholderAttrs['aria-label'] = $altText;
		}
		$placeholder = Html::rawElement(
			'div',
			$placeholderAttrs,
			Html::element( 'span', [ 'class' => 'ext-wikilambda-image__placeholder-icon' ] )
		);
		$icon = Html::element( 'span', [
			'class' => 'ext-wikilambda-image__caption-icon',
			'aria-hidden' => 'true',
		] );
		// Render the caption in the interface language and declare its lang/dir explicitly so the
		// browser's bidi algorithm is not confused when the UI language differs from the content
		// language (e.g. Arabic UI showing an untranslated English fallback message inside an LTR
		// preview body — without the declaration the icon and period appear on the wrong side).
		$msg = wfMessage( $errorKey );
		$captionHtml = Parser::stripOuterParagraph( $msg->parse() );
		$msgLang = $msg->getLanguage();
		$caption = Html::rawElement( 'figcaption', [
			'lang' => $msgLang->getHtmlCode(),
			'dir' => $msgLang->getDir(),
		], $icon . $captionHtml );
		return Html::rawElement(
			'figure',
			[
				'class' => 'ext-wikilambda-image ext-wikilambda-image--thumb ext-wikilambda-image--' . $severity,
				// Anchor the display:table figure to a definite width so its max-width:50%
				// can actually constrain it. Without this, the figure shrinkwraps and the
				// placeholder div's own dimensions become the min-content floor.
				'style' => "width:{$width}px;",
			],
			$placeholder . $caption
		);
	}
}
