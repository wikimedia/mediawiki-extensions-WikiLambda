<?php

/**
 * WikiLambda integration test suite for the AbstractContentHistoryAction class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentHistoryAction;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Page\Article;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentHistoryAction
 * @group Database
 */
class AbstractContentHistoryActionTest extends WikiLambdaClientIntegrationTestCase {

	private const TEST_ABSTRACT_NS = 2300;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();

		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			$this->markTestSkipped( 'WikibaseClient not available' );
		}
	}

	public function testGetName() {
		$title = Title::newFromText( 'Q42', self::TEST_ABSTRACT_NS );
		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setTitle( $title );

		$article = Article::newFromTitle( $title, $context );

		$action = new AbstractContentHistoryAction( $article, $context );

		$this->assertSame( 'history', $action->getName() );
	}

	public function testGetPageTitleReturnsLabelForValidEntity() {
		$content = new AbstractWikiContent(
			// Q8776414 is the lede section QID; required by AbstractWikiContent.php validation
			'{"qid":"Q34086","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);
		$this->editPage( 'Q34086', $content, 'test abstract page', self::TEST_ABSTRACT_NS );

		$this->mockWikibaseClientServicesForAbstractMode( 'Q34086', 'en', 'Justin Bieber' );

		$action = $this->makeAction( 'Q34086' );
		$title = Title::newFromText( 'Q34086', self::TEST_ABSTRACT_NS );
		$result = $this->invokeGetPageTitle( $action )->text();

		$this->assertStringContainsString( 'Revision history', $result );
		$this->assertStringContainsString( 'Justin Bieber', $result );
		$this->assertStringContainsString( 'Q34086', $result );
	}

	public function testGetPageTitleFallsBackWhenPageDoesNotExist() {
		$action = $this->makeAction( 'Q9999999' );
		$result = $this->invokeGetPageTitle( $action )->text();

		// Our formatted title contains 'of "' (e.g. 'Revision history of "Justin Bieber" (Q34086)'),
		// while the parent fallback does not (e.g. 'Abstract Wikipedia:Q34086: Revision history').
		// So absence of 'of "' confirms we got the fallback.
		$this->assertStringNotContainsString( 'of "', $result );
		$this->assertStringContainsString( 'Q9999999', $result );
	}

	public function testGetPageTitleFallsBackWhenLabelMissing() {
		// Q8776414 is the lede section QID; required by AbstractWikiContent.php validation
		$content = new AbstractWikiContent(
			'{"qid":"Q34086","sections":{"Q8776414":{"index":0,"fragments":["Z89"]}}}'
		);
		$this->editPage( 'Q34086', $content, 'test abstract page', self::TEST_ABSTRACT_NS );

		$mockTermList = $this->createMock( \Wikibase\DataModel\Term\TermList::class );
		$mockTermList->method( 'getByLanguage' )
			->willThrowException( new \OutOfBoundsException( 'Term with languageCode "en" not found' ) );

		$mockItem = $this->createMock( \Wikibase\DataModel\Entity\Item::class );
		$mockItem->method( 'getLabels' )->willReturn( $mockTermList );

		$mockEntityLookup = $this->createMock( \Wikibase\DataModel\Services\Lookup\EntityLookup::class );
		$mockEntityLookup->method( 'getEntity' )->willReturn( $mockItem );

		$mockClientStore = $this->createMock( \Wikibase\Client\Store\ClientStore::class );
		$mockClientStore->method( 'getEntityLookup' )->willReturn( $mockEntityLookup );

		$mockItemId = $this->createMock( \Wikibase\DataModel\Entity\ItemId::class );
		$mockEntityIdParser = $this->createMock( \Wikibase\DataModel\Entity\EntityIdParser::class );
		$mockEntityIdParser->method( 'parse' )->willReturnMap( [ [ 'Q34086', $mockItemId ] ] );

		$this->setService( 'WikibaseClient.Store', $mockClientStore );
		$this->setService( 'WikibaseClient.EntityIdParser', $mockEntityIdParser );

		$action = $this->makeAction( 'Q34086' );
		$result = $this->invokeGetPageTitle( $action )->text();

		// (T426833) With no Wikibase label, we still render an Abstract-Article-shaped title
		// ("Revision history of Q34086"), not the MediaWiki default
		// ("Abstract Wikipedia:Q34086: Revision history") nor the labelled form
		// ("Revision history of "…" (Q34086)").
		$this->assertStringContainsString( 'Revision history of Q34086', $result );
		$this->assertStringNotContainsString( 'of "', $result );
	}

	private function invokeGetPageTitle( AbstractContentHistoryAction $action ): \MediaWiki\Message\Message {
		$method = new \ReflectionMethod( AbstractContentHistoryAction::class, 'getPageTitle' );
		$method->setAccessible( true );
		return $method->invoke( $action );
	}

	private function makeAction( string $qid ): AbstractContentHistoryAction {
		$title = Title::newFromText( $qid, self::TEST_ABSTRACT_NS );
		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setTitle( $title );
		$context->setLanguage( 'en' );
		$article = Article::newFromTitle( $title, $context );
		return new AbstractContentHistoryAction( $article, $context );
	}

}
