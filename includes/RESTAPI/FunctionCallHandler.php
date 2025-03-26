<?php
/**
 * WikiLambda ZObject function calling REST API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\RESTAPI;

use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZQuote;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjects\ZType;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Rest\Handler;
use MediaWiki\Rest\LocalizedHttpException;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\ResponseInterface;
use MediaWiki\Rest\SimpleHandler;
use MediaWiki\Title\Title;
use Psr\Log\LoggerInterface;
use stdClass;
use Throwable;
use Wikimedia\Message\MessageValue;
use Wikimedia\ParamValidator\ParamValidator;

/**
 * Simple REST API to call a ZFunction with text arguments for cross-wiki embedding
 * in wikitext, via `GET /wikifunctions/v0/call/{zid}/{arguments}`, or more fully,
 * `GET /wikifunctions/v0/call/{zid}/{arguments}/{parselang}/{renderlang}`
 */
class FunctionCallHandler extends SimpleHandler {

	private LoggerInterface $logger;
	private ZObjectStore $zObjectStore;
	private ZLangRegistry $langRegistry;

	/**
	 * @param string $target
	 * @param string[] $arguments
	 * @param string $parseLang
	 * @param string $renderLang
	 * @return Response
	 */
	public function run( $target, $arguments = [], $parseLang = 'en', $renderLang = 'en' ) {
		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );
		$this->zObjectStore = WikiLambdaServices::getZObjectStore();
		$this->langRegistry = ZLangRegistry::singleton();

		$this->logger->debug(
			__METHOD__ . ' triggered to evaluate a call to {target}',
			[ 'target' => $target ]
		);

