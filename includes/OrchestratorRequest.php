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

use GitInfo;
use GuzzleHttp\Client;
use GuzzleHttp\ClientInterface;
use Psr\Http\Message\ResponseInterface;

/**
 * @codeCoverageIgnore
 */
class OrchestratorRequest {

	/** @var Client */
	protected $guzzleClient;

	/** @var string */
	protected $userAgentString;

	/**
	 * @param ClientInterface $client GuzzleHttp Client used for requests
	 */
	public function __construct( ClientInterface $client ) {
		$this->guzzleClient = $client;

		$this->userAgentString = 'wikifunctions-request/' . MW_VERSION;
		// TODO: We should fetch this dynamically rather than use a global.
		// phpcs:ignore MediaWiki.NamingConventions.ValidGlobalName.allowedPrefix
		global $IP;
		$gitInfo = new GitInfo( "$IP/extensions/WikiLambda" );
		$gitHash = $gitInfo->getHeadSHA1();
		if ( $gitHash !== false ) {
			$this->userAgentString .= '-WL' . substr( $gitHash, 0, 8 );
		}
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
				'User-Agent' => $this->userAgentString,
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
