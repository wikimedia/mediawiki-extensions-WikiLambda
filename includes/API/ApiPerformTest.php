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
use ApiPageSet;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Exception\ServerException;
use MediaWiki\Extension\WikiLambda\MockOrchestrator;
use MediaWiki\Extension\WikiLambda\OrchestratorInterface;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
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

	public function __construct( $query, $moduleName, ZObjectStore $zObjectStore ) {
		parent::__construct( $query, $moduleName, 'wikilambda_perform_test_' );

		$this->zObjectStore = $zObjectStore;

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
			'doValidate' => true,
			'nocache' => $nocache,
		];
		$query = json_encode( $jsonQuery );
		try {
			$response = $this->orchestrator->performTest( $query );
			$result = [ 'success' => true, 'data' => $response->getBody() ];
		} catch ( ConnectException $exception ) {
			$this->dieWithError( [ "apierror-wikilambda_perform_test-not-connected", $this->orchestratorHost ] );
		} catch ( ClientException | ServerException $exception ) {
			$zError = json_encode( [
				ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_RESPONSEENVELOPE,
				ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE => ZTypeRegistry::Z_NULL,
				ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA => [
					ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_ERROR,
					ZTypeRegistry::Z_ERROR_VALUE => [
						ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_STRING,
						ZTypeRegistry::Z_STRING_VALUE => $exception->getResponse()->getReasonPhrase()
					]
				]
			] );

			$result = [ 'data' => $zError ];
		}
		$pageResult->addValue( [ 'query' ], $this->getModuleName(), $result );
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
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
	 * @codeCoverageIgnore
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
