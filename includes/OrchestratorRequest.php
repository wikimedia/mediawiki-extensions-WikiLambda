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
use MediaWiki\Http\Telemetry;
use MediaWiki\Utils\GitInfo;
use Psr\Http\Message\ResponseInterface;
use Wikimedia\ObjectCache\BagOStuff;

/**
 * @codeCoverageIgnore
 */
class OrchestratorRequest {

	protected Client $guzzleClient;
	protected string $userAgentString;
	protected BagOStuff $objectCache;

	public const FUNCTIONCALL_CACHE_KEY_PREFIX = 'WikiLambdaFunctionCall';

	/**
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

		$this->objectCache = WikiLambdaServices::getZObjectStash();
	}

	/**
	 * @param \stdClass|array $query
	 * @param bool $bypassCache Whether to bypass the function call cache; this is only
	 *   to be used for special circumstances, as it's potentially expensive.
	 * @return string response object returned by orchestrator, down-cast to a string
	 */
	public function orchestrate( $query, $bypassCache = false ): string {
		// TODO (T338242): Use postAsync here.
		$guzzleClient = $this->guzzleClient;
		$userAgentString = $this->userAgentString;

		// (T365053) Propagate request tracing headers
		$telemetry = Telemetry::getInstance();
		$requestHeaders = $telemetry->getRequestHeaders();
		$requestHeaders['User-Agent'] = $userAgentString;
		if ( $bypassCache ) {
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
				return $guzzleClient->post( '/1/v1/evaluate/', [
					'json' => $query,
					'headers' => $requestHeaders,
				] )->getBody()->getContents();
			}
		);
	}

	/**
	 * @return ResponseInterface response object returned by orchestrator
	 */
	public function getSupportedProgrammingLanguages(): ResponseInterface {
		// TODO (T338242): Use getAsync here.
		return $this->guzzleClient->get( '/1/v1/supported-programming-languages/' );
	}
}
