<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Api;

use ApiTestCase;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\API\ApiHealthCheck
 * @group API
 * @group WikiLambda
 * @group medium
 */
class ApiHealthCheckTest extends ApiTestCase {
	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiHealthCheck::execute
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiHealthCheck::run
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiHealthCheck::runOneCheck
	 */
	public function testExecuteSuccessfulViaBetaCluster() {
		$result = $this->doApiRequest( [
			'action' => 'wikilambda_health_check',
		] );

		$orchestrationResult = $result[0]['query']['wikilambda_health_check'];

		$this->assertSame( 'true', $orchestrationResult['success'] );
		$this->assertSame( '', $orchestrationResult['error'] );
		$this->assertSame( $orchestrationResult['total_tests'], $orchestrationResult['passed'] );
	}
}
