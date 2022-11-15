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
use FormatJson;
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
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\MediaWikiServices;
use Title;
use Wikimedia\ParamValidator\ParamValidator;

class ApiPerformTest extends WikiLambdaApiBase {

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
			$this->dieWithError( [ "wikilambda-performtest-error-unknown-zid", $zfunction ] );
		}
		$targetObject = $this->zObjectStore->fetchZObjectByTitle( $targetTitle );
		if ( $targetObject->getZType() !== ZTypeRegistry::Z_FUNCTION ) {
			$this->dieWithError( [ "wikilambda-performtest-error-nonfunction", $zfunction ] );
		}

		$targetFunction = $targetObject->getInnerZObject();

		if ( empty( $requestedImplementations ) ) {
			$targetFunctionImplementions = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $targetFunctionImplementions';

			$requestedImplementations = $targetFunctionImplementions->getAsArray();
		}

		if ( empty( $requestedTesters ) ) {
			$targetFunctionTesters = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_TESTERS );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $targetFunctionTesters';
			$requestedTesters = $targetFunctionTesters->getAsArray();
		}

		// 2. For each implementation, run each tester
		$responseArray = [];
		foreach ( $requestedImplementations as $implementation ) {
			if ( is_string( $implementation ) ) {
				$decodedJson = FormatJson::decode( $implementation );
				// If not JSON, assume we have received a ZID.
				$implementation = $decodedJson
					? ZObjectFactory::create( $decodedJson )
					: new ZReference( $implementation );
			}
			$implementationZid = $this->getZid( $implementation );
			$implementationListEntry = $this->getImplementationListEntry( $implementation );

			// Re-use our copy of the target function, setting the implementations to just the one
			// we're testing now
			$targetFunction->setValueByKey(
				ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS,
				new ZTypedList(
					ZTypedList::buildType( new ZReference( ZTypeRegistry::Z_IMPLEMENTATION ) ),
					$implementationListEntry
				)
			);
			foreach ( $requestedTesters as $requestedTester ) {
				if ( is_string( $requestedTester ) ) {
					$decodedJson = FormatJson::decode( $requestedTester );
					// If not JSON, assume we have received a ZID.
					$requestedTester = $decodedJson
						? ZObjectFactory::create( $decodedJson )
						: new ZReference( $requestedTester );
				}
				$testerZid = $this->getZid( $requestedTester );
				$testerObject = $this->getTesterObject( $requestedTester );

				// TODO (T297707): Work out if this has been cached before (check revisions of objects?), and
				// if so reply with that instead of executing.

				// Use tester to create a function call of the test case inputs
				$testFunctionCall = $testerObject->getValueByKey( ZTypeRegistry::Z_TESTER_CALL );
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall $testFunctionCall';

				// Set the target function of the cal too our modified copy of the target function with only the
				// current implementation
				$testFunctionCall->setValueByKey( ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION, $targetFunction );

				// Execute the test case function call
				$testResultObject = $this->executeFunctionCall( $testFunctionCall, true );
				$testMetadata = $testResultObject->getValueByKey(
					ZTypeRegistry::Z_RESPONSEENVELOPE_METADATA );
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedMap $testMetadata';

				// Use tester to create a function call validating the output
				$validateTestValue = $testResultObject->hasErrors() ?
					$testResultObject->getErrors() :
					$testResultObject->getZValue();

				$validateFunctionCall = $testerObject->getValueByKey( ZTypeRegistry::Z_TESTER_VALIDATION );
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
					// Add the validator errors to the metadata map
					$testMetadata->setValueForKey( new ZString( "validateErrors" ),
						$validateResult->getErrors() );
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
					// Add the expected and actual values to the metadata map
					$testMetadata->setValueForKey( new ZString( "actualTestResult" ),
						$validateTestValue );
					$testMetadata->setValueForKey( new ZString( "expectedTestResult" ),
						$validateFunctionCall->getValueByKey( $targetValidationFunctionZID . 'K2'
						) );
				}

				// TODO (T297707): Store this response in a DB table for faster future responses.

				// Stash the response
				$testResult = [ 'zFunctionId' => $zfunction,
					'zImplementationId' => $implementationZid,
					'zTesterId' => $testerZid,
					'testMetadata' => $testMetadata,
					'validateStatus' => $validateResultItem
				];
				$responseArray[] = $testResult;
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
			$responseContents = FormatJson::decode( $response->getBody()->getContents() );
			$responseObject = ZObjectFactory::create( $responseContents );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope $responseObject';
			return $responseObject;
		} catch ( ConnectException $exception ) {
			$this->dieWithError( [ "apierror-wikilambda_function_call-not-connected", $this->orchestratorHost ] );
		} catch ( ClientException | ServerException $exception ) {
			$zErrorObject = ApiFunctionCall::wrapMessageInZError(
				$exception->getResponse()->getReasonPhrase(),
				$zObject
			);
			$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zErrorObject );
			return new ZResponseEnvelope( null, $zResponseMap );
		} catch ( \Exception $exception ) {
			$zErrorObject = ApiFunctionCall::wrapMessageInZError(
				$exception->getMessage(),
				$zObject
			);
			$zResponseMap = ZResponseEnvelope::wrapErrorInResponseMap( $zErrorObject );
			return new ZResponseEnvelope( null, $zResponseMap );
		}
	}

	private function getZid( $zobject ) {
		if ( $zobject->getZType() === ZTypeRegistry::Z_REFERENCE ) {
			return $zobject->getValueByKey( ZTypeRegistry::Z_REFERENCE_VALUE );
		} elseif ( $zobject->getZType() === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
			return $zobject
				->getValueByKey( ZTypeRegistry::Z_PERSISTENTOBJECT_ID )
				->getValueByKey( ZTypeRegistry::Z_STRING_VALUE );
		}
		// Use placeholder ZID for non-persisted objects.
		return 'Z0';
	}

	private function getImplementationListEntry( $zobject ) {
		if ( $zobject->getZType() === ZTypeRegistry::Z_REFERENCE ||
				$zobject->getZType() === ZTypeRegistry::Z_IMPLEMENTATION ) {
			return $zobject;
		} elseif ( $zobject->getZType() === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
			return $this->getImplementationListEntry(
				$zobject->getValueByKey( ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ) );
		}
		$this->dieWithError( [ "wikilambda-performtest-error-nonimplementation", $zobject ] );
	}

	private function getTesterObject( $zobject ) {
		if ( $zobject->getZType() === ZTypeRegistry::Z_REFERENCE ) {
			$zid = $this->getZid( $zobject );
			$title = Title::newFromText( $zid, NS_MAIN );
			if ( !( $title->exists() ) ) {
				$this->dieWithError( [ "wikilambda-performtest-error-unknown-zid", $zid ] );
			}
			return $this->getTesterObject( $this->zObjectStore->fetchZObjectByTitle( $title )->getInnerZObject() );
		} elseif ( $zobject->getZType() === ZTypeRegistry::Z_PERSISTENTOBJECT ) {
			return $this->getTesterObject( $zobject->getValueByKey( ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ) );
		} elseif ( $zobject->getZType() === ZTypeRegistry::Z_TESTER ) {
			return $zobject;
		}
		$this->dieWithError( [ "wikilambda-performtest-error-nontester", $zobject ] );
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
