<?php
/**
 * WikiLambda trait for storing tester results
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Jobs;

use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use Psr\Log\LoggerInterface;
use stdClass;
use Wikimedia\Timestamp\ConvertibleTimestamp;
use Wikimedia\Timestamp\TimestampFormat as TS;

trait StoreTestResultTrait {

	/**
	 * Stores a tester result in the database and logs the outcome.
	 * The output from the DB operation can tell whether:
	 * * the row was successfully upserted
	 * * the row was skipped because the current revision id is outdated
	 * * the row insertion failed for another reason
	 *
	 * @param LoggerInterface $logger
	 * @param ZObjectStore $store
	 * @param string $functionZid
	 * @param int $functionRevision
	 * @param string $implementationZid
	 * @param int $implementationRevision
	 * @param string $testZid
	 * @param int $testRevision
	 * @param bool $passed
	 * @param stdClass $stashedResult
	 */
	private function storeTestResult(
		LoggerInterface $logger,
		ZObjectStore $store,
		string $functionZid,
		int $functionRevision,
		string $implementationZid,
		int $implementationRevision,
		string $testZid,
		int $testRevision,
		bool $passed,
		stdClass $stashedResult
	): void {
		// Deserialize ZResponseEnvelope
		$response = ZObjectFactory::create( $stashedResult );
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope $response';

		$cacheKey = $functionZid . '#' . (string)$functionRevision . ':'
			. $implementationZid . '#' . (string)$implementationRevision . ':'
			. $testZid . '#' . (string)$testRevision;

		// Add metadata entry with caching indexing information
		$response->setMetaDataValue( 'testResultCacheKey', new ZString( $cacheKey ) );
		// Add metadata entry with caching timestamp
		$now = ConvertibleTimestamp::now( TS::ISO_8601 );
		$response->setMetaDataValue( 'testResultCachedOn', new ZString( $now ) );

		$outcome = $store->insertZTesterResult(
			$functionZid,
			$functionRevision,
			$implementationZid,
			$implementationRevision,
			$testZid,
			$testRevision,
			$passed,
			$response->__toString()
		);

		$logContext = [
			'functionZid' => $functionZid,
			'functionRevision' => $functionRevision,
			'implementationZid' => $implementationZid,
			'implementationRevision' => $implementationRevision,
			'testZid' => $testZid,
			'testRevision' => $testRevision,
		];

		if ( $outcome === ZObjectStore::TESTER_RESULT_CACHE_WRITE_INSERTED ) {
			$logger->debug(
				__CLASS__ . ' Updated cache for tester result',
				$logContext
			);
		} elseif ( $outcome === ZObjectStore::TESTER_RESULT_CACHE_WRITE_STALE ) {
			$logger->info(
				__CLASS__ . ' Skipped stale tester result cache write',
				$logContext
			);
		} else {
			$logger->info(
				__CLASS__ . ' Failed to update cache for tester result',
				$logContext + [ 'passed' => $passed, 'stashedResult' => $stashedResult ]
			);
		}
	}
}
