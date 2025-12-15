<?php

/**
 * WikiLambda extension HTML-stripping Remex token handler for our parser function
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ParserFunction;

use MediaWiki\Extension\SiteMatrix\SiteMatrix;
use MediaWiki\MediaWikiServices;
use MediaWiki\Parser\Sanitizer;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Tidy\RemexCompatFormatter;
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

class WikifunctionsPFragmentSanitiserTokenHandler extends RelayTokenHandler {

	private string $source;
	private array $allowedUrls = [];
	private LoggerInterface $logger;

	public function __construct( LoggerInterface $logger, Serializer $serializer, string $source ) {
		$this->nextHandler = new Dispatcher( new TreeBuilder( $serializer, [
			'ignoreErrors' => true,
			'ignoreNulls' => true,
		] ) );

		parent::__construct( $this->nextHandler );

		$this->logger = $logger;
		$this->source = $source;

		// The local server URL is always allowed, so we can link to the current wiki
		$this->allowedUrls = [ MediaWikiServices::getInstance()->getMainConfig()->get( 'Server' ) ];

		if ( ExtensionRegistry::getInstance()->isLoaded( 'SiteMatrix' ) ) {
			// If loaded, SiteMatrix can give us a list of cluster wikis and thus their server URLs
			$sitematrix = new SiteMatrix();

			$languages = $sitematrix->getLangList();
			$families = $sitematrix->getSites();
			foreach ( $languages as $key => $langCode ) {
				foreach ( $families as $family ) {
					if ( $sitematrix->exist( $langCode, $family ) ) {
						$this->allowedUrls[] = $sitematrix->getUrl( $langCode, $family );
					}
				}
			}

			$specials = $sitematrix->getSpecials();
			foreach ( $specials as $special ) {
				$this->allowedUrls[] = $sitematrix->getUrl( $special[0], $special[1] );
			}
		}
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
	 * @inheritDoc
	 */
	public function startTag( $name, Attributes $attrs, $selfClose, $sourceStart, $sourceLength ) {
		$tagName = strtolower( $name );

		// If the tag is not in the allowed list, we'll skip processing it entirely and escape as text
		if ( in_array( $tagName, self::ALLOWEDELEMENTS ) ) {
			// Check attributes are allowed, and drop banned ones

			// First, we use MediaWiki's Sanitizer to validate the tag's attributes.
			// This is imperfect, but a good start for dropping bad attributes.
			$fixedAttrs = Sanitizer::validateTagAttributes( $attrs->getValues(), $tagName );

			// Unlike the MediaWiki Sanitizer, for safety we do not allow any data- attributes at all
			foreach ( $fixedAttrs as $key => $value ) {
				if ( str_starts_with( $key, 'data-' ) ) {
					unset( $fixedAttrs[$key] );
				}

				if ( $key === 'style' && $value === "/* insecure input */" ) {
					// Don't let the placeholder cleansed value through
					unset( $fixedAttrs[$key] );
				}
			}

			$tagAllowed = true;

			// Finally, we do some special handling for the <a> tag. The MediaWiki Sanitizer (above) will
			// have only allowed through supported full URLs with supported protocols (so no relative URLs
			// or javascript: URLs), but we want to restrict further to only known local and interwiiki links.
			if ( $tagName === 'a' ) {
				$parsedLink = MediaWikiServices::getInstance()->getUrlUtils()->parse( $fixedAttrs['href'] ?? '' );

				if ( !$parsedLink || !isset( $parsedLink['host'] ) ) {
					// If the link is not parseable, or has no host, we will not allow it
					$tagAllowed = false;
					$fixedAttrs = [];
				} else {
					$targetDomain = $parsedLink['scheme'] . $parsedLink['delimiter'] . $parsedLink['host'];

					// Mostly for local testing!
					if ( isset( $parsedLink['port'] ) ) {
						$targetDomain .= ':' . $parsedLink['port'];
					}

					if ( in_array( $targetDomain, $this->allowedUrls ) ) {
						// Allowed; over-write all other attributes
						$fixedAttrs = [
							'href' => $fixedAttrs['href']
						];
						$this->logger->info(
							'WikifunctionsPFragmentSanitiserTokenHandler: Allowing <a> tag with href "{targetDomain}"',
							[
								'rawHref' => $fixedAttrs['href'] ?? '',
								'targetDomain' => $targetDomain,
								'allowedDomains' => $this->allowedUrls,
							]
						);

					} else {
						$tagAllowed = false;
						$this->logger->info(
							'WikifunctionsPFragmentSanitiserTokenHandler: Rejecting <a> tag with href "{targetDomain}"',
							[
								'rawHref' => $fixedAttrs['href'] ?? '',
								'targetDomain' => $targetDomain,
								'allowedDomains' => $this->allowedUrls,
							]
						);

					}
				}
			}

			$attrs = new PlainAttributes( $fixedAttrs );

			if ( $tagAllowed ) {
				$this->nextHandler->startTag( $name, $attrs, $selfClose, $sourceStart, $sourceLength );
				return;
			}
			// If the tag is not allowed, we will fall down to the below, and escape it as text
		}

		// If we've reached this point, the tag is not allowed, so we will escape it as text
		$this->nextHandler->characters( $this->source, $sourceStart, $sourceLength, $sourceStart, $sourceLength );
	}

	/**
	 * @inheritDoc
	 */
	public function endTag( $name, $sourceStart, $sourceLength ) {
		$tagName = strtolower( $name );

		if ( in_array( $tagName, self::ALLOWEDELEMENTS ) ) {
			$this->nextHandler->endTag( $name, $sourceStart, $sourceLength );
		} else {
			$this->nextHandler->characters( $this->source, $sourceStart, $sourceLength, $sourceStart, $sourceLength );
		}
	}

	/**
	 * Sanitise an HTML fragment string using Remex, like MediaWiki's Sanitizer but with
	 * more control (for both including and excluding things).
	 *
	 * @param LoggerInterface $logger
	 * @param string $text
	 * @return string
	 */
	public static function sanitiseHtmlFragment( LoggerInterface $logger, string $text ): string {
		// Use RemexHtml to tokenize $text and remove the barred tags

		$serializer = new RemexSerializer( new RemexCompatFormatter );

		$tokenizer = new RemexTokenizer(
			new WikifunctionsPFragmentSanitiserTokenHandler( $logger, $serializer, $text ),
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

		return $serializer->getResult();
	}
}
