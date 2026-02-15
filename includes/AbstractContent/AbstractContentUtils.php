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

	/**
	 * Walk a given input ZObject, and make a cache key constructed of its keys and values.
	 * This is intended to build a key in Abstract mode (or Client), as it won't append
	 * revision Ids to the references.
	 *
	 * E.g. { "Z1K1": "Z7", "Z7K1": "Z801", "Z801K1": "Hey" } => 'Z1K1|Z7,Z7K1|Z801,Z801K1|Hey'
	 *
	 * @param \stdClass|array $query
	 * @return string
	 */
	public static function makeCacheKeyFromZObject( $query ): string {
		$accumulator = '';

		foreach ( $query as $key => $value ) {
			$accumulator .= $key . '|';
			if ( is_array( $value ) || is_object( $value ) ) {
				$accumulator .= self::makeCacheKeyFromZObject( $value );
			} elseif ( is_scalar( $value ) ) {
				$accumulator .= $value;
			}
			$accumulator .= ',';
		}

		return $accumulator;
	}
}
