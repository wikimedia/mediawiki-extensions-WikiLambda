<?php
/**
 * WikiLambda function call API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Jobs\CacheTesterResultsJob;
use MediaWiki\Extension\WikiLambda\Jobs\UpdateImplementationsJob;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZBoolean;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\Json\FormatJson;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use Wikimedia\ParamValidator\ParamValidator;

class ApiPerformTest extends WikiLambdaApiBase {

	private ZObjectStore $zObjectStore;
	private JobQueueGroup $jobQueueGroup;

	public function __construct(
		ApiMain $mainModule,
		string $moduleName,
		ZObjectStore $zObjectStore
	) {
		parent::__construct( $mainModule, $moduleName, 'wikilambda_perform_test_' );

		$this->zObjectStore = $zObjectStore;

		$this->setUp();

		// TODO (T330033): Consider injecting this service rather than just fetching from main
		$services = MediaWikiServices::getInstance();
		$this->jobQueueGroup = $services->getJobQueueGroup();
	}

	/**
	 * @inheritDoc
	 */
	protected function run() {
		$params = $this->extractRequestParams();
		$pageResult = $this->getResult();
		$functionZid = $params[ 'zfunction' ];
		$requestedImplementations = $params[ 'zimplementations' ] ?: [];
		$requestedTesters = $params[ 'ztesters' ] ?: [];

		// 1. Work out the matrix of implementations/testers that we want to run
		// TODO (T362190): Consider handling an inline ZFunction (for when it's not been created yet)?

		// 1.a. Check that Function exists
		$targetTitle = Title::newFromText( $functionZid, NS_MAIN );
		if ( !$targetTitle || !( $targetTitle->exists() ) ) {
			$this->dieWithError(
				[ "wikilambda-performtest-error-unknown-zid", $functionZid ],
				null,
				null,
				HttpStatus::NOT_FOUND
			);
		}

		// 1.b. Check that Function Zid belongs to an object of the right type (Z8/Function)
		$targetObject = $this->zObjectStore->fetchZObjectByTitle( $targetTitle );
		if ( $targetObject->getZType() !== ZTypeRegistry::Z_FUNCTION ) {
			$this->dieWithError(
				[ "wikilambda-performtest-error-nonfunction", $functionZid ],
				null,
				null,
				HttpStatus::BAD_REQUEST
			);
		}

		// Get function latest revision Id for caching
		$functionRevision = $targetTitle->getLatestRevID();
		$targetFunction = $targetObject->getInnerZObject();
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunction $targetFunction';

		// 1.c. If no specific implementation Zids are passed in the request, test all of them (connected ones)
		if ( !count( $requestedImplementations ) ) {
			$targetFunctionImplementions = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $targetFunctionImplementions';
			$requestedImplementations = $targetFunctionImplementions->getAsArray();
		}

		// 1.d. If no specific tester Zids are passed in the request, run all of them (connected ones)
		if ( !count( $requestedTesters ) ) {
			$targetFunctionTesters = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_TESTERS );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $targetFunctionTesters';
			$requestedTesters = $targetFunctionTesters->getAsArray();
		}

		// We only update the implementation ranking for connected implementations and testers,
		// and only if all connected implementations and testers are included in the results,
		// and at least one result is live (not from cache).
		// These vars are used to track those conditions.
		$attachedImplementationZids = $targetFunction->getImplementationZids();
		$attachedTesterZids = $targetFunction->getTesterZids();
		$canUpdateImplementationRanking = false;

		// 2. For each selected implementation, run each selected tester

		// Exit early flags
		$exitEarly = false;
		$exitEarlyResponse = null;
		// Array of test results for each implementation:tester combination
		$responseArray = [];
		// Map of $implementationZid:$testerMap; used for implementation ranking
		$implementationMap = [];

		foreach ( $requestedImplementations as $implementation ) {
			// 2.a. Validate the implementation passed in the request, and if all goes well,
			// get all the details needed (zid, revision, inner object and whether its passed inline)
			[ $inlineImplementation,
				$implementationZid,
				$implementationObject,
				$implementationRevision,
				$implementationZError
			] = $this->validateRequestedObject( $implementation, ZTypeRegistry::Z_IMPLEMENTATION );

			// Initial validation of implementation went well! We prepare to iterate through the testers

			// 2.b. Re-use our copy of the target function, setting the implementations
			// to a list with just the one we're testing now
			$targetFunction->setValueByKey(
				ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS,
				new ZTypedList(
					ZTypedList::buildType( new ZReference( ZTypeRegistry::Z_IMPLEMENTATION ) ),
					$implementationObject
				)
			);

			// 3. For each tester passed in the request, perform function call
			// against the current implementation.

			// Map of $testerZid:$testResult for a particular implementation
			$testerMap = [];

			foreach ( $requestedTesters as $requestedTester ) {
				// 3.a. Validate the tester passed in the request, and if all goes well,
				// get all the details needed (zid, revision, inner object and whether its passed inline)
				[ $inlineTester,
					$testerZid,
					$testerObject,
					$testerRevision,
					$testerZError
				] = $this->validateRequestedObject( $requestedTester, ZTypeRegistry::Z_TESTER );

				// Initial validation of tester went well! We prepare to run the calls

				// 3.b. Initialize test result object
				$passed = true;
				$testResult = [
					'zFunctionId' => $functionZid,
					'zImplementationId' => $implementationZid,
					'zTesterId' => $testerZid
				];

				// 3.c. If there was any validation error, set test result as false and create error metadata
				if ( $implementationZError || $testerZError ) {
					$testResult[ 'validateStatus' ] = new ZBoolean( false );
					$testResult[ 'testMetadata' ] = ZResponseEnvelope::wrapInResponseMap(
						'validateErrors',
						$implementationZError ?: $testerZError
					);

					// Next implementation:test iteration
					$responseArray[] = $testResult;
					continue;
				}

				// 3.d. (T297707): Work out if this has been cached before (checking revisions of objects),
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

						$this->getLogger()->debug( 'Cache result hit: ' . $possiblyCachedResult->getZValue() );
						$testResult[ 'validateStatus' ] = $possiblyCachedResult->getZValue();
						$testResult[ 'testMetadata'] = $possiblyCachedResult->getZMetadata();

						// Update bookkeeping for the call to maybeUpdateImplementationRanking, if needed.
						// Implementation ranking only involves attached implementations and testers.
						if ( in_array( $testerZid, $attachedTesterZids ) &&
							in_array( $implementationZid, $attachedImplementationZids ) ) {
							$testerMap[$testerZid] = $testResult;
						}

						// Next implementation:test iteration
						$responseArray[] = $testResult;
						continue;
					}
				}

				// 3.e. If there was an exitEarly error, avoid execution and set result to exitEarlyRespone
				if ( $exitEarly ) {
					$testResult[ 'validateStatus' ] = new ZBoolean( false );
					$testResult[ 'testMetadata' ] = $exitEarlyResponse;

					// Next implementation:test iteration
					$responseArray[] = $testResult;
					continue;
				}

				// 3.f. Use tester to create a function call of the test case inputs
				$testFunctionCall = $testerObject->getValueByKey( ZTypeRegistry::Z_TESTER_CALL );
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall $testFunctionCall';

				// 3.g. Set the target function of the call to our modified copy of the
				// target function with only the current implementation.
				// It might not be the top level Z7K1, so descend down the nested function
				// call to find the position of the target before setting the new value.
				$testFunctionCall = ZObjectUtils::dereferenceZFunction(
					$testFunctionCall,
					$functionZid,
					$targetFunction
				);

				// 3.h. Execute the test case function call
				try {
					$flags = [ 'isUnsavedCode' => $inlineImplementation ];
					$response = $this->executeFunctionCall( $testFunctionCall, $flags );
				} catch ( ApiUsageException $e ) {
					// If reached concurrency limit, add failed response and stop further executions
					if ( $e->getCode() === HttpStatus::TOO_MANY_REQUESTS ) {
						$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [
							'message' => $e->getMessage()
						] );

						// We set $exitEarly flag and failed response for all following executions from the matrix
						$exitEarly = true;
						$exitEarlyResponse = ZResponseEnvelope::wrapInResponseMap( 'errors', $zError );

						$testResult[ 'validateStatus' ] = new ZBoolean( false );
						$testResult[ 'testMetadata' ] = $exitEarlyResponse;

						// Next implementation:test iteration
						$responseArray[] = $testResult;
						continue;
					}

					throw $e;
				}

				// 3.i. Get a valid Response Envelope/Z22 object by passing it through ZObjectFactory::create
				// If the orchestrator response is not valid, it will build and return a Response Envelope/Z22
				// with the error information in its 'errors' key.
				$testResultObject = $this->getResponseEnvelope(
					$response[ 'result' ],
					json_encode( $testFunctionCall )
				);
				$testMetadata = $testResultObject->getValueByKey( ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA );
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap $testMetadata';

				// 3.i. Validate test result.
				// (T394107) Don't let a type error from this being invalid result in a server-side error
				$validateTestValue = $testResultObject->getZValue();
				if ( !( $validateTestValue instanceof ZObject ) ) {
					$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [
						'message' => wfMessage( 'wikilambda-performtest-error-invalidtester', $testerZid )->text()
					] );
					$testResult[ 'validateStatus' ] = new ZBoolean( false );
					$testResult[ 'testMetadata' ] = ZResponseEnvelope::wrapInResponseMap( 'validateErrors', $zError );

					// Next implementation:test iteration
					$responseArray[] = $testResult;
					continue;
				}

				// 3.j. Use tester to create a function call validating the output
				$validateFunctionCall = $testerObject->getValueByKey( ZTypeRegistry::Z_TESTER_VALIDATION );
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall $validateFunctionCall';

				$targetValidationFunctionZID = $validateFunctionCall->getZValue();
				$validateFunctionCall->setValueByKey( $targetValidationFunctionZID . 'K1', $validateTestValue );

				// 3.k. Execute the validation function call
				try {
					$flags = [ 'validate' => false ];
					$response = $this->executeFunctionCall( $validateFunctionCall, $flags );
				} catch ( ApiUsageException $e ) {
					// If reached concurrency limit, add failed response and stop further executions
					if ( $e->getCode() === HttpStatus::TOO_MANY_REQUESTS ) {
						$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [
							'message' => $e->getMessage()
						] );

						// We set $exitEarly flag and failed response for all following executions from the matrix
						$exitEarly = true;
						$exitEarlyResponse = ZResponseEnvelope::wrapInResponseMap( 'errors', $zError );

						$testResult[ 'validateStatus' ] = new ZBoolean( false );
						$testResult[ 'testMetadata' ] = $exitEarlyResponse;

						// Next implementation:test iteration
						$responseArray[] = $testResult;
						continue;
					}

					throw $e;
				}

				// 3.i. Get a valid Response Envelope/Z22 object by passing it through ZObjectFactory::create
				// If the orchestrator response is not valid, it will build and return a Response Envelope/Z22
				// with the error information in its 'errors' key.
				$validateResult = $this->getResponseEnvelope(
					$response[ 'result' ],
					json_encode( $validateFunctionCall )
				);

				// 3.l. If the test result doesn't match the expected result, set test failure and metadata
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

				// 3.m. (T297707): Store this response in a DB table for faster future responses.
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

				// Update bookkeeping for the call to maybeUpdateImplementationRanking, if needed.
				// Implementation ranking only involves attached implementations and testers.
				if ( in_array( $testerZid, $attachedTesterZids ) &&
					in_array( $implementationZid, $attachedImplementationZids ) ) {
					$testerMap[$testerZid] = $testResult;
					// Since this $testResult is "live" (not from cache), indicating that the
					// function, implementation, or tester has changed, we should check
					// if there is an improved implementation ranking
					// TODO (T330370): Revisit this strategy when we have more experience with it
					$canUpdateImplementationRanking = true;
				}
			}

			// Update bookkeeping for the call to maybeUpdateImplementationRanking, if needed.
			if ( in_array( $implementationZid, $attachedImplementationZids ) ) {
				$implementationMap[ $implementationZid ] = $testerMap;
			}
		}

		// 4. Maybe update implementation ranking (in persistent storage)
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
				__METHOD__ . ' Not updating {functionZid} implementation ranking; no live results',
				[
					'functionZid' => $functionZid,
					'canUpdateImplementationRanking' => $canUpdateImplementationRanking
				]
			);
		}

		// 5. Return the response.
		$pageResult->addValue( [ 'query' ], $this->getModuleName(), $responseArray );
	}

	/**
	 * Given an item passed as an input in the zimplementations or the ztesters
	 * arrays, it validates the input value and returns the broken down data
	 * needed to perform the execution of each test vs each implementation.
	 *
	 * In the case of any validation errors, if the object is inline, we will
	 * directly die with error. In the case of validation errors for references
	 * we will return the error, which will be attached to the result matrix in
	 * the request. This is because inline errors occur on edit/create pages of
	 * test/implementation, and the inline object will be the only one for that type.
	 *
	 * The data returned is an array containing:
	 * * isInline: whether the object passed is an inline object instead of a reference
	 * * objectZid: the zid of the implementation or test
	 * * innerObject: the value of the object, which can be the zid or literal Z14
	 *   in the case of implementations, and will be the literal Z20 in case of testers.
	 * * revision: the latest revision ID, which will be used for caching
	 * * zError: error to attach to the result matrix (if anything went wrong and the
	 *   input object is not an inline literal)
	 *
	 * @param ZObject|\stdClass|string $object - requested object (implementation or tester)
	 * @param string $type - either 'Z14' or 'Z20'
	 * @return array
	 */
	private function validateRequestedObject( $object, $type ) {
		$isInline = false;

		$isImplementation = $type === ZTypeRegistry::Z_IMPLEMENTATION;
		$createPermission = $isImplementation ?
			'wikilambda-create-implementation' :
			'wikilambda-create-tester';
		$nonObjectMessge = $isImplementation ?
			'wikilambda-performtest-error-nonimplementation' :
			'wikilambda-performtest-error-nontester';
		$invalidObjectMessge = $isImplementation ?
			'wikilambda-performtest-error-invalidimplementation' :
			'wikilambda-performtest-error-invalidtester';

		// If object is a string, it was passed as a parameter in the request;
		// decode it to see if it's a zid (persisted) or an inline object (not persisted)
		if ( is_string( $object ) ) {
			// (T358089) Decode any '|' characters of ZObjects that were escaped for the API transit
			$object = str_replace( '🪈', '|', $object );
			$decodedJson = FormatJson::decode( $object );
			if ( $decodedJson ) {
				// If the input is a JSON, we have received an inline implementation.

				// NOTE on errors:
				// In the case of inline object, we know there will only be one, so any failure
				// while validating it will be a non-recoverable error, and we will die without
				// iterating to other items in the list. This will happen only in the FunctionReport
				// widget in create/edit implementation/tester pages.
				$isInline = true;

				// If we are received an inline implementation, check that user has the necessary special rights
				if ( !$this->getContext()->getAuthority()->isAllowed( $createPermission ) ) {
					// Non-recoverable Failure: if implementation creation is not authorized, we end the request.
					$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
					WikiLambdaApiBase::dieWithZError( $zError, HttpStatus::FORBIDDEN );
				}

				try {
					// For an inline implementation, check that the ZObject is valid
					$object = ZObjectFactory::create( $decodedJson );
				} catch ( ZErrorException $e ) {
					// Non-recoverable Failure: if this implementation is not valid, we end the request.
					$this->dieWithError(
						[ $invalidObjectMessge, $e->getZErrorMessage() ],
						null, null, HttpStatus::BAD_REQUEST
					);
				}

				// For an inline implementation, check that the ZObject is an implementation/Z14
				// or a persisted object/Z2 containing an implementation/Z14
				if ( (
					( $object instanceof ZPersistentObject ) &&
					( $object->getInternalZType() !== $type )
				) || (
					!( $object instanceof ZPersistentObject ) &&
					( $object->getZType() !== $type )
				) ) {
					// Non-recoverable Failure: if this is not an implementation, we end the request.
					$this->dieWithError(
						[ $nonObjectMessge, $object ],
						null, null, HttpStatus::BAD_REQUEST
					);
				}

			} else {
				// If the input is not a JSON, we assume that we have received a Zid
				$object = new ZReference( $object );
			}
		}

		// Get the object zid (value if it's a reference, or identity if persistent object)
		$objectZid = ZObjectUtils::getZid( $object );

		// If the object is a reference (not inline):
		// * get its revision ID, and
		// * check that it exists and belongs to the right type
		$revision = null;
		$innerObject = null;
		$zError = null;
		$fetchedObject = null;
		if ( !$isInline ) {
			$title = Title::newFromText( $objectZid, NS_MAIN );

			if ( !$title || !( $title instanceof Title ) || !$title->exists() ) {
				$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [
					'message' => wfMessage( $nonObjectMessge, $object )->text()
				] );
			} else {
				$revision = $title->getLatestRevID();
			}

			if ( !$zError ) {
				$fetchedObject = $this->zObjectStore->fetchZObjectByTitle( $title )->getInnerZObject();
				if ( $fetchedObject->getZType() !== $type ) {
					$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [
						'message' => wfMessage( $nonObjectMessge, $object )->text()
					] );
				}
			}
		}

		if ( !$zError ) {
			$innerObject = $isImplementation ?
				$this->getImplementationObject( $object ) :
				$this->getTesterObject( $object, $fetchedObject );
		}

		return [
			$isInline,
			$objectZid,
			$innerObject,
			$revision,
			$zError
		];
	}

	/**
	 * Return a ZObject with a reference or a literal implementation.
	 * If the input ZObject has a persisted object containing a non-implementation,
	 * die with ApiUsageException.
	 *
	 * @param ZObject $zobject - either a reference, or a literal implementation or persistent object
	 * @return ZObject
	 * @throws ApiUsageException
	 */
	private function getImplementationObject( $zobject ) {
		// Input implementation was passed inline (as a literal persistent object):
		if ( $zobject->getZType() === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
			return $zobject->getValueByKey( ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE );
		}

		// Input implementation was passed inline (as a literal implementation), or
		// input implementation was passed as a reference:
		if (
			$zobject->getZType() === ZTypeRegistry::Z_IMPLEMENTATION ||
			$zobject->getZType() === ZTypeRegistry::Z_REFERENCE
		) {
			return $zobject;
		}

		// This should never happen, as validation should have taken care of this.
		// log an error and die:
		$this->getLogger()->error(
			__METHOD__ . ' expected implementation but found something else',
			[ 'zobject' => $zobject ]
		);

		$this->dieWithError(
			[ "wikilambda-performtest-error-nonimplementation", $zobject ],
			null,
			null,
			HttpStatus::BAD_REQUEST
		);
	}

	/**
	 * Return a ZObject with a literal tester.
	 * * If the tester object was passed inline, return that
	 * * If the tester object was passed as a reference, return the fetched
	 *
	 * @param ZObject $zobject
	 * @param ZObject|null $fetched
	 * @return ZObject
	 * @throws ApiUsageException
	 */
	private function getTesterObject( $zobject, $fetched ) {
		// Input tester was passed inline (as a literal persistent object):
		if ( $zobject->getZType() === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
			return $zobject->getValueByKey( ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE );
		}

		// Input tester was passed inline (as a literal tester):
		if ( $zobject->getZType() === ZTypeRegistry::Z_TESTER ) {
			return $zobject;
		}

		// Input tester was passed as a reference: we want the literal tester, which should be fetched:
		if ( $zobject->getZType() === ZTypeRegistry::Z_REFERENCE && ( $fetched !== null ) ) {
			return $fetched;
		}

		// This should never happen, as validation should have taken care of this.
		// log an error and die:
		$this->getLogger()->error(
			__METHOD__ . ' expected tester but found something else',
			[ 'zobject' => $zobject ]
		);

		$this->dieWithError(
			[ "wikilambda-performtest-error-nontester", $zobject ],
			null,
			null,
			HttpStatus::BAD_REQUEST
		);
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
		// Don't try to read the latest ZID from the DB on client wikis, we can't.
		$exampleZid =
			( MediaWikiServices::getInstance()->getMainConfig()->get( 'WikiLambdaEnableRepoMode' ) ) ?
			$this->zObjectStore->findFirstZImplementationFunction() :
			'Z10000';

		$queryPrefix = 'action=wikilambda_perform_test&format=json&wikilambda_perform_test_zfunction=';

		return [
			$queryPrefix . $exampleZid
				=> 'apihelp-wikilambda_perform_test-example',
			$queryPrefix . 'Z801'
				=> 'apihelp-wikilambda_perform_test-z801',
			$queryPrefix . 'Z801&wikilambda_perform_test_zimplementations=Z901'
				=> 'apihelp-wikilambda_perform_test-z801-implementation',
			$queryPrefix . 'Z801&wikilambda_perform_test_ztesters=Z8010|Z8011'
				=> 'apihelp-wikilambda_perform_test-z801-tester',
			$queryPrefix . 'Z801&wikilambda_perform_test_zimplementations=Z901&wikilambda_perform_test_ztesters=Z8010'
				=> 'apihelp-wikilambda_perform_test-z801-implementation-and-testers',
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
	 * TODO (T329138): Consider possible refinements to the ranking strategy.
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
			$logger->debug(
				__METHOD__ . ' Not updating {functionZid}: Implementation count <= 1',
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
			$logger->debug(
				__METHOD__ . ' Not updating {functionZid}: Missing results for attached implementations or testers',
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
				$averageTime += self::getNumericMetadataValue( $metadataMap, 'orchestrationDuration' );
			}
			$averageTime /= count( $testerMap );
			$implementationMap[ $implementationZid ][ 'numFailed' ] = $numFailed;
			$implementationMap[ $implementationZid ][ 'averageTime' ] = $averageTime;
		}

		uasort( $implementationMap, [ self::class, 'compareImplementationStats' ] );
		// Get the ranked Zids

		// Bail out if the new first element is the same as the previous
		$newFirst = array_key_first( $implementationMap );
		if ( $newFirst === $previousFirst ) {
			$logger->debug(
				__METHOD__ . ' Not updating {functionZid}: Same first element',
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
			$logger->debug(
				__METHOD__ . ' Not updating {functionZid}: New first element only marginally better than previous',
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
			__METHOD__ . ' Creating UpdateImplementationsJob for {functionZid}',
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
