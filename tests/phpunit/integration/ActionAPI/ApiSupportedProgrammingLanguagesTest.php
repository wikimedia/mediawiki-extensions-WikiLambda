<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use Throwable;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiSupportedProgrammingLanguages
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase
 * @group API
 * @group Database
 * @group Standalone
 */
class ApiSupportedProgrammingLanguagesTest extends WikiLambdaApiTestCase {

	private function mockOrchestrator( Response|Throwable $response ): void {
		$mock = $this->createMock( OrchestratorRequest::class );
		if ( $response instanceof Throwable ) {
			$mock->method( 'getSupportedProgrammingLanguages' )->willThrowException( $response );
		} else {
			$mock->method( 'getSupportedProgrammingLanguages' )->willReturn( $response );
		}
		$mock->method( 'getHost' )->willReturn( 'http://orchestrator.test' );
		$this->setService( 'WikiLambdaOrchestratorRequest', $mock );
	}

	private function doSupportedProgrammingLanguagesRequest(): array {
		$result = $this->doApiRequest( [ 'action' => 'wikilambda_supported_programming_languages' ] );
		return $result[0]['query']['wikilambda_supported_programming_languages'];
	}

	public function testExecute_success() {
		$body = '["javascript-es2020","python-3-8"]';
		$this->mockOrchestrator( new Response( 200, [], $body ) );

		$result = $this->doSupportedProgrammingLanguagesRequest();

		$this->assertTrue( $result['success'] );
		$this->assertSame( $body, $result['data'] );
	}

	public function testExecute_notConnected() {
		$this->mockOrchestrator( new ConnectException( 'Connection refused', new Request( 'GET', '' ) ) );

		try {
			$this->doSupportedProgrammingLanguagesRequest();
			$this->fail( 'Expected ApiUsageException' );
		} catch ( ApiUsageException $e ) {
			$this->assertStatusError(
				'apierror-wikilambda_supported_programming_languages-not-connected',
				$e->getStatusValue()
			);
		}
	}

	public function testExecute_orchestratorError() {
		$this->mockOrchestrator( new ServerException(
			'Service Unavailable', new Request( 'GET', '' ), new Response( 503 )
		) );

		$result = $this->doSupportedProgrammingLanguagesRequest();

		$this->assertArrayNotHasKey( 'success', $result );
		$this->assertSame( 'Z24', $result['data']['Z22K1'] );
		$errorEntry = $result['data']['Z22K2']['K1'][1];
		$this->assertSame( 'errors', $errorEntry['K1'] );
		$this->assertSame( 'Z507', $errorEntry['K2']['Z5K1'] );
		$this->assertSame( 'Service Unavailable', $errorEntry['K2']['Z5K2']['K2']['Z5K2']['K1'] );
	}

}
