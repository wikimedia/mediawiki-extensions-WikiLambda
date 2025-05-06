<?php

/**
 * WikiLambda integration test suite for 'client-mode' RecentChanges-related hooks
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Context\IContextSource;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\HookHandler\ClientChangeHooks;
use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsRecentChangesInsertJob;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaClientIntegrationTestCase;
use MediaWiki\Page\PageReferenceValue;
use MediaWiki\RecentChanges\EnhancedChangesList;
use MediaWiki\RecentChanges\RecentChange;
use MediaWiki\User\User;

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

	public function testOnEnhancedChangesListModifyLineData() {
		$hooks = $this->newClientChangeHooks();

		$mockContext = $this->createMock( IContextSource::class );
		$mockContext->method( 'getUser' )->willReturn(
			$this->getServiceContainer()->getUserFactory()->newAnonymous()
		);

		$mockEnhancedChangesList = $this->createMock( EnhancedChangesList::class );
		$mockEnhancedChangesList->method( 'getContext' )->willReturn( RequestContext::getMain() );
		$mockEnhancedChangesList->method( 'recentChangesFlags' )->willReturn( [] );
		$mockEnhancedChangesList->method( 'getLanguage' )->willReturn(
			$this->getServiceContainer()->getLanguageFactory()->getLanguage( 'en' )
		);

		$mockRecentChange = $this->createMock( RecentChange::class );
		$mockRecentChange->method( 'getPage' )->willReturn(
			PageReferenceValue::localReference( NS_MAIN, "Test title" )
		);
		$mockRecentChange->method( 'getAttribute' )->willReturnMap( [
			[ 'rc_id', 1 ],
			[ 'rc_source', WikifunctionsRecentChangesInsertJob::SRC_WIKIFUNCTIONS ],
			[ 'rc_params', '{"target":"Z801","newId":10,"oldId":9,"message": "foo"}' ],
			[ 'rc_type', 'edit' ],
			[ 'rc_bot', false ],
			[ 'rc_minor', true ],

			[ 'rc_user_text', 'TestUser' ],
			[ 'rc_timestamp', '2023-10-01T00:00:00Z' ],
			[ 'rc_comment', 'Test comment' ],
			[ 'rc_title', 'Test title' ],
			[ 'rc_namespace', 0 ],
			[ 'rc_user_id', 1 ],
			[ 'rc_user_text', 'TestUser' ],
		] );

		$data = [ 'recentChangesFlags' => [ 'foo' => 'bar' ] ];

		$block = [];

		$classes = [];

		$attribs = [];

		$hooks->onEnhancedChangesListModifyLineData(
			$mockEnhancedChangesList,
			$data,
			$block,
			$mockRecentChange,
			$classes,
			$attribs
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

	// TODO: onOldChangesListRecentChangesLine
	// TODO: onChangesListSpecialPageQuery
	// TODO: onChangesListSpecialPageStructuredFilters
}
