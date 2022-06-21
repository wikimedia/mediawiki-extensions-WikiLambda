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

use ApiBase;
use ApiMain;
use ApiPageSet;
use DerivativeContext;
use FauxRequest;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use MediaWiki\Extension\WikiLambda\MockOrchestrator;
use MediaWiki\Extension\WikiLambda\OrchestratorInterface;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZQuote;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\MediaWikiServices;
use PoolCounterWorkViaCallback;
use RequestContext;
use Status;
use Wikimedia\ParamValidator\ParamValidator;

class ApiFunctionCall extends ApiBase {

	/** @var OrchestratorInterface */
	protected $orchestrator;

	/** @var string */
	private $orchestratorHost;

	/**
	 * @inheritDoc
	 */
	public function __construct( $query, $moduleName ) {
		parent::__construct( $query, $moduleName, 'wikilambda_function_call_' );
		if ( defined( 'MW_PHPUNIT_TEST' ) ) {
			$this->orchestrator = MockOrchestrator::getInstance();
			$this->orchestratorHost = 'mock';
		} else {
			$config = MediaWikiServices::getInstance()->
				getConfigFactory()->makeConfig( 'WikiLambda' );
			$this->orchestratorHost = $config->get( 'WikiLambdaOrchestratorLocation' );
			$client = new Client( [ "base_uri" => $this->orchestratorHost ] );
			$this->orchestrator = new OrchestratorInterface( $client );
		}
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
	 * @param ApiPageSet|null $resultPageSet
	 */
	private function run( $resultPageSet = null ) {
		$params = $this->extractRequestParams();
		$pageResult = $this->getResult();
		$stringOfAZ = $params[ 'zobject' ];
		$zObject = json_decode( $stringOfAZ );
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

		try {
			$response = $work->execute();
			$result = [ 'success' => true, 'data' => $response->getBody() ];
		} catch ( ConnectException $exception ) {
			$this->dieWithError( [ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ] );
		} catch ( ClientException | ServerException $exception ) {
			$zErrorObject = self::wrapError( $exception->getResponse()->getReasonPhrase(), $zObject );
			$zResponseObject = new ZResponseEnvelope( null, $zErrorObject );
			$result = [ 'data' => $zResponseObject->getSerialized() ];
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
		$ZMillion = $this->readTestFileAsArray( 'user-defined-validation-type.json' );
		$validationZ7 = $this->readTestFileAsArray( 'example-user-defined-validation.json' );
		$ZMillion["Z4K3"]["Z8K1"][0]["Z17K1"] = $ZMillion;
		$validationZ7["Z801K1"]["Z1K1"] = $ZMillion;
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
		$curryFunction["Z8K4"][0] = $curryImplementation;
		$curryFunctionCall = $this->readTestFileAsArray( 'curry-call-Z30086.json' );
		$curryFunctionCall["Z8K4"][0]["Z14K2"]["Z7K1"]["Z7K1"] = $curryFunction;
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
				$zerror = self::wrapError( new ZQuote( $zerror ), $call );
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
			$zerror = self::wrapError( "Server returned a non-result of type '$responseType'!", $call );
			throw new ZErrorException( $zerror );
		}

		if ( $response->hasErrors() ) {
			// If the server has responsed with a Z5/Error, show that properly.
			$zerror = $response->getErrors();
			if ( !( $zerror instanceof ZError ) ) {
				$zerror = self::wrapError( new ZQuote( $zerror ), $call );
			}
			throw new ZErrorException( $zerror );
		}

		return trim( $response->getZValue() );
	}

	/**
	 * Private convenience method to wrap a non-error in a Z507/Evaluation ZError
	 *
	 * @param string|ZObject $message The non-error to wrap.
	 * @param string $call The functional call context.
	 * @return ZError
	 */
	private static function wrapError( $message, $call ): ZError {
		$wrappedError = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_GENERIC, [ 'message' => $message ]
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
