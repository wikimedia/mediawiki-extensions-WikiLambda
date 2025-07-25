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

use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use JsonException;
use MediaWiki\Api\ApiMain;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\PoolCounter\PoolCounterWorkViaCallback;
use MediaWiki\Status\Status;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\Telemetry\SpanInterface;

class ApiFunctionCall extends WikiLambdaApiBase {

	public function __construct( ApiMain $mainModule, string $moduleName ) {
		parent::__construct( $mainModule, $moduleName, 'wikilambda_function_call_' );

		$this->setUp();
	}

	/**
	 * TODO (T338251): Use WikiLambdaApiBase::executeFunctionCall() rather than rolling our own.
	 *
	 * @inheritDoc
	 */
	protected function run() {
		$start = microtime( true );
		$params = $this->extractRequestParams();
		$pageResult = $this->getResult();
		$stringOfAZ = $params[ 'zobject' ];

		$tracer = MediaWikiServices::getInstance()->getTracer();
		$span = $tracer->createSpan( 'WikiLambda ApiFunctionCall' )
			->setSpanKind( SpanInterface::SPAN_KIND_CLIENT )
			->start();
		$span->activate();

		try {
			$zObjectAsStdClass = json_decode( $stringOfAZ, false, 512, JSON_THROW_ON_ERROR );
			if ( $zObjectAsStdClass === null ) {
				$errorMessage = 'Invalid JSON that did not throw, somehow.';
				$span->setAttributes( [
						'error.message' => $errorMessage
					] );
				throw new JsonException( $errorMessage );
			}
		} catch ( JsonException ) {
			$this->submitFunctionCallEvent( HttpStatus::BAD_REQUEST, null, $start );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX, [] );
			WikiLambdaApiBase::dieWithZError( $zError, HttpStatus::BAD_REQUEST );
		} finally {
			$span->end();
		}

		$jsonQuery = [
			'zobject' => $zObjectAsStdClass,
			'doValidate' => true
		];

		$logger = LoggerFactory::getInstance( 'WikiLambda' );

		// Extract the function called, as a string, for the metrics event. (It should always exist,
		// but if not the orchestrator will return an error.)
		$function = '';
		if ( property_exists( $zObjectAsStdClass, 'Z7K1' ) ) {
			if ( gettype( $zObjectAsStdClass->Z7K1 ) === 'string' ) {
				$function = $zObjectAsStdClass->Z7K1;
			} elseif (
				is_object( $zObjectAsStdClass->Z7K1 ) &&
				property_exists( $zObjectAsStdClass->Z7K1, 'Z8K5' )
			) {
				$function = $zObjectAsStdClass->Z7K1->Z8K5;
			} else {
				$logger->info(
					'ApiFunctionCall unable to find a ZID for the function called',
					[
						'zobject' => $stringOfAZ
					]
				);
			}
		}
		// Only log or submit event with $function if it's valid, to ensure privacy
		if ( !ZObjectUtils::isValidZObjectReference( $function ) ) {
			$function = 'No valid ZID';
		}

		// Unlike the Special pages, we don't have a helpful userCanExecute() method
		$userAuthority = $this->getContext()->getAuthority();
		if ( !$userAuthority->isAllowed( 'wikilambda-execute' ) ) {
			$this->submitFunctionCallEvent( HttpStatus::FORBIDDEN, $function, $start );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			WikiLambdaApiBase::dieWithZError( $zError, HttpStatus::FORBIDDEN );
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
			$errorMessage =
				'ApiFunctionCall rejecting a request for arbitrary execution from an unauthorised user "{user}"';
			$logger->info(
				$errorMessage,
				[
					'user' => $userName,
					'function' => $function
				]
			);
			$this->submitFunctionCallEvent( HttpStatus::FORBIDDEN, $function, $start );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			WikiLambdaApiBase::dieWithZError( $zError, HttpStatus::FORBIDDEN );
		}

		$bypassCache = false;
		$toggleCacheFlag = $params[ 'bypass-cache' ];
		if ( $toggleCacheFlag ) {
			if ( $userAuthority->isAllowed( 'wikilambda-bypass-cache' ) ) {
				$bypassCache = filter_var( $toggleCacheFlag, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE );
				$logger->info( "'bypass-cache' flag has just been toggled to: $bypassCache" );
			} else {
				$errorMessage = "User not permitted to toggle 'bypass-cache' flag";
				$logger->warning( $errorMessage );
				$this->submitFunctionCallEvent( HttpStatus::FORBIDDEN, $function, $start );
				$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
				WikiLambdaApiBase::dieWithZError( $zError, HttpStatus::FORBIDDEN );
			}
		}

