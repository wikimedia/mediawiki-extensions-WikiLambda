<?php
/**
 * WikiLambda ZObject factory
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use InvalidArgumentException;

class ZObjectFactory {

	/**
	 * @param string $text The serialised form in a string
	 * @return object A ZObject, implementing ZObjectInteface.
	 */
	public static function createFromSerialisedString( string $text ) {
		if ( $text === '' || ( $text[0] !== '{' && $text[0] !== '[' ) ) {
			return new ZString( $text );
		}

		$evaluatedInput = json_decode( $text );
		// Compatibility with PHP 7.2; JSON_THROW_ON_ERROR is PHP 7.3+
		if ( $evaluatedInput === null ) {
			throw new InvalidArgumentException( "Couldn't create ZObject for given input '$text'" );
		}

		if ( $text[0] === '[' ) {
			return new ZList( $evaluatedInput );
		}

		if ( $text[0] === '{' ) {
			return new ZRecord( $evaluatedInput );
		}

		throw new InvalidArgumentException( "Couldn't create ZObject for given input '$text'" );
	}
}
