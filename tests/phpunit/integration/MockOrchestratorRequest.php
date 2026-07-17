<?php
/**
 * WikiLambda Mock Orchestrator Interface
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use GuzzleHttp\Psr7\Response;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use Psr\Http\Message\ResponseInterface;

/**
 * @codeCoverageIgnore
 */
class MockOrchestratorRequest extends OrchestratorRequest {

	private \stdClass $fileData;

	public function __construct() {
		$filePath = dirname( __DIR__, 1 ) . '/test_data/mockCallResponses.json';
		$this->fileData = json_decode( file_get_contents( $filePath ) );

		if ( $this->fileData === false ) {
			throw new \RuntimeException( 'MockOrchestratorRequest: Unable to read test data file.' );
		}
	}

	/**
	 * @inheritDoc
	 */
	public function orchestrate(
		array $query,
		$bypassCache = false,
		$evaluateOnMiss = true
	): array {
		$key = ZObjectUtils::makeCacheKeyFromZObject( $query );

		// Strip out revision counts for referenced Objects, as local dev machines may differ from fresh CI installs
		$key = preg_replace( '/#\d+/u', '#0', $key );

		// JSON doesn't like keys with newlines or tabs in them, so we need to replace them with something else.
		$key = preg_replace( '/[\n\t]/u', '…', $key );

		if ( !isset( $this->fileData->$key ) ) {
			throw new \RuntimeException( 'MockOrchestratorRequest: Unable to find test data for key: ' . $key );
		}

		// Add a debug log so it's easier to find the wrong test data in the file if it fails
		wfDebugLog( 'WikiLambda', 'MockOrchestratorRequest: Found test data for key: "' . $key . '"' );

		$entry = $this->fileData->$key;
		$httpStatusCode = $entry->httpStatusCode;

		$emptyZMap = '{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z883","Z883K1":"Z6","Z883K2":"Z1"},'
			. '"K1":[{"Z1K1":"Z7","Z7K1":"Z882","Z882K1":"Z6","Z882K2":"Z1"}]}';

		if ( isset( $entry->body ) ) {
			// Success: Z22K1 = body value, Z22K2 = empty zmap
			$z22k1 = $entry->body;
			if ( $z22k1[0] !== '{' && $z22k1[0] !== '[' ) {
				$z22k1 = '"' . $z22k1 . '"';
			}
			$z22k2 = $emptyZMap;
		} else {
			// Failure: Z22K1 = Z24, Z22K2 = zmap with errors key containing the error object
			$z22k1 = '"Z24"';
			$z22k2 = '{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z883","Z883K1":"Z6","Z883K2":"Z1"},'
				. '"K1":[{"Z1K1":"Z7","Z7K1":"Z882","Z882K1":"Z6","Z882K2":"Z1"},'
				. '{"Z1K1":{"Z1K1":"Z7","Z7K1":"Z882","Z882K1":"Z6","Z882K2":"Z1"},'
				. '"K1":"errors","K2":' . $entry->error . '}]}';
		}

		return [
			'result' => '{"Z1K1":"Z22","Z22K1":' . $z22k1 . ',"Z22K2":' . $z22k2 . '}',
			'httpStatusCode' => $httpStatusCode
		];
	}

	/**
	 * @inheritDoc
	 */
	public function persistToCache( $Z2 ): ResponseInterface {
		return new Response();
	}

}
