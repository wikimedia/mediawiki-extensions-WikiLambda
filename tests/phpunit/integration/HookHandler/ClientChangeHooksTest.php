<?php

/**
 * WikiLambda integration test suite for 'client-mode' RecentChanges-related hooks
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\HookHandler\ClientChangeHooks;
use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsRecentChangesInsertJob;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaClientIntegrationTestCase;
use MediaWiki\Html\FormOptions;
use MediaWiki\Page\PageReferenceValue;
use MediaWiki\RecentChanges\ChangesListBooleanFilterGroup;
use MediaWiki\RecentChanges\EnhancedChangesList;
use MediaWiki\RecentChanges\OldChangesList;
use MediaWiki\RecentChanges\RecentChange;
use MediaWiki\SpecialPage\ChangesListSpecialPage;
use MediaWiki\User\User;
use MediaWiki\User\UserIdentityValue;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\ClientChangeHooks
 *
 * @group Database
 */
class ClientChangeHooksTest extends WikiLambdaClientIntegrationTestCase {

	private function newClientChangeHooks(): ClientChangeHooks {
		return new ClientChangeHooks(
			$this->getServiceContainer()->getUserOptionsLookup(),
			$this->getServiceContainer()->getConnectionProvider(),
			$this->getServiceContainer()->getMainConfig(),
			$this->getServiceContainer()->getLinkRenderer()
		);
	}

	/**
	 * Build a mock RecentChange with an rc_source that is NOT from Wikifunctions,
	 * for testing the early-return "not one of ours" branches.
	 */
	private function newNonWikifunctionsRecentChange(): RecentChange {
		$rc = $this->createMock( RecentChange::class );
		$rc->method( 'getAttribute' )->willReturnMap( [
			[ 'rc_source', RecentChange::SRC_EDIT ],
		] );
		return $rc;
	}

	/**
	 * Build a mock RecentChange that looks like a Wikifunctions RC entry with the given params JSON.
	 */
	private function newWikifunctionsRecentChange(
		?string $paramsJson = null,
		bool $hasPage = true
	): RecentChange {
		$rc = $this->createMock( RecentChange::class );

		$page = $hasPage
			? PageReferenceValue::localReference( NS_MAIN, 'Test_title' )
			: null;
		$rc->method( 'getPage' )->willReturn( $page );

		$performer = new UserIdentityValue( 1, 'TestUser' );
		$rc->method( 'getPerformerIdentity' )->willReturn( $performer );

		$rc->method( 'getAttribute' )->willReturnMap( [
			[ 'rc_id', 1 ],
			[ 'rc_source', WikifunctionsRecentChangesInsertJob::SRC_WIKIFUNCTIONS ],
			[ 'rc_params', $paramsJson ?? '{"target":"Z801","function":"Z802",'
				. '"newId":10,"oldId":9,"message":"wikilambda-updated","messageParams":["Z801"]}' ],
			[ 'rc_bot', false ],
			[ 'rc_minor', true ],
			[ 'rc_user_text', 'TestUser' ],
			[ 'rc_timestamp', '20231001000000' ],
			[ 'rc_comment', 'Test comment' ],
			[ 'rc_title', 'Test_title' ],
			[ 'rc_namespace', 0 ],
			[ 'rc_user_id', 1 ],
		] );

		return $rc;
	}

	/**
	 * Build a mock EnhancedChangesList with common stubs.
	 */
	private function newMockEnhancedChangesList(): EnhancedChangesList {
		$mock = $this->createMock( EnhancedChangesList::class );
		$mock->method( 'getContext' )->willReturn( RequestContext::getMain() );
		$mock->method( 'recentChangesFlags' )->willReturn( '' );
		$mock->method( 'getLanguage' )->willReturn(
			$this->getServiceContainer()->getLanguageFactory()->getLanguage( 'en' )
		);
		return $mock;
	}

	// ─── onEnhancedChangesListModifyLineData ───────────────────

