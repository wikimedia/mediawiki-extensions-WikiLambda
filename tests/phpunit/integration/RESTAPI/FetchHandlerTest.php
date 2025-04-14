<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\RESTAPI\FetchHandler;
use MediaWiki\Rest\RequestData;
use MediaWiki\Tests\Rest\Handler\HandlerTestTrait;

/**
 * @covers \MediaWiki\Extension\WikiLambda\RESTAPI\FetchHandler
 *
 * - {zids}
 * - {zids}/{revisions}
 *
 * - {zids}?language={language}
 * - {zids}?getDependencies={getDependencies}
 *
 * @group Standalone
 * @group Database
 */
class FetchHandlerTest extends WikiLambdaIntegrationTestCase {
	use HandlerTestTrait;

	/** @var array */
	private $standardCall;

	protected function setUp(): void {
		parent::setUp();

		// First, we need to insert the ZObjects we're going to try to fetch
		$this->insertZids( [
			// Base types
			'Z1', 'Z2', 'Z6', 'Z8', 'Z17', 'Z40', 'Z41', 'Z42', 'Z60',
			// Languages we use
			'Z1002', 'Z1004'
		] );
		$this->registerLangs( [ 'en', 'fr' ] );

		$this->registerErrors( [ 'Z504' ] );
	}

	/**
	 * The simplest call, just getting one ZObject
	 */
	public function testExecute_basicFetch() {
		$request = new RequestData( [
			'pathParams' => [ 'zids' => 'Z8' ],
			'queryParams' => []
		] );
		$handler = new FetchHandler();

		$response = $this->executeHandler( $handler, $request );

		$this->assertEquals( 200, $response->getStatusCode() );

		$responseBody = $response->getBody()->getContents();

		$decodedContents = json_decode( $responseBody, true );
		$this->assertArrayHasKey( 'Z8', $decodedContents );

		$decodedSubContents = json_decode( $decodedContents['Z8'], true );
		$this->assertEquals( 'Z2', $decodedSubContents['Z1K1'] );
		$this->assertEquals( 'Z8', $decodedSubContents['Z2K1']['Z6K1'] );
	}

	/**
	 * Fetch two ZObjects at once
	 */
	public function testExecute_basicMultiFetch() {
		$request = new RequestData( [
			'pathParams' => [ 'zids' => 'Z8|Z2' ],
			'queryParams' => []
		] );
		$handler = new FetchHandler();

		$response = $this->executeHandler( $handler, $request );

		$this->assertEquals( 200, $response->getStatusCode() );

		$responseBody = $response->getBody()->getContents();

		$decodedContents = json_decode( $responseBody, true );
		$this->assertArrayHasKey( 'Z8', $decodedContents );
		$this->assertArrayHasKey( 'Z2', $decodedContents );

		$decodedSubContents = json_decode( $decodedContents['Z8'], true );
		$this->assertEquals( 'Z2', $decodedSubContents['Z1K1'] );
		$this->assertEquals( 'Z8', $decodedSubContents['Z2K1']['Z6K1'] );

		$decodedSubContents = json_decode( $decodedContents['Z2'], true );
		$this->assertEquals( 'Z2', $decodedSubContents['Z1K1'] );
		$this->assertEquals( 'Z2', $decodedSubContents['Z2K1']['Z6K1'] );
	}

	// TESTME: Revisions
	// TESTME: Language filtering
	// TESTME: Dependency bundling
}
