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
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Jobs\CacheTesterResultsJob;
use MediaWiki\Extension\WikiLambda\Jobs\ExecuteTestAndCacheJob;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZBoolean;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunction;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\Json\FormatJson;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use Wikimedia\ParamValidator\ParamValidator;

class ApiPerformTest extends WikiLambdaApiBase {

	// Function variables
	private ZFunction $function;
	private string $functionZid;
	private int $functionRevision;

	private array $connectedImplementations = [];
	private array $connectedTests = [];
	private array $memoizedObjectData = [];

	public function __construct(
		ApiMain $mainModule,
		string $moduleName,
		OrchestratorRequest $orchestrator,
		private readonly ZObjectStore $zObjectStore,
		private readonly JobQueueGroup $jobQueueGroup
	) {
		parent::__construct( $mainModule, $moduleName, 'wikilambda_perform_test_' );

		$this->setUp( $orchestrator );
	}

	/**
	 * Runs a matrix of Testers against Implementations for a given Function and returns the results
	 * of each test/implementation pair.
	 *
	 * Request parameters:
	 * ===================
	 * * zfunction (required): Zid of the Z8/Function to test. When called alone (no values for the
	 *   implementations or the tests array), it will test the matrix of all the connected tests and
	 *   implementations.
	 * * zimplementations (optional): List of implementations to test. Every item can be a Zid or a
	 *   literal implementation. However, when passed a literal, that is normally considered the only
	 *   implementation to test.
	 * * ztesters (optional): List of tests to perform. Every item can be a zid or a literal test object.
	 *   When passed as a literal, it is normally the only item.
	 *
	 * Response:
	 * =========
	 * For each implementation/tester pair, returns an item with the following info for each test:
	 * * zFunctionId
	 * * zImplementationId
	 * * zTesterId
	 * * validateStatus: Z40/Boolean indicating whether the test passed
	 * * testMetadata: Z22K2 metadata map from the orchestrator response. Contains the response of
	 *   the initial test call, enriched with new keys containing different circumstances encountered
	 *   by the test execution (e.g. actual result vs. expected result, cache-related keys, etc.)
	 *
	 * This API has no synchronous execution, so it should return the matrix of values
	 * immediately. The matrix of values contains all the items requested, it will not
	 * remove expected results from the response.
	 *
	 * Internal logic:
	 * ===============
	 * For each implementation-test pair to run:
	 * 1. We try to getch the test result from the test result cache (DB table wikilambda_ztester_results)
	 * 2. If not stored, we orchestrate the test execution:
	 *    2.a. We resolve the test call/Z20K2
	 *    2.b. We use the response from the test call to build the validation call.
	 *    2.c. We resolve the validation call.
	 *    These two calls are fetched from the function call cache. At any point, if any call
	 *    is missing from the cache, then the test cannot be resolved immediately, so a "pending"
	 *    response is added to the response matrix.
	 * 3. For every test response in a pending state and needs to be fully executed, queue an
	 *    executeTestAndCache job
	 * 4. For every test response that is ready but not stored in the test results table: queue
	 *    a cacheTesterResults job.
	 *
	 * @inheritDoc
	 */
	protected function run() {
		$params = $this->extractRequestParams();
		$pageResult = $this->getResult();

		$this->functionZid = $params[ 'zfunction' ];

		$requestedImps = $params[ 'zimplementations' ] ?: [];
		$requestedTesters = $params[ 'ztesters' ] ?: [];

		// 1. Work out the matrix of implementations/testers that we want to run

		// 1.a. Check that Function exists
		$targetTitle = Title::newFromText( $this->functionZid, NS_MAIN );
		if ( !$targetTitle || !( $targetTitle->exists() ) ) {
			$this->dieWithError(
				[ "wikilambda-performtest-error-unknown-zid", $this->functionZid ],
				null,
				null,
				HttpStatus::NOT_FOUND
			);
		}

		// 1.b. Check that Function Zid belongs to an object of the right type (Z8/Function)
		$targetObject = $this->zObjectStore->fetchZObjectByTitle( $targetTitle );
		if ( $targetObject->getZType() !== ZTypeRegistry::Z_FUNCTION ) {
			$this->dieWithError(
				[ "wikilambda-performtest-error-nonfunction", $this->functionZid ],
				null,
				null,
				HttpStatus::BAD_REQUEST
			);
		}

		// Initialize the function globals
		$this->functionRevision = $targetTitle->getLatestRevID();
		$functionObject = $targetObject->getInnerZObject();
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunction $functionObject';

		// Set globally function object, connected implementations and connected tests
		$this->function = $functionObject;
		$this->connectedImplementations = $functionObject->getImplementationZids();
		$this->connectedTests = $functionObject->getTesterZids();

		// 1.c. If no specific implementation Zids are passed in the request, test all of them (connected ones)
		if ( !count( $requestedImps ) ) {
			$implementationsTemp = $functionObject->getValueByKey( ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $implementationsTemp';
			$requestedImps = $implementationsTemp->getAsArray();
		}

		// 1.d. If no specific tester Zids are passed in the request, run all of them (connected ones)
		if ( !count( $requestedTesters ) ) {
			$testsTemp = $functionObject->getValueByKey( ZTypeRegistry::Z_FUNCTION_TESTERS );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $testsTemp';
			$requestedTesters = $testsTemp->getAsArray();
		}

		// 2. For each selected implementation, run each selected tester

		// Array of test results for each implementation:tester combination
		$responseArray = [];

		foreach ( $requestedImps as $requestedImp ) {
			// 2.a. Validate the implementation passed in the request, and if all goes well,
			// get all the details needed (zid, revision, inner object and whether its passed inline)
			$implementation = $this->validateRequestedObject( $requestedImp, ZTypeRegistry::Z_IMPLEMENTATION );

			// 2.b. Re-use our copy of the target function, setting the implementations
			// to a list with just the one we're testing now
			$functionObject->setValueByKey(
				ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS,
				new ZTypedList(
					ZTypedList::buildType( new ZReference( ZTypeRegistry::Z_IMPLEMENTATION ) ),
					$implementation[ 'object' ]
				)
			);

			// 3. For each tester passed in the request, perform function call
			// against the current implementation.
			foreach ( $requestedTesters as $requestedTester ) {
				// 3.a. Validate the tester passed in the request, and if all goes well,
				// get all the details needed (zid, revision, inner object and whether its passed inline)
				$test = $this->validateRequestedObject( $requestedTester, ZTypeRegistry::Z_TESTER );

				// 3.b. Initialize test result item
				$testResult = [
					'zFunctionId' => $this->functionZid,
					'zImplementationId' => $implementation['zid'],
					'zTesterId' => $test['zid'],
				];

				// 3.c. If there was any validation error, set test result as false and create error metadata
				if ( $implementation['zError'] || $test['zError'] ) {
					$testResult['validateStatus'] = new ZBoolean( false );
					$testResult['testMetadata'] = ZResponseEnvelope::wrapInResponseMap(
						'validateErrors', $implementation['zError'] ?: $test['zError']
					);

					// Continue to next implementation:test iteration
					$responseArray[] = $testResult;
					continue;
				}

				// Initial validation of implementation and tester went well!
				$testResult = array_merge( $testResult,
					$this->getTestResultForImplementation( $implementation, $test ) );

				// Serialize and encode the responses; validateStatus and testMetadata are ZObjects
				$testResult[ 'validateStatus' ] = json_encode( $testResult[ 'validateStatus' ]->getSerialized() );
				$testResult[ 'testMetadata' ] = json_encode( $testResult[ 'testMetadata' ]->getSerialized() );

				// Stash the response
				$responseArray[] = $testResult;
			}
		}

		// 5. Return the response.
		$pageResult->addValue( [ 'query' ], $this->getModuleName(), $responseArray );
	}

	/**
	 * Returns the result of running a test against an implementation:
	 * * See if the execution response is stored in the test result cache
	 * * Run orchestrateTestExecution with evaluateOnMiss=false
	 * * If both calls are available, return the response and persist it in the test results cache.
	 * * If one call is not available, return pending and execute the test via an async job.
	 *
	 * @param array $implementation
	 * @param array $test
	 * @return array
	 */
	private function getTestResultForImplementation( array $implementation, array $test ): array {
		$passed = true;
		$testResult = [];
		$logContext = [
			'functionZid' => $this->functionZid,
			'functionRevision' => $this->functionRevision,
			'implementationZid' => $implementation['zid'],
			'implementationRevision' => $implementation['revision'],
			'testZid' => $test['zid'],
			'testRevision' => $test['revision']
		];

		// 1. If test and implementation have revision Ids (aren't inline literals), check test result table
		$inlineTest = $test['revision'] === null;
		$inlineImplementation = $implementation['revision'] === null;

		if ( !$inlineTest && !$inlineImplementation ) {
			$cachedResult = $this->zObjectStore->findZTesterResult(
				$this->functionZid,
				$this->functionRevision,
				$implementation['zid'],
				$implementation['revision'],
				$test['zid'],
				$test['revision'],
			);

			// 1.a. Cache hit on the first level! We return the stored value,
			// which should already have info about where and when it was cached
			if ( $cachedResult !== null ) {
				$this->getLogger()->debug( __CLASS__ . ' Test results are cached', $logContext + [
					'cached' => $cachedResult->getZValue()->getSerialized()
				] );

				$testResult['validateStatus'] = $cachedResult->getZValue();
				$testResult['testMetadata'] = $cachedResult->getZMetadata();

				return $testResult;
			}
		}

		// 2. Orchestrate the test execution
		// =================================

		// 2.a. Use tester to create a function call of the test case inputs
		$testObject = $test['object'];
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZObject $testObject';

		$testFunctionCall = $testObject->getValueByKey( ZTypeRegistry::Z_TESTER_CALL );
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall $testFunctionCall';

		$validationCall = $testObject->getValueByKey( ZTypeRegistry::Z_TESTER_VALIDATION );
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall $validationCall';

		// 2.b. Set the target function of the call to our modified copy of the
		// target function with only the current implementation.
		// It might not be the top level Z7K1, so descend down the nested function
		// call to find the position of the target before setting the new value.
		$testDereferencedCall = ZObjectUtils::dereferenceZFunction(
			$testFunctionCall,
			$this->functionZid,
			$this->function
		);

		// 2.c. execute without evaluation on miss
		// * can return false,
		// * won't ever throw OrchestratorException or TimeoutException
		$result = $this->orchestrator->orchestrateTestExecution(
			$testDereferencedCall,
			$validationCall->getSerialized(),
			/* evaluateOnMiss= */ false
		);

		// 2.d. at least one of the necessary function calls is not cached :(
		if ( $result === false ) {
			$this->getLogger()->debug(
				__CLASS__ . ' Test calls are not cached: creating new ExecuteTestAndCacheJob',
				$logContext
			);

			// Before queuing an execution job, make sure the user has the right permission
			if ( !$this->getContext()->getAuthority()->isAllowed( 'wikilambda-execute' ) ) {
				$this->failWithPermissionDenied( 'wikilambda-execute', $testDereferencedCall );
			}

			// This job should be able to execute the whole test
			// no matter which call miss has caused the re-execution.
			$executeTestJob = new ExecuteTestAndCacheJob( [
				// Initial test call already dereferenced with the literal function
				'testCall' => $testDereferencedCall,
				// Validation call without K1 (which will be replaced with test call result)
				'validationCall' => $validationCall->getSerialized(),
				// Function, implementation and test data
				'functionZid' => $this->functionZid,
				'functionRevision' => $this->functionRevision,
				'firstImplementation' => $this->connectedImplementations[0] ?? null,
				'implementationZid' => $implementation['zid'],
				'implementationRevision' => $implementation['revision'],
				'testZid' => $test['zid'],
				'testRevision' => $test['revision'],
			] );
			$this->jobQueueGroup->push( $executeTestJob );

			// Return a pending response
			$failedResponse = ZResponseEnvelope::wrapInResponseMap( 'pending', new ZBoolean( true ) );
			$testResult['validateStatus'] = new ZBoolean( false );
			$testResult['testMetadata'] = $failedResponse;

			return $testResult;
		}

		// 3. Cache through an asynchronous job
		// ====================================
		$testMetadata = $result['metadata'];
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap $testMetadata';

		// We can only do this for persisted revisions, not inline items, as we can't
		// version them otherwise, so use truthiness (neither null nor 0, non-extant).
		// We also only do this if the validation step didn't have an error itself.
		if ( !$inlineImplementation && !$inlineTest && !$result['hasErrors'] ) {
			// Store a fake ZResponseEnvelope of the validation result and the real metadata
			// via an asynchronous job so that we don't trigger a "DB write on API GET" error
			$this->getLogger()->debug(
				__CLASS__ . ' Test calls are cached: creating new CacheTesterResultsJob',
				$logContext
			);

			$stashedResult = new ZResponseEnvelope( $result['value'], $testMetadata );

			// Create and push job to update the stored result
			$cacheTesterResultsJob = new CacheTesterResultsJob( [
				'functionZid' => $this->functionZid,
				'functionRevision' => $this->functionRevision,
				'implementationZid' => $implementation['zid'],
				'implementationRevision' => $implementation['revision'],
				'testZid' => $test['zid'],
				'testRevision' => $test['revision'],
				'passed' => $result['passed'],
				'stashedResult' => $stashedResult->getSerialized()
			] );
			$this->jobQueueGroup->push( $cacheTesterResultsJob );
		}

		$testResult['validateStatus'] = $result['value'];
		$testResult['testMetadata'] = $testMetadata;
		return $testResult;
	}

	/**
	 * Validates an implementation or test object before adding it to the
	 * test result matrix and proceeding to its test evaluation.
	 *
	 * The input object could be:
	 * * If received through the API parameters, it will be a string,
	 *   which can contain a zid, or a literal test or implementation.
	 * * Else, it will be a ZObject (most likely a ZReference), stored
	 *   in the ZFunction object.
	 *
	 * Permission errors will be thrown immediately and will cause the API to die.
	 * Validation errors will be added to the result matrix.
	 *
	 * The data returned is an array containing:
	 * * zid: the zid of the implementation or test
	 * * object: the value of the object, which can be the zid or literal Z14
	 *   in the case of implementations, and will be the literal Z20 in case of testers.
	 * * revision: the latest revision ID, which will be used for caching
	 * * inline: boolean flag that indicates whether the object was passed
	 *   as an inline literal object rather than a reference
	 *   to the function or disconnected
	 * * zError: error to attach to the result matrix
	 *
	 * @param ZObject|string $object - object to validate for the given type
	 * @param string $type - either 'Z14' or 'Z20'
	 * @return array
	 */
	protected function validateRequestedObject( $object, $type ): array {
		// If this was validated in a previous iteration, don't do it again
		$memoized = $this->getMemoizedObjectData( $object );
		if ( is_array( $memoized ) ) {
			return $memoized;
		}

		// Prepare response array:
		$response = [
			'zid' => null,
			'object' => null,
			'revision' => null,
			'zError' => null
		];

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

			// Validate literal input
			// ======================
			if ( $decodedJson ) {
				// If the input is a JSON, we have received an inline implementation.
				$userAuthority = $this->getContext()->getAuthority();
				// Non-recoverable Failure: if creation is not authorized, we end the request.
				if ( !$userAuthority->isAllowed( $createPermission ) ) {
					$this->failWithPermissionDenied( $createPermission, $decodedJson );
				}
				// Non-recoverable Failure: user is not authorized to run inline implementation
				if ( $isImplementation && !$userAuthority->isAllowed( 'wikilambda-execute-unsaved-code' ) ) {
					$this->failWithPermissionDenied( 'wikilambda-execute-unsaved-code', $decodedJson );
				}

				try {
					// For an inline object, create the ZObject instance with the factory
					$object = ZObjectFactory::create( $decodedJson );
				} catch ( ZErrorException ) {
					// ZObjectFactory::create threw a ZErrorException because the object
					// wasn't valid: set response zError and return immediately
					$response['zError'] = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [
						'message' => wfMessage( $invalidObjectMessge )->text()
					] );
					return $response;
				}

				// The inline object is a valid object: check that it contains the right type
				// (it can be wrapped in a persistent object or be directly a literal implementation or test)
				$isPersistentObj = $object instanceof ZPersistentObject;
				$objectType = $isPersistentObj ? $object->getInternalZType() : $object->getZType();

				if ( $objectType !== $type ) {
					// The type is something else: set response zError and return immediately
					$response['zError'] = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [
						'message' => wfMessage( $nonObjectMessge, (string)$object )->text()
					] );
					return $response;
				}

				// object must have a ZObject; eiter a ZTest or ZImplementation or a ZReference
				$response['object'] = $isPersistentObj ? $object->getInnerZObject() : $object;
				return $response;
			}

