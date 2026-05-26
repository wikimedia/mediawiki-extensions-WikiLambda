<?php

/**
 * WikiLambda integration test suite for the CacheTesterResultsJob class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Jobs;

use MediaWiki\Extension\WikiLambda\Jobs\CacheTesterResultsJob;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use Wikimedia\Timestamp\ConvertibleTimestamp;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Jobs\CacheTesterResultsJob
 * @covers \MediaWiki\Extension\WikiLambda\Jobs\StoreTestResultTrait
 * @group Database
 */
class CacheTesterResultsJobTest extends WikiLambdaIntegrationTestCase {

	private const DEFAULT_PARAMS = [
		'functionZid' => 'Z10000',
		'functionRevision' => 1,
		'implementationZid' => 'Z10001',
		'implementationRevision' => 2,
		'testZid' => 'Z10002',
		'testRevision' => 3,
		'passed' => true
	];

	private static function buildResponseEnvelopeFor( $pass ) {
		$zbool = $pass ? 'Z41' : 'Z42';
		return json_decode( '{ "Z1K1": "Z22",'
			. '"Z22K1": {"Z1K1": "Z40", "Z40K1": "' . $zbool . '"}, '
			. '"Z22K2": "Z24"}' );
	}

	private function mockZObjectStore(
		array $overrides = [],
		string $returnFlag = ZObjectStore::TESTER_RESULT_CACHE_WRITE_INSERTED
	): void {
		$params = array_merge(
			self::DEFAULT_PARAMS,
			[ 'stashedResult' => self::buildResponseEnvelopeFor( true ) ],
			$overrides
		);

		$mockStore = $this->createMock( ZObjectStore::class );
		$mockStore
			->expects( $this->once() )
			->method( 'insertZTesterResult' )
			->with(
					$params[ 'functionZid' ],
					$params[ 'functionRevision' ],
					$params[ 'implementationZid' ],
					$params[ 'implementationRevision' ],
					$params[ 'testZid' ],
					$params[ 'testRevision' ],
					$params[ 'passed' ],
					$this->callback( static function ( $stashedResult ) use ( $params ) {
						$actual = json_decode( $stashedResult );
						$expected = $params[ 'stashedResult' ];
						return $actual->Z22K1->Z40K1 === $expected->Z22K1->Z40K1;
					} )
		)
		->willReturn( $returnFlag );

		$this->setService( 'WikiLambdaZObjectStore', $mockStore );
	}

	private function buildJob( array $overrides = [] ): CacheTesterResultsJob {
		return new CacheTesterResultsJob( array_merge(
			self::DEFAULT_PARAMS,
			[ 'stashedResult' => self::buildResponseEnvelopeFor( true ) ],
			$overrides
		) );
	}

	public function testRun_successfulInsert() {
		$this->mockZObjectStore();

		$job = $this->buildJob();
		$this->assertTrue( $job->run() );
	}

	public function testRun_staleInsert() {
		$this->mockZObjectStore( [], ZObjectStore::TESTER_RESULT_CACHE_WRITE_STALE );

		$job = $this->buildJob();

		// Job returns true even on failed insert (logs info but doesn't retry)
		$this->assertTrue( $job->run() );
	}

	public function testRun_failedInsert() {
		$this->mockZObjectStore( [], ZObjectStore::TESTER_RESULT_CACHE_WRITE_FAILED );

		$job = $this->buildJob();

		// Job returns true even on failed insert (logs info but doesn't retry)
		$this->assertTrue( $job->run() );
	}

	public function testRun_setsMetadataTestKeys() {
		// Set mock clock
		$mockNow = '19850531040500';
		ConvertibleTimestamp::setFakeTime( $mockNow );

		$mockStore = $this->createMock( ZObjectStore::class );
		$mockStore
			->expects( $this->once() )
			->method( 'insertZTesterResult' )
			->willReturnCallback( static function (
				/* function zid and revision */ $fzid, $frev,
				/* implementation zid and revision */ $izid, $irev,
				/* test zid and revision */ $tzid, $trev,
				$passed,
				$result
			) {
				$decoded = json_decode( $result, true );
				$metadata = $decoded['Z22K2'];
				$metadataEntries = array_slice( $metadata['K1'], 1 );
				$metadataKeyValues = [];
				foreach ( $metadataEntries as $entry ) {
					$metadataKeyValues[ $entry['K1'] ] = $entry['K2'];
				}

				// Assert cache key contains zids and revisions
				$testCacheKey = "$fzid#$frev:$izid#$irev:$tzid#$trev";
				self::assertEquals( $testCacheKey, $metadataKeyValues[ 'testResultCacheKey' ] );

				// Assert cached timestamp is now
				$testCachedOn = '1985-05-31T04:05:00Z';
				self::assertEquals( $testCachedOn, $metadataKeyValues[ 'testResultCachedOn' ] );

				return ZObjectStore::TESTER_RESULT_CACHE_WRITE_INSERTED;
			} );

		$this->setService( 'WikiLambdaZObjectStore', $mockStore );

		$job = $this->buildJob();
		$this->assertTrue( $job->run() );

		// Reset clock
		ConvertibleTimestamp::setFakeTime( false );
	}
}
