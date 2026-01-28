<?php
/**
 * WikiLambda extension handler for default (empty) values for our parser function
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ParserFunction;

use DateTime;
use DateTimeZone;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Title\Title;
use Wikimedia\Parsoid\Core\LinkTarget;

class WikifunctionsCallDefaultValues {

	/**
	 * Returns the map of type IDs to default value callbacks.
	 * Each callback should return a default value for the given type.
	 *
	 * To add default values for other types:
	 * 1. Add a new entry in the returned array with the type zid
	 *    as the index, and a callable as its value.
	 * 2. The callable can be an anonymous function or a public static
	 * 	  named function, which should be implemented below.
	 *
	 * @return array
	 */
	private static function getDefaultValueCallbacks(): array {
		return [
			'Z60' => [ self::class, 'getDefaultLanguage' ],
			'Z6001' => [ self::class, 'getWikidataItem' ],
			'Z6091' => [ self::class, 'getWikidataItem' ],
			'Z20420' => [ self::class, 'getDefaultDate' ],
		];
	}

	/**
	 * Checks whether a default value callback exists for a given type.
	 *
	 * @param string $type
	 * @return bool
	 */
	public static function hasDefaultValueCallback( string $type ): bool {
		return array_key_exists( $type, self::getDefaultValueCallbacks() );
	}

	/**
	 * Returns a callable that provides a default value for the given type.
	 *
	 * @param string $type
	 * @return callable|null
	 */
	public static function getDefaultValueForType( string $type ): ?callable {
		return self::getDefaultValueCallbacks()[ $type ] ?? null;
	}

	// Callables for each type:

	/**
	 * Default Value Callable for Language/Z60:
	 * Returns the language of the page
	 *
	 * @param array $context
	 * @return string
	 */
	public static function getDefaultLanguage( array $context = [] ): string {
		// Context doesn't have the info of the page language; return empty string
		if ( !isset( $context['pageLanguage'] ) || $context['pageLanguage'] === '' ) {
			return '';
		}
		// Return page language Bcp47 code, FunctionCallHandler will convert it to zid
		return $context[ 'pageLanguage' ];
	}

	/**
	 * Default Value Callable for Date/Z20420:
	 * Returns today's date in the current locale in the format 'dd-mm-yyyy'
	 *
	 * @param array $context
	 * @return string
	 */
	public static function getDefaultDate( array $context = [] ): string {
		global $wgLocaltimezone;

		$cmc = $context['contentMetadataCollector'] ?? null;
		// In some test cases, $cmc will be a StubMetadataCollector rather than a ParserOutput, so we can't do this
		if ( $cmc && $cmc instanceof ParserOutput ) {
			// Make sure our fragment's cache expiry is set to at most 24 hours, as we're adding
			// a one-day-variant piece of content.
			$cmc->updateRuntimeAdaptiveExpiry( 24 * 60 * 60 );
		}

		$date = new DateTime( 'now', new DateTimeZone( $wgLocaltimezone ?? 'UTC' ) );
		return $date->format( 'd-m-Y' );
	}

	/**
	 * Default Value Callable for Wikidata Item/Z6001 and Wikidata Item Reference/Z6091
	 * Returns the Wikidata Item ID linked to the client page
	 *
	 * @param array $context
	 * @return string
	 */
	public static function getWikidataItem( array $context = [] ): string {
		// Context doesn't have info of the page title; return empty string
		if ( !isset( $context['linkTarget'] ) ||
			!( $context['linkTarget'] instanceof LinkTarget ) ) {
			return '';
		}

		// The extension doesn't have WikibaseClient loaded; return empty string
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			return '';
		}

		$prefixedTitle = Title::newFromLinkTarget( $context['linkTarget'] )->getPrefixedText();
		$wbSiteLinkLookup = \Wikibase\Client\WikibaseClient::getStore()->getSiteLinkLookup();
		$wbClientSettings = \Wikibase\Client\WikibaseClient::getSettings();

		$clientSiteGlobalID = $wbClientSettings->getSetting( 'siteGlobalID' );
		$entityId = $wbSiteLinkLookup->getItemIdForLink( $clientSiteGlobalID, $prefixedTitle );

		// No linked wikidata item; return empty string
		if ( !$entityId ) {
			return '';
		}

		// Success, return default value wikidata item ID; E.g. Q42
		return $entityId->getSerialization();
	}
}