	public function testOnEnhancedChangesListModifyLineData() {
		$hooks = $this->newClientChangeHooks();

		$mockEnhancedChangesList = $this->newMockEnhancedChangesList();
		$mockRecentChange = $this->newWikifunctionsRecentChange();

		$data = [ 'recentChangesFlags' => [ 'foo' => 'bar' ] ];
		$block = [];
		$classes = [];
		$attribs = [];

		$hooks->onEnhancedChangesListModifyLineData(
			$mockEnhancedChangesList, $data, $block, $mockRecentChange, $classes, $attribs
		);

		// Recent change meta-data is set
		$this->assertSame( true, $data['recentChangesFlags']['wikifunctions-edit'], "Check we set our own flag" );
		$this->assertSame( true, $data['recentChangesFlags']['minor'], "Check we passed on the minor flag (+ve)" );
		$this->assertSame( false, $data['recentChangesFlags']['bot'], "Check we passed on the bot flag (-ve)" );
		$this->assertArrayHasKey( 'foo', $data['recentChangesFlags'], "Don't over-write existing unrelated flags" );

		// Recent change time data is set
		$this->assertArrayHasKey( 'timestampLink', $data );

		// Recent change links are set
		$this->assertArrayHasKey( 'currentAndLastLinks', $data );

		// Recent change comment is set
		$this->assertArrayHasKey( 'comment', $data );
	}

	public function testOnEnhancedChangesListModifyLineData_nonWikifunctions() {
		$hooks = $this->newClientChangeHooks();

		$mockEnhancedChangesList = $this->newMockEnhancedChangesList();
		$mockRecentChange = $this->newNonWikifunctionsRecentChange();

		$data = [ 'recentChangesFlags' => [] ];
		$block = [];
		$classes = [];
		$attribs = [];

		$hooks->onEnhancedChangesListModifyLineData(
			$mockEnhancedChangesList, $data, $block, $mockRecentChange, $classes, $attribs
		);

		$this->assertSame(
			false, $data['recentChangesFlags']['wikifunctions-edit'],
			"Non-Wikifunctions RC entries should set the wikifunctions-edit flag to false"
		);
		// Should NOT have set our custom fields
		$this->assertArrayNotHasKey( 'timestampLink', $data );
	}

	// ─── onEnhancedChangesListModifyBlockLineData ──────────────

	public function testOnEnhancedChangesListModifyBlockLineData_nonWikifunctions() {
		$hooks = $this->newClientChangeHooks();

		$mockEnhancedChangesList = $this->newMockEnhancedChangesList();
		$mockRecentChange = $this->newNonWikifunctionsRecentChange();

		$data = [ 'recentChangesFlags' => [] ];

		$hooks->onEnhancedChangesListModifyBlockLineData(
			$mockEnhancedChangesList, $data, $mockRecentChange
		);

		$this->assertSame(
			false, $data['recentChangesFlags']['wikifunctions-edit'],
			"Non-Wikifunctions RC entries should set the wikifunctions-edit flag to false"
		);
	}

	public function testOnEnhancedChangesListModifyBlockLineData_noPage() {
		$hooks = $this->newClientChangeHooks();

		$mockEnhancedChangesList = $this->newMockEnhancedChangesList();
		$mockRecentChange = $this->newWikifunctionsRecentChange( null, false );

		$data = [ 'recentChangesFlags' => [] ];

		// Should return early without error when rc has no page
		$hooks->onEnhancedChangesListModifyBlockLineData(
			$mockEnhancedChangesList, $data, $mockRecentChange
		);

		$this->assertArrayNotHasKey( 'timestampLink', $data );
	}

	public function testOnEnhancedChangesListModifyBlockLineData_badParams() {
		$hooks = $this->newClientChangeHooks();

		$mockEnhancedChangesList = $this->newMockEnhancedChangesList();
		$mockRecentChange = $this->newWikifunctionsRecentChange( 'not valid json{{{' );

		$data = [ 'recentChangesFlags' => [] ];

		// Should return early without error when rc_params can't be decoded
		$hooks->onEnhancedChangesListModifyBlockLineData(
			$mockEnhancedChangesList, $data, $mockRecentChange
		);

		$this->assertArrayNotHasKey( 'timestampLink', $data );
	}

	public function testOnEnhancedChangesListModifyBlockLineData_noTarget() {
		$hooks = $this->newClientChangeHooks();

		$mockEnhancedChangesList = $this->newMockEnhancedChangesList();
		$mockRecentChange = $this->newWikifunctionsRecentChange(
			'{"target":null,"newId":10}'
		);

		$data = [ 'recentChangesFlags' => [] ];

		// Should return early without error when target is missing/null
		$hooks->onEnhancedChangesListModifyBlockLineData(
			$mockEnhancedChangesList, $data, $mockRecentChange
		);

		$this->assertArrayNotHasKey( 'timestampLink', $data );
	}

