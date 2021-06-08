<?php
/**
 * WikiLambda function call API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
use ApiPageSet;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use MediaWiki\Extension\WikiLambda\MockOrchestrator;
use MediaWiki\Extension\WikiLambda\OrchestratorInterface;
use MediaWiki\MediaWikiServices;
use Wikimedia\ParamValidator\ParamValidator;

class ApiFunctionCall extends ApiBase {

	/** @var OrchestratorInterface */
	protected $orchestrator;

	/** @var string */
	private $orchestratorHost;

	/** @var string */
	private $evaluatorHost;

	public function __construct( $query, $moduleName ) {
		parent::__construct( $query, $moduleName, 'wikilambda_function_call_' );
		if ( defined( 'MW_PHPUNIT_TEST' ) ) {
			$this->orchestrator = MockOrchestrator::getInstance();
			$this->orchestratorHost = 'mock';
			$this->evaluatorHost = 'mock';
		} else {
			$config = MediaWikiServices::getInstance()->
				getConfigFactory()->makeConfig( 'WikiLambda' );
			$this->orchestratorHost = $config->get( 'WikiLambdaOrchestratorLocation' );
			$this->evaluatorHost = $config->get( 'WikiLambdaEvaluatorLocation' );
			$client = new Client( [ "base_uri" => $this->orchestratorHost ] );
			$this->orchestrator = new OrchestratorInterface( $client );
		}
	}

	public function execute() {
		$this->run();
	}

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
		$jsonQuery = [ 'zobject' => $zObject, 'evaluatorUri' => urlencode( $this->evaluatorHost ) ];
		$query = json_encode( $jsonQuery );
		try {
			$response = $this->orchestrator->orchestrate( $query );
			$result = [ 'success' => true, 'data' => $response->getBody() ];
			$pageResult->addValue(
				// TODO: Remove "Orchestrated".
				[ 'query', $this->getModuleName() ], "Orchestrated", $result );
		} catch ( ConnectException $exception ) {
			$this->dieWithError( [ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ] );
		} catch ( ClientException $exception ) {
			$this->dieWithError( [ $exception->getResponse()->getReasonPhrase() ] );
		}
	}

	/**
	 * @inheritDoc
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
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 */
	protected function getExamplesMessages() {
		// TODO: Collapse this with test logic in orchestrator interface.
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

		$Z902File = $baseDir . DIRECTORY_SEPARATOR . 'Z902_false.json';
		$Z902 = file_get_contents( $Z902File );
		$Z902 = preg_replace( '/[\s\n]/', '', $Z902 );

		$nativeJavaScriptCodeFile = $baseDir . DIRECTORY_SEPARATOR . 'evaluated-js.json';
		$nativeJavaScriptCode = file_get_contents( $nativeJavaScriptCodeFile );
		$nativeJavaScriptCode = urlencode( preg_replace( '/[\s\n]/', '', $nativeJavaScriptCode ) );

		$nativePythonCodeFile = $baseDir . DIRECTORY_SEPARATOR . 'evaluated-python.json';
		$nativePythonCode = file_get_contents( $nativePythonCodeFile );
		$nativePythonCode = urlencode( preg_replace( '/[\s\n]/', '', $nativePythonCode ) );

		return [
			'action=wikilambda_function_call&wikilambda_function_call_zobject=' . $Z902
				=> 'apihelp-wikilambda_function_call-example-if',
			'action=wikilambda_function_call&wikilambda_function_call_zobject=' . $nativeJavaScriptCode
				=> 'apihelp-wikilambda_function_call-example-native-js-code',
			'action=wikilambda_function_call&wikilambda_function_call_zobject=' . $nativePythonCode
				=> 'apihelp-wikilambda_function_call-example-native-python-code',
		];
	}
}
