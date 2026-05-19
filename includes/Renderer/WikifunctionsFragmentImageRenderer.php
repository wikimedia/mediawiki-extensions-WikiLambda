<?php

/**
 * WikiLambda Commons image element renderer
 *
 * Converts a single <ext-wikilambda-image> custom element produced by Wikifunctions
 * function output into safe <figure> HTML, fetching metadata from the Commons API
 * and caching successful results in MemcachedWrapper.
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
	private const COMMONS_IMAGE_DATA_CACHE_KEY_PREFIX = 'WikiLambdaCommonsImageData';
	private const ALLOWED_THUMB_HOSTS = [ 'upload.wikimedia.org' ];
	private const SUPPORTED_SIZES = [ 'thumb' ];

	/**
	 * Sentinel returned by doFetchCommonsImageData() when the Commons page does not exist.
	 * Distinguished from null (API/network error) so the caller can show a more specific message.
	 */
	private const FETCH_NOT_FOUND = 'NOT_FOUND';

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
	 * @return string Trusted figure HTML
	 */
	public function render( ?string $mid, string $size, ?string $alt ): string {
		if ( $mid === null ) {
			$this->logger->warning( __METHOD__ . ': No image selected', [ 'mid' => $mid ] );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-no-image', 'warning' );
		}

		if ( !preg_match( '/^M\d+$/', $mid ) ) {
			$this->logger->warning( __METHOD__ . ': Invalid M-ID format', [ 'mid' => $mid ] );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-invalid-mid', 'error' );
		}

		if ( !in_array( $size, self::SUPPORTED_SIZES, true ) ) {
			$this->logger->warning( __METHOD__ . ': Unsupported size value', [ 'mid' => $mid, 'size' => $size ] );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-invalid-size', 'error' );
		}

		$fetchResult = $this->fetchCommonsImageData( $mid, $size );

		if ( $fetchResult === null ) {
			$this->logger->warning( __METHOD__ . ': Commons API request failed', [ 'mid' => $mid ] );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-unavailable', 'error' );
		}

		if ( $fetchResult === self::FETCH_NOT_FOUND ) {
			$this->logger->warning( __METHOD__ . ': Commons page not found', [ 'mid' => $mid ] );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-not-found', 'error' );
		}

		$mime = $fetchResult['mime'] ?? '';
		if ( !str_starts_with( $mime, 'image/' ) ) {
			$this->logger->info( __METHOD__ . ': Skipping non-image MIME type', [
				'mid' => $mid,
				'mime' => $mime,
			] );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-invalid-mime', 'error' );
		}

		$thumbUrl = $fetchResult['thumbUrl'] ?? '';
		$parsedThumb = parse_url( $thumbUrl );
		if ( empty( $parsedThumb['host'] ) || !in_array( $parsedThumb['host'], self::ALLOWED_THUMB_HOSTS, true ) ) {
			$this->logger->warning( __METHOD__ . ': Thumbnail URL host not allowed', [
				'mid' => $mid,
				'thumbUrl' => $thumbUrl,
			] );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-not-commons', 'error' );
		}

		$title = $fetchResult['title'] ?? '';
		$fileName = preg_replace( '/^File:/i', '', $title );
		if ( $this->badFileLookup->isBadFile( $fileName, null ) ) {
			$this->logger->info( __METHOD__ . ': Image is on bad file list', [
				'mid' => $mid,
				'title' => $title,
			] );
			return $this->createImageErrorFigure( 'wikilambda-commons-image-error-blocked', 'error' );
		}

		return $this->createImageFigure( $fetchResult, $alt );
	}

	/**
	 * Fetch image metadata from the Commons API for a given M-ID and size.
	 *
	 * Returns a data array on success, the FETCH_NOT_FOUND sentinel when the Commons page
	 * does not exist, or null on a transient API/network failure.
	 *
	 * Successful results are cached in MemcachedWrapper; failures are not cached so they
	 * self-heal on the next request.
	 *
	 * @param string $mid e.g. "M68960758"
	 * @param string $size e.g. "thumb"
	 * @return array|string|null Data array, FETCH_NOT_FOUND sentinel, or null on error
	 */
	private function fetchCommonsImageData( string $mid, string $size ): array|string|null {
		$thumbWidth = $this->thumbWidthForSize( $size );
		$cacheKey = $this->objectCache->makeKey( self::COMMONS_IMAGE_DATA_CACHE_KEY_PREFIX, $mid, $size );

		$cached = $this->objectCache->get( $cacheKey );
		if ( $cached !== false ) {
			return is_array( $cached ) ? $cached : null;
		}

		// Extract the numeric page ID from the M-ID
		$pageId = (int)substr( $mid, 1 );
		$result = $this->doFetchCommonsImageData( $pageId, $thumbWidth );

		if ( is_array( $result ) ) {
			$this->objectCache->set( $cacheKey, $result, MemcachedWrapper::TTL_MONTH );
		}

		return $result;
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
	 * Make the HTTP request to the Commons API.
	 *
	 * Uses imageinfo with iiurlwidth so the API computes the thumbnail URL directly.
	 *
	 * Returns a data array on success, FETCH_NOT_FOUND when the Commons page is missing,
	 * or null on a network/API error.
	 *
	 * @param int $pageId Numeric Commons page ID
	 * @param int $thumbWidth Desired thumbnail width in pixels
	 * @return array|string|null
	 */
	private function doFetchCommonsImageData( int $pageId, int $thumbWidth ): array|string|null {
		$url = wfAppendQuery( self::COMMONS_API_URL, [
			'action' => 'query',
			'pageids' => $pageId,
			'prop' => 'imageinfo',
			'iiprop' => 'url|size|mime',
			'iiurlwidth' => $thumbWidth,
			'format' => 'json',
			'formatversion' => '2',
		] );

		$request = $this->httpRequestFactory->create( $url, [ 'method' => 'GET' ], __METHOD__ );
		$status = $request->execute();

		if ( !$status->isOK() ) {
			$this->logger->warning( __METHOD__ . ': Commons API request failed', [
				'pageId' => $pageId,
				'httpStatus' => $request->getStatus(),
			] );
			return null;
		}

		$response = json_decode( $request->getContent(), true );
		if ( !is_array( $response ) ) {
			return null;
		}

		$pages = $response['query']['pages'] ?? [];
		if ( !$pages ) {
			return null;
		}

		$page = reset( $pages );
		if ( isset( $page['missing'] ) || isset( $page['invalid'] ) ) {
			return self::FETCH_NOT_FOUND;
		}

		$imageinfo = $page['imageinfo'][0] ?? null;
		if ( !$imageinfo ) {
			return null;
		}

		return [
			'title' => $page['title'] ?? '',
			'descriptionUrl' => $imageinfo['descriptionurl'] ?? null,
			'thumbUrl' => $imageinfo['thumburl'] ?? null,
			'thumbWidth' => $imageinfo['thumbwidth'] ?? null,
			'thumbHeight' => $imageinfo['thumbheight'] ?? null,
			'mime' => $imageinfo['mime'] ?? '',
		];
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
		] );

		if ( $data['descriptionUrl'] ) {
			$inner = Html::rawElement( 'a', [
				'href' => $data['descriptionUrl'],
				'target' => '_blank',
				'rel' => 'noopener noreferrer',
			], $img );
		} else {
			$inner = $img;
		}

		return Html::rawElement( 'figure', [ 'class' => 'ext-wikilambda-image ext-wikilambda-image-thumb' ], $inner );
	}

	/**
	 * Build a placeholder figure for display when a Commons image cannot be rendered.
	 *
	 * @param string $errorKey i18n message key for the figcaption error text
	 * @param string $severity 'warning' for authoring problems, 'error' for system/policy failures
	 * @param int $width Placeholder width in pixels
	 * @param int $height Placeholder height in pixels
	 * @return string HTML string
	 */
	private function createImageErrorFigure(
		string $errorKey,
		string $severity = 'error',
		int $width = 250,
		int $height = 188
	): string {
		$placeholder = Html::rawElement(
			'div',
			[
				'class' => 'ext-wikilambda-image__placeholder',
				'style' => "width:{$width}px;height:{$height}px;",
			],
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
			[ 'class' => 'ext-wikilambda-image ext-wikilambda-image-thumb ext-wikilambda-image--' . $severity ],
			$placeholder . $caption
		);
	}
}
