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
use MediaWiki\Extension\WikiLambda\WikifunctionCallException;
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

		wfDebugLog( 'wikilambda', 'Triggered REST API to evaluate a call to "' . $target . '".' );

		// 0. Check if we are disabled.
		$config = MediaWikiServices::getInstance()->getConfigFactory()->makeConfig( 'WikiLambda' );
		if ( !$config->get( 'WikiLambdaEnableRepoMode' ) || !$config->get( 'WikiLambdaEnableClientMode' ) ) {
			// Note: We check for both modes here, as a very quick way to emergency-disable this everywhere.
			// Client-side code is also going to check whether it's disabled before it's installed.
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET, [] ),
				// This is an HTTP 501 because it's literally "not implemented yet", rather than necessarily user error
				501,
				[ "target" => $target ]
			);
		}

		// 1. Check if we can call this requested Function at all
		if ( !ZObjectUtils::isValidOrNullZObjectReference( $target ) ) {
			// User is trying to use a non-ZID function, e.g. an inline one
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND, [ "data" => $target ] ),
				400,
				[ "target" => $target ]
			);
		}

		$targetTitle = Title::newFromText( $target, NS_MAIN );
		if ( !( $targetTitle->exists() ) ) {
			// User is trying to use a function that doesn't exist
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND, [ "data" => $target ] ),
				400,
				[ "target" => $target ]
			);
		}

		$targetObject = $this->zObjectStore->fetchZObjectByTitle( $targetTitle );
		// ZObjectStore's fetchZObjectByTitle() will return a ZObjectContent, so just check it's a valid ZObject
		if ( !$targetObject->isValid() ) {
			// User is trying to use an invalid ZObject or somehow non-ZObject in our namespace
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED,
					[
						'subtype' => ZErrorTypeRegistry::Z_ERROR_KEY_VALUE_NOT_WELLFORMED,
						'childError' => $targetObject->getErrors()
					]
				),
				400,
				[ "target" => $target ]
			);
		}

		if ( $targetObject->getZType() !== ZTypeRegistry::Z_FUNCTION ) {
			// User is trying to use a ZObject that's not a ZFunction
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [ "data" => $target ]
				),
				400,
				[ "target" => $target ]
			);
		}

		$targetFunction = $targetObject->getInnerZObject();

		// 2. (T368604): Check for and use parsers on inputs

		// First, check that the requested parse language is one we know of and support
		$parseLanguageZid = 'Z1002';
		try {
			$parseLanguageZid = $this->langRegistry->getLanguageZidFromCode( $parseLang );
		} catch ( ZErrorException $error ) {
			$this->dieRESTfullyWithZError(
				$error->getZError(),
				400,
				[ "target" => $parseLang ]
			);
		}

		if ( is_string( $arguments ) ) {
			$encodedArguments = explode( '|', $arguments );
			$arguments = array_map( static fn ( $val ): string => base64_decode( $val ), $encodedArguments );
		}

		// Then, actually check the arguments' Types by looping over allowed inputs,
		// and set up given inputs (for parsing if appropriate)
		$argumentsForCall = [];

		$targetFunctionArguments = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_ARGUMENTS );
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $targetFunctionArguments';
		$expectedArguments = $targetFunctionArguments->getAsArray();

		if ( count( $arguments ) !== count( $expectedArguments ) ) {
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ARGUMENT_COUNT_MISMATCH,
					[
						"expected" => count( $expectedArguments ),
						"actual" => count( $arguments ),
						"arguments" => $arguments
					]
				),
				400,
				[ "target" => $target ]
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

			// Type is generic and we hope for the best (Z1)
			// FIXME: Adjust API filter code to allow Z1s as well?
			if ( $targetTypeZid === ZTypeRegistry::Z_OBJECT ) {
				continue;
			}

			// TODO (T385619): Cache these for repeated uses of the same Type?
			$targetTypeContentObject = $this->zObjectStore
				->fetchZObjectByTitle( Title::newFromText( $targetTypeZid, NS_MAIN ) );
			$targetTypeObject = $targetTypeContentObject->getInnerZObject();

			if ( !( $targetTypeObject instanceof ZType ) ) {
				// It's somehow not to a Type. This is an error in the content.
				// Mostly this is here to make phan happy.
				$this->dieRESTfullyWithZError(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND, [ "data" => $targetTypeZid ]
					),
					400,
					[ "target" => $target ]
				);
			}

			// Check if the argument is a ZID to an instance of the right Type
			if ( $this->checkArgumentValidity( $providedArgument, $targetTypeObject, $inputArgumentKey, $target ) ) {
				continue;
			}

			// At this point, we know it's a string input to a non-string Type, so we need to parse it
			$typeParser = $targetTypeObject->getParserFunction();

			// Type has no parser
			if ( $typeParser === false ) {
				// At this point, we assume it's going to fail, so error on the basis that this is incorrect.
				// TODO (T362252): Would be nicer to build a list with multiple failures in one go, rather than
				// fatalling on the first (and thus making the user fix one just to be told about the next).

				// User is trying to use a parameter that can't be parsed from text
				$this->dieRESTfullyWithZError(
					ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET, [
						"data" => [
							$target,
							$expectedArgument->getValueByKey( ZTypeRegistry::Z_ARGUMENTDECLARATION_ID ),
							$targetTypeZid
						]
					] ),
					400,
					[ "target" => $target, "mode" => "input" ]
				);
			}

			// At this point, we know the argument should be parsed and a parser is available, so let's schedule it
			$argumentsForCall[$argumentKey] = ( new ZFunctionCall( new ZReference( $typeParser ), [
				$typeParser . "K1" => $providedArgument,
				$typeParser . "K2" => $parseLanguageZid
			] ) )->getSerialized();
		}

		// 3. Set up the final, full call with all the above sub-calls embedded
		$callObject = new ZFunctionCall( new ZReference( $target ), $argumentsForCall );

		// 4. (T362252): Check if there's a renderer for this return type (if so, it will be used)
		// First, check that the requested render language is one we know of and support
		$renderLanguageZid = 'Z1002';
		try {
			$renderLanguageZid = $this->langRegistry->getLanguageZidFromCode( $renderLang );
		} catch ( ZErrorException $error ) {
			$this->dieRESTfullyWithZError(
				$error->getZError(),
				400,
				[ "target" => $renderLang ]
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
			$targetReturnTypeObjectArray = $this->zObjectStore
				->fetchZObjectByTitle( Title::newFromText( $targetReturnType, NS_MAIN ) )
				->getZValue();

			$rendererFunction = $targetReturnTypeObjectArray[ZTypeRegistry::Z_TYPE_RENDERER];
			if ( $rendererFunction === false ) {

				// User is trying to use a ZFunction that returns something which doesn't have a renderer
				$this->dieRESTfullyWithZError(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET, [ "data" => $target ]
					),
					400,
					[ "target" => $target, "mode" => "output" ]
				);
			}

			// At this point, we know that we must render, so wrap the function call in that
			$call = new ZFunctionCall( new ZReference( $rendererFunction ), [
				$typeParser . "K1" => $callObject,
				$typeParser . "K2" => $renderLanguageZid
			] );
		}

		// 5. Down-convert the ZFunctionCall Object to a stdClass object
		$call = $callObject->getSerialized();

		// 6. Execute the call
		try {
			$response = $this->makeRequest( json_encode( $call ), $renderLang );
		} catch ( WikifunctionCallException $error ) {
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_EVALUATION, [ "data" => $error ] ),
				// This is an HTTP 500 because it's an error when calling our "local" API, which is probably our fault
				500,
				[ "data" => $error ]
			);
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

	private function dieRESTfullyWithZError( ZError $zerror, int $code = 500, array $errorData = [] ) {
		try {
			$errorData['errorData'] = $zerror->getErrorData();
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

		$this->dieRESTfully( 'wikilambda-zerror', [ $zerror->getZErrorType() ], $code, $errorData );
	}

	/**
	 * @return never
	 */
	private function dieRESTfully( string $messageKey, array $spec, int $code, array $errorData = [] ) {
		throw new LocalizedHttpException(
			new MessageValue( $messageKey, $spec ), $code, $errorData
		);
	}

	/**
	 * Verifies the validity of an argument with respect to the expected type.
	 * If not valid, dies with error.
	 *
	 * @param string $providedArgument
	 * @param ZType $targetTypeObject
	 * @param string $inputArgumentKey
	 * @param string $targetFunction
	 * @return bool
	 */
	private function checkArgumentValidity(
		$providedArgument,
		$targetTypeObject,
		$inputArgumentKey,
		$targetFunction
	): bool {
		if ( ZObjectUtils::isValidZObjectReference( $providedArgument ) ) {
			$referencedArgument = $this->zObjectStore
				->fetchZObjectByTitle( Title::newFromText( $providedArgument, NS_MAIN ) );

			if ( $referencedArgument === false ) {
				// Fatal — it's a ZID but not to an extant Object.
				$this->dieRESTfullyWithZError(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
						[ "data" => $providedArgument ]
					),
					400,
					[ "target" => $targetFunction ]
				);
			}

			$referencedArgumentType = $referencedArgument->getInnerZObject()->getZType();

			$targetTypeObjectArray = $targetTypeObject->getZValue();
			$expectedArgumentType = $targetTypeObjectArray[ZTypeRegistry::Z_TYPE_IDENTITY]->getZValue();

			if ( $referencedArgumentType === $expectedArgumentType ) {
				return true;
			}

			// Check if the argument is an enum: it has no parser, but it's still valid input
			if ( $targetTypeObject->isEnumType() ) {
				// TODO (T385617): Check that the given input is valid for this Type, somehow.
				return true;
			}

			// Fatal — it's a ZID but not to an instance of the right Type.
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ARGUMENT_TYPE_MISMATCH,
					[
						"expected" => $expectedArgumentType,
						"actual" => $referencedArgumentType,
						"argument" => $inputArgumentKey
					]
				),
				400,
				[ "target" => $targetFunction ]
			);
		}

		return false;
	}

	/**
	 * A convenience function for making a ZFunctionCall and returning its result to embed within a page.
	 *
	 * @param string $call The ZFunctionCall to make, as a JSON object turned into a string
	 * @param string $renderLanguageCode The code of the language in which to render errors, e.g. fr
	 *
	 * @return stdClass Currently the only permissable response objects are strings
	 * @throws ZErrorException When the request is responded to oddly by the orchestrator
	 */
	private function makeRequest( $call, $renderLanguageCode ): stdClass {
		// TODO (T338251): Can we do an Orchestrator call directly here using WikiLambdaApiBase::executeFunctionCall()
		// (But note that we're not an ActionAPI class, so can't extend that… Meh.)
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
		$api->execute();
		$outerResponse = $api->getResult()->getResultData( [], [ 'Strip' => 'all' ] );

		if ( isset( $outerResponse['error'] ) ) {
			try {
				$zerror = ZObjectFactory::create( $outerResponse['error'] );
			} catch ( ZErrorException $e ) {
				// Can't use $this->dieWithError() as we're static, so use the call indirectly
				throw ApiUsageException::newWithMessage(
					null,
					[
						'apierror-wikilambda_function_call-response-malformed',
						$e->getZError()->getMessage( $renderLanguageCode )
					],
					null,
					null,
					400
				);
			}
			if ( !( $zerror instanceof ZError ) ) {
				$zerror = ZErrorFactory::wrapMessageInZError( new ZQuote( $zerror ), $call );
			}
			throw new ZErrorException( $zerror );
		}

		// Now we know that the request has not failed before it even got to the orchestrator, get the response
		// JSON string as a ZResponseEnvelope (falling back to an empty string in case it's unset).
		$response = ZObjectFactory::create(
			json_decode( $outerResponse['wikilambda_function_call']['data'] ?? '' )
		);

		if ( !( $response instanceof ZResponseEnvelope ) ) {
			// The server's not given us a result!
			$responseType = $response->getZType();
			$zerror = ZErrorFactory::wrapMessageInZError(
				"Server returned a non-result of type '$responseType'!",
				$call
			);
			throw new ZErrorException( $zerror );
		}

		if ( $response->hasErrors() ) {
			// If the server has responsed with a Z5/Error, show that properly.
			$zerror = $response->getErrors();
			if ( !( $zerror instanceof ZError ) ) {
				$zerror = ZErrorFactory::wrapMessageInZError( new ZQuote( $zerror ), $call );
			}
			$this->dieRESTfullyWithZError(
				$zerror,
				400,
				[ "target" => $call ]
			);
			throw new ZErrorException( $zerror );
		}

		$ret = $response->getZValue();

		if ( $ret->getZTypeObject()->getZValue() === ZTypeRegistry::Z_STRING ) {
			return (object)[ 'value' => trim( $ret->getZValue() ) ];
		}

		// Despite checks above, response is something other than a post-render Z6/String;
		// throw, as there's nowt else to do
		throw new WikifunctionCallException(
			// TODO (T385620): Make a bespoke error type
			ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, [ "data" => 'fish' ] ),
			'wikilambda-functioncall-error-nonstringoutput'
		);
	}
}
