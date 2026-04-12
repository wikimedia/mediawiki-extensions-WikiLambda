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
use MediaWiki\Extension\WikiLambda\WikifunctionsClientStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Title\Title;
use Wikimedia\Rdbms\SelectQueryBuilder;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsRecentChangesInsertJob
 *
 * @group Database
 */
class WikifunctionsRecentChangesInsertJobTest extends WikiLambdaClientIntegrationTestCase {

	private WikifunctionsClientStore $store;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();
		$this->store = WikiLambdaServices::getWikifunctionsClientStore();
	}

	/**
	 * Create a real wiki page and seed a usage row so the job has something to act on.
	 * Returns the Title for assertion use.
	 */
	private function seedPageWithUsage( string $pageName, string $functionZid ): Title {
		// Use Talk namespace so that repo mode doesn't try to parse the content as a ZObject.
		$title = Title::newFromText( $pageName, NS_TALK );
		$this->editPage( $title, 'Test content for RC job', 'seed page' );
		$this->store->insertWikifunctionsUsage( $functionZid, $title );
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
			'user' => 1,
			'bot' => false,
		], $overrides );
	}

	/**
	 * Query recentchanges for entries created by this job (rc_source = 'wf').
	 *
	 * @return array[] Rows as associative arrays
	 */
	private function fetchWfRecentChanges(): array {
		$dbr = $this->getServiceContainer()->getConnectionProvider()->getReplicaDatabase();
		$result = $dbr->newSelectQueryBuilder()
			->select( [ 'rc_source', 'rc_namespace', 'rc_title', 'rc_params', 'rc_bot' ] )
			->from( 'recentchanges' )
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
		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z99999',
		] ) );

		$this->assertTrue( $job->run() );
		$this->assertCount( 0, $this->fetchWfRecentChanges() );
	}

	public function testRun_earlyReturnForUnrecognisedAction() {
		$this->seedPageWithUsage( 'RCJobTestBadAction', 'Z10091' );

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z10091',
			'data' => [ 'action' => 'purge', 'type' => ZTypeRegistry::Z_FUNCTION ],
		] ) );

		$this->assertTrue( $job->run() );
		$this->assertCount( 0, $this->fetchWfRecentChanges() );
	}

	public function testRun_earlyReturnForDeleteOfUnknownType() {
		$this->seedPageWithUsage( 'RCJobTestDeleteUnknown', 'Z10092' );

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z10092',
			'data' => [ 'action' => 'delete', 'type' => 'Z999', 'target' => 'Z10092' ],
		] ) );

		$this->assertTrue( $job->run() );
		$this->assertCount( 0, $this->fetchWfRecentChanges() );
	}

	public function testRun_earlyReturnForEditOfUnknownType() {
		$this->seedPageWithUsage( 'RCJobTestEditUnknown', 'Z10093' );

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z10093',
			'data' => [
				'action' => 'edit',
				'type' => 'Z999',
				'operations' => [],
			],
		] ) );

		$this->assertTrue( $job->run() );
		$this->assertCount( 0, $this->fetchWfRecentChanges() );
	}

	// ------------------------------------------------------------------
	// RC-insertion paths: edit action
	// ------------------------------------------------------------------

	public function testRun_editFunctionConnectImplementations_createsRcEntry() {
		$title = $this->seedPageWithUsage( 'RCJobTestConnectImpl', 'Z10094' );

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
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
		] ) );

		$this->assertTrue( $job->run() );

		$rows = $this->fetchWfRecentChanges();
		$this->assertCount( 1, $rows );

		$rcParams = json_decode( $rows[0]->rc_params, true );
		$this->assertStringContainsString( 'connect', $rcParams['message'] );
		$this->assertStringContainsString( 'implementation', $rcParams['message'] );
	}

	public function testRun_editFunctionDisconnectTesters_createsRcEntry() {
		$this->seedPageWithUsage( 'RCJobTestDisconnectTesters', 'Z10097' );

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
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
		] ) );

		$this->assertTrue( $job->run() );

		$rows = $this->fetchWfRecentChanges();
		$this->assertCount( 1, $rows );

		$rcParams = json_decode( $rows[0]->rc_params, true );
		$this->assertStringContainsString( 'disconnect', $rcParams['message'] );
		$this->assertStringContainsString( 'tester', $rcParams['message'] );
	}

	public function testRun_editFunctionGenericPath_createsRcEntry() {
		$this->seedPageWithUsage( 'RCJobTestGenericEdit', 'Z10099' );

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z10099',
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_FUNCTION,
				'target' => 'Z10099',
				'operations' => [
					'Z8K1' => [ 'changed' => true ],
				],
			],
		] ) );

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

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z10100',
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_IMPLEMENTATION,
				'target' => 'Z10100',
				'operations' => [],
			],
		] ) );

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

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z10101',
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_TESTER,
				'target' => 'Z10101',
				'operations' => [],
			],
		] ) );

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

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z10102',
			'data' => [
				'action' => 'delete',
				'type' => ZTypeRegistry::Z_FUNCTION,
				'target' => 'Z10102',
			],
		] ) );

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

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z10103',
			'data' => [
				'action' => 'restore',
				'type' => ZTypeRegistry::Z_IMPLEMENTATION,
				'target' => 'Z10103',
			],
		] ) );

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

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z10104',
			'data' => [
				'action' => 'delete',
				'type' => ZTypeRegistry::Z_TESTER,
				'target' => 'Z10104',
			],
		] ) );

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

		$job = new WikifunctionsRecentChangesInsertJob( $this->buildParams( [
			'target' => 'Z10105',
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_IMPLEMENTATION,
				'target' => 'Z10105',
				'operations' => [],
			],
		] ) );

		$this->assertTrue( $job->run() );
		$this->assertCount( 2, $this->fetchWfRecentChanges() );
	}

	// ------------------------------------------------------------------
	// CentralIdLookup: null path (no central auth)
	// ------------------------------------------------------------------

	public function testRun_usesDirectUserIdWhenNoCentralLookup() {
		$this->seedPageWithUsage( 'RCJobTestNoCentral', 'Z10106' );

		// Use a real user's actor ID so RecentChange::save() can resolve it.
		$user = $this->getTestSysop()->getUser();
		$actorId = $user->getActorId();

		$params = $this->buildParams( [
			'target' => 'Z10106',
			'user' => $actorId,
			'data' => [
				'action' => 'edit',
				'type' => ZTypeRegistry::Z_FUNCTION,
				'target' => 'Z10106',
				'operations' => [
					'Z8K1' => [ 'changed' => true ],
				],
			],
		] );

		$job = new WikifunctionsRecentChangesInsertJob( $params );
		TestingAccessWrapper::newFromObject( $job )->centralIdLookup = null;

		$this->assertTrue( $job->run() );
		$this->assertCount( 1, $this->fetchWfRecentChanges() );
	}
}
