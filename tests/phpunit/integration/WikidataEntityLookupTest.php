<?php
/**
 * Tests for the WikidataEntityLookup service.
 *
 * This should become the only point where we test WikibaseClient depending
 * on its loaded or unloaded state. Every interfacing method should hence
 * test both behaviors:
 * * if the extension is loaded, test the loaded use cases and skip the unloaded behavior
 * * if the extension is unloaded, test the output in such case.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\WikidataEntityLookup;
use MediaWiki\MediaWikiServices;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\WikidataEntityLookup
 * @group Database
 */
class WikidataEntityLookupTest extends MediaWikiIntegrationTestCase {

	private function getService(): WikidataEntityLookup {
		return new WikidataEntityLookup( MediaWikiServices::getInstance()->getLanguageFallback() );
	}

	private function skipIfNoWikibaseClient(): void {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			$this->markTestSkipped( 'WikibaseClient extension is not loaded' );
		}
	}

	private function skipIfWikibaseClient(): void {
		if ( ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			$this->markTestSkipped( 'WikibaseClient is loaded; cannot test unavailable path' );
		}
	}

	private function mockItemWithLabel( string $langCode, string $label ) {
		$mockItemId = $this->createMock( \Wikibase\DataModel\Entity\ItemId::class );

		// Create a mock Term with the label
		$mockTerm = $this->createMock( \Wikibase\DataModel\Term\Term::class );
		$mockTerm
			->method( 'getText' )
			->willReturn( $label );

		// Create a mock TermList with the label
		$mockTermList = $this->createMock( \Wikibase\DataModel\Term\TermList::class );
		$mockTermList
			->method( 'getByLanguage' )
			->willReturnCallback( static function ( string $lang ) use ( $langCode, $mockTerm ) {
				if ( $lang === $langCode ) {
					return $mockTerm;
				}
				throw new \OutOfBoundsException();
			} );

		// Create a mock Item with the labels
		$mockItem = $this->createMock( \Wikibase\DataModel\Entity\Item::class );
		$mockItem
			->method( 'getLabels' )
			->willReturn( $mockTermList );

		return $mockItem;
	}

	private function setUpEntityIdParser( $qid, $itemId = null ): void {
		$mockEntityIdParser = $this->createMock( \Wikibase\DataModel\Entity\EntityIdParser::class );
		if ( $itemId === null ) {
			$mockEntityIdParser
				->method( 'parse' )
				->willThrowException( new \Wikibase\DataModel\Entity\EntityIdParsingException );
		} else {
			$mockEntityIdParser
				->method( 'parse' )
				->with( $qid )
				->willReturn( $itemId );
		}
		$this->setService( 'WikibaseClient.EntityIdParser', $mockEntityIdParser );
	}

	private function setUpEntityLookup( $itemId, $item = null ): void {
		$mockEntityLookup = $this->createMock( \Wikibase\DataModel\Services\Lookup\EntityLookup::class );
		$mockEntityLookup
			->method( 'getEntity' )
			->with( $itemId )
			->willReturn( $item );

		$mockClientStore = $this->createMock( \Wikibase\Client\Store\ClientStore::class );
		$mockClientStore
			->method( 'getEntityLookup' )
			->willReturn( $mockEntityLookup );

		$this->setService( 'WikibaseClient.EntityLookup', $mockEntityLookup );
		$this->setService( 'WikibaseClient.Store', $mockClientStore );
	}

	// wikidataItemExists
	// ==================

	public function testWikidataItemExists_returnsTrueForExistingItem(): void {
		$this->skipIfNoWikibaseClient();

		$itemId = new \Wikibase\DataModel\Entity\ItemId( 'Q42' );
		$mockItem = $this->createMock( \Wikibase\DataModel\Entity\Item::class );
		$this->setUpEntityIdParser( 'Q42', $itemId );
		$this->setUpEntityLookup( $itemId, $mockItem );

		$this->assertTrue( $this->getService()->wikidataItemExists( 'Q42' ) );
	}

	public function testWikidataItemExists_returnsFalseForMissingItem(): void {
		$this->skipIfNoWikibaseClient();

		$itemId = new \Wikibase\DataModel\Entity\ItemId( 'Q6' );
		$this->setUpEntityIdParser( 'Q6', $itemId );
		$this->setUpEntityLookup( $itemId, null );
		$this->assertFalse( $this->getService()->wikidataItemExists( 'Q6' ) );
	}

	public function testWikidataItemExists_returnsFalseForInvalidQid(): void {
		$this->skipIfNoWikibaseClient();
		$this->setUpEntityIdParser( 'not-a-qid' );
		$this->assertFalse( $this->getService()->wikidataItemExists( 'not-a-qid' ) );
	}

	public function testWikidataItemExists_returnsNullWhenWikibaseClientUnavailable(): void {
		$this->skipIfWikibaseClient();
		$this->assertNull( $this->getService()->wikidataItemExists( 'Q42' ) );
	}

	// resolveAbstractLabel
	// ====================

	public function testResolveAbstractLabel_returnsLabelForExistingItem(): void {
		$this->skipIfNoWikibaseClient();

		$itemId = new \Wikibase\DataModel\Entity\ItemId( 'Q319' );
		$mockItem = $this->mockItemWithLabel( 'en', 'Jupiter' );
		$this->setUpEntityIdParser( 'Q319', $itemId );
		$this->setUpEntityLookup( $itemId, $mockItem );

		$this->assertSame( 'Jupiter', $this->getService()->resolveAbstractLabel( 'Q319', 'en' ) );
	}

	public function testResolveAbstractLabel_returnsFallbackChainLabel(): void {
		$this->skipIfNoWikibaseClient();

		$itemId = new \Wikibase\DataModel\Entity\ItemId( 'Q319' );
		// Requesting Asturian falls back to English bc of fallback chain which doesn't have Asturian
		$mockItem = $this->mockItemWithLabel( 'en', 'Jupiter' );
		$this->setUpEntityIdParser( 'Q319', $itemId );
		$this->setUpEntityLookup( $itemId, $mockItem );

		$this->assertSame( 'Jupiter', $this->getService()->resolveAbstractLabel( 'Q319', 'ast' ) );
	}

	public function testResolveAbstractLabel_returnsMulLabelAsFinalFallback(): void {
		$this->skipIfNoWikibaseClient();

		$itemId = new \Wikibase\DataModel\Entity\ItemId( 'Q319' );
		// No lang label so resolves to final fallback, mul
		$mockItem = $this->mockItemWithLabel( 'mul', 'Jupiter' );
		$this->setUpEntityIdParser( 'Q319', $itemId );
		$this->setUpEntityLookup( $itemId, $mockItem );

		$this->assertSame( 'Jupiter', $this->getService()->resolveAbstractLabel( 'Q319', 'fr' ) );
	}

	public function testResolveAbstractLabel_returnsNullWhenNoLabelInFallbackChain(): void {
		$this->skipIfNoWikibaseClient();

		$itemId = new \Wikibase\DataModel\Entity\ItemId( 'Q319' );
		// Only has a Chinese label so requesting French will return null bc it's not in the fallback chain
		$mockItem = $this->mockItemWithLabel( 'zh', '木星' );
		$this->setUpEntityIdParser( 'Q319', $itemId );
		$this->setUpEntityLookup( $itemId, $mockItem );

		$this->assertNull( $this->getService()->resolveAbstractLabel( 'Q319', 'fr' ) );
	}

	public function testResolveAbstractLabel_returnsNullForMissingEntity(): void {
		$this->skipIfNoWikibaseClient();

		$itemId = new \Wikibase\DataModel\Entity\ItemId( 'Q999' );
		$this->setUpEntityIdParser( 'Q999', $itemId );
		$this->setUpEntityLookup( $itemId, null );

		$this->assertNull( $this->getService()->resolveAbstractLabel( 'Q999', 'en' ) );
	}

	public function testResolveAbstractLabel_returnsNullForInvalidQid(): void {
		$this->skipIfNoWikibaseClient();
		$this->setUpEntityIdParser( 'not-a-qid' );
		$this->assertNull( $this->getService()->resolveAbstractLabel( 'not-a-qid', 'en' ) );
	}

	public function testResolveAbstractLabel_returnsNullWhenWikibaseClientUnavailable(): void {
		$this->skipIfWikibaseClient();
		$this->assertNull( $this->getService()->resolveAbstractLabel( 'Q42', 'en' ) );
	}

	// getWikidataItemForTitle
	// =======================

	public function testGetWikidataItemForTitle_returnsQidForLinkedPage(): void {
		$this->skipIfNoWikibaseClient();

		$itemId = new \Wikibase\DataModel\Entity\ItemId( 'Q42' );

		$mockSiteLinkLookup = $this->createMock( \Wikibase\Lib\Store\SiteLinkLookup::class );
		$mockSiteLinkLookup->method( 'getItemIdForLink' )->willReturn( $itemId );
		$mockClientStore = $this->createMock( \Wikibase\Client\Store\ClientStore::class );
		$mockClientStore->method( 'getSiteLinkLookup' )->willReturn( $mockSiteLinkLookup );
		$this->setService( 'WikibaseClient.Store', $mockClientStore );

		$this->assertSame( 'Q42', $this->getService()->getWikidataItemForTitle( 'Douglas Adams' ) );
	}

	public function testGetWikidataItemForTitle_returnsNullForUnlinkedPage(): void {
		$this->skipIfNoWikibaseClient();

		$mockSiteLinkLookup = $this->createMock( \Wikibase\Lib\Store\SiteLinkLookup::class );
		$mockSiteLinkLookup->method( 'getItemIdForLink' )->willReturn( null );
		$mockClientStore = $this->createMock( \Wikibase\Client\Store\ClientStore::class );
		$mockClientStore->method( 'getSiteLinkLookup' )->willReturn( $mockSiteLinkLookup );
		$this->setService( 'WikibaseClient.Store', $mockClientStore );

		$this->assertNull( $this->getService()->getWikidataItemForTitle( 'NonExistentPage' ) );
	}

	public function testGetWikidataItemForTitle_returnsNullWhenWikibaseClientUnavailable(): void {
		$this->skipIfWikibaseClient();
		$this->assertNull( $this->getService()->getWikidataItemForTitle( 'Douglas Adams' ) );
	}
}
