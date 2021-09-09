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
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\MediaWikiServices;
use Wikimedia\ParamValidator\ParamValidator;

class ApiPerformTest extends ApiBase {

	/** @var ZObjectStore */
	protected $zObjectStore;

	/** @var OrchestratorInterface */
	protected $orchestrator;

	/** @var string */
	private $orchestratorHost;

	/** @var string */
	private $evaluatorHost;

	/** @var string */
	private $wikiUri;

	public function __construct( $query, $moduleName, ZObjectStore $zObjectStore ) {
		parent::__construct( $query, $moduleName, 'wikilambda_perform_test_' );

		$this->zObjectStore = $zObjectStore;

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
		$zfunction = $params[ 'zfunction' ];
		$zimplementations = $params[ 'zimplementations' ] ?: "[]";
		$ztesters = $params[ 'ztesters' ] ?: "[]";
		$nocache = $params[ 'nocache' ];
		$jsonQuery = [
			'zfunction' => $zfunction,
			'zimplementations' => $zimplementations,
			'ztesters' => $ztesters,
			'evaluatorUri' => urlencode( $this->evaluatorHost ),
			'wikiUri' => urlencode( $this->wikiUri ),
			'doValidate' => true,
			'nocache' => $nocache,
		];
		$query = json_encode( $jsonQuery );
		try {
			$response = $this->orchestrator->performTest( $query );
			$result = [ 'success' => true, 'data' => $response->getBody() ];
			$pageResult->addValue(
				// TODO: Remove "Tested".
				[ 'query', $this->getModuleName() ], "Tested", $result );
		} catch ( ConnectException $exception ) {
			$this->dieWithError( [ "apierror-wikilambda_perform_test-not-connected", $this->orchestratorHost ] );
		} catch ( ClientException $exception ) {
			$this->dieWithError( [ $exception->getResponse()->getReasonPhrase() ] );
		}
	}

	/**
	 * @inheritDoc
	 */
	protected function getAllowedParams(): array {
		return [
			'zfunction' => [
				ParamValidator::PARAM_TYPE => 'text',
				ParamValidator::PARAM_REQUIRED => true,
			],
			'zimplementations' => [
				ParamValidator::PARAM_TYPE => 'text',
				ParamValidator::PARAM_REQUIRED => false,
			],
			'ztesters' => [
				ParamValidator::PARAM_TYPE => 'text',
				ParamValidator::PARAM_REQUIRED => false,
			],
			'nocache' => [
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_REQUIRED => false,
			]
		];
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 */
	protected function getExamplesMessages() {
		$exampleZid = $this->zObjectStore->findFirstZImplementationFunction();

		return [
			'action=wikilambda_perform_test&format=json&wikilambda_perform_test_zfunction='
				. $exampleZid .
				'&wikilambda_perform_test_nocache=true'
				=> 'apihelp-wikilambda_perform_test-example',
		];
	}

}
