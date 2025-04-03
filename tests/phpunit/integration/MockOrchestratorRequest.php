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

use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

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
	public function orchestrate( $query, $bypassCache = false ): string {
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

		$response = $this->fileData->$key;

		if ( $response[0] !== '{' && $response[0] !== '[' ) {
			$response = '"' . $response . '"';
		}

		return '{ "Z1K1": "Z22", "Z22K1": ' . $response . ', "Z22K2": "oopswedidnotdothisbityet" }';
	}
}
