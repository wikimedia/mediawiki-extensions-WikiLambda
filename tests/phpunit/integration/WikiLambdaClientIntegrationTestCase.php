<?php

/**
 * WikiLambda integration test abstract class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWikiIntegrationTestCase;

abstract class WikiLambdaClientIntegrationTestCase extends MediaWikiIntegrationTestCase {
	protected function setUpAsClientMode(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', 'test.wikifunctions.org' );
		\MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks::registerExtension();
	}

	protected function mockWikibaseClientServicesForAbstractMode( string $qid, string $langCode, string $label ) {
		$mockItemId = $this->createMock( \Wikibase\DataModel\Entity\ItemId::class );

		// Create a mock Term with the label
		$mockTerm = $this->createMock( \Wikibase\DataModel\Term\Term::class );
		$mockTerm->method( 'getText' )->willReturn( $label );

		// Create a mock TermList with the label
		$mockTermList = $this->createMock( \Wikibase\DataModel\Term\TermList::class );
		$mockTermList->method( 'getByLanguage' )->willReturn( $mockTerm );

		// Create a mock Item with the labels
		$mockItem = $this->createMock( \Wikibase\DataModel\Entity\Item::class );
		$mockItem->method( 'getLabels' )->willReturn( $mockTermList );

		// Create a mock EntityLookup that returns our mock item
		$mockEntityLookup = $this->createMock( \Wikibase\DataModel\Services\Lookup\EntityLookup::class );
		$mockEntityLookup->method( 'getEntity' )->willReturn( $mockItem );

		$mockClientStore = $this->createMock( \Wikibase\Client\Store\ClientStore::class );
		$mockClientStore->method( 'getEntityLookup' )->willReturn( $mockEntityLookup );

		$mockEntityIdParser = $this->createMock( \Wikibase\DataModel\Entity\EntityIdParser::class );
		$mockEntityIdParser->method( 'parse' )->willReturnMap( [ [ $qid, $mockItemId ] ] );

		$this->setService( 'WikibaseClient.Store', $mockClientStore );
		$this->setService( 'WikibaseClient.EntityIdParser', $mockEntityIdParser );
	}
}
