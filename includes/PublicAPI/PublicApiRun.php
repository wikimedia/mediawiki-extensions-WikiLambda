<?php
/**
 * WikiLambda function call run public API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\PublicAPI;

use JsonException;
use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use Wikimedia\ParamValidator\ParamValidator;

class PublicApiRun extends WikiLambdaApiBase {

	/**
	 * @inheritDoc
	 */
	public function __construct( ApiMain $mainModule, string $moduleName ) {
		parent::__construct( $mainModule, $moduleName, '', true );

		$this->setUp();
	}

	/**
	 * @inheritDoc
	 */
	protected function run() {
		$start = microtime( true );

		// Get input parameters
		$params = $this->extractRequestParams();
		$zObjectString = $params[ 'function_call' ];

		// Initialize output
		$pageResult = $this->getResult();

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
			WikiLambdaApiBase::dieWithZError( $zError, HttpStatus::BAD_REQUEST );
		}

		// Cautionary canonicalization
		$zObjectAsStdClass = ZObjectUtils::canonicalize( $zObjectAsStdClass );

		// Initialize flags:
		$flags = [
			'validate' => true,
			'isUnsavedCode' => false,
			'bypassCache' => false
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
				'data' => $response['result']
			];

			$httpStatusCode = $response['httpStatusCode'];

			$pageResult->addValue( [], $this->getModuleName(), $result );
			$this->submitFunctionCallEvent( $httpStatusCode, $function, $start );

		} catch ( ApiUsageException $e ) {
			// Whenever executeFunctionCall dies with error, we intercept it so that:
			// * we submit a function call metrics event,
			// * we rethrow the error
			$errorCode = $e->getCode();
			$httpStatusCode = ( is_int( $errorCode ) && $errorCode >= 100 && $errorCode < 600 ) ?
				$errorCode : HttpStatus::BAD_REQUEST;
			$this->submitFunctionCallEvent( $httpStatusCode, $function, $start );
			throw $e;

		} catch ( \Throwable $e ) {
			// Whatever we catch here is an unexpected system error:
			// * we log accordingly as error
			// * we rethrow the error
			$this->getLogger()->error(
				__METHOD__ . ' caused an unexpected system failure',
				[
					'zobject' => $zObjectString,
					'exception' => $e
				]
			);
			throw $e;
		}
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getAllowedParams(): array {
		return [
			'function_call' => [
				ParamValidator::PARAM_TYPE => 'text',
				ParamValidator::PARAM_REQUIRED => true,
			]
		];
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages() {
		return [
			'action=wikifunctions_run&function_call='
				. urlencode( ZObjectUtils::readTestFile( 'Z902_false.json' ) )
				=> 'apihelp-wikilambda_function_call-example-if',
		];
	}
}
