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

use MediaWiki\Registration\ExtensionRegistry;
use OutOfBoundsException;

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
	 * Walk a given input Object, and make a cache key constructed of its keys and values.
	 * This is intended to build a key for an Abstract Content fragment while in Abstract mode,
	 * and unlike ZObject cache keys in Repo Mode, it won't add revision Ids to the references.
	 *
	 * NOTE: Whether the input is passed as a stdClass or as associative array it will not
	 * make any difference for the output string key, as demonstrated in the test cases.
	 *
	 * @param \stdClass|array $query
	 * @return string
	 */
	public static function makeCacheKeyForAbstractFragment( $query ): string {
		$accumulator = '';

		foreach ( $query as $key => $value ) {
			$accumulator .= $key . '|';
			if ( is_array( $value ) || is_object( $value ) ) {
				$accumulator .= self::makeCacheKeyForAbstractFragment( $value );
			} elseif ( is_scalar( $value ) ) {
				$accumulator .= $value;
			}
			$accumulator .= ',';
		}

		return $accumulator;
	}

	/**
	 * Resolve the label for a Wikidata entity via WikibaseClient.
	 *
	 * @param string $qid The Wikidata QID (e.g. Q715040)
	 * @param string $langCode The language code to fetch the label in
	 * @return ?string The label, or null if not found
	 */
	public static function resolveAbstractLabel( string $qid, string $langCode ): ?string {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			return null;
		}
		try {
			$wbEntityParser = \Wikibase\Client\WikibaseClient::getEntityIdParser();
			$itemId = $wbEntityParser->parse( $qid );
		} catch ( \Wikibase\DataModel\Entity\EntityIdParsingException ) {
			return null;
		}

		$wbEntityLookup = \Wikibase\Client\WikibaseClient::getStore()->getEntityLookup();
		$wbEntity = $wbEntityLookup->getEntity( $itemId );

		if ( !( $wbEntity instanceof \Wikibase\DataModel\Entity\Item ) ) {
			return null;
		}

		try {
			return $wbEntity->getLabels()->getByLanguage( $langCode )?->getText();
		} catch ( OutOfBoundsException ) {
			return null;
		}
	}
}
