<?php

/**
 * WikiLambda integration test suite for the WikiLambdaApiBase abstract class.
 *
 * Tests protected methods via TestingAccessWrapper on a concrete subclass
 * (ApiFunctionCall). Only the abstract base's own code paths are asserted;
 * subclass-specific behaviour lives in the respective test files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\ActionAPI\ApiFunctionCall;
use MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use Wikimedia\TestingAccessWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase
 *
 * @group API
 * @group Database
 */
class WikiLambdaApiBaseTest extends WikiLambdaApiTestCase {

	/**
	 * Construct an ApiFunctionCall module, run setUp(), and return a
	 * TestingAccessWrapper so that protected/private members are accessible.
	 */
	private function getWrappedModule(): TestingAccessWrapper {
		$context = RequestContext::getMain();
		$main = new ApiMain( $context );
		$module = new ApiFunctionCall( $main, 'wikilambda_function_call' );
		$wrapper = TestingAccessWrapper::newFromObject( $module );
		$wrapper->setUp();
		return $wrapper;
	}

	// ------------------------------------------------------------------
	// dieWithZError (public static)
	// ------------------------------------------------------------------

	public function testDieWithZError_throwsApiUsageExceptionWithZErrorMessage() {
		$zerror = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
			[ 'message' => 'test error' ]
		);

		$this->expectException( ApiUsageException::class );

