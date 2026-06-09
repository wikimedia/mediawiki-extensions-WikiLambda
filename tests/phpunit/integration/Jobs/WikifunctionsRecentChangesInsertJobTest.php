<?php

/**
 * WikiLambda integration test suite for WikifunctionsRecentChangesInsertJob.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Jobs;

use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsRecentChangesInsertJob;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaClientIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\WikifunctionsUsageStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Site\Site;
use MediaWiki\Site\SiteLookup;
use MediaWiki\Title\Title;
use MediaWiki\User\CentralId\CentralIdLookup;
use MediaWiki\WikiMap\WikiMap;
use Wikimedia\Rdbms\SelectQueryBuilder;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsRecentChangesInsertJob
 * @covers \MediaWiki\Extension\WikiLambda\WikifunctionsUsageStore
 *
 * @group Database
 */
class WikifunctionsRecentChangesInsertJobTest extends WikiLambdaClientIntegrationTestCase {

	private WikifunctionsUsageStore $usageStore;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();
		$this->usageStore = WikiLambdaServices::getWikifunctionsUsageStore();
	}

	/**
	 * Create a real wiki page and seed a shared (x1) usage row so the job has something to
	 * act on. The page must really exist, as the job resolves each usage row's page ID back
	 * to a Title. Returns the Title for assertion use.
	 */
	private function seedPageWithUsage( string $pageName, string $functionZid ): Title {
		// Use Talk namespace so that repo mode doesn't try to parse the content as a ZObject.
		$title = Title::newFromText( $pageName, NS_TALK );
		$this->editPage( $title, 'Test content for RC job', 'seed page' );
		// Resolve the page ID via a fresh WikiPage rather than the Title object, whose
		// article-ID cache can predate the edit.
		$pageId = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $title )->getId();
		$this->usageStore->insertUsage(
			$functionZid,
			WikiMap::getCurrentWikiId(),
			$pageId,
			$title->getNamespace(),
			$title->getNsText() ?: null,
			$title->getDBkey()
		);
		return $title;
	}

	private function buildParams( array $overrides = [] ): array {
		return array_merge( [
			'target' => 'Z10090',
			'timestamp' => '20260412120000',
			'summary' => 'Test edit on repo',
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_FUNCTION,
				'target' => 'Z10090',
				'operations' => [
					ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS => [
						'add' => [ 'Z10091' ],
					],
				],
			],
			'centralUserId' => 1,
			'bot' => false,
		], $overrides );
	}

	/**
	 * Build a job whose (mocked) CentralIdLookup resolves the central id to a real local user,
	 * standing in for the production CentralAuth path where the repo editor has a local account.
	 */
	private function makeJobWithLocalPerformer( array $overrides = [] ): WikifunctionsRecentChangesInsertJob {
		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( $overrides ) );
		$mock = $this->createMock( CentralIdLookup::class );
		$mock->method( 'localUserFromCentralId' )
			->willReturn( $this->getTestSysop()->getUserIdentity() );
		TestingAccessWrapper::newFromObject( $job )->centralIdLookup = $mock;
		return $job;
	}

	/**
	 * Query recentchanges for entries created by this job (rc_source = 'wf').
	 *
	 * @return array[] Rows as associative arrays
	 */
	private function fetchWfRecentChanges(): array {
		$dbr = $this->getServiceContainer()->getConnectionProvider()->getReplicaDatabase();
		$result = $dbr->newSelectQueryBuilder()
			// The performer is stored via rc_actor (the recentchanges table has no rc_user/rc_user_text
			// columns since the actor migration), so join the actor table to read it back.
			->select( [ 'rc_source', 'rc_namespace', 'rc_title', 'rc_params', 'rc_bot', 'actor_user', 'actor_name' ] )
			->from( 'recentchanges' )
			->join( 'actor', null, 'actor_id = rc_actor' )
			->where( [ 'rc_source' => WikifunctionsRecentChangesInsertJob::SRC_WIKIFUNCTIONS ] )
			->orderBy( 'rc_id', SelectQueryBuilder::SORT_DESC )
			->caller( __METHOD__ )
			->fetchResultSet();
		$rows = [];
		foreach ( $result as $row ) {
			$rows[] = $row;
		}
		return $rows;
	}

	// ------------------------------------------------------------------
	// Early-exit paths
	// ------------------------------------------------------------------

	public function testRun_earlyReturnWhenNoPagesUseFunction() {
		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z99999',
		] );

		$this->assertTrue( $job->run() );
		$this->assertCount( 0, $this->fetchWfRecentChanges() );
	}

	public function testRun_earlyReturnForUnrecognisedAction() {
		$this->seedPageWithUsage( 'RCJobTestBadAction', 'Z10091' );

		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z10091',
			'data' => [ 'action' => 'purge', 'type' => ZTypeRegistry::Z_FUNCTION ],
		] );

		$this->assertTrue( $job->run() );
		$this->assertCount( 0, $this->fetchWfRecentChanges() );
	}

	public function testRun_earlyReturnForDeleteOfUnknownType() {
		$this->seedPageWithUsage( 'RCJobTestDeleteUnknown', 'Z10092' );

		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z10092',
			'data' => [ 'action' => 'delete', 'type' => 'Z999', 'target' => 'Z10092' ],
		] );

		$this->assertTrue( $job->run() );
		$this->assertCount( 0, $this->fetchWfRecentChanges() );
	}

	public function testRun_earlyReturnForEditOfUnknownType() {
		$this->seedPageWithUsage( 'RCJobTestEditUnknown', 'Z10093' );

		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z10093',
			'data' => [
				'action' => 'edit',
				'type' => 'Z999',
				'operations' => [],
			],
		] );

		$this->assertTrue( $job->run() );
		$this->assertCount( 0, $this->fetchWfRecentChanges() );
	}

	// ------------------------------------------------------------------
	// RC-insertion paths: edit action
	// ------------------------------------------------------------------

	public function testRun_editFunctionConnectImplementations_createsRcEntry() {
		$title = $this->seedPageWithUsage( 'RCJobTestConnectImpl', 'Z10094' );

		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z10094',
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_FUNCTION,
				'target' => 'Z10094',
				'operations' => [
					ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS => [
						'add' => [ 'Z10095', 'Z10096' ],
					],
				],
			],
		] );

		$this->assertTrue( $job->run() );

		$rows = $this->fetchWfRecentChanges();
		$this->assertCount( 1, $rows );

		$rcParams = json_decode( $rows[0]->rc_params, true );
		$this->assertStringContainsString( 'connect', $rcParams['message'] );
		$this->assertStringContainsString( 'implementation', $rcParams['message'] );
	}

	public function testRun_editFunctionDisconnectTesters_createsRcEntry() {
		$this->seedPageWithUsage( 'RCJobTestDisconnectTesters', 'Z10097' );

		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z10097',
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_FUNCTION,
				'target' => 'Z10097',
				'operations' => [
					ZTypeRegistry::Z_FUNCTION_TESTERS => [
						'remove' => [ 'Z10098' ],
					],
				],
			],
		] );

		$this->assertTrue( $job->run() );

		$rows = $this->fetchWfRecentChanges();
		$this->assertCount( 1, $rows );

		$rcParams = json_decode( $rows[0]->rc_params, true );
		$this->assertStringContainsString( 'disconnect', $rcParams['message'] );
		$this->assertStringContainsString( 'tester', $rcParams['message'] );
	}

	public function testRun_editFunctionGenericPath_createsRcEntry() {
		$this->seedPageWithUsage( 'RCJobTestGenericEdit', 'Z10099' );

		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z10099',
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_FUNCTION,
				'target' => 'Z10099',
				'operations' => [
					'Z8K1' => [ 'changed' => true ],
				],
			],
		] );

		$this->assertTrue( $job->run() );

		$rows = $this->fetchWfRecentChanges();
		$this->assertCount( 1, $rows );

		$rcParams = json_decode( $rows[0]->rc_params, true );
		$this->assertSame(
			'wikilambda-recentchanges-explanation-edit-function',
			$rcParams['message']
		);
	}

	public function testRun_editImplementation_createsRcEntry() {
		$this->seedPageWithUsage( 'RCJobTestEditImpl', 'Z10100' );

		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z10100',
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_IMPLEMENTATION,
				'target' => 'Z10100',
				'operations' => [],
			],
		] );

		$this->assertTrue( $job->run() );

		$rows = $this->fetchWfRecentChanges();
		$this->assertCount( 1, $rows );

		$rcParams = json_decode( $rows[0]->rc_params, true );
		$this->assertSame(
			'wikilambda-recentchanges-explanation-edit-implementation',
			$rcParams['message']
		);
	}

	public function testRun_editTester_createsRcEntry() {
		$this->seedPageWithUsage( 'RCJobTestEditTester', 'Z10101' );

		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z10101',
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_TESTER,
				'target' => 'Z10101',
				'operations' => [],
			],
		] );

		$this->assertTrue( $job->run() );

		$rows = $this->fetchWfRecentChanges();
		$this->assertCount( 1, $rows );

		$rcParams = json_decode( $rows[0]->rc_params, true );
		$this->assertSame(
			'wikilambda-recentchanges-explanation-edit-tester',
			$rcParams['message']
		);
	}

	// ------------------------------------------------------------------
	// RC-insertion paths: delete/restore actions
	// ------------------------------------------------------------------

	public function testRun_deleteFunction_createsRcEntry() {
		$this->seedPageWithUsage( 'RCJobTestDeleteFunc', 'Z10102' );

		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z10102',
			'data' => [
				'action' => 'delete',
				'type' => ZTypeRegistry::Z_FUNCTION,
				'target' => 'Z10102',
			],
		] );

		$this->assertTrue( $job->run() );

		$rows = $this->fetchWfRecentChanges();
		$this->assertCount( 1, $rows );

		$rcParams = json_decode( $rows[0]->rc_params, true );
		$this->assertSame(
			'wikilambda-recentchanges-explanation-delete-function',
			$rcParams['message']
		);
	}

	public function testRun_restoreImplementation_createsRcEntry() {
		$this->seedPageWithUsage( 'RCJobTestRestoreImpl', 'Z10103' );

		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z10103',
			'data' => [
				'action' => 'restore',
				'type' => ZTypeRegistry::Z_IMPLEMENTATION,
				'target' => 'Z10103',
			],
		] );

		$this->assertTrue( $job->run() );

		$rows = $this->fetchWfRecentChanges();
		$this->assertCount( 1, $rows );

		$rcParams = json_decode( $rows[0]->rc_params, true );
		$this->assertSame(
			'wikilambda-recentchanges-explanation-restore-implementation',
			$rcParams['message']
		);
	}

	public function testRun_deleteTester_createsRcEntry() {
		$this->seedPageWithUsage( 'RCJobTestDeleteTester', 'Z10104' );

		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z10104',
			'data' => [
				'action' => 'delete',
				'type' => ZTypeRegistry::Z_TESTER,
				'target' => 'Z10104',
			],
		] );

		$this->assertTrue( $job->run() );

		$rows = $this->fetchWfRecentChanges();
		$this->assertCount( 1, $rows );

		$rcParams = json_decode( $rows[0]->rc_params, true );
		$this->assertSame(
			'wikilambda-recentchanges-explanation-delete-tester',
			$rcParams['message']
		);
	}

	// ------------------------------------------------------------------
	// Multiple pages
	// ------------------------------------------------------------------

	public function testRun_createsRcEntryForEachPageUsingFunction() {
		$this->seedPageWithUsage( 'RCJobTestMultiA', 'Z10105' );
		$this->seedPageWithUsage( 'RCJobTestMultiB', 'Z10105' );

		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z10105',
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_IMPLEMENTATION,
				'target' => 'Z10105',
				'operations' => [],
			],
		] );

		$this->assertTrue( $job->run() );
		$this->assertCount( 2, $this->fetchWfRecentChanges() );
	}

	// ------------------------------------------------------------------
	// Performer attribution via CentralAuth
	// ------------------------------------------------------------------

	public function testRun_attributesLocalUserViaCentralId() {
		$this->seedPageWithUsage( 'RCJobTestLocalUser', 'Z10106' );
		$user = $this->getTestSysop()->getUserIdentity();

		$job = $this->makeJobWithLocalPerformer( [
			'target' => 'Z10106',
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_FUNCTION,
				'target' => 'Z10106',
				'operations' => [
					'Z8K1' => [ 'changed' => true ],
				],
			],
		] );

		$this->assertTrue( $job->run() );

		$rows = $this->fetchWfRecentChanges();
		$this->assertCount( 1, $rows );
		$this->assertSame( $user->getId(), (int)$rows[0]->actor_user );
		$this->assertSame( $user->getName(), $rows[0]->actor_name );
	}

	public function testRun_skipsWhenNoCentralUserId() {
		$this->seedPageWithUsage( 'RCJobTestNoCentralId', 'Z10107' );

		// No central id for the performer (e.g. an unattached or anonymous repo user).
		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z10107',
			'centralUserId' => 0,
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_FUNCTION,
				'target' => 'Z10107',
				'operations' => [
					'Z8K1' => [ 'changed' => true ],
				],
			],
		] ) );

		$this->assertTrue( $job->run() );
		$this->assertCount( 0, $this->fetchWfRecentChanges() );
	}

	public function testRun_skipsWhenCentralAuthHasNoName() {
		$this->seedPageWithUsage( 'RCJobTestNoName', 'Z10108' );

		// CentralAuth knows a central id but returns neither a local user nor a global name.
		$mock = $this->createMock( CentralIdLookup::class );
		$mock->method( 'localUserFromCentralId' )->willReturn( null );
		$mock->method( 'nameFromCentralId' )->willReturn( null );

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z10108',
			'centralUserId' => 42,
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_FUNCTION,
				'target' => 'Z10108',
				'operations' => [
					'Z8K1' => [ 'changed' => true ],
				],
			],
		] ) );
		TestingAccessWrapper::newFromObject( $job )->centralIdLookup = $mock;

		$this->assertTrue( $job->run() );
		$this->assertCount( 0, $this->fetchWfRecentChanges() );
	}

	public function testRun_attributesUnattachedRepoUserAsInterwiki() {
		$this->seedPageWithUsage( 'RCJobTestInterwiki', 'Z10109' );

		// Repo user with a global name but no local account: attribute as an interwiki user.
		$mock = $this->createMock( CentralIdLookup::class );
		$mock->method( 'localUserFromCentralId' )->willReturn( null );
		$mock->method( 'nameFromCentralId' )->willReturn( 'RepoOnlyUser' );

		// Configure the repo site so getExternalUserNames() can resolve an interwiki prefix.
		$this->overrideConfigValue( 'WikiLambdaClientRepoSiteId', 'wikifunctionswiki' );
		$repoSite = new Site();
		$repoSite->setGlobalId( 'wikifunctionswiki' );
		$repoSite->addInterwikiId( 'wikifunctions' );
		$siteLookup = $this->createMock( SiteLookup::class );
		$siteLookup->method( 'getSite' )->with( 'wikifunctionswiki' )->willReturn( $repoSite );
		$this->setService( 'SiteLookup', $siteLookup );

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z10109',
			'centralUserId' => 42,
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_FUNCTION,
				'target' => 'Z10109',
				'operations' => [
					'Z8K1' => [ 'changed' => true ],
				],
			],
		] ) );
		TestingAccessWrapper::newFromObject( $job )->centralIdLookup = $mock;

		$this->assertTrue( $job->run() );

		$rows = $this->fetchWfRecentChanges();
		$this->assertCount( 1, $rows );
		// An external (interwiki) actor has no local user id.
		$this->assertSame( 0, (int)$rows[0]->actor_user );
		$this->assertSame( 'wikifunctions>RepoOnlyUser', $rows[0]->actor_name );
	}
}
