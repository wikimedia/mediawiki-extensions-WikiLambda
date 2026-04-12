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
}
