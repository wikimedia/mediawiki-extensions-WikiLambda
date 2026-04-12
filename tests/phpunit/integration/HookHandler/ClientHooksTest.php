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
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\ResourceLoader\ResourceLoader;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Storage\EditResult;
use MediaWiki\Title\Title;
use MediaWiki\User\UserIdentity;

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
