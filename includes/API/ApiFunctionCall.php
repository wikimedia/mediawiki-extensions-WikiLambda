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

	/** @var string */
	private $wikiUri;

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
			$this->wikiUri = $config->get( 'WikiLocation' );
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
		$jsonQuery = [
			'zobject' => $zObject,
			'evaluatorUri' => urlencode( $this->evaluatorHost ),
			'wikiUri' => urlencode( $this->wikiUri ),
			// TODO: Enable validation once it works :)
			'doValidate' => false
		];
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
	 * Generates URL-encoded example function call from JSON file contents.
	 * @param string $fileName
	 * @return string URL-encoded contents
	 */
	private function createExample( $fileName ) : string {
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
		$contents = urlencode( file_get_contents( $fullFile ) );
		return $contents;
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
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
		];
	}

}
