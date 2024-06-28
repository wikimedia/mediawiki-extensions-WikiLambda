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

use ApiMain;
use ApiPageSet;
use ApiUsageException;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZQuote;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\PoolCounter\PoolCounterWorkViaCallback;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Status\Status;
use Wikimedia\ParamValidator\ParamValidator;

class ApiFunctionCall extends WikiLambdaApiBase {

	/**
	 * @inheritDoc
	 */
	public function __construct( $query, $moduleName ) {
		parent::__construct( $query, $moduleName, 'wikilambda_function_call_' );

		$this->setUp();
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
	 * TODO (T338251): Use WikiLambdaApiBase::executeFunctionCall() rather than rolling our own.
	 *
	 * @param ApiPageSet|null $resultPageSet
	 */
	private function run( $resultPageSet = null ) {
		$start = microtime( true );
		$params = $this->extractRequestParams();
		$pageResult = $this->getResult();
		$stringOfAZ = $params[ 'zobject' ];
		$zObjectAsStdClass = json_decode( $stringOfAZ );
		$jsonQuery = [
			'zobject' => $zObjectAsStdClass,
			'doValidate' => true
		];

		$logger = LoggerFactory::getInstance( 'WikiLambda' );

		// Extract the function called, as a string, for the metrics event. (It should always exist,
		// but if not the orchestrator will return an error.)
		$function = null;
		if ( property_exists( $zObjectAsStdClass, 'Z7K1' ) ) {
			if ( gettype( $zObjectAsStdClass->Z7K1 ) === 'string' ) {
				$function = $zObjectAsStdClass->Z7K1;
			} elseif (
				is_object( $zObjectAsStdClass->Z7K1 ) &&
				property_exists( $zObjectAsStdClass->Z7K1, 'Z8K5' )
			) {
				$function = $zObjectAsStdClass->Z7K1->Z8K5;
			} else {
				$function = json_encode( $zObjectAsStdClass->Z7K1 );
				$logger->info(
					'ApiFunctionCall unable to find a ZID for the function called',
					[
						'zobject' => $stringOfAZ
					]
				);
			}
		}

		// Unlike the Special pages, we don't have a helpful userCanExecute() method
		$userAuthority = $this->getContext()->getAuthority();
		if ( !$userAuthority->isAllowed( 'wikilambda-execute' ) ) {
			$this->submitFunctionCallEvent( 403, $function, $start );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			$this->dieWithZError( $zError, 403 );
		}

		// Principally used for the PoolCounter, but also logging
		$userName = $this->getUser()->getName();

		// Arbitrary implementation calls need more than wikilambda-execute;
		// require wikilambda-execute-unsaved-code, so that it can be independently
		// activated/deactivated (to run an arbitrary implementation, you have to
		// pass a custom function with the raw implementation rather than a ZID string.)
		$isUnsavedCode = false;
		if (
			property_exists( $zObjectAsStdClass, 'Z7K1' ) &&
			is_object( $zObjectAsStdClass->Z7K1 ) &&
			property_exists( $zObjectAsStdClass->Z7K1, 'Z8K4' ) &&
			count( $zObjectAsStdClass->Z7K1->Z8K4 ) > 1
		) {
			$implementation = $zObjectAsStdClass->Z7K1->Z8K4[ 1 ];
			if ( is_object( $implementation ) && property_exists( $implementation, 'Z14K1' ) ) {
				$isUnsavedCode = true;
			}
		}
		if ( $isUnsavedCode && !$userAuthority->isAllowed( 'wikilambda-execute-unsaved-code' ) ) {
			$logger->info(
				'ApiFunctionCall rejecting a request for arbitrary execution from an unauthorised user "{user}"',
				[
					'user' => $userName,
					'function' => $function
				]
			);
			$this->submitFunctionCallEvent( 403, $function, $start );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			$this->dieWithZError( $zError, 403 );
		}

		$work = new PoolCounterWorkViaCallback( 'WikiLambdaFunctionCall', $userName, [
			'doWork' => function () use ( $jsonQuery, $logger ) {
				$logger->debug(
					'ApiFunctionCall running request',
					[
						'query' => $jsonQuery
					]
				);

				return $this->orchestrator->orchestrate( $jsonQuery );
			},
			'error' => function ( Status $status ) use ( $function, $start, $userName, $logger ) {
				$logger->info(
					'ApiFunctionCall rejecting a request due to too many requests from source "{user}"',
					[
						'user' => $userName,
						'function' => $function
					]
				);

				$this->submitFunctionCallEvent( 429, $function, $start );
				$this->dieWithError( [ "apierror-wikilambda_function_call-concurrency-limit" ], null, null, 429 );
			}
		] );

		$result = [ 'success' => false ];
		try {
			$response = $work->execute();
			$result['data'] = $response;
			$result['success'] = true;
		} catch ( ConnectException $exception ) {
			$logger->warning(
				'ApiFunctionCall failed due to a ConnectException: "{message}"',
				[
					'message' => $exception->getMessage(),
					'exception' => $exception
				]
			);
			$this->submitFunctionCallEvent( 503, $function, $start );
			$this->dieWithError(
				[ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ],
				null, null, 503
			);
		} catch ( ClientException | ServerException $exception ) {
			$zError = ZErrorFactory::wrapMessageInZError(
				$exception->getResponse()->getReasonPhrase(),
				$zObjectAsStdClass
			);
			$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zError );
			$zResponseObject = new ZResponseEnvelope( null, $zResponseMap );
			$result['data'] = $zResponseObject->getSerialized();
			$logger->warning(
				'ApiFunctionCall failed due to a Client or Server Exception: "{message}"',
				[
					'message' => $exception->getMessage(),
					'exception' => $exception
				]
			);
		}
		$pageResult->addValue( [ 'query' ], $this->getModuleName(), $result );
		$this->submitFunctionCallEvent( 200, $function, $start );
	}

