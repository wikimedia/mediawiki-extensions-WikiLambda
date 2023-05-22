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
use Psr\Http\Message\ResponseInterface;

/**
 * @codeCoverageIgnore
 */
class OrchestratorRequest {

	/** @var Client */
	protected $guzzleClient;

	/**
	 * @param ClientInterface $client GuzzleHttp Client used for requests
	 */
	public function __construct( ClientInterface $client ) {
		$this->guzzleClient = $client;
	}

	/**
	 * @param \stdClass|array $query
	 * @return ResponseInterface response object returned by orchestrator
	 */
	public function orchestrate( $query ): ResponseInterface {
		// TODO: Use postAsync here.

		return $this->guzzleClient->post( '/1/v1/evaluate/', [
			'json' => $query,
			'headers' => [
				// TODO: Get a reasonable version string for /our/ code, not MW's
				'User-Agent' => 'wikifunctions-request/' . MW_VERSION,
			],
		] );
	}

	/**
	 * @return ResponseInterface response object returned by orchestrator
	 */
	public function getSupportedProgrammingLanguages(): ResponseInterface {
		// TODO: Use getAsync here.
		return $this->guzzleClient->get( '/1/v1/supported-programming-languages/' );
	}

	/**
	 * @param string $query
	 * @return ResponseInterface response object returned by orchestrator
	 */
	public function performTest( string $query ): ResponseInterface {
		// TODO: Use getAsync here.
		return $this->guzzleClient->get( '/1/v1/evaluate/test/' . $query );
	}
}
