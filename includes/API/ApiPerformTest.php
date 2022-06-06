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
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\MediaWikiServices;
use Title;
use Wikimedia\ParamValidator\ParamValidator;

class ApiPerformTest extends ApiBase {

	/** @var ZObjectStore */
	protected $zObjectStore;

	/** @var OrchestratorRequest */
	protected $orchestrator;

	/** @var string */
	private $orchestratorHost;

	public function __construct( $query, $moduleName, ZObjectStore $zObjectStore ) {
		parent::__construct( $query, $moduleName, 'wikilambda_perform_test_' );

		$this->zObjectStore = $zObjectStore;

		$config = MediaWikiServices::getInstance()->
			getConfigFactory()->makeConfig( 'WikiLambda' );
		$this->orchestratorHost = $config->get( 'WikiLambdaOrchestratorLocation' );
		$client = new Client( [ "base_uri" => $this->orchestratorHost ] );
		$this->orchestrator = new OrchestratorRequest( $client );
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
		$requestedImplementations = $params[ 'zimplementations' ] ?: [];
		$requestedTesters = $params[ 'ztesters' ] ?: [];

		// 1. Work out matrix of what we want for what
		// FIXME: Handle an inline ZFunction (for when it's not been created yet)?
		$targetTitle = Title::newFromText( $zfunction, NS_MAIN );
		if ( !( $targetTitle->exists() ) ) {
			$this->dieWithError( [ "wikilambda-functioncall-error-unknown", $zfunction ] );
		}
		$targetObject = $this->zObjectStore->fetchZObjectByTitle( $targetTitle );
		if ( $targetObject->getZType() !== ZTypeRegistry::Z_FUNCTION ) {
			$this->dieWithError( [ "wikilambda-functioncall-error-nonfunction", $zfunction ] );
		}

		$targetFunction = $targetObject->getInnerZObject();

		// FIXME: Handle an inline ZImplementation (for when it's not been created yet)
		if ( empty( $requestedImplementations ) ) {
			$targetFunctionImplementions = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $targetFunctionImplementions';

			$requestedImplementations = $targetFunctionImplementions->getAsArray();
		}

		// FIXME: Handle an inline ZTester (for when it's not been created yet)
		if ( empty( $requestedTesters ) ) {
			$targetFunctionTesters = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_TESTERS );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $targetFunctionTesters';

			$requestedTesters = $targetFunctionTesters->getAsArray();
		}

