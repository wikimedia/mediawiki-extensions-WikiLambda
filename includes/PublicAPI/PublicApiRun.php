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

use ApiPageSet;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use MediaWiki\Extension\WikiLambda\ActionAPI\WikiLambdaApiBase;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
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
	 * @inheritDoc
	 */
	public function execute() {
		// (T362271) Emit appropriate cache headers for a 7 day TTL
		// NOTE (T362273): MediaWiki out-guesses us and assumes we don't know what we're doing; to fix so it works
		$this->getMain()->setCacheMode( 'public' );
		$this->getMain()->setCacheMaxAge( 60 * 60 * 24 * 7 );

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
		// Unlike the Special pages, we don't have a helpful userCanExecute() method
		$userAuthority = $this->getContext()->getAuthority();
		if ( !$userAuthority->isAllowed( 'wikifunctions-run' ) ) {
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			$this->dieWithZError( $zError, 403 );
		}

		$params = $this->extractRequestParams();
		$pageResult = $this->getResult();
		$stringOfAZ = $params[ 'function_call' ];
		$zObjectAsStdClass = json_decode( $stringOfAZ );
		$jsonQuery = [
			'zobject' => $zObjectAsStdClass,
			'doValidate' => true
		];

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
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			$this->dieWithZError( $zError, 403 );
		}

		$work = new PoolCounterWorkViaCallback( 'WikiLambdaFunctionCall', $this->getUser()->getName(), [
			'doWork' => function () use ( $jsonQuery ) {
				return $this->orchestrator->orchestrate( $jsonQuery );
			},
			'error' => function ( Status $status ) {
				$this->dieWithError( [ "apierror-wikilambda_function_call-concurrency-limit" ], null, null, 429 );
			}
		] );

		$result = [];
		try {
			$response = $work->execute();
			$result['data'] = $response;
		} catch ( ConnectException $exception ) {
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
		}
		$pageResult->addValue( [], $this->getModuleName(), $result );
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