		WikiLambdaApiBase::dieWithZError( $zerror, 403 );
	}

	public function testDieWithZError_throwsApiUsageExceptionWithDefaultCode() {
		$zerror = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
			[ 'message' => 'test' ]
		);

		$this->expectException( ApiUsageException::class );

		WikiLambdaApiBase::dieWithZError( $zerror );
	}

	// ------------------------------------------------------------------
	// execute() — repo-mode guard
	// ------------------------------------------------------------------

	public function testExecute_diesWhenRepoModeDisabled() {
		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );

		$this->expectException( ApiUsageException::class );

		$this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' =>
				'{"Z1K1":"Z7","Z7K1":"Z801","Z801K1":"hello"}'
		] );
	}

	// ------------------------------------------------------------------
	// getResponseEnvelope (protected)
	// ------------------------------------------------------------------

	public function testGetResponseEnvelope_parsesValidZ22() {
		$wrapper = $this->getWrappedModule();

		$response = json_encode( [
			'Z1K1' => 'Z22',
			'Z22K1' => 'hello',
			'Z22K2' => [ 'Z1K1' => 'Z6', 'Z6K1' => 'no errors' ],
		] );

		$envelope = $wrapper->getResponseEnvelope( $response, '{}' );
		$this->assertInstanceOf( ZResponseEnvelope::class, $envelope );
	}

	public function testGetResponseEnvelope_returnsFailureForInvalidJson() {
		$wrapper = $this->getWrappedModule();

		$envelope = $wrapper->getResponseEnvelope( '{not json!!!', '{}' );
		$this->assertInstanceOf( ZResponseEnvelope::class, $envelope );
		$this->assertFailureEnvelopeContainsErrorType( $envelope, ZErrorTypeRegistry::Z_ERROR_EVALUATION );
	}

	public function testGetResponseEnvelope_returnsFailureWhenZ1K1Missing() {
		$wrapper = $this->getWrappedModule();

		$response = json_encode( [ 'error' => 'Payload too large' ] );
		$envelope = $wrapper->getResponseEnvelope( $response, '{}' );
		$this->assertInstanceOf( ZResponseEnvelope::class, $envelope );
		$this->assertFailureEnvelopeContainsErrorType( $envelope, ZErrorTypeRegistry::Z_ERROR_EVALUATION );
	}

	public function testGetResponseEnvelope_returnsFailureWhenNotZ22() {
		$wrapper = $this->getWrappedModule();

		$response = json_encode( [
			'Z1K1' => 'Z6',
			'Z6K1' => 'I am a string, not a response envelope',
		] );
		$envelope = $wrapper->getResponseEnvelope( $response, '{}' );
		$this->assertInstanceOf( ZResponseEnvelope::class, $envelope );
		$this->assertFailureEnvelopeContainsErrorType( $envelope, ZErrorTypeRegistry::Z_ERROR_EVALUATION );
	}

	public function testGetResponseEnvelope_returnsFailureWhenZObjectFactoryFails() {
		$wrapper = $this->getWrappedModule();

		// Valid JSON with Z1K1 present on the top-level object, but the inner Z22K1
		// value has Z1K1 set to an integer (not a valid type reference), which makes
		// ZObjectFactory::create throw a ZErrorException.
		$response = json_encode( [
			'Z1K1' => 'Z22',
			'Z22K1' => (object)[ 'Z1K1' => 42 ],
			'Z22K2' => (object)[ 'Z1K1' => 'Z6', 'Z6K1' => 'meta' ],
		] );
		$envelope = $wrapper->getResponseEnvelope( $response, '{}' );
		$this->assertInstanceOf( ZResponseEnvelope::class, $envelope );
		$this->assertFailureEnvelopeContainsErrorType( $envelope, ZErrorTypeRegistry::Z_ERROR_EVALUATION );
	}

	/**
	 * Assert that a failure ZResponseEnvelope's metadata contains the given
	 * error type somewhere in its serialized output.
	 */
	private function assertFailureEnvelopeContainsErrorType(
		ZResponseEnvelope $envelope,
		string $expectedErrorType
	): void {
		$serialized = json_encode( $envelope->getSerialized() );
		$this->assertStringContainsString(
			$expectedErrorType,
			$serialized,
			"Expected failure envelope to reference error type $expectedErrorType"
		);
	}

	// ------------------------------------------------------------------
	// hasUnsavedCode (protected)
	// ------------------------------------------------------------------

	/**
	 * @dataProvider provideHasUnsavedCode
	 */
	public function testHasUnsavedCode( \stdClass $functionCall, bool $expected, string $description ) {
		$wrapper = $this->getWrappedModule();
		$this->assertSame( $expected, $wrapper->hasUnsavedCode( $functionCall ), $description );
	}

	public static function provideHasUnsavedCode() {
		yield 'No Z7K1 property at all' => [
			(object)[ 'Z1K1' => 'Z7' ],
			false,
			'Should return false when Z7K1 is absent',
		];

		yield 'Z7K1 is a string reference (not an object)' => [
			(object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z10000' ],
			false,
			'Should return false when function is a ZID reference',
		];

		yield 'Z7K1 is an object but has no implementations key' => [
			(object)[
				'Z1K1' => 'Z7',
				'Z7K1' => (object)[ 'Z1K1' => 'Z8' ],
			],
			false,
			'Should return false when function has no Z8K4',
		];

		yield 'Implementations list has only the type header (count <= 1)' => [
			(object)[
				'Z1K1' => 'Z7',
				'Z7K1' => (object)[
					'Z1K1' => 'Z8',
					'Z8K4' => [ 'Z14' ],
				],
			],
			false,
			'Should return false when implementations list contains only the type element',
		];

		yield 'All implementations are ZID references (strings)' => [
			(object)[
				'Z1K1' => 'Z7',
				'Z7K1' => (object)[
					'Z1K1' => 'Z8',
					'Z8K4' => [ 'Z14', 'Z10001', 'Z10002' ],
				],
			],
			false,
			'Should return false when every implementation is a reference string',
		];

		yield 'A literal implementation exists (not Z825)' => [
			(object)[
				'Z1K1' => 'Z7',
				'Z7K1' => (object)[
					'Z1K1' => 'Z8',
					'Z8K4' => [
						'Z14',
						(object)[
							'Z1K1' => 'Z14',
							'Z14K1' => 'Z10000',
						],
					],
				],
			],
			true,
			'Should return true when a literal implementation targets a non-Z825 function',
		];

		yield 'A literal implementation for Z825 (Run Abstract Fragment) is safe' => [
			(object)[
				'Z1K1' => 'Z7',
				'Z7K1' => (object)[
					'Z1K1' => 'Z8',
					'Z8K4' => [
						'Z14',
						(object)[
							'Z1K1' => 'Z14',
							'Z14K1' => 'Z825',
						],
					],
				],
			],
			false,
			'Should return false when the only literal implementation targets Z825',
		];

		yield 'Mixed: one reference, one safe literal (Z825), one dangerous literal' => [
			(object)[
				'Z1K1' => 'Z7',
				'Z7K1' => (object)[
					'Z1K1' => 'Z8',
					'Z8K4' => [
						'Z14',
						'Z10001',
						(object)[
							'Z1K1' => 'Z14',
							'Z14K1' => 'Z825',
						],
						(object)[
							'Z1K1' => 'Z14',
							'Z14K1' => 'Z10000',
						],
					],
				],
			],
			true,
			'Should return true if any implementation in the list is a dangerous literal',
		];
	}

	// ------------------------------------------------------------------
	// executeFunctionCall — non-Z7 rejection via the Action API
	// ------------------------------------------------------------------

	public function testExecuteFunctionCall_rejectsNonZ7Input() {
		$this->expectException( ApiUsageException::class );

		$this->doApiRequest( [
			'action' => 'wikilambda_function_call',
			'wikilambda_function_call_zobject' =>
				'{"Z1K1":"Z6","Z6K1":"I am a string, not a function call"}'
		] );
	}
}
