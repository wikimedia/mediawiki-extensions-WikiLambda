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

	private function buildJob(
		string $targetFunction,
		string $targetPageText,
		int $targetPageNamespace = NS_MAIN
	): WikifunctionsClientUsageUpdateJob {
		return new WikifunctionsClientUsageUpdateJob( [
			'targetFunction' => $targetFunction,
			'targetPageText' => $targetPageText,
			'targetPageNamespace' => $targetPageNamespace,
		] );
	}

	public function testRun_insertsUsageRow() {
		$job = $this->buildJob( 'Z10070', 'TestUsageJobPage' );

		$result = $job->run();

		$this->assertTrue( $result );
		$this->assertSame(
			[ 'TestUsageJobPage' ],
			WikiLambdaServices::getWikifunctionsClientStore()->fetchWikifunctionsUsage( 'Z10070' )
		);
	}

	public function testRun_handlesNamespacedTitle() {
		$job = $this->buildJob( 'Z10071', 'Namespaced target', NS_TEMPLATE );

		$result = $job->run();

		$this->assertTrue( $result );
		$pages = WikiLambdaServices::getWikifunctionsClientStore()->fetchWikifunctionsUsage( 'Z10071' );
		$this->assertCount( 1, $pages );
		$this->assertSame( 'Template:Namespaced target', $pages[0] );
	}

	public function testRun_duplicateInsertStillReturnsTrue() {
		$job = $this->buildJob( 'Z10072', 'TestDuplicatePage' );

		$job->run();
		$result = $job->run();

		$this->assertTrue( $result, 'Job should return true even when the row already exists' );
		$this->assertSame(
			[ 'TestDuplicatePage' ],
			WikiLambdaServices::getWikifunctionsClientStore()->fetchWikifunctionsUsage( 'Z10072' )
		);
	}

	public function testRun_earlyReturnWhenClientModeDisabled() {
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );

		$job = $this->buildJob( 'Z10073', 'TestNoClientModePage' );

		$result = $job->run();

		$this->assertTrue( $result, 'Job should return true (silently skip) when client mode is off' );
		$this->assertSame(
			[],
			WikiLambdaServices::getWikifunctionsClientStore()->fetchWikifunctionsUsage( 'Z10073' ),
			'No usage row should be inserted when client mode is disabled'
		);
	}

	// ------------------------------------------------------------------
	// Dual-write to the shared cross-wiki usage table on x1 (T390557)
	// ------------------------------------------------------------------

	public function testRun_dualWritesToSharedUsageTableForExistingPage() {
		// A wikitext namespace is needed for a real page here, as NS_MAIN is the ZObject
		// content model under repo mode. The null-namespace-text (main namespace) case is
		// covered by WikifunctionsUsageStoreTest.
		$page = $this->getExistingTestPage( 'Help:Shared usage target' );

		$job = $this->buildJob( 'Z10080', $page->getTitle()->getDBkey(), NS_HELP );
		$this->assertTrue( $job->run() );

		$usage = WikiLambdaServices::getWikifunctionsUsageStore()->fetchUsage( 'Z10080' );
		$this->assertCount( 1, $usage );
		$this->assertSame( $page->getId(), $usage[0]['pageId'] );
		$this->assertSame( NS_HELP, $usage[0]['namespaceId'] );
		$this->assertSame( 'Help', $usage[0]['namespaceText'] );
		$this->assertSame( $page->getTitle()->getDBkey(), $usage[0]['title'] );
	}

	public function testRun_dualWriteRecordsNamespaceTextForNamespacedPage() {
		$page = $this->getExistingTestPage( 'Template:Shared usage tpl' );

		$job = $this->buildJob( 'Z10081', $page->getTitle()->getDBkey(), NS_TEMPLATE );
		$this->assertTrue( $job->run() );

		$usage = WikiLambdaServices::getWikifunctionsUsageStore()->fetchUsage( 'Z10081' );
		$this->assertCount( 1, $usage );
		$this->assertSame( NS_TEMPLATE, $usage[0]['namespaceId'] );
		$this->assertSame( 'Template', $usage[0]['namespaceText'] );
	}

	public function testRun_skipsSharedUsageForNonexistentPage() {
		// No page is created, so Title::getId() is 0 and the shared (x1) write is skipped:
		// this is how a render of a not-yet-saved page (e.g. a preview) avoids polluting
		// the cross-wiki table. The legacy local table still records it, unchanged.
		$job = $this->buildJob( 'Z10082', 'No such page here', NS_MAIN );
		$this->assertTrue( $job->run() );

		$this->assertSame(
			[],
			WikiLambdaServices::getWikifunctionsUsageStore()->fetchUsage( 'Z10082' ),
			'A non-existent page must not create a shared-usage row'
		);
		$this->assertSame(
			[ 'No such page here' ],
			WikiLambdaServices::getWikifunctionsClientStore()->fetchWikifunctionsUsage( 'Z10082' )
		);
	}

	// ------------------------------------------------------------------
	// Targets that are not Function ZIDs (T434194)
	// ------------------------------------------------------------------

	/**
	 * @dataProvider provideTargetsThatAreNotZids
	 */
	public function testRun_skipsUsageForTargetThatIsNotAZid( string $target ) {
		// The shared table keys on the numeric part of the ZID, so a target that is not a
		// reference has nothing to record. Discard the job rather than let it throw: the
		// target comes straight from wikitext, so any editor can otherwise fail the job.
		$page = $this->getExistingTestPage( 'Help:Target that is not a ZID' );

		$job = $this->buildJob( $target, $page->getTitle()->getDBkey(), NS_HELP );

		$this->assertTrue( $job->run(), 'The job must succeed, and must not throw' );

		$this->assertSame(
			[],
			WikiLambdaServices::getWikifunctionsClientStore()->fetchWikifunctionsUsage( $target ),
			'A target that is not a ZID must not reach the local usage table'
		);
		// fetchUsage() would itself reject the target, so count the rows directly.
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
}
