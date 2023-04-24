<?php
/**
 * WikiLambda function call API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\API;

use ApiPageSet;
use FormatJson;
use JobQueueGroup;
use MediaWiki\Extension\WikiLambda\Jobs\CacheTesterResultsJob;
use MediaWiki\Extension\WikiLambda\Jobs\UpdateImplementationsJob;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use Wikimedia\ParamValidator\ParamValidator;

class ApiPerformTest extends WikiLambdaApiBase {

	/** @var ZObjectStore */
	protected $zObjectStore;

	/** @var JobQueueGroup */
	private $jobQueueGroup;

	public function __construct( $query, $moduleName, ZObjectStore $zObjectStore ) {
		parent::__construct( $query, $moduleName, 'wikilambda_perform_test_' );

		$this->zObjectStore = $zObjectStore;

		$this->setUp();

		// TODO (T330033): Consider injecting this service rather than just fetching from main
		$services = MediaWikiServices::getInstance();
		$this->jobQueueGroup = $services->getJobQueueGroup();
	}

	public function execute() {
		$this->run();
	}

	public function executeGenerator( $resultPageSet ) {
		$this->run( $resultPageSet );
	}

	/**
	 * @param ApiPageSet|null $resultPageSet
	 */
	private function run( $resultPageSet = null ) {
		$params = $this->extractRequestParams();
		$pageResult = $this->getResult();
		$functionZid = $params[ 'zfunction' ];
		$requestedImplementations = $params[ 'zimplementations' ] ?: [];
		$requestedTesters = $params[ 'ztesters' ] ?: [];

		// 1. Work out matrix of what we want for what
		// FIXME: Handle an inline ZFunction (for when it's not been created yet)?
		$targetTitle = Title::newFromText( $functionZid, NS_MAIN );
		if ( !$targetTitle || !( $targetTitle->exists() ) ) {
			$this->dieWithError( [ "wikilambda-performtest-error-unknown-zid", $functionZid ] );
		}

		// Needed for caching.
		$functionRevision = $targetTitle->getLatestRevID();

		// @phan-suppress-next-line PhanTypeMismatchArgumentNullable
		$targetObject = $this->zObjectStore->fetchZObjectByTitle( $targetTitle );
		if ( $targetObject->getZType() !== ZTypeRegistry::Z_FUNCTION ) {
			$this->dieWithError( [ "wikilambda-performtest-error-nonfunction", $functionZid ] );
		}
		$targetFunction = $targetObject->getInnerZObject();
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunction $targetFunction';

		if ( empty( $requestedImplementations ) ) {
			$targetFunctionImplementions = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $targetFunctionImplementions';
			$requestedImplementations = $targetFunctionImplementions->getAsArray();
		}

		if ( empty( $requestedTesters ) ) {
			$targetFunctionTesters = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_TESTERS );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $targetFunctionTesters';
			$requestedTesters = $targetFunctionTesters->getAsArray();
		}

		// We only update the implementation ranking for attached implementations and testers,
		// and only if all attached implementations and testers are included in the results,
		// and no results come from the cache.  These vars are used to track those conditions.
		$attachedImplementationZids = $targetFunction->getImplementationZids();
		$attachedTesterZids = $targetFunction->getTesterZids();

		$canUpdateImplementationRanking = true;

		// 2. For each implementation, run each tester
		$responseArray = [];
		// Map of $implementationZid:$testerMap; used for implementation ranking
		$implementationMap = [];
		foreach ( $requestedImplementations as $implementation ) {
			$inlineImplementation = false;
			if ( is_string( $implementation ) ) {
				$decodedJson = FormatJson::decode( $implementation );
				// If not JSON, assume we have received a ZID.
				if ( $decodedJson ) {
					$inlineImplementation = true;
					$implementation = ZObjectFactory::create( $decodedJson );
				} else {
					$implementation = new ZReference( $implementation );
				}
			}
			$implementationZid = ZObjectUtils::getZid( $implementation );
			$implementationListEntry = $this->getImplementationListEntry( $implementation );

			// Note that the Implementation ZID can be non-Z0 if it's being run on an unsaved edit.
			$implementationRevision = $inlineImplementation
				? null
				: Title::newFromText( $implementationZid, NS_MAIN )->getLatestRevID();

			// Re-use our copy of the target function, setting the implementations to just the one
			// we're testing now
			$targetFunction->setValueByKey(
				ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS,
				new ZTypedList(
					ZTypedList::buildType( new ZReference( ZTypeRegistry::Z_IMPLEMENTATION ) ),
					$implementationListEntry
				)
			);
			// Map of $testerZid:$testResult for a particular implementation
			$testerMap = [];
			foreach ( $requestedTesters as $requestedTester ) {
				$passed = true;
				$testResult = [
					'zFunctionId' => $functionZid,
					'zImplementationId' => $implementationZid,
				];

				$inlineTester = false;
				if ( is_string( $requestedTester ) ) {
					$decodedJson = FormatJson::decode( $requestedTester );
					// If not JSON, assume we have received a ZID.
					if ( $decodedJson ) {
						$inlineTester = true;
						$requestedTester = ZObjectFactory::create( $decodedJson );
					} else {
						$requestedTester = new ZReference( $requestedTester );
					}
				}

				$testerZid = ZObjectUtils::getZid( $requestedTester );
				$testResult[ 'zTesterId' ] = $testerZid;
				$testerObject = $this->getTesterObject( $requestedTester );

				// Note that the Tester ZID can be non-Z0 if it's being run on an unsaved edit.
				$testerRevision = $inlineTester
					? null
					: Title::newFromText( $testerZid, NS_MAIN )->getLatestRevID();

				// (T297707): Work out if this has been cached before (checking revisions of objects),
				// and if so reply with that instead of executing.
				if ( !$inlineImplementation && !$inlineTester ) {
					$possiblyCachedResult = $this->zObjectStore->findZTesterResult(
						$functionZid,
						$functionRevision,
						$implementationZid,
						$implementationRevision,
						$testerZid,
						$testerRevision,
					);

					if ( $possiblyCachedResult ) {
						$possiblyCachedResult->setMetaDataValue(
							"loadedFromMediaWikiCache",
							new ZString( date( 'Y-m-d\TH:i:s\Z' ) )
						);

						$this->getLogger()->debug(
							'Cache result hit: ' . $possiblyCachedResult->getZValue(),
							[]
						);
						$testResult[ 'validateStatus' ] = $possiblyCachedResult->getZValue();
						$testResult[ 'testMetadata'] = $possiblyCachedResult->getZMetadata();

						$responseArray[] = $testResult;
						if ( in_array( $testerZid, $attachedTesterZids ) &&
							in_array( $implementationZid, $attachedImplementationZids ) ) {
							// Implementation ranking only involves attached implementations and
							// testers.  To get the best possible ranking, we want all such
							// test results to be "fresh" (not from the cache).  Here, we have
							// a result from the cache, so we choose not to update the ranking.
							// TODO (T330370): Revisit this strategy when we have more experience with it
							$canUpdateImplementationRanking = false;
						}
						continue;
					}
				}

				// Use tester to create a function call of the test case inputs
				$testFunctionCall = $testerObject->getValueByKey( ZTypeRegistry::Z_TESTER_CALL );
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall $testFunctionCall';

				// Set the target function of the call to our modified copy of the target function with only the
				// current implementation
				$testFunctionCall->setValueByKey( ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION, $targetFunction );

				// Execute the test case function call
				$testResultObject = $this->executeFunctionCall( $testFunctionCall, true );
				$testMetadata = $testResultObject->getValueByKey( ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA );
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap $testMetadata';

				// Use tester to create a function call validating the output
				$validateTestValue = $testResultObject->hasErrors() ?
					$testResultObject->getErrors() :
					$testResultObject->getZValue();

				$validateFunctionCall = $testerObject->getValueByKey( ZTypeRegistry::Z_TESTER_VALIDATION );
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall $validateFunctionCall';

				$targetValidationFunctionZID = $validateFunctionCall->getZValue();
				$validateFunctionCall->setValueByKey( $targetValidationFunctionZID . 'K1', $validateTestValue );

				// Execute the validation function call and stash it
				$validateResult = $this->executeFunctionCall( $validateFunctionCall, false );

				// If the running failed, we explicitly set the tester passing as false
				if ( $validateResult->hasErrors() ) {
					$validateResult->setValueByKey(
						ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE,
						new ZReference( ZTypeRegistry::Z_BOOLEAN_FALSE )
					);
					// Add the validator errors to the metadata map
					$testMetadata->setValueForKey(
						new ZString( "validateErrors" ),
						$validateResult->getErrors() );
				}

				$validateResultItem = $validateResult->getZValue();

				if ( self::isFalse( $validateResultItem ) ) {
					$passed = false;
					// Add the expected and actual values to the metadata map
					$testMetadata->setValueForKey(
						new ZString( "actualTestResult" ),
						$validateTestValue
					);
					$testMetadata->setValueForKey(
						new ZString( "expectedTestResult" ),
						$validateFunctionCall->getValueByKey( $targetValidationFunctionZID . 'K2' )
					);
				}

				// (T297707): Store this response in a DB table for faster future responses.
				// We can only do this for persisted revisions, not inline items, as we can't
				// version them otherwise, so use truthiness (neither null nor 0, non-extant).
				// We also only do this if the validation step didn't have an error itself.
				if (
					!$inlineImplementation && !$inlineTester &&
					!$validateResult->hasErrors()
				) {
					// Store a fake ZResponseEnvelope of the validation result and the real meta-data run
					// via an asynchronous job so that we don't trigger a "DB write on API GET" performance
					// error.
					$this->getLogger()->debug(
						'Tester result cache job triggered',
						[
							'functionZid' => $functionZid,
							'functionRevision' => $functionRevision
						]
					);

					$stashedResult = new ZResponseEnvelope( $validateResultItem, $testMetadata );

					$cacheTesterResultsJob = new CacheTesterResultsJob(
						[
							'functionZid' => $functionZid,
							'functionRevision' => $functionRevision,
							'implementationZid' => $implementationZid,
							'implementationRevision' => $implementationRevision,
							'testerZid' => $testerZid,
							'testerRevision' => $testerRevision,
							'passed' => $passed,
							'stashedResult' => $stashedResult->__toString()
							]
					);

					$this->jobQueueGroup->push( $cacheTesterResultsJob );
				}

				// Stash the response
				$testResult[ 'validateStatus' ] = $validateResultItem;
				$testResult[ 'testMetadata' ] = $testMetadata;
				$responseArray[] = $testResult;
				// Update bookkeeping for the call to maybeUpdateImplementationRanking
				if ( in_array( $testerZid, $attachedTesterZids ) &&
					in_array( $implementationZid, $attachedImplementationZids ) ) {
					$testerMap[$testerZid] = $testResult;
				}
			}
			if ( in_array( $implementationZid, $attachedImplementationZids ) ) {
				$implementationMap[ $implementationZid ] = $testerMap;
			}
		}

		// 3. Maybe update implementation ranking (in persistent storage)
		if ( $canUpdateImplementationRanking ) {
			$this->maybeUpdateImplementationRanking(
				$functionZid,
				$functionRevision,
				$implementationMap,
				$attachedImplementationZids,
				$attachedTesterZids
			);
		} else {
			$this->getLogger()->info(
				__METHOD__ . ' Not updating implementation ranking',
				[
					'functionZid' => $functionZid,
					'canUpdateImplementationRanking' => $canUpdateImplementationRanking
				]
			);
		}

		// 4. Return the response.
		$pageResult->addValue( [ 'query' ], $this->getModuleName(), $responseArray );
	}

	private function getImplementationListEntry( $zobject ) {
		if ( $zobject->getZType() === ZTypeRegistry::Z_REFERENCE ||
				$zobject->getZType() === ZTypeRegistry::Z_IMPLEMENTATION ) {
			return $zobject;
		} elseif ( $zobject->getZType() === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
			return $this->getImplementationListEntry(
				$zobject->getValueByKey( ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ) );
		}
		$this->dieWithError( [ "wikilambda-performtest-error-nonimplementation", $zobject ] );
	}

	private function getTesterObject( $zobject ) {
		if ( $zobject->getZType() === ZTypeRegistry::Z_REFERENCE ) {
			$zid = ZObjectUtils::getZid( $zobject );
			$title = Title::newFromText( $zid, NS_MAIN );
			if ( !( $title->exists() ) ) {
				$this->dieWithError( [ "wikilambda-performtest-error-unknown-zid", $zid ] );
			}
			return $this->getTesterObject( $this->zObjectStore->fetchZObjectByTitle( $title )->getInnerZObject() );
		} elseif ( $zobject->getZType() === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
			return $this->getTesterObject( $zobject->getValueByKey( ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ) );
		} elseif ( $zobject->getZType() === ZTypeRegistry::Z_TESTER ) {
			return $zobject;
		}
		$this->dieWithError( [ "wikilambda-performtest-error-nontester", $zobject ] );
	}

	private static function isFalse( $object ) {
		if ( $object instanceof ZObject ) {
			if ( $object instanceof ZReference ) {
				return self::isFalse( $object->getZValue() );
			} elseif ( $object->getZType() === ZTypeRegistry::Z_BOOLEAN ) {
				return self::isFalse( $object->getValueByKey( ZTypeRegistry::Z_BOOLEAN_VALUE ) );
			}
		} elseif ( $object instanceof \stdClass ) {
			if ( $object->{ ZTypeRegistry::Z_OBJECT_TYPE } === ZTypeRegistry::Z_REFERENCE ) {
				return self::isFalse( $object->{ ZTypeRegistry::Z_REFERENCE_VALUE } );
			} elseif ( $object->{ ZTypeRegistry::Z_OBJECT_TYPE } === ZTypeRegistry::Z_BOOLEAN ) {
				return self::isFalse( $object->{ ZTypeRegistry::Z_BOOLEAN_VALUE } );
			}
		}
		return $object === ZTypeRegistry::Z_BOOLEAN_FALSE;
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getAllowedParams(): array {
		return [
			'zfunction' => [
				ParamValidator::PARAM_TYPE => 'text',
				ParamValidator::PARAM_REQUIRED => true,
			],
			'zimplementations' => [
				ParamValidator::PARAM_ISMULTI => true,
				ParamValidator::PARAM_REQUIRED => false,
			],
			'ztesters' => [
				ParamValidator::PARAM_ISMULTI => true,
				ParamValidator::PARAM_REQUIRED => false,
			],
		];
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages() {
		$exampleZid = $this->zObjectStore->findFirstZImplementationFunction();

		return [
			'action=wikilambda_perform_test&format=json&wikilambda_perform_test_zfunction='
				. $exampleZid
				=> 'apihelp-wikilambda_perform_test-example',
		];
	}

	/**
	 * Mark as internal. This isn't meant to be user-facing, and can change at any time.
	 * @return bool
	 */
	public function isInternal() {
		return true;
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
	 * @param ZTypedMap $metadataMap
	 * @param string $keyString
	 * @return float
	 */
	private static function getNumericMetadataValue( $metadataMap, $keyString ) {
		$key = new ZString( $keyString );
		$value = $metadataMap->getValueGivenKey( $key );
		if ( !$value ) {
			return 0;
		}
		$value = $value->getZValue();
		return floatval( $value );
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
	 * Based on tester results contained in $implementationMap, order the implementations of the
	 * given function from best-performing to worst-performing (in terms of speed).  If the
	 * ordering is significantly different than the previous ordering for this function, instantiate
	 * an asynchronous job to update Z8K4/implementations in the function's persistent storage.
	 *
	 * TODO (T329138): Consider whether average Cpu usage is good enough to determine the ranking.
	 *   Should we eliminate implementations that are outliers relative to others on the same test?
	 *   Should we consider non-CPU time needed to, e.g., retrieve info from Wikidata?
	 *
	 * @param string $functionZid
	 * @param int $functionRevision
	 * @param array $implementationMap contains $implementationZid => $testerMap, for each tested
	 * implementation.  $testerMap contains $testerZid => $testResult for each tester. See
	 * ApiPerformTest::run for the structure of $testResult.
	 * @param array $attachedImplementationZids
	 * @param array $attachedTesterZids
	 */
	public static function maybeUpdateImplementationRanking(
		$functionZid, $functionRevision, $implementationMap, $attachedImplementationZids, $attachedTesterZids
	) {
		// NOTE: As this code is static for testing purposes, we can't use $this->getLogger() here
		$logger = LoggerFactory::getInstance( 'WikiLambda' );

		// We don't currently support updates involving a Z0, and we don't expect to get any here.
		// (However, it maybe could happen if the value of Z8K4 has been manually edited.)
		unset( $implementationMap[ ZTypeRegistry::Z_NULL_REFERENCE ] );

		if ( count( $attachedImplementationZids ) <= 1 ) {
			// No point in updating.
			$logger->info(
				__METHOD__ . ' Bailing: Implementation count <= 1',
				[
					'functionZid' => $functionZid,
					'functionRevision' => $functionRevision,
					'implementationMap' => $implementationMap
				]
			);
			return;
		}

		// We only update if we have results for all currently attached implementations,
		// and all currently attached testers.  We already know that the implementations and
		// testers in the maps are attached; now we check whether all attached ones are present.
		$implementationZids = array_keys( $implementationMap );
		$testerZids = array_keys( reset( $implementationMap ) );
		if ( array_diff( $attachedImplementationZids, $implementationZids ) ||
			array_diff( $attachedTesterZids, $testerZids ) ) {
			$logger->info(
				__METHOD__ . ' Bailing: Missing results for attached implementations or testers',
				[
					'functionZid' => $functionZid,
					'functionRevision' => $functionRevision,
					'attachedImplementationZids' => $attachedImplementationZids,
					'implementationZids' => $implementationZids,
					'attachedTesterZids' => $attachedTesterZids,
					'testerZids' => $testerZids,
					'implementationMap' => $implementationMap
				]
			);
			return;
		}

		// Record which implementation is first in Z8K4 before this update happens
		$previousFirst = $attachedImplementationZids[ 0 ];

		// For each implementation, get (count of tests-failed) and (average runtime of tests)
		// and add them into $implementationMap.
		// TODO (T314539): Revisit Use of (count of tests-failed) after failing implementations are
		//   routinely deactivated
		foreach ( $implementationMap as $implementationZid => $testerMap ) {
			$numFailed = 0;
			$averageTime = 0.0;
			foreach ( $testerMap as $testerId => $testResult ) {
				if ( self::isFalse( $testResult[ 'validateStatus' ] ) ) {
					$numFailed++;
				}
				$metadataMap = $testResult[ 'testMetadata' ];
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap $metadataMap';
				$averageTime +=
					( self::getNumericMetadataValue( $metadataMap, 'orchestrationCpuUsage' )
					+ self::getNumericMetadataValue( $metadataMap, 'evaluationCpuUsage' )
					+ self::getNumericMetadataValue( $metadataMap, 'executionCpuUsage' ) );
			}
			$averageTime = $averageTime / count( $testerMap );
			$implementationMap[ $implementationZid ][ 'numFailed' ] = $numFailed;
			$implementationMap[ $implementationZid ][ 'averageTime' ] = $averageTime;
		}

		uasort( $implementationMap, [ self::class, 'compareImplementationStats' ] );
		// Get the ranked Zids

		// Bail out if the new first element is the same as the previous
		$newFirst = array_key_first( $implementationMap );
		if ( $newFirst === $previousFirst ) {
			$logger->info(
				__METHOD__ . ' Bailing: Same first element',
				[
					'functionZid' => $functionZid,
					'functionRevision' => $functionRevision,
					'previousFirst' => $previousFirst,
					'implementationMap' => $implementationMap
				]
			);
			return;
		}

		// Bail out if the performance of $newFirst is only marginally better than the
		// performance of $previousFirst.  Note: if numFailed of $newFirst is less than
		// numFailed of $previousFirst, then we should *not* bail out.
		// TODO (T329138): Also consider:
		//   Check if all of the average times are roughly indistinguishable.
		$previousFirstStats = $implementationMap[ $previousFirst ];
		$newFirstStats = $implementationMap[ $newFirst ];
		$relativeThreshold = 0.8;
		if ( $newFirstStats[ 'averageTime' ] >= $relativeThreshold * $previousFirstStats[ 'averageTime' ] &&
			$newFirstStats[ 'numFailed' ] >= $previousFirstStats[ 'numFailed' ] ) {
			$logger->info(
				__METHOD__ . ' Bailing: New first element only marginally better than previous',
				[
					'functionZid' => $functionZid,
					'functionRevision' => $functionRevision,
					'previousFirst' => $previousFirst,
					'newFirst' => $newFirst,
					'implementationMap' => $implementationMap
				]
			);
			return;
		}

		$implementationRankingZids = array_keys( $implementationMap );
		$logger->info(
			__METHOD__ . ' Creating update job',
			[
				'functionZid' => $functionZid,
				'functionRevision' => $functionRevision,
				'implementationRankingZids' => $implementationRankingZids,
				'implementationMap' => $implementationMap
			]
		);

		$updateImplementationsJob = new UpdateImplementationsJob(
			[ 'functionZid' => $functionZid,
				'functionRevision' => $functionRevision,
				'implementationRankingZids' => $implementationRankingZids
			] );
		// NOTE: As this code is static for testing purposes, we can't use $this->jobQueueGroup here
		// TODO (T330033): Consider using an injected service for the following
		$services = MediaWikiServices::getInstance();
		$jobQueueGroup = $services->getJobQueueGroup();
		$jobQueueGroup->push( $updateImplementationsJob );
	}
}
