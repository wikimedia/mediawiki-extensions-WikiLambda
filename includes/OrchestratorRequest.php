<?php
/**
 * WikiLambda Orchestrator Interface base class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\GuzzleException;
use GuzzleHttp\Exception\TooManyRedirectsException;
use JsonException;
use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjects\ZBoolean;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Json\FormatJson;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Utils\GitInfo;
use Psr\Http\Message\ResponseInterface;
use Psr\Log\LoggerInterface;
use stdClass;
use Wikimedia\RequestTimeout\TimeoutException;
use Wikimedia\Telemetry\TracerInterface;

class OrchestratorRequest {

	protected string $userAgentString;
	protected MemcachedWrapper $objectCache;
	protected TracerInterface $tracer;
	protected LoggerInterface $logger;

	public const FUNCTIONCALL_CACHE_KEY_PREFIX = 'WikiLambdaFunctionCall';

	/**
	 * The specialised request interface to control all network access to the function-orchestrator.
	 *
	 * @param Client $guzzleClient GuzzleHttp Client used for requests
	 */
	public function __construct( protected readonly Client $guzzleClient ) {
		// We generate a user agent string for better traceability of requests
		$this->userAgentString = 'wikifunctions-request/' . MW_VERSION;
		$gitInfo = new GitInfo( MW_INSTALL_PATH . '/extensions/WikiLambda' );
		$gitHash = $gitInfo->getHeadSHA1();
		if ( $gitHash !== false ) {
			$this->userAgentString .= '-WL' . substr( $gitHash, 0, 8 );
		}

		// Non-injected items
		$this->tracer = MediaWikiServices::getInstance()->getTracer();
		$this->objectCache = WikiLambdaServices::getMemcachedWrapper();

		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );
	}

	/**
	 * Returns the orchestrator host
	 *
	 * @return string
	 */
	public function getHost(): string {
		return $this->guzzleClient->getConfig( 'base_uri' );
	}

	/**
	 * Returns the evaluated result for a given function call.
	 *
	 * First checks whether the value is cached. If miss, it requests the
	 * evaluation to the backend services. When the new value returns, it
	 * sets it in the cache.
	 *
	 * The following flags alter the cache-related behavior:
	 * * If bypassCache is true, sends the request directly to the orchestrator and
	 *   does not update the cached value.
	 * * If evaluateOnMis is false, after a cache miss it returns false, rather than
	 *   triggering a call
	 *
	 * @param array $query
	 * @param bool $bypassCache - Whether to bypass the MediaWiki-side function call cache; this is
	 *   only to be used for special circumstances, as it's potentially expensive.
	 * @param bool $evaluateOnMiss - Whether to make an http request to the evaluate endpoint on cache miss.
	 *   Default behavior is true, but we can disable this flag if we want to orchestrate asynchronous
	 *   calls when there's no cached result (e.g. with bulk requests).
	 * @return array|false containing Response object (Z22) returned by orchestrator, down-cast to a string
	 *   and the actual http status code from the Orchestrator
	 * @throws OrchestratorException on any transport failure
	 */
	public function orchestrate(
		array $query,
		$bypassCache = false,
		$evaluateOnMiss = true
	): array|false {
		// (T365053) Propagate request tracing headers
		$requestHeaders = $this->tracer->getRequestHeaders();
		$requestHeaders['User-Agent'] = $this->userAgentString;

		// 1. Get from memcached (if bypassCache is unset)
		$requestKey = '';
		if ( !$bypassCache ) {
			$requestKey = $this->objectCache->makeKey(
				self::FUNCTIONCALL_CACHE_KEY_PREFIX,
				ZObjectUtils::makeCacheKeyFromZObject( $query )
			);

			$response = $this->objectCache->get( $requestKey );

			// 1.a. Cache hit, exit early with validated cached value
			if ( $response !== false ) {
				$this->logger->debug( __METHOD__ . ' cache hit for {key}', [ 'key' => $requestKey ] );
				return $this->validateCachedResponse( $response, $requestKey );
			}

			// 1.b. Cache miss, re-evaluate or return false (if evaluateOnMiss is unset)
			$this->logger->info( __METHOD__ . ' cache miss for {key}', [ 'key' => $requestKey ] );
			if ( !$evaluateOnMiss ) {
				return false;
			}
		}

		// 2. Call the orchestrator
		try {
			$response = $this->handleGuzzleRequestForEvaluate( $query, $requestHeaders );
		} catch ( GuzzleException $e ) {
			throw new OrchestratorException( $e->getMessage(), $query, 0, $e );
		}

		// 3. Store in the cache (if bypassCache is unset)
		if ( !$bypassCache ) {
			// (T338243) Set TTL conditionally:
			// * success (http 200)           TTL_MONTH
			// * bad request (http 400-422)   TTL_WEEK
			// * too many requests (http 429) TTL_MINUTE
			// * server error (http >= 500)   TTL_MINUTE
			$httpStatus = $response['httpStatusCode'] ?? HttpStatus::INTERNAL_SERVER_ERROR;
			$loggerArgs = [ __METHOD__ . ' evaluated response for {key} returned HTTP {status}', [
				'key' => $requestKey,
				'status' => $httpStatus
			] ];

			// Default: All possible bad request status, set to TTL_WEEK
			$exptime = $this->objectCache::TTL_WEEK;

			if (
				( $httpStatus >= HttpStatus::INTERNAL_SERVER_ERROR ) ||
				( $httpStatus === HttpStatus::TOO_MANY_REQUESTS )
			) {
				// Recoverable system errors: set to TTL_MINUTE
				$exptime = $this->objectCache::TTL_MINUTE;
				$this->logger->warning( ...$loggerArgs );
			} elseif ( $httpStatus === HttpStatus::OK ) {
				// Successful value: set to TTL_MONTH
				$exptime = $this->objectCache::TTL_MONTH;
				$this->logger->info( ...$loggerArgs );
			} else {
				// Default: TTL_WEEK
				$this->logger->info( ...$loggerArgs );
			}

			// Let's avoid deserializing-serializing just to add a few metadata keys before caching
			$stampedResponse = json_decode( $response[ 'result' ] );
			$stampedResponse = ZObjectUtils::setMetaDataValue( $stampedResponse,
				'functionCallCachedOn', date( 'Y-m-d\TH:i:s\Z' ) );
			$stampedResponse = ZObjectUtils::setMetaDataValue( $stampedResponse,
				'functionCallCacheKey', $requestKey );

			// Cache stamped response metadata if it was stamped on successfully, else don't worry,
			// this is not critical data. However, make sure to return the unstamped response, so
			// we don't give the impression the call was retrieved from the cache when it was not.
			$cachedResponse = $stampedResponse !== null
				? array_merge( $response, [ 'result' => json_encode( $stampedResponse ) ] )
				: $response;

			$this->objectCache->set( $requestKey, $cachedResponse, $exptime );
			$this->logger->debug( __METHOD__ . ' cache store for {key}, TTL {ttl}', [
				'key' => $requestKey,
				'ttl' => $exptime
			] );
		}

		return $response;
	}

	/**
	 * Orchestrates a full test execution: runs the test call (Z20K2) and validation
	 * call (Z20K3) against the orchestrator, interprets the result, and returns it.
	 *
	 * The returned array contains the keys:
	 * * passed: boolean flag
	 * * value: ZObject with ZBoolean containing passed or not passed
	 * * metadata: ZObject with ZTypedMap containing overall test metadata
	 * * hasErrors: boolean flag
	 *
	 * Returns false if either call is a cache miss and $evaluateOnMiss is false,
	 * meaning the caller should queue a job to execute the test asynchronously.
	 *
	 * @param stdClass $testCall Dereferenced ZFunctionCall for the test (Z20K2)
	 * @param stdClass $validationCall ZFunctionCall for the validation (Z20K3), without K1 set
	 * @param bool $evaluateOnMiss Whether to call the orchestrator on a cache miss
	 * @return array|false
	 * @throws OrchestratorException
	 * @throws TimeoutException
	 */
	public function orchestrateTestExecution(
		stdClass $testCall,
		stdClass $validationCall,
		bool $evaluateOnMiss
	) {
		// 1. Execute the test call (Z20K2)
		// ================================

		// 1.a. validate test call; if not a function call then this
		// test is not valid and we need to return an error (object type mismatch/Z518)
		if ( !ZObjectUtils::isFunctionCall( $testCall ) ) {
			$this->logger->warning( __METHOD__ . ' input test call is not a valid function call', [
				'testCall' => $testCall
			] );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_OBJECT_TYPE_MISMATCH, [
				'expected' => ZTypeRegistry::Z_FUNCTIONCALL,
				'actual' => $testCall
			] );
			return [
				'passed' => false,
				'value' => new ZBoolean( false ),
				'metadata' => ZResponseEnvelope::wrapInResponseMap( 'errors', $zError ),
				'hasErrors' => true
			];
		}

		// 1.b. call orchestrator service with evaluateOnMiss flag
		// can throw OrchestratorException or TimoutException
		$response = $this->orchestrate(
			[ 'zobject' => $testCall, 'doValidate' => true ],
			/* bypassCache= */ false,
			$evaluateOnMiss
		);

		// 1.c. if response is false, there was a cache miss with evaluateOnMiss=false
		if ( $response === false ) {
			return false;
		}

		// 1.d. parse the response, into a ZResponseEnvelope object
		$callResponse = $this->getResponseEnvelope(
			$response['result'],
			json_encode( $testCall )
		);

		// 1.e. (T394107) check that Z22K1 contains a valid object, else set validateErrors
		$callResponseValue = $callResponse->getZValue();
		if ( !( $callResponseValue instanceof ZObject ) ) {
			$this->logger->warning( __METHOD__ . ' test call does not return a valid response envelope', [
				'testCallResponse' => var_export( $callResponseValue, true )
			] );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [
				'message' => 'Test call returned invalid Z22K1'
			] );
			return [
				'passed' => false,
				'value' => new ZBoolean( false ),
				'metadata' => ZResponseEnvelope::wrapInResponseMap( 'validateErrors', $zError ),
				'hasErrors' => true
			];
		}

		// 1.f. If the call was retrieved from the cache, get stored timestamp from the response
		$callCachedTimestamp = ZObjectUtils::getMetadataValue(
			$callResponse->getSerialized(), 'functionCallCachedOn' );

		// 2. Execute the validation call (Z20K3)
		// ======================================

		// 2.a. validate test validation call; if not a function call then this
		// test is not valid and we need to return an error (object type mismatch/Z518)
		if ( !ZObjectUtils::isFunctionCall( $validationCall ) ) {
			$this->logger->warning( __METHOD__ . ' input validation call is not a valid function call', [
				'validationCall' => $validationCall
			] );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_OBJECT_TYPE_MISMATCH, [
				'expected' => ZTypeRegistry::Z_FUNCTIONCALL,
				'actual' => $validationCall
			] );
			return [
				'passed' => false,
				'value' => new ZBoolean( false ),
				'metadata' => ZResponseEnvelope::wrapInResponseMap( 'errors', $zError ),
				'hasErrors' => true
			];
		}

		$testMetadata = $callResponse->getValueByKey( ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA );
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap $testMetadata';

		// 2.b. build the validation call by adding the first key
		$validationCallFunctionZid = $validationCall->{ ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION };
		$validationCall->{ $validationCallFunctionZid . 'K1' } = $callResponseValue->getSerialized();

		// 2.c. call orchestrator service with evaluateOnMiss flag
		// can throw OrchestratorException or TimeoutException
		$response = $this->orchestrate(
			[ 'zobject' => $validationCall, 'doValidate' => false ],
			/* bypassCache= */ false,
			$evaluateOnMiss
		);

		// 2.d. if response is false, there was a cache miss with evaluateOnMiss=false
		if ( $response === false ) {
			return false;
		}

		// 2.e. parse the response into a Response Envelope Z22
		$validationResponse = $this->getResponseEnvelope(
			$response['result'],
			json_encode( $validationCall )
		);

		// 2.f. If the call was retrieved from the cache, get stored timestamp from the response
		$validationCachedTimestamp = ZObjectUtils::getMetadataValue(
			$validationResponse->getSerialized(), 'functionCallCachedOn' );

		// 3. Interpret the result and compile additional metadata
		// =======================================================

		// must be ZBoolean( true or false ):
		$validationResponseValue = $validationResponse->getZValue();
		$passed = true;

		// 3.a. If the validation call fails, set it as false in the metadata map
		if ( $validationResponse->hasErrors() ) {
			$validationResponseValue = new ZReference( ZTypeRegistry::Z_BOOLEAN_FALSE );
			$testMetadata->setValueForKey( new ZString( 'validateErrors' ), $validationResponse->getErrors() );
		}

		// 3.b. If the validation call is false, set metadata keys with actual vs expected result
		if ( ZObjectUtils::isFalse( $validationResponseValue ) ) {
			$passed = false;
			// validator might not be a two-input call, set expected as Z24/Void if that's the case
			$expectedValue = ZObjectFactory::create(
				$validationCall->{ $validationCallFunctionZid . 'K2' } ?? ZTypeRegistry::Z_VOID
			);
			$testMetadata->setValueForKey( new ZString( 'actualTestResult' ), $callResponseValue );
			$testMetadata->setValueForKey( new ZString( 'expectedTestResult' ), $expectedValue );
		}

		// 3.c. If any of the calls was retrieved from the cache, add timestamps to metadata
		if ( $callCachedTimestamp ) {
			$testMetadata->setValueForKey(
				new ZString( 'testCallCachedOn' ),
				new ZString( $callCachedTimestamp )
			);
		}
		if ( $validationCachedTimestamp ) {
			$testMetadata->setValueForKey(
				new ZString( 'validationCallCachedOn' ),
				new ZString( $validationCachedTimestamp )
			);
		}

		return [
			'passed' => $passed,
			'value' => $validationResponseValue,
			'metadata' => $testMetadata,
			'hasErrors' => $validationResponse->hasErrors(),
		];
	}

	/**
	 * Validates and returns an orchestrator cache response.
	 * If the stored value is not an array, it deletes.
	 *
	 * @param mixed $response
	 * @param string $requestKey
	 * @return array
	 */
	private function validateCachedResponse( $response, string $requestKey ): array {
		if ( is_array( $response ) ) {
			return $response;
		}

		$this->logger->error(
			'Cached orchestrator response was somehow not an array',
			[
				'requestKey' => $requestKey,
				// Shortened to avoid over-loading the logging system
				'response' => substr( var_export( $response, true ), 0, 1000 )
			]
		);
		$this->objectCache->delete( $requestKey );
		return [ 'result' => null, 'httpStatusCode' => 500 ];
	}

	/**
	 * Helper function to handle client-side HTTP error codes.
	 *
	 * Guzzle by default throws an exception on any non-2xx status, in this case returned from the Orchestrator.
	 * By calling the post method with `http_errors => false`, 400 and 500 errors are returned in the
	 * response payload instead of being thrown as ClientException or ServerException.
	 *
	 * Guzzle throws four types of exception, all extend TransferException (implements GuzzleException):
	 * * ConnectException: in case of networking error
	 * * ClientException: for http 400 errors; with `http_errors => false` these are not thrown.
	 * * ServerException: for http 500 errors; with `http_errors => false` these are not thrown.
	 * * TooManyRedirectsException: in case of too many redirects followed
	 *
	 * See: https://docs.guzzlephp.org/en/stable/quickstart.html#exceptions
	 *
	 * @param stdClass|array $query
	 * @param array $requestHeaders
	 * @return array containing Response object (Z22) returned by orchestrator, down-cast to a string
	 * and the actual http status code from the Orchestrator
	 * @throws ConnectException If the request fails to connect
	 * @throws TooManyRedirectsException If the request exceeds the allowed number of redirects
	 */
	private function handleGuzzleRequestForEvaluate( $query, $requestHeaders ): array {
		// TODO (T338242): Use postAsync here.
		$response = $this->guzzleClient->post( '/1/v2/evaluate/', [
			'json' => $query,
			'headers' => $requestHeaders,
			// http 400/500 errors from Orchestrator will be suppressed so that they will not throw exceptions
			'http_errors' => false
		] );
		$httpStatusCode = $response->getStatusCode();
		$responseBody = $response->getBody()->getContents();

		try {
			// (T414062) Check if the response body is a valid JSON string, and a Z22 as expected.
			$responseBodyObject = json_decode( $responseBody, true, 512, JSON_THROW_ON_ERROR );
			if (
				!is_array( $responseBodyObject ) ||
				!isset( $responseBodyObject['Z1K1'] ) ||
				$responseBodyObject['Z1K1'] !== 'Z22'
			) {
				throw new JsonException( 'Response is not a Z22: ' . var_export( $responseBody, true ) );
			}
		} catch ( JsonException $e ) {
			$this->logger->warning(
				'Orchestrator response was either not JSON, or somehow not a Z22',
				[
					// Shortened to avoid over-loading the logging system
					'responseBody' => substr( $responseBody, 0, 1000 ),
					'httpStatusCode' => $httpStatusCode,
					'exceptionMessage' => $e->getMessage(),
				]
			);

			// Make an actual Z22 response for the user of a Z24 with with a Z577 error inside, quoting the bad response
			$responseError = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_INVALID_ORCHESTRATOR_RESULT,
				[ 'request' => $query, 'response' => $responseBody ]
			);
			$badResponse = new ZResponseEnvelope( null, ZResponseEnvelope::wrapErrorInResponseMap( $responseError ) );
			return [ 'result' => FormatJson::encode( $badResponse->getSerialized() ), 'httpStatusCode' => 500 ];
		}

		return [ 'result' => $responseBody, 'httpStatusCode' => $httpStatusCode ];
	}

	/**
	 * Ask the function-orchestrator for the list of programming languages with evaluators currently configured.
	 *
	 * @return ResponseInterface Response interface returned by orchestrator network call.
	 */
	public function getSupportedProgrammingLanguages(): ResponseInterface {
		// TODO (T338242): Use getAsync here.
		return $this->guzzleClient->get( '/1/v1/supported-programming-languages/' );
	}

	/**
	 * Ask the function-orchestrator to store a Persistent ZObject (Z2) in its cache.
	 *
	 * @param stdClass $Z2 The ZObject to persist to cache.
	 * @return ResponseInterface Response interface returned by orchestrator network call.
	 */
	public function persistToCache( $Z2 ): ResponseInterface {
		// (T365053) Propagate request tracing headers
		$requestHeaders = $this->tracer->getRequestHeaders();
		$requestHeaders['User-Agent'] = $this->userAgentString;

		$query = [
			'ZObject' => $Z2,
			'ZID' => $Z2->{ 'Z2K1' }->{ 'Z6K1' }
		];

		// TODO (T338242): Use postAsync here.
		return $this->guzzleClient->post( '/1/v1/persist-to-cache', [
			'json' => $query,
			'headers' => $requestHeaders,
			'http_errors' => false
		] );
	}

	/**
	 * Converts a response string into a valid ZResponseEnvelope and
	 * handles all possible errors from the conversion.
	 *
	 * If the response cannot be validated or the response type is
	 * not correct, it builds a new failure Response Envelope/Z22
	 * with the error details in its "errors" key.
	 *
	 * All errors captured and returned in this method will be wrapped
	 * in a Z507/Evaluator error, as they are errors carried by the
	 * response from the orchestrator service.
	 *
	 * This method will NOT throw any exception nor cause the API
	 * to die with error.
	 *
	 * @param string $response The JSON string being decoded
	 * @param string $call The JSON string of the function call
	 * @return ZResponseEnvelope
	 */
	private function getResponseEnvelope( string $response, string $call ): ZResponseEnvelope {
		try {
			// Decode string JSON into stdClass
			$responseContents = json_decode( $response, false, 512, JSON_THROW_ON_ERROR );
		} catch ( JsonException $e ) {
			$this->logger->error(
				__METHOD__ . ' failed to execute, server response not valid Json: {exception}',
				[
					'request' => $call,
					'response' => $response,
					'exception' => $e,
				]
			);
			// ZError: Invalid JSON returned by the evaluator
			$zErrorJson = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_INVALID_JSON, [
				'message' => $e->getMessage(),
				'data' => $response
			] );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_EVALUATION, [
				'functionCall' => $call,
				'error' => $zErrorJson
			] );
			return $this->getFailedResponseEnvelope( $zError );
		}

		// (T414752) Trivial check if server hasn't responded with a ZObject, rather than loading all of ZObjectFactory
		// e.g. "{"error":"Payload too large"}"
		if ( !property_exists( $responseContents, ZTypeRegistry::Z_OBJECT_TYPE ) ) {
			$this->logger->warning(
				__METHOD__ . ' failed to execute, server response was not a ZObject: {response}',
				[
					'request' => $call,
					'response' => $response
				]
			);
			// ZError: Invalid ZObject returned by the evaluator
			$zErrorType = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_OBJECT_TYPE_MISMATCH, [
				'expected' => ZTypeRegistry::Z_RESPONSEENVELOPE,
				// If it's not a ZObject at all, just say it's a string
				'actual' => ZTypeRegistry::Z_STRING
			] );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_EVALUATION, [
				'functionCall' => $call,
				'error' => $zErrorType
			] );
			return $this->getFailedResponseEnvelope( $zError );
		}

		// Convert stdClass into ZObject by passing it through ZObjectFactory::create
		try {
			$responseObject = ZObjectFactory::create( $responseContents );
		} catch ( ZErrorException $e ) {
			$this->logger->error(
				__METHOD__ . ' failed to execute, server response not wellformed: {exception}',
				[
					'request' => $call,
					'response' => $response,
					'exception' => $e,
				]
			);
			// ZError: Invalid ZObject returned by the evaluator
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_EVALUATION, [
				'functionCall' => $call,
				'error' => $e->getZError()
			] );
			return $this->getFailedResponseEnvelope( $zError );
		}

		// Check that returned object is of the right type
		if ( !( $responseObject instanceof ZResponseEnvelope ) ) {
			$this->logger->error(
				__METHOD__ . ' failed to execute, server response was not a Response Envelope',
				[
					'request' => $call,
					'response' => $response
				]
			);
			// ZError: Invalid ZObject returned by the evaluator
			$zErrorType = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_OBJECT_TYPE_MISMATCH, [
				'expected' => ZTypeRegistry::Z_RESPONSEENVELOPE,
				'actual' => $responseObject->getZType()
			] );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_EVALUATION, [
				'functionCall' => $call,
				'error' => $zErrorType
			] );
			return $this->getFailedResponseEnvelope( $zError );
		}

		// Response Envelope returned by the orchestrator is valid!
		return $responseObject;
	}

	/**
	 * Builds and returns a Z22/ResponseEnvelope object wrapping a failure, so:
	 * * Z22K1 is Void/Z24, and
	 * * Z22K2 contains a Map with an "error" key with the given zError object
	 *
	 * @param ZError $zErrorObject
	 * @return ZResponseEnvelope
	 */
	private function getFailedResponseEnvelope( $zErrorObject ): ZResponseEnvelope {
		$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zErrorObject );
		return new ZResponseEnvelope( null, $zResponseMap );
	}
}
