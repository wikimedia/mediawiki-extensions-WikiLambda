<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Tests\Api\ApiTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiSupportedProgrammingLanguages
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase
 * @group API
 * @group Database
 * @group Standalone
 */
class ApiSupportedProgrammingLanguagesTest extends ApiTestCase {

	/**
	 * TODO (T374242): Fix Beta Cluster so we can re-enable these tests.
	 * @group Broken
	 */
	public function testExecuteSuccessfulViaBetaCluster() {
		// Beta cluster doesn't like all these tests, so retry until it does.
		$result = [];
		$orchestrationResult = [];
		for ( $i = 0; $i < 4; $i++ ) {
			if ( array_key_exists( 'success', $orchestrationResult ) ) {
				break;
			}
			if ( $i > 0 ) {
				sleep( pow( 2, $i ) );
			}
			$result = $this->doApiRequest( [
				'action' => 'wikilambda_supported_programming_languages'
			] );
			$orchestrationResult = $result[0]['query']['wikilambda_supported_programming_languages'];
		}

		$this->assertArrayHasKey( 'success', $orchestrationResult );
		$this->assertTrue( $orchestrationResult['success'] );

		// This doesn't test the actual result because the result is entirely
		// dependent on state internal to the orchestrator. Best we can do is
		// make sure it's an array.
		$this->assertIsArray( json_decode( $orchestrationResult[ 'data' ] ) );
	}

}