	public function testOnEnhancedChangesListModifyBlockLineData_noNewId() {
		$hooks = $this->newClientChangeHooks();

		$mockEnhancedChangesList = $this->newMockEnhancedChangesList();
		$mockRecentChange = $this->newWikifunctionsRecentChange(
			'{"target":"Z801","newId":null}'
		);

		$data = [ 'recentChangesFlags' => [] ];

		// Should return early without error when newId is missing/null
		$hooks->onEnhancedChangesListModifyBlockLineData(
			$mockEnhancedChangesList, $data, $mockRecentChange
		);

		$this->assertArrayNotHasKey( 'timestampLink', $data );
	}

	// ─── onOldChangesListRecentChangesLine ─────────────────────

	public function testOnOldChangesListRecentChangesLine_nonWikifunctions() {
		$hooks = $this->newClientChangeHooks();

		$mockChangesList = $this->createMock( OldChangesList::class );
		$mockRecentChange = $this->newNonWikifunctionsRecentChange();

		$s = 'original';
		$classes = [];
		$attribs = [];

		$hooks->onOldChangesListRecentChangesLine(
			$mockChangesList, $s, $mockRecentChange, $classes, $attribs
		);

		$this->assertSame( 'original', $s, "Non-Wikifunctions entries should not be modified" );
	}

	public function testOnOldChangesListRecentChangesLine_noPage() {
		$hooks = $this->newClientChangeHooks();

		$mockChangesList = $this->createMock( OldChangesList::class );
		$mockRecentChange = $this->newWikifunctionsRecentChange( null, false );

		$s = 'original';
		$classes = [];
		$attribs = [];

		$hooks->onOldChangesListRecentChangesLine(
			$mockChangesList, $s, $mockRecentChange, $classes, $attribs
		);

		$this->assertSame( 'original', $s, "Entries with no page should not be modified" );
	}

	public function testOnOldChangesListRecentChangesLine_badParams() {
		$hooks = $this->newClientChangeHooks();

		$mockChangesList = $this->createMock( OldChangesList::class );
		// getContext() is called before the params check, so we need to stub it
		$mockChangesList->method( 'getContext' )->willReturn( RequestContext::getMain() );
		$mockRecentChange = $this->newWikifunctionsRecentChange( 'not valid json{{{' );

		$s = 'original';
		$classes = [];
		$attribs = [];

		$hooks->onOldChangesListRecentChangesLine(
			$mockChangesList, $s, $mockRecentChange, $classes, $attribs
		);

		$this->assertSame( 'original', $s, "Entries with bad params should not be modified" );
	}

	public function testOnOldChangesListRecentChangesLine_happyPath() {
		$hooks = $this->newClientChangeHooks();

		$mockChangesList = $this->createMock( OldChangesList::class );
		$mockChangesList->method( 'getContext' )->willReturn( RequestContext::getMain() );
		$mockChangesList->method( 'recentChangesFlags' )->willReturn( '' );
		$mockChangesList->method( 'getLanguage' )->willReturn(
			$this->getServiceContainer()->getLanguageFactory()->getLanguage( 'en' )
		);

		$mockRecentChange = $this->newWikifunctionsRecentChange();

		$s = '';
		$classes = [];
		$attribs = [];

		$hooks->onOldChangesListRecentChangesLine(
			$mockChangesList, $s, $mockRecentChange, $classes, $attribs
		);

		// The output should be an HTML span wrapping the full line
		$this->assertStringContainsString( 'mw-changeslist-line-inner', $s );
		// Should contain diff/hist links
		$this->assertStringContainsString( 'mw-changeslist-diff', $s );
		$this->assertStringContainsString( 'mw-changeslist-history', $s );
		// Should contain the function link
		$this->assertStringContainsString( 'mw-wikilambda-function', $s );
		// Should contain the timestamp
		$this->assertStringContainsString( 'mw-changeslist-date', $s );
	}

	// ─── onChangesListSpecialPageQuery ─────────────────────────

