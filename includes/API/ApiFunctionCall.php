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
	private $host;

	public function __construct( $query, $moduleName ) {
		parent::__construct( $query, $moduleName, 'wikilambda_function_call_' );
		if ( defined( 'MW_PHPUNIT_TEST' ) ) {
			$this->orchestrator = MockOrchestrator::getInstance();
			$this->host = 'mock';
		} else {
			$config = MediaWikiServices::getInstance()->
				getConfigFactory()->makeConfig( 'WikiLambda' );
			$this->host = $config->get( 'WikiLambdaOrchestratorLocation' );
			$client = new Client( [ "base_uri" => $this->host ] );
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
		try {
			$response = $this->orchestrator->orchestrate( $stringOfAZ );
			$result = [ 'success' => true, 'data' => $response->getBody() ];
			$pageResult->addValue(
				// TODO: Remove "Orchestrated".
				[ 'query', $this->getModuleName() ], "Orchestrated", $result );
		} catch ( ConnectException $exception ) {
			$this->dieWithError( [ "apierror-wikilambda_function_call-not-connected", $this->host ] );
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
		$inputFile = __DIR__ .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'..' .
			DIRECTORY_SEPARATOR .
			'tests' .
			DIRECTORY_SEPARATOR .
			'phpunit' .
			DIRECTORY_SEPARATOR .
			'test_data' .
			DIRECTORY_SEPARATOR .
			'Z902_false.json';
		$Z902 = file_get_contents( $inputFile );
		$Z902 = preg_replace( '/[\s\n]/', '', $Z902 );
		return [
			'action=wikilambda_function_call&wikilambda_function_call_zobject=' . $Z902
				=> 'apihelp-wikilambda_function_call-example-full',
		];
	}
}
