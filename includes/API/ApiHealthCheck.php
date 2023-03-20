<?php
/**
 * WikiLambda health check API.
 *
 * It is similar to the function call API, but takes no parameters. Instead, it just
 * automatically calls a select number of tests and returns whether they have all passed
 * (success: 'true').
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\API;

use ApiPageSet;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use PoolCounterWorkViaCallback;
use Status;

class ApiHealthCheck extends WikiLambdaApiBase {

	/**
	 * @inheritDoc
	 */
	public function __construct( $query, $moduleName ) {
		parent::__construct( $query, $moduleName, 'wikilambda_health_check_' );

		$this->setUpOrchestrator();
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		$this->run();
	}

	/**
	 * @inheritDoc
	 */
	public function executeGenerator( $resultPageSet ) {
		$this->run( $resultPageSet );
	}

	/**
	 * Calls the orchestrator with a test function call and checks it against the expected outcome.
	 *
	 * Checks the expected outcome against the Z22/ResponseEnvelope's Z22K1 field.
	 * If there is any connection error, client error, or server error, an error will be thrown and the check
	 * will be aborted.
	 *
	 * TODO: Use WikiLambdaApiBase::executeFunctionCall() rather than rolling our own.
	 *
	 * @param string $requestFileName File in ../../tests/phpunit/test_data.
	 * @param string $expectedOutcome The expected correct outcome that should be present in the Z22K1 field.
	 * @return bool Whether the orchestrator result contains the expected outcome.
	 */
	private function runOneCheck( $requestFileName, $expectedOutcome ) {
		$zObject = json_decode( $this->readTestFile( $requestFileName ) );
		$jsonQuery = [
			'zobject' => $zObject,
			'doValidate' => true
		];
		$work = new PoolCounterWorkViaCallback( 'WikiLambdaFunctionCall', $this->getUser()->getName(), [
			'doWork' => function () use ( $jsonQuery ) {
				return $this->orchestrator->orchestrate( $jsonQuery );
			},
			'error' => function ( Status $status ) {
				$this->dieWithError( [ "apierror-wikilambda_function_call-concurrency-limit" ] );
			}
		] );
		$response = $work->execute();
		$data = json_decode( $response->getBody() );
		$resultField = json_encode( $data->{ 'Z22K1' } );
		// Ensures that the expected outcome is a substring of the Z22K1 field.
		return strpos( $resultField, $expectedOutcome ) !== false;
	}

	/**
	 * @return array An array of the file names for the checks and their corresponding
	 *     expected outcomes.
	 */
	private static function getChecksAndAnswers() {
		// TODO (T311457): We can expand this to use all the examples in the API function call.
		return [
			'evaluated-js.json' => "13",
			'evaluated-python.json' => "13",
			'example-composition.json' => "abcddeeeefghhijklmnoooopqrrttuuvwxyz"
		];
	}

	/**
	 * Runs a series of builtin checks against the orchestrator and returns an overview
	 * of the test's pass/fail status.
	 *
	 * To ensure the check has passed, the caller should check that the success field in the
	 * response is "true". The other fields in the response are for debugging purposes.
	 *
	 * @param ApiPageSet|null $resultPageSet
	 */
	private function run( $resultPageSet = null ) {
		$pageResult = $this->getResult();
		$checksAndAnswers = self::getChecksAndAnswers();
		$result = [
			'success' => 'false',
			// The total number of tests that is expected to be run.
			'total_tests' => count( $checksAndAnswers ),
			// The total number of tests this call was able to attempt (errors might interrupt the executions).
			'tested' => 0,
			// The total number of tests that passed the check.
			'passed' => 0,
			// The first error encountered.
			// TODO (T311457): An alternative is to make errors not abort and collect all of them.
			'error' => ''
		];

		try {
			foreach ( $checksAndAnswers as $check => $answer ) {
				$result[ 'tested' ] += 1;
				$result[ 'passed' ] += (int)$this->runOneCheck( $check, $answer );
			}
			if ( $result[ 'passed'] == $result[ 'total_tests'] ) {
				$result[ 'success' ] = 'true';
			}
		} catch ( ConnectException | ServerException | ClientException $exception ) {
			$result[ 'error' ] = $exception->getMessage();
		}

		$pageResult->addValue( [ 'query' ], $this->getModuleName(), $result );
	}

	/**
	 * Reads file contents from test data directory.
	 * @param string $fileName
	 * @return string file contents
	 * @codeCoverageIgnore
	 */
	private function readTestFile( $fileName ): string {
		$baseDir = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'tests' .
			DIRECTORY_SEPARATOR .
			'phpunit' .
			DIRECTORY_SEPARATOR .
			'test_data';
		$fullFile = $baseDir . DIRECTORY_SEPARATOR . $fileName;
		return file_get_contents( $fullFile );
	}

	/**
	 * Mark as internal. This isn't meant to be user-facing, and can change at any time.
	 * @return bool
	 */
	public function isInternal() {
		return true;
	}
}