		// 0. Check if we are disabled.
		$config = MediaWikiServices::getInstance()->getConfigFactory()->makeConfig( 'WikiLambda' );
		if ( !$config->get( 'WikiLambdaEnableRepoMode' ) || !$config->get( 'WikiLambdaEnableClientMode' ) ) {
			$this->logger->info( __METHOD__ . ' called but neither repo nor client mode are enabled' );

			// Note: We check for both modes here, as a very quick way to emergency-disable this everywhere.
			// Client-side code is also going to check whether it's disabled before it's installed.
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET, [ 'data' => "WikiLambdaEnableClientMode" ]
				),
				// This is an HTTP 501 because it's literally "not implemented yet", rather than necessarily user error
				501,
				[ 'target' => $target ]
			);
		}

		// 1. Check if we can call this requested Function at all
		if ( !ZObjectUtils::isValidOrNullZObjectReference( $target ) ) {
			$this->logger->debug(
				__METHOD__ . ' called on {target} which is a non-ZID, e.g. an inline function',
				[ 'target' => $target ]
			);
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND, [ 'data' => $target ] ),
				400,
				[ 'target' => $target ]
			);
		}

		$targetTitle = Title::newFromText( $target, NS_MAIN );
		if ( !( $targetTitle->exists() ) ) {
			$this->logger->debug(
				__METHOD__ . ' called on {target} which does not exist on-wiki',
				[ 'target' => $target ]
			);
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND, [ 'data' => $target ] ),
				400,
				[ 'target' => $target ]
			);
		}

		$targetObject = $this->zObjectStore->fetchZObjectByTitle( $targetTitle );
		// ZObjectStore's fetchZObjectByTitle() returns ZObjectContent or false, so first sense-check it
		if ( !$targetObject ) {
			$this->logger->warning(
				__METHOD__ . ' called on {target} which is somehow non-ZObject in our namespace',
				[ 'target' => $target ]
			);
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND, [ 'data' => $target ] ),
				400,
				[ 'target' => $target ]
			);
		}

		// … then check it's valid
		if ( !$targetObject->isValid() ) {
			$this->logger->warning(
				__METHOD__ . ' called on {target} which is an invalid ZObject',
				[
					'target' => $target,
					'childError' => $targetObject->getErrors()->getMessage(),
				]
			);
			// Dies with Z_ERROR_NOT_WELLFORMED
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createValidationZError( $targetObject->getErrors() ),
				400,
				[ 'target' => $target ]
			);
		}

		if ( $targetObject->getZType() !== ZTypeRegistry::Z_FUNCTION ) {
			// User is trying to use a ZObject that's not a ZFunction
			$this->logger->debug(
				__METHOD__ . ' called on {target} which is not a Function but a {type}',
				[
					'target' => $target,
					'type' => $targetObject->getZType()
				]
			);
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ARGUMENT_TYPE_MISMATCH,
					[
						'expected' => ZTypeRegistry::Z_FUNCTION,
						'actual' => $targetObject->getZType(),
						'argument' => $target
					]
				),
				400,
				[
					'target' => $target,
					'mode' => 'function'
				]
			);
		}

		$targetFunction = $targetObject->getInnerZObject();
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZFunction $targetFunction';

		// 2. (T368604): Check for and use parsers on inputs

		// First, check that the requested parse language is one we know of and support
		$parseLanguageZid = 'Z1002';
		try {
			$parseLanguageZid = $this->langRegistry->getLanguageZidFromCode( $parseLang );
		} catch ( ZErrorException $error ) {
			$this->logger->debug(
				__METHOD__ . ' called with parse language {parseLang} which is not found / errored: {error}',
				[
					'parseLang' => $parseLang,
					'error' => $error->getMessage()
				]
			);
			// Die with Z_ERROR_LANG_NOT_FOUND
			$this->dieRESTfullyWithZError(
				$error->getZError(),
				400,
				[ 'target' => $parseLang ]
			);
		}

		if ( is_string( $arguments ) ) {
			$encodedArguments = explode( '|', $arguments );
			$arguments = array_map( static fn ( $val ): string => base64_decode( $val ), $encodedArguments );
		}

		// Then, actually check the arguments' Types by looping over allowed inputs,
		// and set up given inputs (for parsing if appropriate)
		$argumentsForCall = [];

		$expectedArguments = $targetFunction->getArgumentDeclarations();
		if ( count( $arguments ) !== count( $expectedArguments ) ) {
			$this->logger->debug(
				__METHOD__ . ' called on {target} with the wrong number of arguments, {givenCount} not {expectedCount}',
				[
					'target' => $target,
					'givenCount' => count( $arguments ),
					'expectedCount' => count( $expectedArguments )
				]
			);
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ARGUMENT_COUNT_MISMATCH,
					[
						'expected' => strval( count( $expectedArguments ) ),
						'actual' => strval( count( $arguments ) ),
						'arguments' => $arguments
					]
				),
				400,
				[ 'target' => $target ]
			);
		}

		foreach ( $expectedArguments as $inputArgumentKey => $expectedArgument ) {
			$argumentKey = $expectedArgument->getValueByKey( ZTypeRegistry::Z_ARGUMENTDECLARATION_ID )->getZValue();

			$providedArgument = $arguments[array_keys( $arguments )[$inputArgumentKey]];

			// By default, assume that it's safe to just pass through the argument blindly
			$argumentsForCall[$argumentKey] = $providedArgument;

			$targetTypeZid = $expectedArgument->getValueByKey( ZTypeRegistry::Z_ARGUMENTDECLARATION_TYPE )->getZValue();

			// Type is always parseable (Z6)
			if ( $targetTypeZid === ZTypeRegistry::Z_STRING ) {
				continue;
			}

			// Type is generic (Z1) and we treat it as a Z6
			// TODO (T390678): Adjust API filter code to allow Z1s as well?
			if ( $targetTypeZid === ZTypeRegistry::Z_OBJECT ) {
				continue;
			}

			// TODO (T385619): Cache these for repeated uses of the same Type?
			$targetTypeContentObject = $this->zObjectStore
				->fetchZObjectByTitle( Title::newFromText( $targetTypeZid, NS_MAIN ) );
			$targetTypeObject = $targetTypeContentObject->getInnerZObject();

			if ( !( $targetTypeObject instanceof ZType ) ) {
				// It's somehow not to a Type, because:
				// * Argument is a generic type; the function input is not supported.
				// * There is an error in the content; the function is not wellformed (not very likely).
				$this->logger->error(
					__METHOD__ . ' called on {target} which has a non-Type argument, {targetTypeZid} in position {pos}',
					[
						'target' => $target,
						'targetTypeZid' => $targetTypeZid,
						'pos' => $inputArgumentKey
					]
				);
				$this->dieRESTfullyWithZError(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET, [ 'data' => $target ]
					),
					400,
					[
						'target' => $target,
						'mode' => 'input'
					]
				);
			}

			// Check if the argument is a ZID to an instance of the right Type
			// * Returns true if there's no need to parse it
			// * Returns false if we should parse it
			// * Dies if the type is not correct
			if ( $this->checkArgumentValidity( $providedArgument, $targetTypeObject, $target ) ) {
				continue;
			}

			// At this point, we know it's a string input to a non-string Type, so we need to parse it
			$typeParser = $targetTypeObject->getParserFunction();

			// Type has no parser
			if ( $typeParser === false ) {
				// User is trying to use a parameter that can't be parsed from text
				$this->logger->info(
					__METHOD__ . ' called on {target} with an unparseable input, {targetTypeZid} in position {pos}',
					[
						'target' => $target,
						'targetTypeZid' => $targetTypeZid,
						'pos' => $inputArgumentKey
					]
				);
				$this->dieRESTfullyWithZError(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET, [ 'data' => $target ]
					),
					400,
					[
						'target' => $target,
						'mode' => 'input'
					]
				);
			}

			// At this point, we know the argument should be parsed and a parser is available, so let's schedule it
			$argumentsForCall[$argumentKey] = ( new ZFunctionCall( new ZReference( $typeParser ), [
				$typeParser . "K1" => $providedArgument,
				$typeParser . "K2" => $parseLanguageZid
			] ) );
		}

		// 3. Set up the final, full call with all the above sub-calls embedded
		$callObject = new ZFunctionCall( new ZReference( $target ), $argumentsForCall );

		// 4. (T362252): Check if there's a renderer for this return type (if so, it will be used)
		// First, check that the requested render language is one we know of and support
		$renderLanguageZid = 'Z1002';
		try {
			$renderLanguageZid = $this->langRegistry->getLanguageZidFromCode( $renderLang );
		} catch ( ZErrorException $error ) {
			$this->logger->debug(
				__METHOD__ . ' called with render language {renderLang} which is not found / errored: {error}',
				[
					'renderLang' => $renderLang,
					'error' => $error->getMessage()
				]
			);
			// Die with Z_ERROR_LANG_NOT_FOUND
			$this->dieRESTfullyWithZError(
				$error->getZError(),
				400,
				[ 'target' => $renderLang ]
			);
		}

		// Then, actually check the return Type
		$targetReturnType = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_RETURN_TYPE )->getZValue();
		if (
			// Type is always renderable (Z6)
			$targetReturnType !== ZTypeRegistry::Z_STRING &&
			// Type is generic and we hope for the best (Z1)
			$targetReturnType !== ZTypeRegistry::Z_OBJECT
		) {
			$targetReturnTypeObject = $this->zObjectStore
				->fetchZObjectByTitle( Title::newFromText( $targetReturnType, NS_MAIN ) )
				->getInnerZObject();

			if ( !( $targetReturnTypeObject instanceof ZType ) ) {
				// It's somehow not to a Type, because:
				// * Output is a generic type; the function input is not supported.
				// * There is an error in the content; the function is not wellformed (not very likely).
				$this->logger->error(
					__METHOD__ . ' called on {target} which has a non-Type output, {targetReturnType}',
					[
						'target' => $target,
						'targetReturnType' => $targetReturnType
					]
				);
				$this->dieRESTfullyWithZError(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET, [ 'data' => $target ]
					),
					400,
					[
						'target' => $target,
						'mode' => 'output'
					]
				);
			}

			$rendererFunction = $targetReturnTypeObject->getRendererFunction();

			if ( $rendererFunction === false ) {
				// User is trying to use a ZFunction that returns something which doesn't have a renderer
				$this->logger->info(
					__METHOD__ . ' called on {target} with an unrenderable output, {targetReturnType}',
					[
						'target' => $target,
						'targetReturnType' => $targetReturnType
					]
				);
				$this->dieRESTfullyWithZError(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET, [ 'data' => $target ]
					),
					400,
					[
						'target' => $target,
						'mode' => 'output'
					]
				);
			}

			// At this point, we know that we must render, so wrap the function call in that
			$callObject = new ZFunctionCall( new ZReference( $rendererFunction ), [
				$rendererFunction . "K1" => $callObject,
				$rendererFunction . "K2" => $renderLanguageZid
			] );
		}

		// 5. Down-convert the ZFunctionCall Object to a stdClass object
		$call = $callObject->getSerialized();

		// 6. Execute the call
		try {
			$response = $this->makeRequest( json_encode( $call ), $renderLang );
		} catch ( ZErrorException $e ) {
			$this->logger->error(
				__METHOD__ . ' called on {target} but got a ZErrorException, {error}',
				[
					'target' => $target,
					'error' => $e->getMessage()
				]
			);
			// Dies with one of these ZErrors:
			// * Z_ERROR_API_FAILURE/Z530
			// * Z_ERROR_EVALUATION/Z507
			// * Z_ERROR_INVALID_EVALUATION_RESULT/Z560
			$this->dieRESTfullyWithZError( $e->getZError(), 400, [ 'data' => $e->getZError() ] );
		}

		// Finally, return the values as JSON (if not already early-returned as an error)
		$response = $this->getResponseFactory()->createJson( $response );
		return $response;
	}

	public function applyCacheControl( ResponseInterface $response ) {
		if ( $response->getStatusCode() >= 200 && $response->getStatusCode() < 300 ) {
			$response->setHeader( 'Cache-Control', 'public,must-revalidate,s-max-age=' . 60 * 60 * 24 );
		}
	}

	/** @inheritDoc */
	public function needsWriteAccess(): bool {
		// This is a rough approximation, as we have no access to the User object in the REST API, but
		// we want the system to scale back access to this endpoint.
		return true;
	}

	/** @inheritDoc */
	public function getParamSettings() {
		return [
			'zid' => [
				Handler::PARAM_SOURCE => 'path',
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_ISMULTI => false,
				ParamValidator::PARAM_REQUIRED => true,
			],
			'arguments' => [
				Handler::PARAM_SOURCE => 'path',
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_ISMULTI => false,
				ParamValidator::PARAM_REQUIRED => true,
			],
			'parselang' => [
				Handler::PARAM_SOURCE => 'path',
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => 'en',
				ParamValidator::PARAM_REQUIRED => false,
			],
			'renderlang' => [
				Handler::PARAM_SOURCE => 'path',
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => 'en',
				ParamValidator::PARAM_REQUIRED => false,
			],
		];
	}

	/**
	 * @return never
	 */
	private function dieRESTfullyWithZError( ZError $zerror, int $code = 500, array $errorData = [] ) {
		try {
			$errorData['errorData'] = $zerror->getErrorData();

			$this->logger->debug(
				__METHOD__ . ' called because an error happened',
				[
					'zerror' => $zerror->getSerialized(),
					'error' => json_encode( $zerror->getErrorData() ),
				]
			);
		} catch ( ZErrorException $e ) {
			// Generating the human-readable error data itself threw. Oh dear.

			$this->logger->warning(
				__METHOD__ . ' called but an error was thrown when trying to report an error',
				[
					'zerror' => $zerror->getSerialized(),
					'error' => $e,
				]
			);

			$errorData['errorData'] = [ 'zerror' => $zerror->getSerialized() ];
		}

		throw new LocalizedHttpException(
			new MessageValue( 'wikilambda-zerror', [ $zerror->getZErrorType() ] ),
			$code,
			$errorData
		);
	}

	/**
	 * Verifies the validity of an argument with respect to the expected type
	 * and returns whether it can be processed out of the box, or false if it
	 * needs to be processed by a parser function. If not valid, dies with error.
	 *
	 * @param string $providedArgument
	 * @param ZType $targetTypeObject
	 * @param string $targetFunction
	 * @return bool
	 */
	private function checkArgumentValidity(
		$providedArgument,
		$targetTypeObject,
		$targetFunction
	): bool {
		// The provided argument is a string value (not a reference): it should be parsed
		// This excludes Z6s and Z1s as they have already been handled.
		if ( !ZObjectUtils::isValidZObjectReference( $providedArgument ) ) {
			return false;
		}

		// If the provided argument is a reference to a ZObject, we fetch it:
		$referencedArgument = $this->zObjectStore
			->fetchZObjectByTitle( Title::newFromText( $providedArgument, NS_MAIN ) );

		if ( $referencedArgument === false ) {
			// Fatal — it's a ZID but not to an extant Object.
			$this->logger->debug(
				__METHOD__ . ' called on {providedArgument} for function {targetFunction} but it doesn\'t exist',
				[
					'providedArgument' => $providedArgument,
					'targetFunction' => $targetFunction
				]
			);
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND, [ 'data' => $providedArgument ]
				),
				400,
				[ 'target' => $targetFunction ]
			);
		}

		$referencedArgumentType = $referencedArgument->getInnerZObject()->getZType();
		$expectedArgumentType = $targetTypeObject->getTypeId()->getZValue();

		if ( $referencedArgumentType !== $expectedArgumentType ) {
			// Failure — it's a ZID but not to an instance of the right Type.
			$this->logger->debug(
				__METHOD__ . ' called on {arg} for function {function} but it\'s not a {expectedType}',
				[
					'arg' => $providedArgument,
					'function' => $targetFunction,
					'expectedType' => $expectedArgumentType
				]
			);
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ARGUMENT_TYPE_MISMATCH,
					[
						'expected' => $expectedArgumentType,
						'actual' => $referencedArgumentType,
						'argument' => $providedArgument
					]
				),
				400,
				[
					'target' => $targetFunction,
					'mode' => 'input'
				]
			);
		}

		// If the argument is passed as reference but is not an enum,
		// we should probably flag this, as it's a weird use case:
		if ( !$targetTypeObject->isEnumType() ) {
			$this->logger->debug(
				__METHOD__ . ' found reference {arg} of non-enum type {type} as input to {function}',
				[
					'arg' => $providedArgument,
					'type' => $referencedArgumentType,
					'function' => $targetFunction
				]
			);
		}

		// Given argument is a reference to an instance of the expected type: it should not be parsed
		// * e.g. Expected type is enum Boolean/Z40, given arg is True/Z41
		// * e.g. Expected type is String/Z6, given arg is reference to a persisted Z6
		return true;
	}

	/**
	 * A convenience function for making a ZFunctionCall and returning its result to embed within a page.
	 * Throws different ZErrorExceptions wrapping the ZErrors:
	 * * Z_ERROR_API_FAILURE: for any exceptions thrown by the Api before completing the Orchestrator request
	 * * Z_ERROR_EVALUATION: for any errors in the Orchestrator or its response
	 * * Z_ERROR_INVALID_EVALUATION_RESULT: for successful Orchestrator response but unexpected response
	 *
	 * @param string $call The ZFunctionCall to make, as a JSON object turned into a string
	 * @param string $renderLanguageCode The code of the language in which to render errors, e.g. fr
	 * @return stdClass Currently the only permissable response objects are strings
	 * @throws ZErrorException
	 */
	private function makeRequest( $call, $renderLanguageCode ): stdClass {
		// TODO (T338251): Can we do an Orchestrator call directly here using WikiLambdaApiBase::executeFunctionCall()
		// (But note that we're not an ActionAPI class, so can't extend that… Meh.)
		// Also, consider if we can do an Orchestrator call simply calling
		// OrchestratorRequest instead of layering APIs.
		$api = new ApiMain( new FauxRequest() );
		$request = new FauxRequest(
			[
				'format' => 'json',
				'action' => 'wikilambda_function_call',
				'wikilambda_function_call_zobject' => $call,
				'uselang' => $renderLanguageCode
			],
			/* wasPosted */
			true
		);

		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setRequest( $request );
		$api->setContext( $context );

		// 1. Handle Exceptions thrown by ApiFunctionCall and throw Z_ERROR_API_FAILURE

		// Using FauxRequest means ApiMain is internal and hence $api->execute()
		// doesn't do any error handling. We need to catch any Throwables:
		// * dieWithError: throws ApiUsageException with key="apierror-*"
		// * dieWithZError: throws ApiUsageException with key="wikilambda-zerror"
		// * other exceptions: throws MWException
		try {
			$api->execute();
		} catch ( ApiUsageException $e ) {
			$apiMessage = $e->getStatusValue()->getErrors()[0]['message'];
			'@phan-var \MediaWiki\Api\ApiMessage $apiMessage';

			// Log error message thrown by ApiFunctionCall
			$this->logger->error(
				__METHOD__ . ' executed ApiFunctionCall which threw an ApiUsageException: {error}',
				[ 'error' => $e->getMessage() ]
			);

			if ( $apiMessage->getApiCode() === 'wikilambda-zerror' ) {
				// Throw ZErrorException with Z_ERROR_API_FAILURE with propagated error:
				$zerror = ZObjectFactory::create( $apiMessage->getApiData()[ 'zerror' ] );
				throw new ZErrorException( ZErrorFactory::createApiFailureError( $zerror, $call ) );
			}

			// Throw ZErrorException with Z_ERROR_API_FAILURE error:
			throw new ZErrorException( ZErrorFactory::createApiFailureError( $e->getMessage(), $call ) );
		} catch ( Throwable $e ) {
			// Log unhandled exception thrown by ApiFunctionCall
			$this->logger->error(
				__METHOD__ . ' executed ApiFunctionCall which threw an unhandled exception: {error}',
				[ 'error' => $e->getMessage() ]
			);

			// Throw ZErrorException with Z_ERROR_API_FAILURE error:
			throw new ZErrorException( ZErrorFactory::createApiFailureError( $e->getMessage(), $call ) );
		}

		$outerResponse = $api->getResult()->getResultData( [], [ 'Strip' => 'all' ] );

		// 2. Handle non valid Orchestrator responses and throw Z_ERROR_EVALUATION

		// Now we know that the request has not failed before it even got to the orchestrator, get the response
		// JSON string as a ZResponseEnvelope (falling back to an empty string in case it's unset).
		$response = ZObjectFactory::create(
			json_decode( $outerResponse['wikilambda_function_call']['data'] ?? '' )
		);

		if ( !( $response instanceof ZResponseEnvelope ) ) {
			// The server's not given us a result! This is an unexpected system error
			$responseType = $response->getZType();

			// Log non valid Orchestrator response
			$this->logger->error(
				__METHOD__ . ' got a non-valid response from the server of type {responseType} with call: {call}',
				[
					'responseType' => $responseType,
					'call' => $call
				]
			);

			// Throw ZErrorException for evaluation error:
			throw new ZErrorException( ZErrorFactory::wrapMessageInZError(
				"Server returned a non-result of type '$responseType'!",
				$call
			) );
		}

		// 3. Handle valid Orchestrator responses that might have errors: throw Z_ERROR_EVALUATION

		if ( $response->hasErrors() ) {
			// If the server has responded with a Z22 with errors, throw evaluation error
			$zerror = $response->getErrors();

			// Log a debug message, Orchestrator returned a valid response but function call failed
			$this->logger->debug(
				__METHOD__ . ' got an error-ful Z22 back from the server: {error}',
				[ 'error' => $zerror->getSerialized() ]
			);

			if ( !( $zerror instanceof ZError ) ) {
				// Throw ZErrorException for evaluation error, wrap the non error in a Z500:
				throw new ZErrorException( ZErrorFactory::wrapMessageInZError( new ZQuote( $zerror ), $call ) );
			}

			// Throw ZErrorException for evaluation error, propagate existing zerror:
			throw new ZErrorException( ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_EVALUATION,
				[
					'functionCall' => $call,
					'error' => $zerror
				]
			) );
		}

		// Response envelope value (Z22K1)
		$responseValue = $response->getZValue();
		if ( $responseValue->getZType() !== ZTypeRegistry::Z_STRING ) {
			// Log a debug message, Orchestrator returned a valid response but not a string
			$this->logger->debug(
				__METHOD__ . ' got a non-string output from the server of type {responseType} with call: {call}',
				[
					'responseType' => $responseValue->getZType(),
					'call' => $call
				]
			);

			// Throw ZErrorException for invalid evaluator result
			throw new ZErrorException( ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_INVALID_EVALUATION_RESULT, [ 'result' => $responseValue ]
			) );
		}

		// SUCCESS! Return string output value:
		return (object)[ 'value' => trim( $responseValue->getZValue() ) ];
	}
}