		// 2. For each implementation, run each tester
		$responseArray = [];
		foreach ( $requestedImplementations as $implementation ) {

			$implementationName = (string)$implementation;

			// Re-use our copy of the target function, setting the implementations to just the one
			// we're testing now
			$targetFunction->setValueByKey(
				ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS,
				new ZTypedList(
					ZTypedList::buildType( new ZReference( ZTypeRegistry::Z_IMPLEMENTATION ) ),
					new ZReference( $implementationName )
				)
			);
			foreach ( $requestedTesters as $testerName ) {

				// TODO (T297707): Work out if this has been cached before (check revisions of objects?), and
				// if so reply with that instead of executing.

				if ( $testerName instanceof ZReference ) {
					$testerName = $testerName->getZValue();
				}

				$targetTesterTitle = Title::newFromText( $testerName, NS_MAIN );
				if ( !( $targetTesterTitle && $targetTesterTitle->exists() ) ) {
					// FIXME: Throw?
					continue;
				}
				$tester = $this->zObjectStore->fetchZObjectByTitle( $targetTesterTitle )->getInnerZObject();

				// Use tester to create a function call of the test case inputs
				$testFunctionCall = $tester->getValueByKey( ZTypeRegistry::Z_TESTER_CALL );
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall $testFunctionCall';

				// Set the target function of the cal too our modified copy of the target function with only the
				// current implementation
				$testFunctionCall->setValueByKey( ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION, $targetFunction );

				// Execute the test case function call
				$testResultObject = $this->executeFunctionCall( $testFunctionCall, true );

				// Use tester to create a function call validating the output
				$validateTestValue = $testResultObject->hasErrors() ?
					$testResultObject->getErrors() :
					$testResultObject->getZValue();

				$validateFunctionCall = $tester->getValueByKey( ZTypeRegistry::Z_TESTER_VALIDATION );
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall $validateFunctionCall';

				$targetValidationFunctionZID = $validateFunctionCall->getZValue();
				$validateFunctionCall->setValueByKey( $targetValidationFunctionZID . 'K1', $validateTestValue );

				// Execute the validation function call and stash it
				$validateResult = $this->executeFunctionCall( $validateFunctionCall, false );

				// If the running failed, we explicitly set the tester passing as false
				if ( $validateResult->hasErrors() ) {
					$validateResult->setValueByKey(
						ZTypeRegistry::Z_RESPONSEENVELOPE_VALUE,
						new ZReference( ZTypeRegistry::Z_BOOLEAN_FALSE )
					);
				}

				$validateResultItem = $validateResult->getZValue();
				if (
					(
						$validateResultItem instanceof ZObject &&
						(
							(
								$validateResultItem instanceof ZReference &&
								$validateResultItem->getZValue() === ZTypeRegistry::Z_BOOLEAN_FALSE
							) ||
							(
								$validateResultItem->getZType() === ZTypeRegistry::Z_BOOLEAN &&
								$validateResultItem->getValueByKey( ZTypeRegistry::Z_BOOLEAN_VALUE )
									=== ZTypeRegistry::Z_BOOLEAN_FALSE
							)
						)
					) || (
						$validateResultItem instanceof \stdClass &&
						(
							(
								$validateResultItem->{ ZTypeRegistry::Z_OBJECT_TYPE } === ZTypeRegistry::Z_REFERENCE &&
								$validateResultItem->{ ZTypeRegistry::Z_REFERENCE_VALUE }
									=== ZTypeRegistry::Z_BOOLEAN_FALSE
							) ||
							(
								$validateResultItem->{ ZTypeRegistry::Z_OBJECT_TYPE } === ZTypeRegistry::Z_BOOLEAN &&
								$validateResultItem->{ ZTypeRegistry::Z_BOOLEAN_VALUE }
									=== ZTypeRegistry::Z_BOOLEAN_FALSE
							)
						)
					)
				) {
					// FIXME: If it failed, write the expected and actual values to the $validateResult object
				}

				// TODO (T297707): Store this response in a DB table for faster future responses.

				// Stash the response
				$responseArray[ $zfunction ][ $implementationName ][ $testerName ] = $validateResult;
			}
		}

		// 3. Return the response.
		$pageResult->addValue( [ 'query' ], $this->getModuleName(), $responseArray );
	}

	/**
	 * TODO: Move into a super-class of this a ApiFunctionCall so both can use it?
	 *
	 * @param ZFunctionCall $zObject
	 * @param bool $validate
	 * @return ZResponseEnvelope|\GuzzleHttp\Psr7\Stream
	 */
	private function executeFunctionCall( $zObject, $validate ) {
		$queryArguments = [
			'zobject' => $zObject->getSerialized(),
			'doValidate' => $validate
		];
		try {
			$response = $this->orchestrator->orchestrate( $queryArguments );
			$responseObject = ZObjectFactory::create( $response->getBody() );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope $responseObject';
			return $responseObject;
		} catch ( ConnectException $exception ) {
			$this->dieWithError( [ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ] );
		} catch ( ClientException | ServerException $exception ) {
			$zErrorObject = ApiFunctionCall::wrapError(
				$exception->getResponse()->getReasonPhrase(),
				$zObject
			);
			return new ZResponseEnvelope( null, $zErrorObject );
		} catch ( \Exception $exception ) {
			$zErrorObject = ApiFunctionCall::wrapError(
				$exception->getMessage(),
				$zObject
			);
			return new ZResponseEnvelope( null, $zErrorObject );
		}
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
				ParamValidator::PARAM_ISMULTI => true,
				ParamValidator::PARAM_REQUIRED => false,
			],
			'ztesters' => [
				ParamValidator::PARAM_ISMULTI => true,
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
				. $exampleZid
				=> 'apihelp-wikilambda_perform_test-example',
		];
	}

	/**
	 * Mark as internal. This isn't meant to be user-facing, and can change at any time.
	 * @return bool
	 */
	public function isInternal() {
		return true;
	}

}
