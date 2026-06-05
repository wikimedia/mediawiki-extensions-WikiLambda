<?php
/**
 * Injectable service to interface with WikibaseClient lookups.
 *
 * (T428129) This is designed to isolate access to WikibaseClient lookup
 * features conditional to whether WikibaseClient extension is available
 * or not. This class allows us to easily test Wikibase-dependent features.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Language\LanguageFallback;
use MediaWiki\Registration\ExtensionRegistry;
use OutOfBoundsException;

/**
 * Service for checking the existence of Wikidata entities via WikibaseClient.
 * Injectable alternative to static WikibaseClient calls, enabling testability.
 */
class WikidataEntityLookup {

	public function __construct( private readonly LanguageFallback $languageFallback ) {
	}

	/**
	 * @return bool
	 */
	private function isAvailable(): bool {
		return ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' );
	}

	/**
	 * @param string $qid
	 * @return ?\Wikibase\DataModel\Entity\EntityId
	 */
	private function parseEntityId( string $qid ): ?\Wikibase\DataModel\Entity\EntityId {
		try {
			$wbEntityParser = \Wikibase\Client\WikibaseClient::getEntityIdParser();
			return $wbEntityParser->parse( $qid );
		} catch ( \Wikibase\DataModel\Entity\EntityIdParsingException ) {
			return null;
		}
	}

	/**
	 * Check whether a Wikidata item exists via WikibaseClient.
	 *
	 * Returns true if the item exists, false if it definitively does not exist,
	 * or null if WikibaseClient is unavailable (so callers can choose to skip validation).
	 *
	 * @param string $qid The Wikidata QID (e.g. Q42)
	 * @return ?bool
	 */
	public function wikidataItemExists( string $qid ): ?bool {
		if ( !$this->isAvailable() ) {
			return null;
		}

		$itemId = $this->parseEntityId( $qid );
		if ( $itemId === null ) {
			return false;
		}

		$wbEntityLookup = \Wikibase\Client\WikibaseClient::getEntityLookup();
		return $wbEntityLookup->getEntity( $itemId ) !== null;
	}

	/**
	 * Resolve the label for a Wikidata entity via WikibaseClient.
	 *
	 * @param string $qid The Wikidata QID (e.g. Q715040)
	 * @param string $langCode The language code to fetch the label in
	 * @return ?string The label, or null if not found
	 */
	public function resolveAbstractLabel( string $qid, string $langCode ): ?string {
		if ( !$this->isAvailable() ) {
			return null;
		}

		$itemId = $this->parseEntityId( $qid );
		if ( $itemId === null ) {
			return null;
		}

		$wbEntityLookup = \Wikibase\Client\WikibaseClient::getStore()->getEntityLookup();
		$wbEntity = $wbEntityLookup->getEntity( $itemId );

		if ( !( $wbEntity instanceof \Wikibase\DataModel\Entity\Item ) ) {
			return null;
		}

		$labels = $wbEntity->getLabels();
		foreach ( ZObjectUtils::getFallbackLanguageCodes( $this->languageFallback, $langCode ) as $code ) {
			try {
				return $labels->getByLanguage( $code )->getText();
			} catch ( OutOfBoundsException ) {
				// Try next fallback
			}
		}
		return null;
	}

	/**
	 * Get the Wikidata Item ID linked to a client page via sitelink.
	 *
	 * Returns the Qid if found, or null if WikibaseClient is unavailable
	 * r no sitelink exists for the given title.
	 *
	 * @param string $prefixedTitle
	 * @return ?string
	 */
	public function getWikidataItemForTitle( string $prefixedTitle ): ?string {
		if ( !$this->isAvailable() ) {
			return null;
		}

		$wbSiteLinkLookup = \Wikibase\Client\WikibaseClient::getStore()->getSiteLinkLookup();
		$wbClientSettings = \Wikibase\Client\WikibaseClient::getSettings();

		$clientSiteGlobalID = $wbClientSettings->getSetting( 'siteGlobalID' );
		$entityId = $wbSiteLinkLookup->getItemIdForLink( $clientSiteGlobalID, $prefixedTitle );

		// No linked wikidata item; return null
		if ( !$entityId ) {
			return null;
		}

		// Success, return default value wikidata item ID; E.g. Q42
		return $entityId->getSerialization();
	}
}
