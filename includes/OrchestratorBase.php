<?php
/**
 * WikiLambda Orchestrator Interface base class
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use GuzzleHttp\Client;
use GuzzleHttp\Psr7\Response;

class OrchestratorBase {

	/** @var Client */
	protected $guzzleClient;

	/**
	 * @param string $query
	 * @return Response response object returned by orchestrator
	 */
	public function orchestrate( string $query ): Response {
		// TODO: Use getAsync here.
		return $this->guzzleClient->get( '/1/v1/evaluate/' . $query );
	}

	/**
	 * @param string $query
	 * @return Response response object returned by orchestrator
	 */
	public function performTest( string $query ): Response {
		// TODO: Use getAsync here.
		return $this->guzzleClient->get( '/1/v1/evaluate/test/' . $query );
	}
}
