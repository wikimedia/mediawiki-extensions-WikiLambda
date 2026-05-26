<?php
/**
 * WikiLambda job to execute and cache a test result
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Jobs;

use MediaWiki\Extension\WikiLambda\OrchestratorException;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\JobQueue\GenericParameterJob;
use MediaWiki\JobQueue\Job;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use Psr\Log\LoggerInterface;
use RuntimeException;
use stdClass;
use Wikimedia\RequestTimeout\TimeoutException;

/**
 * Executes a test call (Z20K2) and validation call (Z20K3) syncrhonosuly and
 * then persists the result in the test results table.
 *
 * This job is queued when, after an asynchronous test orchestration, it was
 * found that either the when either the test call or the validation call were not
 * cached, but it is possible that only one of them needs to be actually executed,
 * so this job should first check for cache hits once again.
 *
 * When encountering transient errors (timeout, orchestrator, connection errors)
 * it exits and requeues the job. When encountering non-transient errors related
 * to the shape of the input test calls, exits without requeing.
 *
 * Params:
 * * stdClass testCall: test function call (Z20K2) already dereferenced with the
 *   target function and a single implementation.
 * * stdClass validationCall: test validation call (Z20K3) without its K1 key
 * * string functionZid
 * * int functionRevision
 * * string implementationZid: can be null if testing for an inline implementation
 * * int implementationRevsion: can be null if testing for an inline implementation
 * * string testZid: can be null if testing an inline test
 * * int testRevision: can be null if testing an inline test
 *
 * Queued by:
 * * ApiPerformTest
 */
class ExecuteTestAndCacheJob extends Job implements GenericParameterJob {
	use StoreTestResultTrait;

	private LoggerInterface $logger;
	private ZObjectStore $zObjectStore;
	private OrchestratorRequest $orchestrator;
	private JobQueueGroup $jobQueueGroup;

	public function __construct( array $params ) {
		parent::__construct( 'executeTestAndCache', $params );

		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );
		$this->zObjectStore = WikiLambdaServices::getZObjectStore();
		$this->orchestrator = WikiLambdaServices::getOrchestratorRequest();
		$this->jobQueueGroup = MediaWikiServices::getInstance()->getJobQueueGroup();