	public function testOnChangesListSpecialPageQuery_filtersWhenNotShowing() {
		// Default is WikiLambdaClientDefaultShowChanges = false, so changes should be filtered
		$hooks = $this->newClientChangeHooks();

		$tables = [];
		$fields = [];
		$conds = [];
		$query_options = [];
		$join_conds = [];
		$opts = new FormOptions();

		$hooks->onChangesListSpecialPageQuery(
			'RecentChanges', $tables, $fields, $conds, $query_options, $join_conds, $opts
		);

		$this->assertCount( 1, $conds, "Should add a condition to filter out Wikifunctions changes" );
	}

	public function testOnChangesListSpecialPageQuery_noFilterWhenShowing() {
		$this->overrideConfigValue( 'WikiLambdaClientDefaultShowChanges', true );
		$hooks = $this->newClientChangeHooks();

		$tables = [];
		$fields = [];
		$conds = [];
		$query_options = [];
		$join_conds = [];
		$opts = new FormOptions();

		$hooks->onChangesListSpecialPageQuery(
			'RecentChanges', $tables, $fields, $conds, $query_options, $join_conds, $opts
		);

		$this->assertCount( 0, $conds, "Should not add any conditions when showing Wikifunctions changes" );
	}

	// ─── onChangesListSpecialPageStructuredFilters ─────────────

	public function testOnChangesListSpecialPageStructuredFilters() {
		$hooks = $this->newClientChangeHooks();

		$mockFilterGroup = $this->createMock( ChangesListBooleanFilterGroup::class );
		$mockFilterGroup->method( 'getName' )->willReturn( 'changeType' );

		$mockSpecialPage = $this->createMock( ChangesListSpecialPage::class );
		$mockSpecialPage->method( 'getFilterGroup' )->with( 'changeType' )->willReturn( $mockFilterGroup );
		$mockSpecialPage->method( 'getUser' )->willReturn(
			$this->getServiceContainer()->getUserFactory()->newAnonymous()
		);
		$mockSpecialPage->method( 'getName' )->willReturn( 'RecentChanges' );

		// Should execute without error; the filter gets registered as a side effect
		$hooks->onChangesListSpecialPageStructuredFilters( $mockSpecialPage );

		// If we reach here, the filter was successfully created and registered
		$this->addToAssertionCount( 1 );
	}

	// ─── onGetPreferences ──────────────────────────────────────

	public function testOnGetPreferences() {
		$hooks = $this->newClientChangeHooks();

		$mockUser = $this->createMock( User::class );

		$prefs = [];

		$hooks->onGetPreferences(
			$mockUser,
			$prefs
		);

		$this->assertArrayHasKey( 'rcshowwikifunctions', $prefs );
		$this->assertArrayEquals(
			[
				'type' => 'toggle',
				'label-message' => 'wikilambda-recentchanges-filter-rc-pref',
				'section' => 'rc/advancedrc',
			],
			$prefs['rcshowwikifunctions']
		);

		$this->assertArrayHasKey( 'wlshowwikifunctions', $prefs );
		$this->assertArrayEquals(
			[
				'type' => 'toggle',
				'label-message' => 'wikilambda-recentchanges-filter-wl-pref',
				'section' => 'watchlist/advancedwatchlist',
			],
			$prefs['wlshowwikifunctions']
		);
	}

	public function testOnGetPreferences_clientModeDisabled() {
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );
		$hooks = $this->newClientChangeHooks();

		$mockUser = $this->createMock( User::class );
		$prefs = [];

		$hooks->onGetPreferences( $mockUser, $prefs );

		$this->assertArrayNotHasKey(
			'rcshowwikifunctions', $prefs,
			"No preferences should be registered when client mode is disabled"
		);
		$this->assertArrayNotHasKey(
			'wlshowwikifunctions', $prefs,
			"No preferences should be registered when client mode is disabled"
		);
	}

	// ─── isJobFromWikifunctions (static) ───────────────────────

	public function testIsJobFromWikifunctions_true() {
		$rc = $this->createMock( RecentChange::class );
		$rc->method( 'getAttribute' )->with( 'rc_source' )
			->willReturn( WikifunctionsRecentChangesInsertJob::SRC_WIKIFUNCTIONS );

		$this->assertTrue( ClientChangeHooks::isJobFromWikifunctions( $rc ) );
	}

	public function testIsJobFromWikifunctions_false() {
		$rc = $this->createMock( RecentChange::class );
		$rc->method( 'getAttribute' )->with( 'rc_source' )
			->willReturn( RecentChange::SRC_EDIT );

		$this->assertFalse( ClientChangeHooks::isJobFromWikifunctions( $rc ) );
	}
}
