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
use MediaWiki\Extension\WikiLambda\Tests\Integration\MockOrchestratorRequest;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use ReflectionClass;
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
		$orchestrator = new MockOrchestratorRequest();
		$module = new ApiFunctionCall(
			$main,
			'wikilambda_function_call',
			$this->getServiceContainer()->getStatsFactory(),
			$this->getServiceContainer()->getTracer(),
			$orchestrator
		);
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

		// A Z825/Run Abstract Fragment implementation is how Abstract Wikipedia renders
		// its fragments, and it makes that request with no user account, so a
		// composition-only fragment must stay allowed. Code below the composition, or
		// code in place of it, must not.

		yield 'A Z825 literal whose composition only calls saved functions is safe' => [
			(object)[
				'Z1K1' => 'Z7',
				'Z7K1' => (object)[
					'Z1K1' => 'Z8',
					'Z8K4' => [
						'Z14',
						(object)[
							'Z1K1' => 'Z14',
							'Z14K1' => 'Z825',
							'Z14K2' => (object)[
								'Z1K1' => 'Z7',
								'Z7K1' => 'Z10000',
								'Z10000K1' => 'Q42',
							],
						],
					],
				],
			],
			false,
			'Should return false for a Z825 fragment that holds no code',
		];

		yield 'A Z825 literal hiding a code implementation below its composition' => [
			(object)[
				'Z1K1' => 'Z7',
				'Z7K1' => (object)[
					'Z1K1' => 'Z8',
					'Z8K4' => [
						'Z14',
						(object)[
							'Z1K1' => 'Z14',
							'Z14K1' => 'Z825',
							'Z14K2' => (object)[
								'Z1K1' => 'Z7',
								'Z7K1' => (object)[
									'Z1K1' => 'Z8',
									'Z8K4' => [
										'Z14',
										(object)[
											'Z1K1' => 'Z14',
											'Z14K1' => 'Z999',
											'Z14K3' => (object)[
												'Z1K1' => 'Z16',
												'Z16K1' => (object)[ 'Z1K1' => 'Z61', 'Z61K1' => 'python-3' ],
												'Z16K2' => 'def Z999():\n\treturn "pwned"',
											],
										],
									],
								],
							],
						],
					],
				],
			],
			true,
			'Should return true for code nested below a Z825 composition',
		];

		yield 'A Z825 literal that is itself a code implementation' => [
			(object)[
				'Z1K1' => 'Z7',
				'Z7K1' => (object)[
					'Z1K1' => 'Z8',
					'Z8K4' => [
						'Z14',
						(object)[
							'Z1K1' => 'Z14',
							'Z14K1' => 'Z825',
							'Z14K3' => (object)[
								'Z1K1' => 'Z16',
								'Z16K1' => (object)[ 'Z1K1' => 'Z61', 'Z61K1' => 'python-3' ],
								'Z16K2' => 'def Z825():\n\treturn "pwned"',
							],
						],
					],
				],
			],
			true,
			'Should return true when the Z825 implementation gives code instead of a composition',
		];

		// Map Function/Z873 is a saved function whose first argument is a Z8/Function,
		// which it applies to each item of the list. Filter Function/Z872 and Reduce
		// Function/Z876 take a function the same way. The function called is a
		// reference here, so the implementation list below holds nothing to look at,
		// but the code in the argument still runs.
		yield 'Code passed as the function argument of saved Map Function/Z873' => [
			(object)[
				'Z1K1' => 'Z7',
				'Z7K1' => 'Z873',
				'Z873K1' => (object)[
					'Z1K1' => 'Z8',
					'Z8K1' => [
						'Z17',
						(object)[ 'Z1K1' => 'Z17', 'Z17K1' => 'Z6', 'Z17K2' => 'Z999K1' ],
					],
					'Z8K2' => 'Z6',
					'Z8K3' => [ 'Z20' ],
					'Z8K4' => [
						'Z14',
						(object)[
							'Z1K1' => 'Z14',
							'Z14K1' => 'Z999',
							'Z14K3' => (object)[
								'Z1K1' => 'Z16',
								'Z16K1' => 'Z600',
								'Z16K2' => 'function Z999( Z999K1 ) { return "pwned"; }',
							],
						],
					],
					'Z8K5' => 'Z999',
				],
				'Z873K2' => [ 'Z6', 'a', 'b' ],
			],
			true,
			'Should return true for code in an argument, which a top-level check never sees',
		];

		yield 'A bare code object anywhere in the request' => [
			(object)[
				'Z1K1' => 'Z7',
				'Z7K1' => 'Z801',
				'Z801K1' => (object)[
					'Z1K1' => 'Z16',
					'Z16K1' => (object)[ 'Z1K1' => 'Z61', 'Z61K1' => 'javascript' ],
					'Z16K2' => 'function Z999() { return "pwned"; }',
				],
			],
			true,
			'Should return true for a literal code object, wherever it sits',
		];

		yield 'A reference to Z16 is not a code object' => [
			(object)[
				'Z1K1' => 'Z7',
				'Z7K1' => 'Z801',
				'Z801K1' => 'Z16',
			],
			false,
			'Should return false when Z16 only appears as a reference string',
		];
	}

	// ------------------------------------------------------------------
	// containsCodeLiteral (private static)
	// ------------------------------------------------------------------

	/**
	 * A request with more nodes than MAX_CODE_SCAN_NODES fails closed: we cannot
	 * show that it holds no code, so we treat it as unsaved code.
	 */
	public function testHasUnsavedCode_failsClosedOnHugeInput() {
		$wrapper = $this->getWrappedModule();

		$budget = ( new ReflectionClass( WikiLambdaApiBase::class ) )
			->getConstant( 'MAX_CODE_SCAN_NODES' );

		// A flat list of objects, one longer than the walk will look at. array_fill
		// repeats the same object, so this costs one object and a list of handles.
		$nodes = array_fill( 0, $budget + 1, (object)[] );
		$functionCall = (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z801', 'Z801K1' => $nodes ];

		$this->assertTrue(
			$wrapper->hasUnsavedCode( $functionCall ),
			'Should treat an over-large request as unsaved code'
		);
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

	// ------------------------------------------------------------------
	// failWithTypeMismatch
	// ------------------------------------------------------------------

	public function testFailWithTypeMismatchDiesWithBadRequest(): void {
		$zobject = (object)[ 'Z1K1' => 'Z6' ];

		$wrapper = $this->getWrappedModule();

		try {
			$wrapper->failWithTypeMismatch( $zobject );
			$this->fail( "Expected ApiUsageException but none was thrown" );
		} catch ( ApiUsageException $e ) {
			$this->assertSame( 'Error of type Z518', $e->getMessage() );
		}
	}

	// ------------------------------------------------------------------
	// failWithPermissionDenied
	// ------------------------------------------------------------------

	public function testFailWithPermissionDeniedDiesWithForbidden(): void {
		$zobject = (object)[ 'Z1K1' => 'Z7' ];

		$wrapper = $this->getWrappedModule();

		try {
			$wrapper->failWithPermissionDenied( 'some-privilege', $zobject );
			$this->fail( "Expected ApiUsageException but none was thrown" );
		} catch ( ApiUsageException $e ) {
			$this->assertSame( 'Error of type Z559', $e->getMessage() );
		}
	}
}
