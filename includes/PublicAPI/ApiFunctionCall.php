<?php
/**
 * WikiLambda function call API
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
use MediaWiki\Extension\WikiLambda\API\WikiLambdaApiBase;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\PoolCounter\PoolCounterWorkViaCallback;
use MediaWiki\Status\Status;
use Wikimedia\ParamValidator\ParamValidator;

class ApiFunctionCall extends WikiLambdaApiBase {

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
			if ( is_object( $implementation ) && property_exists( $implementation, 'Z14K3' ) ) {
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
	 * Reads file contents from test data directory as JSON array.
	 * @param string $fileName
	 * @return array file contents (JSON-decoded)
	 * @codeCoverageIgnore
	 */
	private function readTestFileAsArray( $fileName ): array {
		return json_decode( $this->readTestFile( $fileName ), true );
	}

	/**
	 * Generates URL-encoded example function call from JSON file contents.
	 * @param string $fileName
	 * @return string URL-encoded contents
	 * @codeCoverageIgnore
	 */
	private function createExample( $fileName ): string {
		return urlencode( $this->readTestFile( $fileName ) );
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages() {
		return [
			'action=wikifunctions_run&function_call='
				. $this->createExample( 'Z902_false.json' )
				=> 'apihelp-wikilambda_function_call-example-if',
		];
	}
}
