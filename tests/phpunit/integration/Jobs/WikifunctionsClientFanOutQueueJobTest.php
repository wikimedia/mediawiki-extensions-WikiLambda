<?php

/**
 * WikiLambda integration test suite for WikifunctionsClientFanOutQueueJob.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Jobs;

use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientFanOutQueueJob;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\JobQueue\JobQueueGroupFactory;
use MediaWiki\JobQueue\JobSpecification;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientFanOutQueueJob
 *
 * @group Database
 */
class WikifunctionsClientFanOutQueueJobTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	private function buildParams(): array {
		return [
			'target' => 'Z10080',
			'timestamp' => '20260412120000',
			'summary' => 'Test edit summary',
			'data' => [ 'action' => 'edit', 'type' => 'Z8', 'target' => 'Z10080' ],
			'user' => 42,
			'bot' => false,
			'revision' => 999,
		];
	}

	public function testConstruction_extractsParamsWithoutError() {
		$job = new WikifunctionsClientFanOutQueueJob( $this->buildParams() );

		$this->assertInstanceOf( WikifunctionsClientFanOutQueueJob::class, $job );
	}

	public function testRun_returnsTrue() {
		$this->overrideConfigValue( 'WikiLambdaClientWikis', [] );

		$job = new WikifunctionsClientFanOutQueueJob( $this->buildParams() );
		$this->assertTrue( $job->run() );
	}

	public function testRun_dispatchesJobToEachClientWiki() {
		$this->overrideConfigValue( 'WikiLambdaClientWikis', [ 'enwiki', 'dewiki' ] );

		$params = $this->buildParams();
		$job = new WikifunctionsClientFanOutQueueJob( $params );

		$dispatched = [];

		$mockQueueGroup = $this->createMock( JobQueueGroup::class );
		$mockQueueGroup->expects( $this->exactly( 2 ) )
			->method( 'lazyPush' )
			->with( $this->callback( static function ( $spec ) use ( &$dispatched, $params ) {
				if ( !( $spec instanceof JobSpecification ) ) {
					return false;
				}
				$dispatched[] = true;
				return $spec->getType() === 'wikifunctionsRecentChangesInsert'
					&& $spec->getParams()['target'] === $params['target']
					&& $spec->getParams()['timestamp'] === $params['timestamp']
					&& $spec->getParams()['summary'] === $params['summary'];
			} ) );

		$mockFactory = $this->createMock( JobQueueGroupFactory::class );
		$mockFactory->expects( $this->exactly( 2 ) )
			->method( 'makeJobQueueGroup' )
			->willReturnCallback( function ( $wiki ) use ( $mockQueueGroup ) {
				$this->assertContains( $wiki, [ 'enwiki', 'dewiki' ] );
				return $mockQueueGroup;
			} );

		TestingAccessWrapper::newFromObject( $job )->jobQueueGroupFactory = $mockFactory;

		$this->assertTrue( $job->run() );
		$this->assertCount( 2, $dispatched, 'Should have dispatched exactly 2 jobs' );
	}

	public function testRun_noDispatchWhenNoClientWikis() {
		$this->overrideConfigValue( 'WikiLambdaClientWikis', [] );

		$job = new WikifunctionsClientFanOutQueueJob( $this->buildParams() );

		$mockFactory = $this->createMock( JobQueueGroupFactory::class );
		$mockFactory->expects( $this->never() )->method( 'makeJobQueueGroup' );
		TestingAccessWrapper::newFromObject( $job )->jobQueueGroupFactory = $mockFactory;

		$this->assertTrue( $job->run() );
	}
}
