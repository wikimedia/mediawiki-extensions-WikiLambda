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

use MediaWiki\Parser\Sanitizer;
use Wikimedia\RemexHtml\Serializer\Serializer;
use Wikimedia\RemexHtml\Tokenizer\Attributes;
use Wikimedia\RemexHtml\Tokenizer\PlainAttributes;
use Wikimedia\RemexHtml\Tokenizer\RelayTokenHandler;
use Wikimedia\RemexHtml\TreeBuilder\Dispatcher;
use Wikimedia\RemexHtml\TreeBuilder\TreeBuilder;

class WikifunctionsPFragmentSanitiserTokenHandler extends RelayTokenHandler {

	private string $source;

	public function __construct( Serializer $serializer, string $source ) {
		$this->nextHandler = new Dispatcher( new TreeBuilder( $serializer, [
			'ignoreErrors' => true,
			'ignoreNulls' => true,
		] ) );

		parent::__construct( $this->nextHandler );

		$this->source = $source;
	}

	// This is our list of allowed HTML elements. It should be kept extremely minimal, and any changes should
	// be carefully considered in conjunction with the Security and MW Content Transformation team.
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

			$attrs = new PlainAttributes( $fixedAttrs );

			$this->nextHandler->startTag( $name, $attrs, $selfClose, $sourceStart, $sourceLength );
			return;
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
}
