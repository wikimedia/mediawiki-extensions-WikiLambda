<?php

/**
 * WikiLambda integration test suite for 'client-mode' hooks (ClientHooks).
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Extension\WikiLambda\HookHandler\ClientHooks;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaClientIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\WikifunctionsClientStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Output\OutputPage;
use MediaWiki\Permissions\Authority;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\ResourceLoader\ResourceLoader;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Storage\EditResult;
use MediaWiki\Title\Title;
use MediaWiki\User\UserIdentity;
use MediaWiki\WikiMap\WikiMap;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\ClientHooks
 *
 * @group Database
 */
class ClientHooksTest extends WikiLambdaClientIntegrationTestCase {

	private WikifunctionsClientStore $store;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();
		$this->store = WikiLambdaServices::getWikifunctionsClientStore();
	}

	private function newClientHooks(): ClientHooks {
		return new ClientHooks(
			$this->getServiceContainer()->getMainConfig()
		);
	}

	/**
	 * Build a minimal WikiPage-like mock that returns the given Title.
	 *
	 * @return \MediaWiki\Page\WikiPage A mock WikiPage object
	 */
	private function mockWikiPage( Title $title ) {
		$wikiPage = $this->createMock( \MediaWiki\Page\WikiPage::class );
		$wikiPage->method( 'getTitle' )->willReturn( $title );
		return $wikiPage;
	}

	// ------------------------------------------------------------------
	// onPageSaveComplete
	// ------------------------------------------------------------------

	public function testOnPageSaveComplete_clearsUsageTrackingForPage() {
		$title = Title::newFromText( 'Template:ClientHookTarget' );
		$this->store->insertWikifunctionsUsage( 'Z10050', $title );
		$this->store->insertWikifunctionsUsage( 'Z10051', $title );
		$this->assertNotEmpty( $this->store->fetchWikifunctionsUsage( 'Z10050' ) );

		$hooks = $this->newClientHooks();
		$hooks->onPageSaveComplete(
			$this->mockWikiPage( $title ),
			$this->createMock( UserIdentity::class ),
			'test summary',
			EDIT_UPDATE,
			$this->createMock( RevisionRecord::class ),
			$this->createMock( EditResult::class )
		);

		$this->assertSame( [], $this->store->fetchWikifunctionsUsage( 'Z10050' ) );
		$this->assertSame( [], $this->store->fetchWikifunctionsUsage( 'Z10051' ) );
	}

	public function testOnPageSaveComplete_clearsSharedUsageForExistingPage() {
		$usageStore = WikiLambdaServices::getWikifunctionsUsageStore();
		$page = $this->getExistingTestPage( 'Template:Shared usage clear' );
		$pageId = $page->getId();
		$wiki = WikiMap::getCurrentWikiId();

		// Seed shared (x1) usage rows for this page on two Functions.
		$usageStore->insertUsage( 'Z10052', $wiki, $pageId, NS_TEMPLATE, 'Template', 'Shared usage clear' );
		$usageStore->insertUsage( 'Z10053', $wiki, $pageId, NS_TEMPLATE, 'Template', 'Shared usage clear' );
		$this->assertNotEmpty( $usageStore->fetchUsage( 'Z10052' ) );

		$hooks = $this->newClientHooks();
		$hooks->onPageSaveComplete(
			$page,
			$this->createMock( UserIdentity::class ),
			'test summary',
			EDIT_UPDATE,
			$this->createMock( RevisionRecord::class ),
			$this->createMock( EditResult::class )
		);

		$this->assertSame( [], $usageStore->fetchUsage( 'Z10052' ) );
		$this->assertSame( [], $usageStore->fetchUsage( 'Z10053' ) );
	}

	public function testOnPageDeleteComplete_clearsSharedUsageForDeletedPage() {
		$usageStore = WikiLambdaServices::getWikifunctionsUsageStore();
		$page = $this->getExistingTestPage( 'Template:Shared usage delete' );
		$pageId = $page->getId();
		$wiki = WikiMap::getCurrentWikiId();

		$usageStore->insertUsage( 'Z10054', $wiki, $pageId, NS_TEMPLATE, 'Template', 'Shared usage delete' );
		$this->assertNotEmpty( $usageStore->fetchUsage( 'Z10054' ) );

		$hooks = $this->newClientHooks();
		$hooks->onPageDeleteComplete(
			$page->getTitle(),
			$this->createMock( Authority::class ),
			'test reason',
			$pageId,
			$this->createMock( RevisionRecord::class ),
			// $logEntry is unused by the handler, so a ManualLogEntry mock isn't needed.
			null,
			1
		);

		$this->assertSame( [], $usageStore->fetchUsage( 'Z10054' ) );
	}

	public function testOnPageMoveComplete_refreshesTitleForInNamespaceRename() {
		$usageStore = WikiLambdaServices::getWikifunctionsUsageStore();
		$page = $this->getExistingTestPage( 'User:Movable sandbox' );
		$pageId = $page->getId();
		$wiki = WikiMap::getCurrentWikiId();

		// Recorded while at User:Movable sandbox …
		$usageStore->insertUsage( 'Z10055', $wiki, $pageId, NS_USER, 'User', 'Movable sandbox' );

		// … then renamed within the User namespace: the row's identity is unchanged, so the
		// title is refreshed in place.
		$hooks = $this->newClientHooks();
		$hooks->onPageMoveComplete(
			$page->getTitle(),
			Title::newFromText( 'User:Renamed sandbox' ),
			$this->createMock( UserIdentity::class ),
			$pageId,
			0,
			'moved',
			$this->createMock( RevisionRecord::class )
		);

		$usage = $usageStore->fetchUsage( 'Z10055' );
		$this->assertCount( 1, $usage );
		$this->assertSame( $pageId, $usage[0]['pageId'] );
		$this->assertSame( NS_USER, $usage[0]['namespaceId'], 'The namespace is unchanged' );
		$this->assertSame( 'User', $usage[0]['namespaceText'] );
		$this->assertSame( 'Renamed_sandbox', $usage[0]['title'] );
	}

	public function testOnPageMoveComplete_clearsUsageForCrossNamespaceMove() {
		$usageStore = WikiLambdaServices::getWikifunctionsUsageStore();
		$page = $this->getExistingTestPage( 'User:Movable sandbox' );
		$pageId = $page->getId();
		$wiki = WikiMap::getCurrentWikiId();

		// Recorded while at User:Movable sandbox …
		$usageStore->insertUsage( 'Z10055', $wiki, $pageId, NS_USER, 'User', 'Movable sandbox' );

		// … then moved to a different namespace: the row's identity (wfu_wiki_id) changes, so
		// the stale rows are cleared and the page's next re-render re-records them.
		$hooks = $this->newClientHooks();
		$hooks->onPageMoveComplete(
			$page->getTitle(),
			Title::newFromText( 'Template:Now a template' ),
			$this->createMock( UserIdentity::class ),
			$pageId,
			0,
			'moved',
			$this->createMock( RevisionRecord::class )
		);

		$this->assertSame( [], $usageStore->fetchUsage( 'Z10055' ) );
	}

	public function testOnPageSaveComplete_noOpWhenClientModeDisabled() {
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );

		$title = Title::newFromText( 'Template:ClientHookSurvivor' );
		$this->store->insertWikifunctionsUsage( 'Z10060', $title );

		$hooks = $this->newClientHooks();
		$hooks->onPageSaveComplete(
			$this->mockWikiPage( $title ),
			$this->createMock( UserIdentity::class ),
			'test summary',
			EDIT_UPDATE,
			$this->createMock( RevisionRecord::class ),
			$this->createMock( EditResult::class )
		);

		$this->assertSame(
			[ 'Template:ClientHookSurvivor' ],
			$this->store->fetchWikifunctionsUsage( 'Z10060' ),
			'Usage should not be cleared when client mode is disabled'
		);
	}

	// ------------------------------------------------------------------
	// onMakeGlobalVariablesScript
	// ------------------------------------------------------------------

	public function testOnMakeGlobalVariablesScript_alwaysSetsModeFlagVars() {
		$hooks = $this->newClientHooks();
		$vars = [];
		$hooks->onMakeGlobalVariablesScript( $vars, $this->createMock( OutputPage::class ) );

		$this->assertArrayHasKey( 'wgWikiLambdaEnableAbstractMode', $vars );
		$this->assertArrayHasKey( 'wgWikiLambdaEnableRepoMode', $vars );
	}

	public function testOnMakeGlobalVariablesScript_addsBaseUrlWhenNonRepoMode() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', 'https://test.wikifunctions.org/w/api.php' );

		$hooks = $this->newClientHooks();
		$vars = [];
		$hooks->onMakeGlobalVariablesScript( $vars, $this->createMock( OutputPage::class ) );

		$this->assertSame(
			'https://test.wikifunctions.org/w/api.php',
			$vars['wgWikifunctionsBaseUrl']
		);
	}

	public function testOnMakeGlobalVariablesScript_omitsBaseUrlInRepoMode() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', true );

		$hooks = $this->newClientHooks();
		$vars = [];
		$hooks->onMakeGlobalVariablesScript( $vars, $this->createMock( OutputPage::class ) );

		$this->assertArrayNotHasKey( 'wgWikifunctionsBaseUrl', $vars );
	}

	public function testOnMakeGlobalVariablesScript_setsPrimaryNamespaceWhenAbstractMode() {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', true );
		$this->overrideConfigValue( 'WikiLambdaAbstractNamespaces', [
			'test' => [ 3000, 3001 ],
		] );

		$hooks = $this->newClientHooks();
		$vars = [];
		$hooks->onMakeGlobalVariablesScript( $vars, $this->createMock( OutputPage::class ) );

		$this->assertSame( 3000, $vars['wgWikiLambdaAbstractPrimaryNamespace'] );
	}

	public function testOnMakeGlobalVariablesScript_omitsNamespaceWhenAbstractModeOff() {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', false );

		$hooks = $this->newClientHooks();
		$vars = [];
		$hooks->onMakeGlobalVariablesScript( $vars, $this->createMock( OutputPage::class ) );

		$this->assertArrayNotHasKey( 'wgWikiLambdaAbstractPrimaryNamespace', $vars );
	}

	public function testOnMakeGlobalVariablesScript_emptyBaseUrlWhenTargetApiMissing() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );
		$this->overrideConfigValue( 'WikiLambdaClientTargetAPI', '' );

		$hooks = $this->newClientHooks();
		$vars = [];
		$hooks->onMakeGlobalVariablesScript( $vars, $this->createMock( OutputPage::class ) );

		$this->assertSame( '', $vars['wgWikifunctionsBaseUrl'] );
	}

	// ------------------------------------------------------------------
	// onResourceLoaderRegisterModules
	// ------------------------------------------------------------------

	public function testOnResourceLoaderRegisterModules_registersVeModulesWhenClientAndVeLoaded() {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'VisualEditor' ) ) {
			$this->markTestSkipped( 'VisualEditor is not loaded in this test environment' );
		}

		$hooks = $this->newClientHooks();
		$rl = $this->getServiceContainer()->getResourceLoader();
		$hooks->onResourceLoaderRegisterModules( $rl );

		$this->assertTrue(
			$rl->isModuleRegistered( 'ext.wikilambda.visualeditor' ),
			'The main VE module should be registered'
		);
		$this->assertTrue(
			$rl->isModuleRegistered( 'ext.wikilambda.visualeditor.icons' ),
			'The VE icons module should be registered'
		);
		$this->assertTrue(
			$rl->isModuleRegistered( 'ext.wikilambda.inlineerrors' ),
			'The inline errors Codex module should be registered'
		);
	}

	public function testOnResourceLoaderRegisterModules_skipsRegistrationWhenClientModeDisabled() {
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );

		$hooks = $this->newClientHooks();
		$rl = new ResourceLoader(
			$this->getServiceContainer()->getMainConfig(),
			null,
			null,
			[ 'loadScript' => '/w/load.php' ]
		);
		$hooks->onResourceLoaderRegisterModules( $rl );

		$this->assertFalse(
			$rl->isModuleRegistered( 'ext.wikilambda.visualeditor' ),
			'VE modules should not be registered when client mode is off'
		);
	}
}
