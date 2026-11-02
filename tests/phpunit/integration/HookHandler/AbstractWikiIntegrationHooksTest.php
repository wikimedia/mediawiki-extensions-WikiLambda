<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Content\JsonContent;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiIntegrationStore;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaAbstractClientIntegrationTestCase;
use MediaWiki\Page\PageIdentityValue;
use MediaWiki\Registration\ExtensionRegistry;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\AbstractWikiIntegrationHooks
 * @group Database
 */
class AbstractWikiIntegrationHooksTest extends WikiLambdaAbstractClientIntegrationTestCase {

	private const CONFIG_TITLE = 'MediaWiki:AbstractWikiOptedInArticles.json';
	private const LOCAL_ARTICLE = AbstractWikiIntegrationStore::REASON_LOCAL_ARTICLE;

	protected function setUp(): void {
		parent::setUp();

		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			$this->markTestSkipped( 'CommunityConfiguration extension is not loaded' );
		}
		$this->setUpAsAbstractClientMode();
		// Let main-namespace test pages be plain wikitext articles, not ZObjects.
		$this->overrideConfigValue( 'NamespaceContentModels', [] );
	}

	private function saveOptedIn( array $items ): void {
		$this->editPage(
			self::CONFIG_TITLE, new JsonContent( json_encode( [ 'OptedInArticles' => $items ] ) ),
			'', NS_MAIN, $this->getTestUser()->getUser()
		);
		// Drop the opted-in list that an earlier page change in this test cached.
		$this->resetServices();
	}

	private function assertIntegrations( array $expected ): void {
		$this->runDeferredUpdates();
		$this->newSelectQueryBuilder()
			->select( [ 'awi_title', 'awi_qid', 'awi_removed_reason' ] )
			->from( 'abstractwiki_integrations' )
			->assertResultSet( $expected );
	}

	private function movePage( string $from, string $to, bool $createRedirect ): void {
		$status = $this->getServiceContainer()->getMovePageFactory()
			->newMovePage( $this->makeTitle( $from ), $this->makeTitle( $to ) )
			->move( $this->getTestSysop()->getUser(), '', $createRedirect );
		$this->assertStatusGood( $status );
	}

	private function makeTitle( string $text ) {
		return $this->getServiceContainer()->getTitleFactory()->newFromText( $text );
	}

	public function testConfigSave_recordsPrimaryTitlesOnly(): void {
		$this->saveOptedIn( [ [ 'title' => [ 'Paris', 'Paris, France' ], 'qid' => 'Q90' ] ] );
		$this->assertIntegrations( [ [ 'Paris', 'Q90', null ] ] );

		$this->saveOptedIn( [] );
		$this->assertIntegrations( [
			[ 'Paris', 'Q90', (string)AbstractWikiIntegrationStore::REASON_OPTED_OUT ],
		] );
	}

	public function testConfigSave_skipsTitlesWithLocalArticle(): void {
		$this->editPage( 'Rome', 'A local article' );
		$this->saveOptedIn( [
			[ 'title' => [ 'Rome' ], 'qid' => 'Q220' ],
			[ 'title' => [ 'Paris' ], 'qid' => 'Q90' ],
		] );

		$this->assertIntegrations( [ [ 'Paris', 'Q90', null ] ] );
	}

	public function testConfigSave_skipsTitlesNotInCanonicalForm(): void {
		$this->overrideConfigValue( 'CapitalLinks', true );
		$this->saveOptedIn( [
			[ 'title' => [ 'paris' ], 'qid' => 'Q90' ],
			[ 'title' => [ 'Talk:Rome' ], 'qid' => 'Q220' ],
			[ 'title' => [ 'New  York' ], 'qid' => 'Q60' ],
			[ 'title' => [ 'Berlin' ], 'qid' => 'Q64' ],
		] );

		$this->assertIntegrations( [ [ 'Berlin', 'Q64', null ] ] );
	}

	public function testConfigSave_doesNothingWithoutIntegration(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientModeIntegration', false );
		$this->saveOptedIn( [ [ 'title' => [ 'Paris' ], 'qid' => 'Q90' ] ] );

		$this->assertIntegrations( [] );
	}

	public function testLocalArticleCreation_closesIntegration(): void {
		$this->saveOptedIn( [ [ 'title' => [ 'Paris' ], 'qid' => 'Q90' ] ] );
		$this->editPage( 'Paris', 'A local article' );

		$this->assertIntegrations( [ [ 'Paris', 'Q90', self::LOCAL_ARTICLE ] ] );
	}

	public function testLocalArticleDeletion_opensIntegration(): void {
		$this->editPage( 'Paris', 'A local article' );
		$this->saveOptedIn( [ [ 'title' => [ 'Paris' ], 'qid' => 'Q90' ] ] );
		$this->assertIntegrations( [] );

		$this->deletePage( $this->makeTitle( 'Paris' ) );
		$this->assertIntegrations( [ [ 'Paris', 'Q90', null ] ] );
	}

	public function testLocalArticleUndeletion_closesIntegration(): void {
		$this->editPage( 'Paris', 'A local article' );
		$this->saveOptedIn( [ [ 'title' => [ 'Paris' ], 'qid' => 'Q90' ] ] );
		$this->deletePage( $this->makeTitle( 'Paris' ) );

		$deletedPage = PageIdentityValue::localIdentity( 0, NS_MAIN, 'Paris' );
		$this->getServiceContainer()->getUndeletePageFactory()
			->newUndeletePage( $deletedPage, $this->getTestSysop()->getUser() )
			->undeleteUnsafe( '' );

		$this->assertIntegrations( [ [ 'Paris', 'Q90', self::LOCAL_ARTICLE ] ] );
	}

	public function testMoveOntoOptedInTitle_closesIntegration(): void {
		$this->editPage( 'Paris draft', 'A local article' );
		$this->saveOptedIn( [ [ 'title' => [ 'Paris' ], 'qid' => 'Q90' ] ] );

		$this->movePage( 'Paris draft', 'Paris', false );

		$this->assertIntegrations( [ [ 'Paris', 'Q90', self::LOCAL_ARTICLE ] ] );
	}

	public function testMoveAwayWithoutRedirect_opensIntegration(): void {
		$this->editPage( 'Paris', 'A local article' );
		$this->saveOptedIn( [ [ 'title' => [ 'Paris' ], 'qid' => 'Q90' ] ] );

		$this->movePage( 'Paris', 'Paris (old)', false );

		$this->assertIntegrations( [ [ 'Paris', 'Q90', null ] ] );
	}

	public function testMoveAwayWithRedirect_keepsIntegrationClosed(): void {
		$this->editPage( 'Paris', 'A local article' );
		$this->saveOptedIn( [ [ 'title' => [ 'Paris' ], 'qid' => 'Q90' ] ] );

		$this->movePage( 'Paris', 'Paris (old)', true );

		$this->assertIntegrations( [] );
	}
}
