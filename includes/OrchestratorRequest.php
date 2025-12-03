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
use GuzzleHttp\ClientInterface;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\TooManyRedirectsException;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Utils\GitInfo;
use Psr\Http\Message\ResponseInterface;
use stdClass;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\Telemetry\TracerInterface;

/**
 * @codeCoverageIgnore
 */
class OrchestratorRequest {

	protected Client $guzzleClient;
	protected string $userAgentString;
	protected BagOStuff $objectCache;
	protected TracerInterface $tracer;

	public const FUNCTIONCALL_CACHE_KEY_PREFIX = 'WikiLambdaFunctionCall';

	/**
	 * The specialised request interface to control all network access to the function-orchestrator.
	 *
	 * @param ClientInterface $client GuzzleHttp Client used for requests
	 */
	public function __construct( ClientInterface $client ) {
		$this->guzzleClient = $client;

		$this->userAgentString = 'wikifunctions-request/' . MW_VERSION;
		$gitInfo = new GitInfo( MW_INSTALL_PATH . '/extensions/WikiLambda' );
		$gitHash = $gitInfo->getHeadSHA1();
		if ( $gitHash !== false ) {
			$this->userAgentString .= '-WL' . substr( $gitHash, 0, 8 );
		}

		$this->tracer = MediaWikiServices::getInstance()->getTracer();
		$this->objectCache = WikiLambdaServices::getZObjectStash();
	}

	/**
	 * Ask the function-orchestrator to evaluate a function call and saves the
	 * response in the cache (if not yet cached).
	 *
	 * * If bypassCache is true, sends the request directly to the orchestrator and
	 *   does not update the cached value.
	 *
	 * @param stdClass|array $query
	 * @param bool $bypassCache Whether to bypass the MediaWiki-side function call cache; this is
	 *   only to be used for special circumstances, as it's potentially expensive.
	 * @return array containing Response object (Z22) returned by orchestrator, down-cast to a string
	 *  and the actual http status code from the Orchestrator
	 * @throws ConnectException If the request fails to connect
	 * @throws TooManyRedirectsException If the request exceeds the allowed number of redirects
	 */
	public function orchestrate( $query, $bypassCache = false ): array {
		// (T365053) Propagate request tracing headers
		$requestHeaders = $this->tracer->getRequestHeaders();
		$requestHeaders['User-Agent'] = $this->userAgentString;

		if ( $bypassCache ) {
			return $this->handleGuzzleRequestForEvaluate( $query, $requestHeaders );
		}

		$requestKey = $this->objectCache->makeKey(
			self::FUNCTIONCALL_CACHE_KEY_PREFIX,
			ZObjectUtils::makeCacheKeyFromZObject( $query )
		);

		// (T338243) Set TTL conditionally, so that:
		// * success (http 200)           TTL_MONTH
		// * bad request (http 400-422)   TTL_WEEK
		// * too many requests (http 429) TTL_MINUTE
		// * server error (http >= 500)   TTL_MINUTE
		// So if the request fails due to 400, we can still cache for
		// a week, but if it failes due to system outages or timeouts,
		// we would benefit from reducing the TTL to something very short.
		$response = $this->objectCache->getWithSetCallback(
			$requestKey,
			$this->objectCache::TTL_MONTH,
			function ( &$exptime ) use ( $query, $requestHeaders ) {
				$guzzleResponse = $this->handleGuzzleRequestForEvaluate( $query, $requestHeaders );
				$httpStatus = $guzzleResponse['httpStatusCode'] ?? HttpStatus::INTERNAL_SERVER_ERROR;

				if (
					( $httpStatus >= HttpStatus::INTERNAL_SERVER_ERROR ) ||
					( $httpStatus === HttpStatus::TOO_MANY_REQUESTS )
				) {
					$exptime = $this->objectCache::TTL_MINUTE;
				} elseif ( $httpStatus === HttpStatus::OK ) {
					$exptime = $this->objectCache::TTL_MONTH;
				} else {
					$exptime = $this->objectCache::TTL_WEEK;
				}

				return $guzzleResponse;
			}
		);

		// (T398410) Check that the response is an array
		if ( is_array( $response ) ) {
			return $response;
		}

		// … if not, delete from cache and return an empty response.
		$logger = LoggerFactory::getInstance( 'WikiLambda' );
		$logger->error(
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
		$response = $this->guzzleClient->post( '/1/v1/evaluate/', [
			'json' => $query,
			'headers' => $requestHeaders,
			// http 400/500 errors from Orchestrator will be suppressed so that they will not throw exceptions
			'http_errors' => false
		] );
		$httpStatusCode = $response->getStatusCode();
		$responseBody = $response->getBody()->getContents();

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

}
