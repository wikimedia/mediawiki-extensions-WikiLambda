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

use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use JsonException;
use MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\PoolCounter\PoolCounterWorkViaCallback;
use MediaWiki\Status\Status;
use Wikimedia\ParamValidator\ParamValidator;

class PublicApiRun extends WikiLambdaApiBase {

	/**
	 * @inheritDoc
	 */
	public function __construct( $query, $moduleName ) {
		parent::__construct( $query, $moduleName );

		$this->setUp();
	}

	/**
	 * TODO (T338251): Use WikiLambdaApiBase::executeFunctionCall() rather than rolling our own.
	 */
	protected function run() {
		$start = microtime( true );
		$params = $this->extractRequestParams();
		$pageResult = $this->getResult();
		$stringOfAZ = $params[ 'function_call' ];

		// (T389702) If the JSON is invalid, we need to return a 400 error rather than have PHP die
		try {
			$zObjectAsStdClass = json_decode( $stringOfAZ, false, 512, JSON_THROW_ON_ERROR );

			if ( $zObjectAsStdClass === null ) {
				throw new JsonException( 'Invalid JSON that did not throw, somehow' );
			}
		} catch ( JsonException ) {
			$this->submitFunctionCallEvent( HttpStatus::BAD_REQUEST, null, $start );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX, [] );
			WikiLambdaApiBase::dieWithZError( $zError, HttpStatus::BAD_REQUEST );
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
					'PublicApiRun unable to find a ZID for the function called',
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
		if ( !$userAuthority->isAllowed( 'wikifunctions-run' ) ) {
			$this->submitFunctionCallEvent( HttpStatus::FORBIDDEN, $function, $start );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			WikiLambdaApiBase::dieWithZError( $zError, HttpStatus::FORBIDDEN );
		}

		// Don't allow the public API to run "unsaved code" (a custom function with the raw
		// implementation rather than a ZID string).
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
		if ( $isUnsavedCode ) {
			$this->submitFunctionCallEvent( HttpStatus::FORBIDDEN, $function, $start );
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			WikiLambdaApiBase::dieWithZError( $zError, HttpStatus::FORBIDDEN );
		}

		$work = new PoolCounterWorkViaCallback(
			WikiLambdaApiBase::FUNCTIONCALL_POOL_COUNTER_TYPE,
			$this->getUser()->getName(),
			[
				'doWork' => function () use ( $jsonQuery ) {
					return $this->orchestrator->orchestrate( $jsonQuery );
				},
				'error' => function ( Status $status ) use ( $function, $start ) {
					$this->submitFunctionCallEvent( HttpStatus::TOO_MANY_REQUESTS, $function, $start );
					$this->dieWithError(
						[ "apierror-wikilambda_function_call-concurrency-limit" ],
						null,
						null,
						HttpStatus::TOO_MANY_REQUESTS
					);
				}
			]
		);

		$result = [];
		try {
			$response = $work->execute();
			$result['data'] = $response['result'];
			$httpStatusCode = $response['httpStatusCode'];
		} catch ( ConnectException ) {
			$this->submitFunctionCallEvent( HttpStatus::SERVICE_UNAVAILABLE, $function, $start );
			$this->dieWithError(
				[ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ],
				null, null, HttpStatus::SERVICE_UNAVAILABLE
			);
		} catch ( ClientException | ServerException $exception ) {
			$zError = ZErrorFactory::wrapMessageInZError(
				$exception->getResponse()->getReasonPhrase(),
				$zObjectAsStdClass
			);
			$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zError );
			$zResponseObject = new ZResponseEnvelope( null, $zResponseMap );
			$result['data'] = json_encode( $zResponseObject->getSerialized() );
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
	 * @codeCoverageIgnore
	 */
	private function submitFunctionCallEvent( $httpStatus, $function, $start ): void {
		$eventData = [ 'http' => [ 'status_code' => $httpStatus ] ];
		if ( $function !== null ) {
			$eventData['function'] = $function;
		}
		$eventData['total_time_ms'] = 1000 * ( microtime( true ) - $start );
		$this->submitMetricsEvent( 'wikifunctions_run', $eventData );
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