			// object was a Zid, convert into a ZReference and continue
			$object = new ZReference( $object );
		}

		// Validate reference
		// ==================

		if ( !( $object instanceof ZReference ) ) {
			// At this point this should not happen, as no literal tests or implementations
			// should be stored inside Z8K3 or Z8K4, but let's make sure nonetheless:
			$response['zError'] = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [
				'message' => wfMessage( $nonObjectMessge, (string)$object )->text()
			] );
		}

		// At this point, $object is a ZReference for sure:
		$response['zid'] = $object->getZValue();

		// Check the zid is a valid title
		$title = Title::newFromText( $response['zid'], NS_MAIN );
		if ( !$title || !( $title instanceof Title ) || !$title->exists() ) {
			$response['zError'] = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [
				'message' => wfMessage( $nonObjectMessge, $response['zid'] )->text()
			] );
			return $response;
		}

		// Check the zid belongs to an object of the right type
		$fetchedObject = $this->zObjectStore->fetchZObjectByTitle( $title )->getInnerZObject();
		if ( $fetchedObject->getZType() !== $type ) {
			$response['zError'] = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [
				'message' => wfMessage( $nonObjectMessge, $response['zid'] )->text()
			] );
			return $response;
		}

		// IMPORTANT!
		// If the type is test, we need to resolve it and get the literal object
		// as well, because the caller is ALWAYS gonna need the test object in order
		// to run separately the call and validation call.
		$response['object'] = $isImplementation ? $object : $fetchedObject;
		$response['revision'] = $title->getLatestRevID();

		$this->setMemoizedObjectData( $response );

		return $response;
	}

	/**
	 * Keeps the already validated object data for future iterations
	 * to retrieve. When requesting a matrix of implementations and
	 * testers (e.g. for a function page), the inner loop (tests)
	 * walks the list of tests for each of the outer implementation.
	 * We memoize these validated objects to avoid running the same
	 * validation operation N*M times, as it contains some expensive
	 * logic (deserialization using ZObjectFactory and DB fetches)
	 *
	 * Only stores when the validated object was given as a zid.
	 *
	 * @param array $response
	 */
	private function setMemoizedObjectData( array $response ): void {
		if ( is_string( $response[ 'zid' ] ) ) {
			$this->memoizedObjectData[ $response[ 'zid' ] ] = $response;
		}
	}

	/**
	 * Returns the memoized resulg of validating an input object and
	 * creating its array of object data. Returns false if nothing
	 * was stored yet.
	 *
	 * Only retrieves when the object to validate is given as a zid.
	 *
	 * @param ZObject|string $object
	 * @return array|false
	 */
	private function getMemoizedObjectData( ZObject|string $object ): array|false {
		if ( is_string( $object ) && array_key_exists( $object, $this->memoizedObjectData ) ) {
			return $this->memoizedObjectData[ $object ];
		}
		return false;
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
	 * @inheritDoc
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
}
