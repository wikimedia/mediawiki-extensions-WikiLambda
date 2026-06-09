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

	public function testRun_recordsUsageForExistingPage() {
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

	public function testRun_recordsNamespaceTextForNamespacedPage() {
		$page = $this->getExistingTestPage( 'Template:Shared usage tpl' );

		$job = $this->buildJob( 'Z10081', $page->getTitle()->getDBkey(), NS_TEMPLATE );
		$this->assertTrue( $job->run() );

		$usage = WikiLambdaServices::getWikifunctionsUsageStore()->fetchUsage( 'Z10081' );
		$this->assertCount( 1, $usage );
		$this->assertSame( NS_TEMPLATE, $usage[0]['namespaceId'] );
		$this->assertSame( 'Template', $usage[0]['namespaceText'] );
	}

	public function testRun_skipsUsageForNonexistentPage() {
		// No page is created, so Title::getId() is 0 and the write is skipped: this is how a
		// render of a not-yet-saved page (e.g. a preview) avoids polluting the cross-wiki table.
		$job = $this->buildJob( 'Z10082', 'No such page here', NS_MAIN );
		$this->assertTrue( $job->run() );

		$this->assertSame(
			[],
			WikiLambdaServices::getWikifunctionsUsageStore()->fetchUsage( 'Z10082' ),
			'A non-existent page must not create a usage row'
		);
	}

	public function testRun_earlyReturnWhenClientModeDisabled() {
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', false );
		$page = $this->getExistingTestPage( 'Help:Client mode off' );

		$job = $this->buildJob( 'Z10083', $page->getTitle()->getDBkey(), NS_HELP );

		$this->assertTrue( $job->run(), 'Job should return true (silently skip) when client mode is off' );
		$this->assertSame(
			[],
			WikiLambdaServices::getWikifunctionsUsageStore()->fetchUsage( 'Z10083' ),
			'No usage row should be recorded when client mode is disabled'
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
