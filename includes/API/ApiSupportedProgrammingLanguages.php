<?php
/**
 * WikiLambda function call API
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
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use PoolCounterWorkViaCallback;
use Status;

class ApiSupportedProgrammingLanguages extends WikiLambdaApiBase {

	/**
	 * @inheritDoc
	 */
	public function __construct( $query, $moduleName ) {
		parent::__construct( $query, $moduleName, 'wikilambda_supported_programming_languages_' );

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
		$pageResult = $this->getResult();

		// TODO (T307742): Memoize the call and cache the response via WANCache getWithSetCallback too?
		$work = new PoolCounterWorkViaCallback(
			'WikiLambdaSupportedProgrammingLanguages',
			$this->getUser()->getName(),
			[
				'doWork' => function () {
					return $this->orchestrator->getSupportedProgrammingLanguages();
				},
				'error' => function ( Status $status ) {
					$this->dieWithError( [ "apierror-wikilambda_supported_programming_languages-concurrency-limit" ] );
				} ] );

		try {
			$response = $work->execute();
			$result = [ 'success' => true, 'data' => $response->getBody() ];
		} catch ( ConnectException $exception ) {
			$this->dieWithError( [
				"apierror-wikilambda_supported_programming_languages-not-connected",
				$this->orchestratorHost ] );
		} catch ( ClientException | ServerException $exception ) {
			$zError = self::wrapMessageInZError( $exception->getResponse()->getReasonPhrase(), '' );
			$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zError );
			$zResponseObject = new ZResponseEnvelope( null, $zResponseMap );
			$result = [ 'data' => $zResponseObject->getSerialized() ];
		}
		$pageResult->addValue( [ 'query' ], $this->getModuleName(), $result );
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getAllowedParams(): array {
		return [];
	}

	/**
	 * Mark as internal. This isn't meant to be user-facing, and can change at any time.
	 * @return bool
	 */
	public function isInternal() {
		return true;
	}

	/**
	 * Convenience method to wrap a non-error in a Z507/Evaluation ZError
	 *
	 * TODO (T311480): This is used by two different APIs. Move to the ZErrorFactory,
	 * which is where all the error creating convenience methods are right now.
	 *
	 * @param string $message The non-error to wrap.
	 * @param string $call The functional call context.
	 * @return ZError
	 */
	public static function wrapMessageInZError( $message, $call ): ZError {
		$wrappedError = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [ 'message' => $message ]
		);
		$zerror = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_EVALUATION,
			[
				'functionCall' => $call,
				'error' => $wrappedError
			]
		);
		return $zerror;
	}
}
