<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Api;

use ApiTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\API\ApiHealthCheck
 * @covers \MediaWiki\Extension\WikiLambda\API\WikiLambdaApiBase
 * @group API
 * @group Standalone
 */
class ApiHealthCheckTest extends ApiTestCase {

	public function testExecuteSuccessfulViaBetaCluster() {
		$result = [];
		$orchestrationResult = [];

		// Beta cluster doesn't like all these tests, so retry until it does.
		for ( $i = 0; $i < 5; $i++ ) {
			if ( array_key_exists( 'success', $orchestrationResult ) ) {
				if ( $orchestrationResult[ 'success' ] == 'true' ) {
					break;
				}
			}
			if ( $i > 0 ) {
				usleep( 100 * pow( 2, $i ) );
			}
			$result = $this->doApiRequest( [
				'action' => 'wikilambda_health_check',
			] );
			$orchestrationResult = $result[0]['query']['wikilambda_health_check'];
		}

		$this->assertSame( 'true', $orchestrationResult['success'] );
		$this->assertSame( '', $orchestrationResult['error'] );
		$this->assertSame( $orchestrationResult['total_tests'], $orchestrationResult['passed'] );
	}
}