		$work = new PoolCounterWorkViaCallback( WikiLambdaApiBase::FUNCTIONCALL_POOL_COUNTER_TYPE, $userName, [
			'doWork' => function () use ( $bypassCache, $jsonQuery, $logger ) {
				$logger->debug(
					'ApiFunctionCall running request',
					[
						'query' => $jsonQuery
					]
				);

				return $this->orchestrator->orchestrate( $jsonQuery, $bypassCache );
			},
			'error' => function ( Status $status ) use ( $function, $start, $userName, $logger ) {
				$errorMessage = 'ApiFunctionCall rejecting a request due to too many requests from source "{user}"';
				$logger->info(
					$errorMessage,
					[
						'user' => $userName,
						'function' => $function
					]
				);
				$this->submitFunctionCallEvent( HttpStatus::TOO_MANY_REQUESTS, $function, $start );
				$this->dieWithError(
					[ "apierror-wikilambda_function_call-concurrency-limit" ],
					null,
					null,
					HttpStatus::TOO_MANY_REQUESTS
				);
			}
		] );

		$result = [ 'success' => false ];

		try {
			$response = $work->execute();
			$result['data'] = $response['result'];
			$result['success'] = true;
			$httpStatusCode = $response['httpStatusCode'];
			$span->setSpanStatus( SpanInterface::SPAN_STATUS_OK );
		} catch ( ConnectException $exception ) {
			$errorMessage = 'ApiFunctionCall failed due to a ConnectException: "{message}"';
			$logger->warning(
				$errorMessage,
				[
					'message' => $exception->getMessage(),
					'exception' => $exception
				]
			);
			$this->submitFunctionCallEvent( HttpStatus::SERVICE_UNAVAILABLE, $function, $start );
			$this->dieWithError(
				[ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ],
				null,
				null,
				HttpStatus::SERVICE_UNAVAILABLE
			);
		} catch ( ClientException | ServerException $exception ) {
			$zError = ZErrorFactory::wrapMessageInZError(
				$exception->getResponse()->getReasonPhrase(),
				$zObjectAsStdClass
			);
			$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zError );
			$zResponseObject = new ZResponseEnvelope( null, $zResponseMap );
			$result['data'] = json_encode( $zResponseObject->getSerialized() );
			$errorMessage = 'ApiFunctionCall failed due to a Client or Server Exception: "{message}"';
			$logger->warning(
				$errorMessage,
				[
					'message' => $exception->getMessage(),
					'exception' => $exception
				]
			);
			$status = $exception->getResponse()->getStatusCode();
			$span->setSpanStatus( SpanInterface::SPAN_STATUS_ERROR )
				->setAttributes( [
					'response.status_code' => $status,
					'exception.message' => $exception->getMessage()
			] );
			$this->submitFunctionCallEvent( $status, $function, $start );
			if ( $exception instanceof ClientException ) {
				$this->dieWithError(
					[ "apierror-wikilambda_function_call-client-error", $this->orchestratorHost ],
					null, null, $status
				);
			} elseif ( $exception instanceof ServerException ) {
				$this->dieWithError(
					[ "apierror-wikilambda_function_call-server-error", $this->orchestratorHost ],
					null, null, $status
				);
			}
		} finally {
			$span->end();
		}

		$pageResult->addValue( [], $this->getModuleName(), $result );
		$this->submitFunctionCallEvent( $httpStatusCode, $function, $start );
	}

	/**
	 * Constructs and submits a metrics event representing this call.
	 *
	 * @param int $httpStatus
	 * @param string|null $function
	 * @param float $start
	 * @return void
	 */
	private function submitFunctionCallEvent( $httpStatus, $function, $start ): void {
		$duration = 1000 * ( microtime( true ) - $start );

		$eventData = [
			'http' => [ 'status_code' => $httpStatus ],
			'total_time_ms' => $duration,
		];
		if ( $function !== null ) {
			$eventData['function'] = $function;
		}

		// This is our submission to the Analytics / metrics system (private data stream);
		// if EventLogging isn't enabled, this will be a no-op.
		$this->submitMetricsEvent( 'wikilambda_function_call', $eventData );

		// (T390548) This is our submission to the Prometheus / SLO system (public data stream).
		// Note: There is already a metric stream provided out-of-the-box from us being part of the Action API,
		// mediawiki_api_executeTiming_seconds{module="wikilambda_function_call",…}, but that does not include
		// the HTTP status code, so we have to track our own.
		MediaWikiServices::getInstance()->getStatsFactory()->withComponent( 'WikiLambda' )
			// Will end up as 'mediawiki.WikiLambda.mw_to_orchestrator_api_call_seconds{status=…}'
			->getTiming( 'mw_to_orchestrator_api_call_seconds' )
			// Note: We intentionally don't log the function here, for cardinality reasons
			->setLabel( 'status', (string)$httpStatus )
			// The "observe" method takes milliseconds.
			->observe( $duration );
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
