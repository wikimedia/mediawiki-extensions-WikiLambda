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
use Psr\Http\Message\ResponseInterface;

/**
 * @codeCoverageIgnore
 */
class OrchestratorBase {

	/** @var Client */
	protected $guzzleClient;

	/**
	 * @param \stdClass|array $query
	 * @return ResponseInterface response object returned by orchestrator
	 */
	public function orchestrate( $query ): ResponseInterface {
		// TODO: Use postAsync here.
		return $this->guzzleClient->post( '/1/v1/evaluate/', [
			'json' => $query,
		] );
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
