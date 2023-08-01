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

use ApiMain;
use ApiPageSet;
use DerivativeContext;
use FauxRequest;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZQuote;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use PoolCounterWorkViaCallback;
use RequestContext;
use Status;
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
		// Unlike the Special pages, we don't have a helpful userCanExecute() method
		$userAuthority = $this->getContext()->getAuthority();
		if ( !$userAuthority->isAllowed( 'wikilambda-execute' ) ) {
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			$this->dieWithZError( $zError );
		}

		$params = $this->extractRequestParams();
		$pageResult = $this->getResult();
		$stringOfAZ = $params[ 'zobject' ];
		$zObject = json_decode( $stringOfAZ );
		$jsonQuery = [
			'zobject' => $zObject,
			'doValidate' => false
		];

		// TODO (T307742): Memoize the call and cache the response via WANCache getWithSetCallback too?

		// Arbitrary implementation calls need more than wikilambda-execute; require wikilambda-create-implementation
		// (To run an arbitrary implementation, you have to pass a custom function rather than a ZID string.)
		if ( !( is_string( $zObject->Z7K1 ) ) && !$userAuthority->isAllowed( 'wikilambda-create-implementation' ) ) {
			$zError = ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN, [] );
			$this->dieWithZError( $zError );
		}

		$work = new PoolCounterWorkViaCallback( 'WikiLambdaFunctionCall', $this->getUser()->getName(), [
			'doWork' => function () use ( $jsonQuery ) {
				return $this->orchestrator->orchestrate( $jsonQuery );
			},
			'error' => function ( Status $status ) {
				$this->dieWithError( [ "apierror-wikilambda_function_call-concurrency-limit" ] );
			}
		] );

		$result = [ 'success' => false ];
		try {
			$response = $work->execute();
			$result['data'] = $response->getBody();
			if ( is_object( $result['data'] ) ) {
				$result['success'] = true;
			}
		} catch ( ConnectException $exception ) {
			$this->dieWithError( [ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ] );
		} catch ( ClientException | ServerException $exception ) {
			$zError = self::wrapMessageInZError( $exception->getResponse()->getReasonPhrase(), $zObject );
			$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zError );
			$zResponseObject = new ZResponseEnvelope( null, $zResponseMap );
			$result['data'] = $zResponseObject->getSerialized();
		}
		$pageResult->addValue( [ 'query' ], $this->getModuleName(), $result );
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
		$curryImplementation = $this->readTestFileAsArray( 'curry-implementation-Z10088.json' );
		$curryFunction = $this->readTestFileAsArray( 'curry-Z10087.json' );
		$curryFunction["Z8K4"][1] = $curryImplementation;
		$curryFunctionCall = $this->readTestFileAsArray( 'curry-call-Z30086.json' );
		$curryFunctionCall["Z8K4"][1]["Z14K2"]["Z7K1"]["Z7K1"] = $curryFunction;
		$andFunction = $this->readTestFileAsArray( 'and-Z10007.json' );
		$curry = [
			"Z1K1" => "Z7",
			"Z7K1" => $curryFunctionCall,
			"Z30086K1" => $andFunction,
			"Z30086K2" => [
				"Z1K1" => "Z40",
				"Z40K1" => "Z41"
			],
			"Z30086K3" => [
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
		return urlencode( $this->readTestFile( $fileName ) );
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
			$zerror = ZObjectFactory::create( $outerResponse[ 'error' ] );
			if ( !( $zerror instanceof ZError ) ) {
				$zerror = self::wrapMessageInZError( new ZQuote( $zerror ), $call );
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
			$zerror = self::wrapMessageInZError( "Server returned a non-result of type '$responseType'!", $call );
			throw new ZErrorException( $zerror );
		}

		if ( $response->hasErrors() ) {
			// If the server has responsed with a Z5/Error, show that properly.
			$zerror = $response->getErrors();
			if ( !( $zerror instanceof ZError ) ) {
				$zerror = self::wrapMessageInZError( new ZQuote( $zerror ), $call );
			}
			throw new ZErrorException( $zerror );
		}

		return trim( $response->getZValue() );
	}

	/**
	 * Convenience method to wrap a non-error in a Z507/Evaluation ZError
	 *
	 * TODO (T311480): This is used by two different APIs. Move to the ZErrorFactory,
	 * which is where all the error creating convenience methods are right now.
	 *
	 * @param string|ZObject $message The non-error to wrap.
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