		$this->logger->debug(
			__CLASS__ . ' created',
			[
				'functionZid' => $this->params[ 'functionZid' ],
				'functionRevision' => $this->params[ 'functionRevision' ]
			]
		);
	}

	/**
	 * @inheritDoc
	 * @throws RuntimeException on transient orchestrator failure, so the job queue retries
	 */
	public function run(): bool {
		$functionZid = $this->params[ 'functionZid' ];
		$functionRevision = $this->params[ 'functionRevision' ];
		$implementationZid = $this->params[ 'implementationZid' ];
		$implementationRevision = $this->params[ 'implementationRevision' ];
		$testZid = $this->params[ 'testZid' ];
		$testRevision = $this->params[ 'testRevision' ];
		$testCall = $this->params[ 'testCall' ];
		$validationCall = $this->params[ 'validationCall' ];

		$logContext = [
			'functionZid' => $functionZid,
			'implementationZid' => $implementationZid ?? 'inline',
			'testZid' => $testZid ?? 'inline',
		];

		$this->logger->info(
			__CLASS__ . ' starting for test {testZid}, implementation {implementationZid}',
			$logContext
		);

		// 1. execute with evaluation on miss:
		// * can throw OrchestratorException or TimeoutExceptio
		// * won't ever return false
		try {
			$response = $this->orchestrator->orchestrateTestExecution(
				$testCall,
				$validationCall,
				/* evaluateOnMiss= */ true
			);
		} catch ( OrchestratorException | TimeoutException $e ) {
			// 2. log and retry if execution triggered server or timeout errors
			$this->logger->warning(
				__CLASS__ . ' test orchestration call failed, will retry: {error}',
				$logContext + [
					'error' => $e->getMessage(),
					'request' => $e->getRequest()
				]
			);
			// Exit and retry
			throw new RuntimeException( $e->getMessage(), 0, $e );
		}

		// 3. log and exit without retry if the test orchestration returned
		// errors in the metadata, which is assumed to be due to a bad test
		if ( $response[ 'hasErrors' ] ) {
			$this->logger->debug(
				__CLASS__ . ' test returned metadata with errors. Bad test, won\'t retry.',
				$logContext
			);
			// Exit without retry
			return true;
		}

		// 4. Exit early if implementation or test are inline literal objects,
		// everything below is only for referenced (current revision) objects:
		if ( $implementationRevision === null || $testRevision === null ) {
			return true;
		}

		// 5. Test was performed successfully and without errors, (irrespective
		// to whether it passed or failed), store the test result.
		$stashedResult = new ZResponseEnvelope( $response[ 'value' ], $response[ 'metadata' ] );
		$this->storeTestResult(
			$this->logger,
			$this->zObjectStore,
			$functionZid,
			$functionRevision,
			$implementationZid,
			$implementationRevision,
			$testZid,
			$testRevision,
			$response[ 'passed' ],
			$stashedResult->getSerialized()
		);

		// 6. Check if all the latest revisions of connected tests and implementations
		// are tested and stored in the results table. When that happens at this point
		// it means that we have finished re-generating test results after an object
		// update, and it makes sense to review whether implementations are still in
		// the right order.
		$results = $this->zObjectStore->getTestStatusForLatestRevisions( $functionZid, $functionRevision );

		$total = count( $results );
		$updated = count( array_filter( $results, static function ( $row ) {
			return $row[ 'hasResult' ];
		} ) );

		if ( $updated === $total ) {
			$this->maybeUpdateImplementationRanking( $functionZid, $functionRevision, $results );
		}

		return true;
	}

	/**
	 * Based on test results contained in $implementationMap, order the implementations of the
	 * given function from best-performing to worst-performing (in terms of speed).  If the
	 * ordering is significantly different than the previous ordering for this function, instantiate
	 * an asynchronous job to update Z8K4/implementations in the function's persistent storage.
	 *
	 * @param string $functionZid
	 * @param int $functionRevision
	 * @param array $results
	 */
	public function maybeUpdateImplementationRanking(
		string $functionZid,
		int $functionRevision,
		array $results
	): void {
		// 1. Build map of implementations-tests-results from the flat results array
		$implementationMap = [];
		foreach ( $results as $row ) {
			$impZid = $row[ 'implementationZid' ];
			$testZid = $row[ 'testZid' ];
			if ( !isset( $implementationMap[ $impZid ] ) ) {
				$implementationMap[ $impZid ] = [];
			}
			$implementationMap[ $impZid ][ $testZid ] = [
				'passed' => $row[ 'passed' ],
				'result' => $row[ 'result' ] ? json_decode( $row[ 'result' ] ) : null
			];
		}

		$connectedImplementations = array_keys( $implementationMap );
		$connectedTests = array_keys( reset( $implementationMap ) );

		// Gather common log context
		$logContext = [
			'functionZid' => $functionZid,
			'functionRevision' => $functionRevision,
			'connectedImplementations' => $connectedImplementations,
			'connectedTests' => $connectedTests
		];

		// No point in updating when there's only one connected implementation.
		if ( count( $connectedImplementations ) <= 1 ) {
			$this->logger->debug(
				__METHOD__ . ' Not updating {functionZid}: only one implementation.',
				$logContext
			);
			return;
		}

		// NOTE: The current first implementation is passed in the parameters,
		// as the connected implementations array is not sorted (we got it from
		// the secondary tables, not from the function Z8K4)
		$firstImplementation = $this->params[ 'firstImplementation' ];

		// 2. For each implementation in connected implementations:
		//    2.a. calculate its number of failed connected tests (numFailed)
		//    2.b. calculate the average orchestration duration time (averageTime)
		// TODO (T314539): Revisit Use of (count of tests-failed) after failing
		// implementations are routinely deactivated
		foreach ( $implementationMap as $implementationZid => $testMap ) {
			$numFailed = 0;
			$averageTime = 0.0;
			foreach ( $testMap as $testId => $testResult ) {
				if ( !$testResult[ 'passed' ] ) {
					$numFailed++;
				}
				$averageTime += self::getNumericMetadataValue( $testResult[ 'result' ], 'orchestrationDuration' );
			}
			$averageTime /= count( $testMap );
			$implementationMap[ $implementationZid ][ 'numFailed' ] = $numFailed;
			$implementationMap[ $implementationZid ][ 'averageTime' ] = $averageTime;
		}

		// 3. Order all implementations to get a new ranking by performance
		uasort( $implementationMap, [ self::class, 'compareImplementationStats' ] );

		// Bail out if the new first element is the same as the previous
		$bestImplementation = array_key_first( $implementationMap );

		if ( $bestImplementation === $firstImplementation ) {
			$this->logger->debug(
				__METHOD__ . ' Not updating {functionZid}: First element is best',
				$logContext
			);
			return;
		}

		$logContext[ 'firstImplementation' ] = $firstImplementation;
		$logContext[ 'bestImplementation' ] = $bestImplementation;

		// Bail out if the performance of the best is only marginally better than the
		// performance of the first.  Note: if numFailed of $newFirst is less than
		// numFailed of $previousFirst, then we should *not* bail out.
		// TODO (T329138): Also consider checking if all of the average times are
		// roughly indistinguishable.
		$firstStats = $implementationMap[ $firstImplementation ];
		$bestStats = $implementationMap[ $bestImplementation ];
		$relativeThreshold = 0.8;
		if (
			$bestStats[ 'averageTime' ] >= $relativeThreshold * $firstStats[ 'averageTime' ] &&
			$bestStats[ 'numFailed' ] >= $firstStats[ 'numFailed' ]
		) {
			$this->logger->debug(
				__METHOD__ . ' Not updating {functionZid}: Best element only marginally better than first',
				$logContext
			);
			return;
		}

		// 4. If the new ranking is much better, queue an asynchronous job to persist it
		$newRanking = array_keys( $implementationMap );
		$this->logger->info(
			__METHOD__ . ' Creating UpdateImplementationsJob for {functionZid}',
			$logContext + [ 'newRanking' => $newRanking ]
		);

		$updateImplementationsJob = new UpdateImplementationsJob( [
			'functionZid' => $functionZid,
			'functionRevision' => $functionRevision,
			'implementationRankingZids' => $newRanking
		] );

		$this->jobQueueGroup->push( $updateImplementationsJob );
	}

	/**
	 * Retrieves the $metadataMap value for ZString($keyString) and converts it to a float.  It must
	 * be a value of type ZString, whose underlying string begins with a float, e.g. '320.815 ms'.
	 * If ZString($keyString) isn't used in $metadataMap, returns zero.
	 *
	 * N.B. We do not check the units here; we assume that they are always the same (i.e.,
	 * milliseconds) for the values retrieved by this function.  This consistency is primarily
	 * the responsibility of the backend services that generate the metadata elements.
	 *
	 * @param stdClass $response
	 * @param string $key
	 * @return float
	 */
	private static function getNumericMetadataValue( stdClass $response, string $key ) {
		$duration = ZObjectUtils::getMetadataValue( $response, $key );
		return $duration ? floatval( $duration ) : 0.0;
	}

	/**
	 * Callback for uasort() to order the implementations for a function that's been tested
	 * @param array $a Implementation stats
	 * @param array $b Implementation stats
	 * @return int Result of comparison
	 */
	private static function compareImplementationStats( $a, $b ) {
		if ( $a[ 'numFailed' ] < $b[ 'numFailed' ] ) {
			return -1;
		}
		if ( $b[ 'numFailed' ] < $a[ 'numFailed' ] ) {
			return 1;
		}
		if ( $a[ 'averageTime' ] < $b[ 'averageTime' ] ) {
			return -1;
		}
		if ( $b[ 'averageTime' ] < $a[ 'averageTime' ] ) {
			return 1;
		}
		return 0;
	}

	/**
	 * @inheritDoc
	 */
	public function ignoreDuplicates() {
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function getDeduplicationInfo() {
		$info = parent::getDeduplicationInfo();
		// When deduplicating, only keep revision IDs
		$info[ 'params' ] = [
			'functionRevision' => $this->params[ 'functionRevision' ],
			'implementationRevision' => $this->params[ 'implementationRevision' ],
			'testRevision' => $this->params[ 'testRevision' ]
		];
		return $info;
	}
}
