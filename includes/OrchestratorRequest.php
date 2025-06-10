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
	 * Ask the function-orchestrator to evaluate a function call.
	 *
	 * @param stdClass|array $query
	 * @param bool $bypassCache Whether to bypass the MediaWiki-side function call cache; this is
	 *   only to be used for special circumstances, as it's potentially expensive.
	 * @return string Response object (Z22) returned by orchestrator, down-cast to a string
	 */
	public function orchestrate( $query, $bypassCache = false ): string {
		$guzzleClient = $this->guzzleClient;

		// (T365053) Propagate request tracing headers
		$requestHeaders = $this->tracer->getRequestHeaders();
		$requestHeaders['User-Agent'] = $this->userAgentString;

		if ( $bypassCache ) {
			// TODO (T338242): Use postAsync here.
			return $this->guzzleClient->post( '/1/v1/evaluate/', [
				'json' => $query,
				'headers' => $requestHeaders,
			] )->getBody()->getContents();
		}

		return $this->objectCache->getWithSetCallback(
			$this->objectCache->makeKey(
				self::FUNCTIONCALL_CACHE_KEY_PREFIX,
				ZObjectUtils::makeCacheKeyFromZObject( $query )
			),
			// TODO (T338243): Is this the right timeout? Maybe TTL_DAY or TTL_MONTH instead?
			$this->objectCache::TTL_WEEK,
			static function () use ( $query, $guzzleClient, $requestHeaders ) {
				// TODO (T338242): Use postAsync here.
				return $guzzleClient->post( '/1/v1/evaluate/', [
					'json' => $query,
					'headers' => $requestHeaders,
				] )->getBody()->getContents();
			}
		);
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