	/**
	 * Constructs and submits a metrics event representing this call.
	 *
	 * @param int $httpStatus
	 * @param string|null $function
	 * @param float $start
	 * @return void
	 * @codeCoverageIgnore
	 */
	private function submitFunctionCallEvent( $httpStatus, $function, $start ): void {
		$eventData = [ 'http' => [ 'status_code' => $httpStatus ] ];
		if ( $function !== null ) {
			$eventData['function'] = $function;
		}
		$eventData['total_time_ms'] = 1000 * ( microtime( true ) - $start );
		$this->submitMetricsEvent( 'wikilambda_function_call', $eventData );
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
	 * A convenience function for making a ZFunctionCall and returning its result to embed within a page.
	 *
	 * @param string $call The ZFunctionCall to make, as a JSON object turned into a string
	 * @return string Currently the only permissable response objects are strings
	 * @throws ZErrorException When the request is responded to oddly by the orchestrator
	 */
	public static function makeRequest( $call ): string {
		$api = new ApiMain( new FauxRequest() );
		$request = new FauxRequest(
			[
				'format' => 'json',
				'action' => 'wikilambda_function_call',
				'wikilambda_function_call_zobject' => $call,
			],
			/* wasPosted */ true
		);

		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setRequest( $request );
		$api->setContext( $context );
		$api->execute();
		$outerResponse = $api->getResult()->getResultData( [], [ 'Strip' => 'all' ] );

		if ( isset( $outerResponse[ 'error' ] ) ) {
			try {
				$zerror = ZObjectFactory::create( $outerResponse['error'] );
			} catch ( ZErrorException $e ) {
				// Can't use $this->dieWithError() as we're static, so use the call indirectly
				throw ApiUsageException::newWithMessage(
					null,
					[
						'apierror-wikilambda_function_call-response-malformed',
						// TODO (T362236): Pass the rendering language in, don't default to English
						$e->getZError()->getMessage()
					],
					null,
					null,
					400
				);
			}
			if ( !( $zerror instanceof ZError ) ) {
				$zerror = ZErrorFactory::wrapMessageInZError( new ZQuote( $zerror ), $call );
			}
			throw new ZErrorException( $zerror );
		}

		// Now we know that the request has not failed before it even got to the orchestrator, get the response
		// JSON string as a ZResponseEnvelope (falling back to an empty string in case it's unset).
		$response = ZObjectFactory::create(
			$outerResponse['query']['wikilambda_function_call']['data'] ?? ''
		);

		if ( !( $response instanceof ZResponseEnvelope ) ) {
			// The server's not given us a result!
			$responseType = $response->getZType();
			$zerror = ZErrorFactory::wrapMessageInZError(
				"Server returned a non-result of type '$responseType'!",
				$call
			);
			throw new ZErrorException( $zerror );
		}

		if ( $response->hasErrors() ) {
			// If the server has responsed with a Z5/Error, show that properly.
			$zerror = $response->getErrors();
			if ( !( $zerror instanceof ZError ) ) {
				$zerror = ZErrorFactory::wrapMessageInZError( new ZQuote( $zerror ), $call );
			}
			throw new ZErrorException( $zerror );
		}

		return trim( $response->getZValue() );
	}

	/**
	 * Mark as internal. This isn't meant to be user-facing, and can change at any time.
	 * @return bool
	 */
	public function isInternal() {
		return true;
	}
}
