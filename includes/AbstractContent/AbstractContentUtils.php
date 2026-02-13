<?php
/**
 * WikiLambda Abstract Content utilities class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

class AbstractContentUtils {
	/**
	 * Is the input a Wikidata item reference key (e.g. Q1 or Q12345)?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidWikidataItemReference( string $input ): bool {
		return preg_match( "/^Q[1-9]\d*$/", $input );
	}

	/**
	 * Is the input a valid Abstract Content title?
	 * * With or without namespace preceding the Id
	 * * Id is a valid Wikidata item reference (e.g. Q1 or Q12345)
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidAbstractWikiTitle( string $input ): bool {
		return preg_match( '/^(?:[^:\/]+:)?Q[1-9]\d*$/', $input );
	}

	/**
	 * Is the input a null Wikidata item reference (Q0)?
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isNullWikidataItemReference( string $input ): bool {
		return ( $input === 'Q0' );
	}
}
