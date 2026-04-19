<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Config\HashConfig;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaClientIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Language\LanguageFactory;
use MediaWiki\Language\LanguageNameUtils;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsLookup;
use Wikimedia\HtmlArmor\HtmlArmor;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\PageRenderingHandler
 * @group Database
 */
class PageRenderingHandlerAbstractModeTest extends WikiLambdaClientIntegrationTestCase {

	private PageRenderingHandler $pageRenderingHandlerAbstractMode;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();

		// Ensure Wikibase classes are loaded
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			$this->markTestSkipped( 'WikibaseClient not available' );
		}

		$mockHashConfigAbstractMode = $this->createMock( HashConfig::class );
		$mockHashConfigAbstractMode->method( 'get' )->willReturnMap( [
			[ 'WikiLambdaEnableRepoMode', false ],
			[ 'WikiLambdaEnableAbstractMode', true ],
			[ 'WikiLambdaAbstractNamespaces', [ 2300 => 'Abstract_Wikipedia' ] ],
		] );

		$mockUserOptionsLookup = $this->createMock( UserOptionsLookup::class );
		$mockUserOptionsLookup->method( 'getOption' )->willReturn( 'de' );

		$mockLanguageNameUtils = $this->createMock( LanguageNameUtils::class );
		$mockLanguageNameUtils->method( 'getLanguageName' )->willReturn( '' );

		$mockLanguageFactory = $this->createMock( LanguageFactory::class );

		$this->pageRenderingHandlerAbstractMode = new PageRenderingHandler(
			$mockHashConfigAbstractMode,
			$mockUserOptionsLookup,
			$mockLanguageNameUtils,
			$mockLanguageFactory,
			$this->createNoOpMock( ZObjectStore::class )
		);
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

	public function testOnHtmlPageLinkRendererEnd_abstractMode() {
		// Create the abstract page in the test DB so hasContentModel() works
		$content = new AbstractWikiContent(
			'{ "qid": "Q715040", "sections": {} }'
		);
		$this->editPage( 'Q715040', $content, 'test abstract page', 2300 );

		// Mock Wikibase services to return a fake entity with a label
		$this->mockWikibaseClientServicesForAbstractMode( 'Q715040', 'en', 'japchae' );

		// Set up a RequestContext to simulate being on a special page
		$context = RequestContext::getMain();
		$context->setLanguage( 'en' );
		$context->setTitle( Title::newFromText( 'Special:RecentChanges', NS_SPECIAL ) );
		$context->setRequest( new FauxRequest( [ 'title' => 'Special:RecentChanges', 'uselang' => 'en' ] ) );

		$linkRenderer = $this->getServiceContainer()->getLinkRenderer();
		$linkTarget = Title::makeTitle( 2300, 'Q715040' );
		$isKnown = true;
		$text = null;
		$attribs = [ 'href' => '/wiki/Abstract_Wikipedia:Q715040' ];
		$ret = '';

		$this->pageRenderingHandlerAbstractMode->onHtmlPageLinkRendererEnd(
			$linkRenderer, $linkTarget, $isKnown, $text, $attribs, $ret
		);

		$this->assertStringContainsString(
			'japchae (<span dir="ltr">Q715040</span>)',
			HtmlArmor::getHtml( $text ),
			'Abstract mode link should show the Wikidata label with QID in parentheses and BiDi isolation'
		);

		$this->assertSame(
			'/view/en/Abstract_Wikipedia:Q715040',
			$attribs['href'],
			'Abstract mode link should have the correct href with namespace prefix'
		);
	}

	public function testOnHtmlPageLinkRendererEnd_abstractMode_missingLabel() {
		// Mock Wikibase services to return an entity with no label for the requested language
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
		$mockEntityIdParser->method( 'parse' )->willReturnMap( [ [ 'Q715040', $mockItemId ] ] );

		$this->setService( 'WikibaseClient.Store', $mockClientStore );
		$this->setService( 'WikibaseClient.EntityIdParser', $mockEntityIdParser );

		// Set up a RequestContext to simulate being on a special page
		$context = RequestContext::getMain();
		$context->setLanguage( 'en' );
		$context->setTitle( Title::newFromText( 'Special:RecentChanges', NS_SPECIAL ) );
		$context->setRequest( new FauxRequest( [ 'title' => 'Special:RecentChanges', 'uselang' => 'en' ] ) );

		// Create the abstract page in the test DB
		$content = new AbstractWikiContent( '{ "qid": "Q715040", "sections": {} }' );
		$this->editPage( 'Q715040', $content, 'test abstract page', 2300 );

		$linkRenderer = $this->getServiceContainer()->getLinkRenderer();
		$linkTarget = Title::makeTitle( 2300, 'Q715040' );
		$isKnown = true;
		$text = null;
		$attribs = [ 'href' => '/wiki/Abstract_Wikipedia:Q715040' ];
		$ret = '';

		$this->pageRenderingHandlerAbstractMode->onHtmlPageLinkRendererEnd(
			$linkRenderer, $linkTarget, $isKnown, $text, $attribs, $ret
		);

		// When label is missing, $text should remain null (hook returns early)
		$this->assertNull(
			$text,
			'When no label is found, the link text should not be modified'
		);
	}
}
