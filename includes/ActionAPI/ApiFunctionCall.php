<?php
/**
 * WikiLambda function call API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use JsonException;
use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\MediaWikiServices;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\Telemetry\SpanInterface;

class ApiFunctionCall extends WikiLambdaApiBase {

	public function __construct( ApiMain $mainModule, string $moduleName ) {
		parent::__construct( $mainModule, $moduleName, 'wikilambda_function_call_' );

		$this->setUp();
	}

	/**
	 * @inheritDoc
	 */
	protected function run() {
		$start = microtime( true );

		// Get input parameters
		$params = $this->extractRequestParams();
		$zObjectString = $params[ 'zobject' ];

		// Initialize output
		$pageResult = $this->getResult();

		// Initialize span
		$tracer = MediaWikiServices::getInstance()->getTracer();
		$span = $tracer->createSpan( 'WikiLambda ApiFunctionCall' )
			->setSpanKind( SpanInterface::SPAN_KIND_CLIENT )
			->start();
		$span->activate();

		// 1. JSON decode input zobject and die with ZError if invalid syntax
		try {
			$zObjectAsStdClass = json_decode( $zObjectString, false, 512, JSON_THROW_ON_ERROR );
		} catch ( JsonException $e ) {
			// (T389702) If the JSON is invalid, we return a 400 error rather than have PHP die
			$this->submitFunctionCallEvent( HttpStatus::BAD_REQUEST, null, $start );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX, [
				'message' => $e->getMessage(),
				'input' => $zObjectString
			] );
			$span
				->setSpanStatus( SpanInterface::SPAN_STATUS_ERROR )
				->setAttributes( [ 'error.message' => $e->getMessage() ] )
				->end();
			WikiLambdaApiBase::dieWithZError( $zError, HttpStatus::BAD_REQUEST );
		}

		// Cautionary canonicalization
		$zObjectAsStdClass = ZObjectUtils::canonicalize( $zObjectAsStdClass );

		// Initialize flags:
		$flags = [
			'validate' => true,
			'isUnsavedCode' => false,
			// Get bypassCache boolean flag if set to any truthy value, false otherwise
			'bypassCache' => filter_var( $params[ 'bypass-cache' ], FILTER_VALIDATE_BOOLEAN )
		];

		// Get function zid for logging
		$function = ZObjectUtils::getFunctionZidOrNull( $zObjectAsStdClass );
		if ( !ZObjectUtils::isValidZObjectReference( (string)$function ) ) {
			$function = 'No valid ZID';
			$this->getLogger()->info(
				__METHOD__ . ' unable to find a ZID for the function called',
				[
					'zobject' => $zObjectString
				]
			);
		}

		// Arbitrary implementation calls need more than wikilambda-execute;
		// require wikilambda-execute-unsaved-code, so that it can be independently
		// activated/deactivated (to run an arbitrary implementation, you have to
		// pass a custom function with the raw implementation rather than a ZID string.)
		if (
			property_exists( $zObjectAsStdClass, 'Z7K1' ) &&
			is_object( $zObjectAsStdClass->Z7K1 ) &&
			property_exists( $zObjectAsStdClass->Z7K1, 'Z8K4' ) &&
			count( $zObjectAsStdClass->Z7K1->Z8K4 ) > 1
		) {
			$implementation = $zObjectAsStdClass->Z7K1->Z8K4[ 1 ];
			if ( is_object( $implementation ) && property_exists( $implementation, 'Z14K1' ) ) {
				$flags[ 'isUnsavedCode' ] = true;
			}
		}

		try {
			$response = $this->executeFunctionCall( $zObjectAsStdClass, $flags );

			$result = [
				'success' => true,
				'data' => $response['result']
			];

			// Get the Http status code returned by the orchestrator, and:
			// * For 2xx or 4xx, log it as a successful request
			// * For 5xx (server errors), log it as a failer request
			$httpStatusCode = $response['httpStatusCode'];
			if ( $httpStatusCode < HttpStatus::INTERNAL_SERVER_ERROR ) {
				$span->setSpanStatus( SpanInterface::SPAN_STATUS_OK );
			} else {
				$result['success'] = false;
				$span
					->setSpanStatus( SpanInterface::SPAN_STATUS_ERROR )
					->setAttributes( [
						'response.status_code' => $httpStatusCode,
						'exception.message' => $response['result']
					] );
			}

			$pageResult->addValue( [], $this->getModuleName(), $result );
			$this->submitFunctionCallEvent( $httpStatusCode, $function, $start );

		} catch ( ApiUsageException $e ) {
			// Whenever executeFunctionCall dies with error, we intercept it so that:
			// * we submit a function call metrics event,
			// * we rethrow the error
			// * finally we end the span
			$errorCode = $e->getCode();
			$httpStatusCode = ( is_int( $errorCode ) && $errorCode >= 100 && $errorCode < 600 ) ?
				$errorCode : HttpStatus::BAD_REQUEST;
			$this->submitFunctionCallEvent( $httpStatusCode, $function, $start );
			throw $e;

		} catch ( \Throwable $e ) {
			// Whatever we catch here is an unexpected system error:
			// * we log accordingly as error
			// * we rethrow the error
			// * finally we end the span
			$this->getLogger()->error(
				__METHOD__ . ' caused an unexpected system failure',
				[
					'zobject' => $zObjectString,
					'exception' => $e
				]
			);
			throw $e;

		} finally {
			// End the span
			$span->end();
		}
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getAllowedParams(): array {
		return [
			'zobject' => [
				ParamValidator::PARAM_TYPE => 'text',
				ParamValidator::PARAM_REQUIRED => true,
			],
			'bypass-cache' => [
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_REQUIRED => false,
				ParamValidator::PARAM_DEFAULT => false
			]
		];
	}

	/**
	 * Reads file contents from test data directory as JSON array.
	 * @param string $fileName
	 * @return array file contents (JSON-decoded)
	 * @codeCoverageIgnore
	 */
	private function readTestFileAsArray( $fileName ): array {
		return json_decode( ZObjectUtils::readTestFile( $fileName ), true );
	}

	/**
	 * Generates URL-encoded example function call exercising user-defined validation function.
	 * This function call produces a validation error. Replace
	 * Z1000000K1: 'a' with Z1000000K1: 'A' in order to see successful validation.
	 * @return string URL-encoded Function Call
	 * @codeCoverageIgnore
	 */
	private function createUserDefinedValidationExample(): string {
		$ZMillionOuter = $this->readTestFileAsArray( 'user-defined-validation-type.json' );
		$ZMillionInner = $this->readTestFileAsArray( 'user-defined-validation-type.json' );
		$validationZ7 = $this->readTestFileAsArray( 'example-user-defined-validation.json' );
		$ZMillionOuter["Z4K3"]["Z8K1"][1]["Z17K1"] = $ZMillionInner;
		$validationZ7["Z801K1"]["Z1K1"] = $ZMillionOuter;
		return urlencode( json_encode( $validationZ7 ) );
	}

	/**
	 * Generates URL-encoded example function call exercising curry function.
	 * @return string URL-encoded Function Call
	 * @codeCoverageIgnore
	 */
	private function createCurryExample(): string {
		$curryImplementation = $this->readTestFileAsArray( 'curry-implementation-Z409.json' );
		$curryFunction = $this->readTestFileAsArray( 'curry-Z408.json' );
		$curryFunction["Z8K4"][1] = $curryImplementation;
		$curryFunctionCall = $this->readTestFileAsArray( 'curry-call-Z410.json' );
		$curryFunctionCall["Z8K4"][1]["Z14K2"]["Z7K1"]["Z7K1"] = $curryFunction;
		$andFunction = $this->readTestFileAsArray( 'and-Z407.json' );
		$curry = [
			"Z1K1" => "Z7",
			"Z7K1" => $curryFunctionCall,
			"Z410K1" => $andFunction,
			"Z410K2" => [
				"Z1K1" => "Z40",
				"Z40K1" => "Z41"
			],
			"Z410K3" => [
				"Z1K1" => "Z40",
				"Z40K1" => "Z41"
			]
		];
		return urlencode( json_encode( $curry ) );
	}

	/**
	 * Generates URL-encoded example function call from JSON file contents.
	 * @param string $fileName
	 * @return string URL-encoded contents
	 * @codeCoverageIgnore
	 */
	private function createExample( $fileName ): string {
		return urlencode( ZObjectUtils::readTestFile( $fileName ) );
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages() {
		return [
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'Z902_false.json' )
				=> 'apihelp-wikilambda_function_call-example-if',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'evaluated-js.json' )
				=> 'apihelp-wikilambda_function_call-example-native-js-code',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'evaluated-python.json' )
				=> 'apihelp-wikilambda_function_call-example-native-python-code',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'example-composition.json' )
				=> 'apihelp-wikilambda_function_call-example-composition',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'example-notempty.json' )
				=> 'apihelp-wikilambda_function_call-example-notempty',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'example-map.json' )
				=> 'apihelp-wikilambda_function_call-example-map',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'example-apply.json' )
				=> 'apihelp-wikilambda_function_call-example-apply',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'example-generic-list.json' )
				=> 'apihelp-wikilambda_function_call-example-generic-list',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'example-generic-pair.json' )
				=> 'apihelp-wikilambda_function_call-example-generic-pair',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'example-generic-map.json' )
				=> 'apihelp-wikilambda_function_call-example-generic-map',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'example-user-defined-python.json' )
				=> 'apihelp-wikilambda_function_call-example-user-defined-python',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'example-user-defined-javascript.json' )
				=> 'apihelp-wikilambda_function_call-example-user-defined-javascript',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createUserDefinedValidationExample()
				=> 'apihelp-wikilambda_function_call-example-user-defined-validation',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'example-user-defined-generic-type.json' )
				=> 'apihelp-wikilambda_function_call-example-user-defined-generic-type',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createCurryExample()
				=> 'apihelp-wikilambda_function_call-example-curry',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'example-socket.json' )
				=> 'apihelp-wikilambda_function_call-example-socket',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'example-timeout.json' )
				=> 'apihelp-wikilambda_function_call-example-timeout',
			'action=wikilambda_function_call&wikilambda_function_call_zobject='
				. $this->createExample( 'example-orchestrator-timeout.json' )
				=> 'apihelp-wikilambda_function_call-example-orchestrator-timeout',
		];
	}

	/**
	 * Mark as internal. This isn't meant to be user-facing, and can change at any time.
	 * @return bool
	 */
	public function isInternal() {
		return true;
	}
}
