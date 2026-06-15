<?php

/**
 * WikiLambda extension HTML-stripping Remex token handler
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Renderer;

use MediaWiki\Extension\SiteMatrix\SiteMatrix;
use MediaWiki\Extension\SpamBlacklist\BaseBlacklist;
use MediaWiki\Extension\WikiLambda\Tests\Integration\MockSiteMatrix;
use MediaWiki\Html\Html;
use MediaWiki\MediaWikiServices;
use MediaWiki\Parser\Sanitizer;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Tidy\RemexCompatFormatter;
use MediaWiki\User\User;
use Psr\Log\LoggerInterface;
use Wikimedia\RemexHtml\HTMLData;
use Wikimedia\RemexHtml\Serializer\Serializer;
use Wikimedia\RemexHtml\Serializer\Serializer as RemexSerializer;
use Wikimedia\RemexHtml\Tokenizer\Attributes;
use Wikimedia\RemexHtml\Tokenizer\PlainAttributes;
use Wikimedia\RemexHtml\Tokenizer\RelayTokenHandler;
use Wikimedia\RemexHtml\Tokenizer\Tokenizer as RemexTokenizer;
use Wikimedia\RemexHtml\TreeBuilder\Dispatcher;
use Wikimedia\RemexHtml\TreeBuilder\TreeBuilder;

class WikifunctionsSanitiserTokenHandler extends RelayTokenHandler {

	private array $allowedUrls = [];
	/** @var array<int, array{tagName: string, classes: array<int, string>}> */
	private array $openElements = [];

	/**
	 * The custom element produced by Wikifunctions image output. Recognised here and expanded
	 * to trusted <figure> HTML; it is deliberately absent from ALLOWEDELEMENTS.
	 */
	private const IMAGE_ELEMENT = 'ext-wikilambda-image';

	/**
	 * Per-fragment ceiling on how many image elements are expanded. Bounds the number of
	 * Commons API fetches a single function output can trigger (T428829); excess elements
	 * are dropped.
	 */
	private const MAX_IMAGES = 5;

	/** @var array<string, string> Sentinel → trusted figure HTML, substituted after serialisation */
	private array $imagePlaceholders = [];
	private int $imageCount = 0;
	/** Per-instance random salt making image sentinels unforgeable by function output */
	private string $placeholderSalt = '';

	/**
	 * @param LoggerInterface $logger
	 * @param Serializer $serializer
	 * @param string $source
	 * @param array<string, true> $blockedDomains Domain map from AbuseFilter blocked domains
	 * @param User|null $spamCheckUser Anonymous user for SpamBlacklist checks, or null if not loaded
	 * @param WikifunctionsFragmentImageRenderer|null $imageRenderer Renderer for <ext-wikilambda-image>
	 *   elements, or null to drop them (e.g. when image support is unavailable)
	 */
	public function __construct(
		private readonly LoggerInterface $logger,
		Serializer $serializer,
		private readonly string $source,
		private readonly array $blockedDomains = [],
		private readonly ?User $spamCheckUser = null,
		private readonly ?WikifunctionsFragmentImageRenderer $imageRenderer = null
	) {
		$this->nextHandler = new Dispatcher( new TreeBuilder( $serializer, [
			'ignoreErrors' => true,
			'ignoreNulls' => true,
		] ) );

		parent::__construct( $this->nextHandler );

		// Random per-instance salt so the sentinel cannot be forged by attacker-authored
		// function output that happens to contain a guessable placeholder string.
		$this->placeholderSalt = bin2hex( random_bytes( 8 ) );

		// The local server URL is always allowed, so we can link to the current wiki
		$localServer = MediaWikiServices::getInstance()->getMainConfig()->get( 'Server' );
		$canonicalServer = MediaWikiServices::getInstance()->getMainConfig()->get( 'CanonicalServer' );

		$this->allowedUrls = array_filter( [
			$this->toProtocolRelative( $localServer ),
			$this->toProtocolRelative( $canonicalServer )
		] );

		// If loaded, SiteMatrix can give us a list of cluster wikis and thus their server URLs
		$sitematrix = $this->newSiteMatrix();
		if ( $sitematrix ) {
			$languages = $sitematrix->getLangList();
			$families = $sitematrix->getSites();
			foreach ( $languages as $key => $langCode ) {
				foreach ( $families as $family ) {
					if ( $sitematrix->exist( $langCode, $family ) ) {
						$this->allowedUrls[] = $this->toProtocolRelative( $sitematrix->getUrl( $langCode, $family ) );
					}
				}
			}

			$specials = $sitematrix->getSpecials();
			foreach ( $specials as $special ) {
				$this->allowedUrls[] = $this->toProtocolRelative( $sitematrix->getUrl( $special[0], $special[1] ) );
			}
		}
	}

	/**
	 * Returns the appropriate SiteMatrixProvider depending on the environment:
	 * * If running Phpunit tests: return MockSiteMatrixProvider
	 * * If production and SiteMatrix is loaded: return WikiLambdaSiteMatrixProvider
	 * * Else return nothing
	 *
	 * @return ?SiteMatrix
	 */
	protected function newSiteMatrix(): ?SiteMatrix {
		if ( ExtensionRegistry::getInstance()->isLoaded( 'SiteMatrix' ) ) {
			if ( defined( 'MW_PHPUNIT_TEST' ) ) {
				// Phan is unhappy because, altough it's a sub-class, this is not loaded in prod code.
				// @phan-suppress-next-line PhanTypeMismatchReturn, PhanUndeclaredClassMethod
				return new MockSiteMatrix();
			}
			return new SiteMatrix();
		}
		return null;
	}

	// This is our list of allowed HTML elements. It should be kept extremely minimal, and any changes should
	// be carefully considered in conjunction with the Security and MW Content Transformation team.
	// Keep this in sync with CodeEditor.getDisallowedTagAnnotations()
	private const ALLOWEDELEMENTS = [
		// Headings
		"h1",
		"h2",
		"h3",
		"h4",
		"h5",
		"h6",

		// Primary content
		"div",
		"span",
		"p",
		"a",

		// Secondary content
		"blockquote",
		"br",
		"hr",

		// Annotations (FIXME: possibly trim these?)
		"abbr",
		"b",
		"code",
		"del",
		"dfn",
		"em",
		"i",
		"ins",
		"kbd",
		"q",
		"s",
		"strike",
		"strong",
		"sub",
		"sup",
		"u",

		// Structural content (lists and tables)
		"li",
		"dt",
		"dd",
		"ol",
		"ul",
		"dl",
		"tr",
		"td",
		"th",
		"table",
		"caption",

		// Special Unicode bi-directionality elements
		"bdi",
		"bdo",
	];

	/**
	 * Convert a URL to a protocol-relative URL
	 *
	 * @param string $url
	 * @return string
	 */
	private function toProtocolRelative( string $url ): string {
		return preg_match( '#^https?://#i', trim( $url ) ) ?
			'//' . preg_replace( '#^https?://#i', '', $url ) :
			trim( $url );
	}

	/**
	 * @inheritDoc
	 */
	public function startTag( $name, Attributes $attrs, $selfClose, $sourceStart, $sourceLength ) {
		$tagName = strtolower( $name );

		if ( $tagName === self::IMAGE_ELEMENT ) {
			// Custom image element: only ever seen here when it is a genuine tag in element
			// position, so it can never be smuggled in from inside an attribute value.
			$this->handleImageElement( $attrs );
			return;
		}

		$tagClasses = $this->normaliseClasses( $attrs->getValues()['class'] ?? '' );
		$insideReferenceContext = $this->isInsideAllowedReferenceContext();

		if ( !in_array( $tagName, self::ALLOWEDELEMENTS ) ) {
			// Tag is not on the allowlist — escape it as literal text.
			$this->nextHandler->characters( $this->source, $sourceStart, $sourceLength, $sourceStart, $sourceLength );
			return;
		}

		$fixedAttrs = $this->sanitiseAttributes( $attrs->getValues(), $tagName );
		$tagAllowed = true;

		if ( $tagName === 'a' ) {
			// <a> needs extra policy enforcement on top of what Sanitizer provides.
			[ $tagAllowed, $fixedAttrs ] = $this->processAnchorTag( $fixedAttrs, $insideReferenceContext );
		}

		if ( $tagAllowed ) {
			$this->pushOpenElement( $tagName, $tagClasses );
			$plainAttrs = new PlainAttributes( $fixedAttrs );
			$this->nextHandler->startTag( $name, $plainAttrs, $selfClose, $sourceStart, $sourceLength );
			if ( $selfClose ) {
				$this->popOpenElement( $tagName );
			}
			return;
		}

		// Tag was rejected by link policy — escape it as literal text.
		$this->nextHandler->characters( $this->source, $sourceStart, $sourceLength, $sourceStart, $sourceLength );
	}

	/**
	 * Expand a single <ext-wikilambda-image> element to trusted <figure> HTML.
	 *
	 * The figure cannot be emitted as Remex tokens (its <figure>/<img> are off the allowlist),
	 * so a unique text sentinel is emitted in its place and the real HTML is recorded for
	 * substitution after serialisation (see restoreImagePlaceholders()). Emitting the sentinel
	 * as a *text token* guarantees it lands in text-node position, never inside an attribute,
	 * so the later string substitution cannot break out of an attribute and inject markup.
	 *
	 * Attribute values come straight from the parser, so no raw-string regex is involved; the
	 * image renderer validates mid/size itself. Elements beyond MAX_IMAGES are dropped.
	 *
	 * @param Attributes $attrs
	 * @return void
	 */
	private function handleImageElement( Attributes $attrs ): void {
		if ( $this->imageRenderer === null || $this->imageCount >= self::MAX_IMAGES ) {
			return;
		}
		$this->imageCount++;

		$values = $attrs->getValues();
		$figureHtml = $this->imageRenderer->render(
			$values['mid'] ?? null,
			$values['size'] ?? 'thumb',
			$values['alt'] ?? null
		);

		$placeholder = 'WLIMG' . $this->placeholderSalt . $this->imageCount . 'WL';
		$this->imagePlaceholders[$placeholder] = $figureHtml;
		$this->nextHandler->characters( $placeholder, 0, strlen( $placeholder ), 0, strlen( $placeholder ) );
	}

	/**
	 * Run MediaWiki's Sanitizer on raw attributes, then strip anything we additionally disallow:
	 * all data-* attributes (even ones Sanitizer passes), and the insecure-style placeholder value.
	 *
	 * @param array $rawAttrs
	 * @param string $tagName
	 * @return array
	 */
	private function sanitiseAttributes( array $rawAttrs, string $tagName ): array {
		$fixedAttrs = Sanitizer::validateTagAttributes( $rawAttrs, $tagName );

		foreach ( $fixedAttrs as $key => $value ) {
			if ( str_starts_with( $key, 'data-' ) ) {
				unset( $fixedAttrs[$key] );
			}
			// Sanitizer replaces insecure style values with this sentinel; discard it too
			if ( $key === 'style' && $value === "/* insecure input */" ) {
				unset( $fixedAttrs[$key] );
			}
		}

		return $fixedAttrs;
	}

	/**
	 * Apply link policy to an already-sanitised <a> tag.
	 *
	 * Sanitizer allows any full URL with a valid protocol (no javascript:, no relative URLs).
	 * We restrict further: outside a reference context only known Wikimedia domains are allowed;
	 * inside a reference context any URL is allowed unless it is spam- or domain-blocked.
	 *
	 * @param array $fixedAttrs Already-sanitised attributes
	 * @param bool $insideReferenceContext
	 * @return array{0: bool, 1: array} [allowed, cleanedAttrs]
	 */
	private function processAnchorTag( array $fixedAttrs, bool $insideReferenceContext ): array {
		$parsedLink = MediaWikiServices::getInstance()->getUrlUtils()->parse( $fixedAttrs['href'] ?? '' );

		// Sanitizer should already have rejected un-parseable or host-less URLs; guard anyway
		if ( !$parsedLink || empty( $parsedLink['host'] ) ) {
			return [ false, [] ];
		}

		if ( $insideReferenceContext ) {
			return $this->processReferenceContextLink( $fixedAttrs['href'], $parsedLink );
		}

		return $this->processStandardLink( $fixedAttrs['href'], $parsedLink );
	}

	/**
	 * Handle a link inside an ext-wikilambda-reference context.
	 *
	 * Any parseable external URL is permitted here, subject to SpamBlacklist and
	 * AbuseFilter blocked-domain checks. Blocked URLs are rejected and will be escaped as text.
	 *
	 * @param string $href
	 * @param array $parsedLink
	 * @return array{0: bool, 1: array} [allowed, cleanedAttrs]
	 */
	private function processReferenceContextLink( string $href, array $parsedLink ): array {
		$spamBlocked = $this->isUrlSpamBlocked( $href );
		$domainBlocked = $this->isUrlBlocked( $href, $this->blockedDomains );

		if ( $spamBlocked || $domainBlocked ) {
			$this->logger->info(
				__METHOD__ . ': Blocking reference-context <a> — URL matched blocklist',
				[
					'rawHref' => $href,
					'spamBlocked' => $spamBlocked,
					'domainBlocked' => $domainBlocked,
				]
			);
			return [ false, [] ];
		}

		$this->logger->info(
			__METHOD__ . ': Allowing reference-context <a> tag',
			[
				'rawHref' => $href,
				'targetDomain' => $parsedLink['host'],
				'allowReason' => 'reference-context',
			]
		);
		return [ true, [ 'href' => $href ] ];
	}

	/**
	 * Handle a link outside any reference context.
	 *
	 * Only links whose host matches a known local or Wikimedia cluster URL are allowed.
	 * All other external links are rejected (T407640).
	 *
	 * @param string $href
	 * @param array $parsedLink
	 * @return array{0: bool, 1: array} [allowed, cleanedAttrs]
	 */
	private function processStandardLink( string $href, array $parsedLink ): array {
		// Compare using protocol-relative form so http:// and https:// both match an allowed entry
		$targetDomain = '//' . $parsedLink['host'];
		// Include port so local dev environments (e.g. localhost:8080) match correctly
		if ( isset( $parsedLink['port'] ) ) {
			$targetDomain .= ':' . $parsedLink['port'];
		}

		if ( in_array( $targetDomain, $this->allowedUrls ) ) {
			$this->logger->info(
				__METHOD__ . ': Allowing <a> tag with href "{targetDomain}"',
				[
					'rawHref' => $href,
					'targetDomain' => $targetDomain,
				]
			);
			$attrs = [ 'href' => $href ];
			if ( $this->isEmptyAbstractArticle( $parsedLink ) ) {
				$attrs['class'] = 'new';
			}
			return [ true, $attrs ];
		}

		$this->logger->info(
			__METHOD__ . ': Rejecting <a> tag with href "{targetDomain}"',
			[
				'rawHref' => $href,
				'targetDomain' => $targetDomain,
				'allowedDomainsCount' => count( $this->allowedUrls ),
				'allowedDomainsMatch' => $this->getMatchingDomains( $this->allowedUrls, $parsedLink['host'] ),
			]
		);
		return [ false, [] ];
	}

	/**
	 * Returns true if the parsed local URL points to an AW article that does not exist,
	 * false otherwise (including if URL does not point to an AW article).
	 *
	 * @param array $parsedLink Parsed URL
	 * @return bool
	 */
	private function isEmptyAbstractArticle( array $parsedLink ): bool {
		$services = MediaWikiServices::getInstance();
		$config = $services->getMainConfig();

		if ( !$config->get( 'WikiLambdaEnableAbstractMode' ) ) {
			return false;
		}

		// Per-request cache to avoid redundant DB loads if the same QID is linked
		// multiple times within same rendered fragment
		static $emptyAbstractPageCache = [];

		// Only apply red-link logic if the URL points to the current (local) wiki server
		$localHost = preg_replace( '#^(https?:)?//#i', '', $config->get( 'Server' ) );

		$parsedHost = $parsedLink['host'] ?? '';
		if ( isset( $parsedLink['port'] ) ) {
			$parsedHost .= ':' . $parsedLink['port'];
		}
		if ( $parsedHost !== $localHost ) {
			return false;
		}

		$path = $parsedLink['path'] ?? '';

		// Only support /wiki/$1 article-path form (e.g. /wiki/Abstract_Wikipedia:Q42)
		$titleText = null;
		$articlePath = $config->get( 'ArticlePath' );
		$dollarPos = strpos( $articlePath, '$1' );
		if ( $dollarPos !== false ) {
			$pathPrefix = substr( $articlePath, 0, $dollarPos );
			if ( $pathPrefix !== '' && str_starts_with( $path, $pathPrefix ) ) {
				$titleText = urldecode( substr( $path, strlen( $pathPrefix ) ) );
			}
		}

		// Also support /view/<lang>/<title> canonical form (e.g. /view/en/Abstract_Wikipedia:Q42)
		if ( $titleText === null && preg_match( '#^/view/[^/]+/(.+)$#', $path, $matches ) ) {
			$titleText = urldecode( $matches[1] );
		}

		if ( $titleText === null || $titleText === '' ) {
			return false;
		}

		$title = $services->getTitleFactory()->newFromText( $titleText );
		if ( $title === null || !$title->hasContentModel( CONTENT_MODEL_ABSTRACT ) ) {
			return false;
		}

		$cacheKey = $title->getPrefixedDBkey();
		if ( isset( $emptyAbstractPageCache[$cacheKey] ) ) {
			return $emptyAbstractPageCache[$cacheKey];
		}

		$isEmpty = !$title->exists();
		$emptyAbstractPageCache[$cacheKey] = $isEmpty;
		return $isEmpty;
	}

	/**
	 * Check a single URL against SpamBlacklist.
	 *
	 * Uses an anonymous user so no bypass rights apply. Log is suppressed because this
	 * happens at render time, not as part of an edit action. Returns false when SpamBlacklist
	 * is not loaded.
	 *
	 * @param string $href
	 * @return bool
	 */
	private function isUrlSpamBlocked( string $href ): bool {
		if ( $this->spamCheckUser === null ) {
			return false;
		}
		$result = BaseBlacklist::getSpamBlacklist()->filter( [ $href ], null, $this->spamCheckUser, true );
		return $result !== false;
	}

	/**
	 * Returns the allowedDomains that match the host to enable easier
	 * debugging if link is not parsed. Passing the whole allowedDomains
	 * to the logger will mostly end up in a discarded log due to the
	 * size of the whole allowedDomains list, so we will log substring
	 * matches with the host part of the url.
	 *
	 * @param array $allowedDomains
	 * @param string $targetHost
	 * @return array
	 */
	private function getMatchingDomains( $allowedDomains, $targetHost ) {
		$matches = [];
		foreach ( $allowedDomains as $allowed ) {
			if ( strpos( $targetHost, $allowed ) !== false ) {
				$matches[] = $allowed;
			}
		}
		return $matches;
	}

	/**
	 * @inheritDoc
	 */
	public function endTag( $name, $sourceStart, $sourceLength ) {
		$tagName = strtolower( $name );

		if ( $tagName === self::IMAGE_ELEMENT ) {
			// Handled as a self-contained element in startTag(); drop any stray close tag.
			return;
		}

		$this->popOpenElement( $tagName );

		if ( in_array( $tagName, self::ALLOWEDELEMENTS ) ) {
			$this->nextHandler->endTag( $name, $sourceStart, $sourceLength );
		} else {
			$this->nextHandler->characters( $this->source, $sourceStart, $sourceLength, $sourceStart, $sourceLength );
		}
	}

	/**
	 * Check whether a URL's host (or any of its parent domain suffixes) is in the blocked list.
	 *
	 * @param string $url
	 * @param array<string, true> $blockedDomains
	 * @return bool
	 */
	private function isUrlBlocked( string $url, array $blockedDomains ): bool {
		return $blockedDomains !== [] &&
			MediaWikiServices::getInstance()->getUrlUtils()->matchesDomainList( $url, array_keys( $blockedDomains ) );
	}

	/**
	 * Sanitise an HTML fragment string using Remex, like MediaWiki's Sanitizer but with
	 * more control (for both including and excluding things).
	 *
	 * @param LoggerInterface $logger
	 * @param string $text
	 * @param array<string, true> $blockedDomains Domain map from AbuseFilter blocked domains
	 * @param User|null $spamCheckUser Anonymous user for SpamBlacklist checks, or null if not loaded
	 * @param WikifunctionsFragmentImageRenderer|null $imageRenderer Renderer for image elements,
	 *   or null to drop <ext-wikilambda-image> elements
	 * @return string
	 */
	public static function sanitiseHtmlFragment(
		LoggerInterface $logger,
		string $text,
		array $blockedDomains = [],
		?User $spamCheckUser = null,
		?WikifunctionsFragmentImageRenderer $imageRenderer = null
	): string {
		// Use RemexHtml to tokenize $text and remove the barred tags

		$serializer = new RemexSerializer( new RemexCompatFormatter );

		$handler = new WikifunctionsSanitiserTokenHandler(
			$logger, $serializer, $text, $blockedDomains, $spamCheckUser, $imageRenderer
		);
		$tokenizer = new RemexTokenizer(
			$handler,
			$text,
				[
				'ignoreErrors' => true,
				// Don't ignore char refs, as we want them to be decoded
				'ignoreCharRefs' => false,
				'ignoreNulls' => true,
				'skipPreprocess' => true,
			]
		);
		$tokenizer->execute( [ 'fragmentNamespace' => HTMLData::NS_HTML, 'fragmentName' => 'body', ] );

		return $handler->restoreImagePlaceholders( $serializer->getResult() );
	}

	/**
	 * Substitute each image sentinel emitted during tokenisation back to its trusted figure HTML.
	 *
	 * Safe by construction: every sentinel was emitted as a text token, so it can only appear in
	 * text-node position in the serialised output. The random salt makes the sentinel impossible
	 * for function output to forge, so no attacker-supplied text can trigger an unintended swap.
	 *
	 * @param string $html Serialised HTML containing image sentinels
	 * @return string
	 */
	private function restoreImagePlaceholders( string $html ): string {
		foreach ( $this->imagePlaceholders as $placeholder => $imageHtml ) {
			$html = str_replace( $placeholder, $imageHtml, $html );
		}
		return $html;
	}

	/**
	 * Normalise the classes attribute to an array of strings.
	 * @param string $classAttr
	 * @return array<int, string>
	 */
	private function normaliseClasses( string $classAttr ): array {
		$normalized = Html::expandClassList( strtolower( $classAttr ) );
		return $normalized !== '' ? explode( ' ', $normalized ) : [];
	}

	/**
	 * Push an open element onto the stack.
	 * @param string $tagName
	 * @param array<int, string> $classes
	 * @return void
	 */
	private function pushOpenElement( string $tagName, array $classes ): void {
		$this->openElements[] = [
			'tagName' => $tagName,
			'classes' => $classes
		];
	}

	/**
	 * Pop an open element from the stack.
	 * @param string $tagName
	 * @return void
	 */
	private function popOpenElement( string $tagName ): void {
		for ( $i = count( $this->openElements ) - 1; $i >= 0; $i-- ) {
			if ( $this->openElements[$i]['tagName'] === $tagName ) {
				array_splice( $this->openElements, $i, 1 );
				return;
			}
		}
	}

	/**
	 * Check if the current open elements are inside an allowed reference context.
	 * @return bool
	 */
	private function isInsideAllowedReferenceContext(): bool {
		foreach ( $this->openElements as $element ) {
			if ( in_array( 'ext-wikilambda-reference', $element['classes'], true ) ) {
				return true;
			}
		}
		return false;
	}
}
