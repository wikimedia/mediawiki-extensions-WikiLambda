<?php

/**
 * WikiLambda integration test suite for WikifunctionsClientUsageUpdateJob.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Jobs;

use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientUsageUpdateJob;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaClientIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientUsageUpdateJob
 *
 * @group Database
 */
class WikifunctionsClientUsageUpdateJobTest extends WikiLambdaClientIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsClientMode();
	}

	/**
	 * @param int $pageId
	 * @param int $revId
	 * @param string[] $functions
	 * @return WikifunctionsClientUsageUpdateJob
	 */
	private function buildJob( int $pageId, int $revId, array $functions ): WikifunctionsClientUsageUpdateJob {
		return new WikifunctionsClientUsageUpdateJob( [
			'pageId' => $pageId,
			'revId' => $revId,
			'functions' => $functions,
		] );
	}

	public function testRun_recordsUsageForExistingPage() {
		// A wikitext namespace is needed for a real page here, as NS_MAIN is the ZObject
		// content model under repo mode. The null-namespace-text (main namespace) case is
		// covered by WikifunctionsUsageStoreTest.
		$page = $this->getExistingTestPage( 'Help:Shared usage target' );

		$job = $this->buildJob( $page->getId(), $page->getLatest(), [ 'Z10080' ] );
		$this->assertTrue( $job->run() );

		$usage = WikiLambdaServices::getWikifunctionsUsageStore()->fetchUsage( 'Z10080' );
		$this->assertCount( 1, $usage );
		$this->assertSame( $page->getId(), $usage[0]['pageId'] );
		$this->assertSame( NS_HELP, $usage[0]['namespaceId'] );
		$this->assertSame( 'Help', $usage[0]['namespaceText'] );
		$this->assertSame( $page->getTitle()->getDBkey(), $usage[0]['title'] );
	}

	public function testRun_recordsEveryFunctionOnThePage() {
		$page = $this->getExistingTestPage( 'Template:Shared usage tpl' );

		$job = $this->buildJob( $page->getId(), $page->getLatest(), [ 'Z10081', 'Z10082' ] );
		$this->assertTrue( $job->run() );

		$store = WikiLambdaServices::getWikifunctionsUsageStore();
		$this->assertCount( 1, $store->fetchUsage( 'Z10081' ) );
		$this->assertCount( 1, $store->fetchUsage( 'Z10082' ) );
		$this->assertSame( 'Template', $store->fetchUsage( 'Z10081' )[0]['namespaceText'] );
	}

	public function testRun_dropsTheFunctionsThatThePageNoLongerUses() {
		// The snapshot is the whole point: a later revision that keeps one Function and
		// drops another must leave exactly one row behind.
		$page = $this->getExistingTestPage( 'Help:Shared usage narrowed' );
		$store = WikiLambdaServices::getWikifunctionsUsageStore();

		$this->assertTrue(
			$this->buildJob( $page->getId(), $page->getLatest(), [ 'Z10083', 'Z10084' ] )->run()
		);
		$this->assertTrue(
			$this->buildJob( $page->getId(), $page->getLatest(), [ 'Z10083' ] )->run()
		);

		$this->assertCount( 1, $store->fetchUsage( 'Z10083' ), 'The Function still in use is kept' );
		$this->assertSame( [], $store->fetchUsage( 'Z10084' ), 'The Function that went away is dropped' );
	}

	public function testRun_dropsEveryRowForAnEmptySet() {
		$page = $this->getExistingTestPage( 'Help:Shared usage cleared' );
		$store = WikiLambdaServices::getWikifunctionsUsageStore();

		$this->assertTrue(
			$this->buildJob( $page->getId(), $page->getLatest(), [ 'Z10085' ] )->run()
		);
		$this->assertTrue(
			$this->buildJob( $page->getId(), $page->getLatest(), [] )->run()
		);

		$this->assertSame( [], $store->fetchUsage( 'Z10085' ) );
	}

	public function testRun_skipsAJobForAnOlderRevision() {
		// (T433542) Two edits in quick succession: the job from the first can arrive after
		// the second has been saved. Applying it would put back the Function that the
		// second edit removed, so it must do nothing.
		$page = $this->getExistingTestPage( 'Help:Shared usage raced' );
		$staleRevId = $page->getLatest();

		$this->editPage( $page, 'Second revision, no Function calls' );
		$currentRevId = $this->getServiceContainer()->getPageStore()
			->getPageById( $page->getId() )->getLatest();
		$this->assertNotSame( $staleRevId, $currentRevId, 'The test needs a second revision' );

		$job = $this->buildJob( $page->getId(), $staleRevId, [ 'Z10086' ] );
		$this->assertTrue( $job->run(), 'A stale job must succeed, and must not be retried' );

		$this->assertSame(
			[],
			WikiLambdaServices::getWikifunctionsUsageStore()->fetchUsage( 'Z10086' ),
			'A job for a superseded revision must not write anything'
		);
	}

	public function testRun_skipsUsageForNonexistentPage() {
		// A page can be deleted between the render and the job; onPageDeleteComplete has
		// already dropped its rows by then.
		$job = $this->buildJob( 123456789, 1, [ 'Z10087' ] );
		$this->assertTrue( $job->run() );

		$this->assertSame(
			[],
			WikiLambdaServices::getWikifunctionsUsageStore()->fetchUsage( 'Z10087' ),
			'A page that is not there must not create a usage row'
		);
	}

	public function testRun_ignoresAJobQueuedByThePreviousVersion() {
		// Jobs queued before the deploy name one Function and say nothing about the
		// revision they came from, so they cannot be told apart from a stale one.
		$page = $this->getExistingTestPage( 'Help:Shared usage legacy job' );

		$job = new WikifunctionsClientUsageUpdateJob( [
			'targetFunction' => 'Z10088',
			'targetPageText' => $page->getTitle()->getDBkey(),
			'targetPageNamespace' => NS_HELP,
		] );

		$this->assertTrue( $job->run() );
		$this->assertSame( [], WikiLambdaServices::getWikifunctionsUsageStore()->fetchUsage( 'Z10088' ) );
	}

	/**
	 * @dataProvider provideTargetsThatAreNotZids
	 */
	public function testRun_skipsATargetThatIsNotAZid( $target ) {
		// (T434194) The parameters come from a render of arbitrary wikitext, so a target
		// that is not a reference must be discarded rather than fail the job for ever.
		$page = $this->getExistingTestPage( 'Help:Target that is not a ZID' );

		$job = $this->buildJob( $page->getId(), $page->getLatest(), [ $target ] );
		$this->assertTrue( $job->run(), 'The job must succeed, and must not throw' );

		$this->assertSame(
			0,
			$this->newSelectQueryBuilder()
				->from( 'wikifunctions_usage' )
				->caller( __METHOD__ )
				->fetchRowCount(),
			'A target that is not a ZID must not reach the shared usage table'
		);
	}

	public static function provideTargetsThatAreNotZids() {
		return [
			'a Function name rather than its ZID' => [ 'join' ],
			'the placeholder ZID of an unsaved Function' => [ 'Z0' ],
			'a lowercase reference' => [ 'z802' ],
			'an empty target' => [ '' ],
		];
	}

	public function testRun_earlyReturnWhenClientModeDisabled() {
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );
		$page = $this->getExistingTestPage( 'Help:Client mode off' );

		$job = $this->buildJob( $page->getId(), $page->getLatest(), [ 'Z10089' ] );

		$this->assertTrue( $job->run(), 'Job should return true (silently skip) when client mode is off' );
		$this->assertSame(
			[],
			WikiLambdaServices::getWikifunctionsUsageStore()->fetchUsage( 'Z10089' ),
			'No usage row should be recorded when client mode is disabled'
		);
	}
}
