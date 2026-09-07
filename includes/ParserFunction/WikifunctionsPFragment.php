<?php

/**
 * WikiLambda extension Parsoid fragment our parser function
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ParserFunction;

use Wikimedia\Parsoid\Fragments\LiteralStringPFragment;
use Wikimedia\Parsoid\Fragments\PFragment;
use Wikimedia\Parsoid\Fragments\WikitextPFragment;

class WikifunctionsPFragment {
	/**
	 * Static method to return a PFragment instance given its content:
	 * * When the value is an empty string, return WikitextPFragment, which is
	 *   able to produce a span with empty content
	 * * When the value is a non-empty string, return a LiteralStringPFragment
	 *
	 * @param string $value
	 * @return PFragment
	 */
	public static function newFromLiteral( string $value = '' ): PFragment {
		if ( $value !== '' ) {
			return LiteralStringPFragment::newFromLiteral( $value, null );
		}
		return WikitextPFragment::newFromWt( '', null );
	}
}
