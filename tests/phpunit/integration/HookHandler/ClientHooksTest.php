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
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\Output\OutputPage;
use MediaWiki\Parser\ParserOptions;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Permissions\Authority;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\ResourceLoader\ResourceLoader;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Title\Title;
use MediaWiki\User\UserIdentity;
use MediaWiki\WikiMap\WikiMap;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\ClientHooks
 *
 * @group Database
 */
class ClientHooksTest extends WikiLambdaClientIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();
	}

	private function newClientHooks( ?JobQueueGroup $jobQueueGroup = null ): ClientHooks {
		return new ClientHooks(
			$this->getServiceContainer()->getMainConfig(),
			$this->getServiceContainer()->getService( 'WikiLambdaMode' ),
			$jobQueueGroup ?? $this->getServiceContainer()->getJobQueueGroup(),
			null
		);
	}

	/**
	 * Make a ResourceLoader that the registration hook did not run on.
	 *
	 * The service instance already has our modules, and a second registration on it makes core
	 * send a duplicate-module warning (T438387).
	 *
	 * @return ResourceLoader
	 */
	private function newResourceLoader(): ResourceLoader {
		return new ResourceLoader(
			$this->getServiceContainer()->getMainConfig(),
			null,
			null,
			[ 'loadScript' => '/w/load.php' ]
		);
	}

	// ------------------------------------------------------------------
	// onParserCacheSaveComplete
	// ------------------------------------------------------------------

	/**
	 * Build the render of a page that uses the given Functions.
	 *
	 * @param string[] $functions
	 * @param int $revId
	 * @return ParserOutput
	 */
	private function newRenderUsing( array $functions, int $revId ): ParserOutput {
		$parserOutput = new ParserOutput();
		$parserOutput->setCacheRevisionId( $revId );

		foreach ( $functions as $function ) {
			$parserOutput->setNumericPageProperty( 'wikilambda-' . $function, 1 );
		}
		if ( $functions ) {
			$parserOutput->setNumericPageProperty( 'wikilambda', count( $functions ) );
		}

		return $parserOutput;
	}

	private function newParsoidOptions(): ParserOptions {
		$options = ParserOptions::newFromAnon();
		$options->setUseParsoid();
		return $options;
	}

	private function expectPushedJob( array $expectedParams ): JobQueueGroup {
		$jobQueueGroup = $this->createMock( JobQueueGroup::class );
		$jobQueueGroup->expects( $this->once() )
			->method( 'lazyPush' )
			->willReturnCallback( function ( $job ) use ( $expectedParams ) {
				foreach ( $expectedParams as $key => $value ) {
					$this->assertSame( $value, $job->getParams()[ $key ], "Job parameter '$key'" );
				}
			} );
		return $jobQueueGroup;
	}

	public function testOnParserCacheSaveComplete_pushesTheFunctionsTheRenderUsed() {
		$page = $this->getExistingTestPage( 'Template:Shared usage record' );
		$revId = $page->getLatest();

		// 'wikilambda' counts the calls and 'wikilambda-label-en' belongs to the repo's own
		// labelling; neither names a Function, so neither may reach the job.
		$parserOutput = $this->newRenderUsing( [ 'Z10061', 'Z10060' ], $revId );
		$parserOutput->setUnsortedPageProperty( 'wikilambda-label-en', 'Not a Function' );

		$hooks = $this->newClientHooks( $this->expectPushedJob( [
			'pageId' => $page->getId(),
			'revId' => $revId,
			'functions' => [ 'Z10060', 'Z10061' ],
		] ) );

		$hooks->onParserCacheSaveComplete(
			$this->getServiceContainer()->getParserCache(),
			$parserOutput,
			$page->getTitle(),
			$this->newParsoidOptions(),
			$revId
		);
	}

	public function testOnParserCacheSaveComplete_pushesAnEmptySetSoThatUsageIsRemoved() {
		// A page that has stopped using every Function still needs a job: the empty set is
		// what tells the store to drop the rows it left behind.
		$page = $this->getExistingTestPage( 'Template:Shared usage emptied' );
		$revId = $page->getLatest();

		$hooks = $this->newClientHooks( $this->expectPushedJob( [
			'pageId' => $page->getId(),
			'functions' => [],
		] ) );

		$hooks->onParserCacheSaveComplete(
			$this->getServiceContainer()->getParserCache(),
			$this->newRenderUsing( [], $revId ),
			$page->getTitle(),
			$this->newParsoidOptions(),
			$revId
		);
	}

	public function testOnParserCacheSaveComplete_ignoresTheLegacyRender() {
		// The legacy parser does not know {{#function:…}}, so its output reports no
		// Functions for every page. Acting on it would delete every row (T393716).
		$page = $this->getExistingTestPage( 'Template:Shared usage legacy' );

		$jobQueueGroup = $this->createMock( JobQueueGroup::class );
		$jobQueueGroup->expects( $this->never() )->method( 'lazyPush' );

		$this->newClientHooks( $jobQueueGroup )->onParserCacheSaveComplete(
			$this->getServiceContainer()->getParserCache(),
			$this->newRenderUsing( [], $page->getLatest() ),
			$page->getTitle(),
			ParserOptions::newFromAnon(),
			$page->getLatest()
		);
	}

	public function testOnParserCacheSaveComplete_ignoresAPageThatIsNotStored() {
		$jobQueueGroup = $this->createMock( JobQueueGroup::class );
		$jobQueueGroup->expects( $this->never() )->method( 'lazyPush' );

		$this->newClientHooks( $jobQueueGroup )->onParserCacheSaveComplete(
			$this->getServiceContainer()->getParserCache(),
			$this->newRenderUsing( [ 'Z10062' ], 1 ),
			Title::makeTitle( NS_TEMPLATE, 'No such page here' ),
			$this->newParsoidOptions(),
			1
		);
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

	public function testOnParserCacheSaveComplete_noOpWhenClientModeDisabled() {
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );

		$page = $this->getExistingTestPage( 'Template:ClientHookSurvivor' );

		$jobQueueGroup = $this->createMock( JobQueueGroup::class );
		$jobQueueGroup->expects( $this->never() )->method( 'lazyPush' );

		$this->newClientHooks( $jobQueueGroup )->onParserCacheSaveComplete(
			$this->getServiceContainer()->getParserCache(),
			$this->newRenderUsing( [ 'Z10063' ], $page->getLatest() ),
			$page->getTitle(),
			$this->newParsoidOptions(),
			$page->getLatest()
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
		$rl = $this->newResourceLoader();
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
		$rl = $this->newResourceLoader();
		$hooks->onResourceLoaderRegisterModules( $rl );

		$this->assertFalse(
			$rl->isModuleRegistered( 'ext.wikilambda.visualeditor' ),
			'VE modules should not be registered when client mode is off'
		);
	}

	public function testOnResourceLoaderRegisterModules_registersFunctionLookupWhenCommunityConfigurationLoaded() {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			$this->markTestSkipped( 'CommunityConfiguration is not loaded in this test environment' );
		}

		$hooks = $this->newClientHooks();
		$rl = $this->newResourceLoader();
		$hooks->onResourceLoaderRegisterModules( $rl );

		$this->assertTrue(
			$rl->isModuleRegistered( 'ext.wikilambda.functionLookup' ),
			'The CommunityConfiguration form control should be registered'
		);
	}

	public function testOnResourceLoaderRegisterModules_registersFunctionLookupWhateverTheMode() {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			$this->markTestSkipped( 'CommunityConfiguration is not loaded in this test environment' );
		}
		// The client-mode list is not the only one that wants this control: the abstract-mode list
		// wants it too. Tying the module to client mode would leave the abstract-mode form with a
		// control it cannot load.
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );

		$hooks = $this->newClientHooks();
		$rl = $this->newResourceLoader();
		$hooks->onResourceLoaderRegisterModules( $rl );

		$this->assertTrue(
			$rl->isModuleRegistered( 'ext.wikilambda.functionLookup' ),
			'The form control should not depend on client mode'
		);
	}
}
