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

use Exception;
use JsonException;
use MediaWiki\Api\ApiMain;
use MediaWiki\Api\ApiUsageException;
use MediaWiki\Config\Config;
use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunction;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZQuote;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZType;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Rest\Handler;
use MediaWiki\Rest\Response;
use MediaWiki\Rest\ResponseInterface;
use stdClass;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\Telemetry\SpanInterface;

/**
 * Simple REST API to call a ZFunction with text arguments for cross-wiki embedding
 * in wikitext, via `GET /wikifunctions/v0/call/{zid}/{arguments}`, or more fully,
 * `GET /wikifunctions/v0/call/{zid}/{arguments}/{parselang}/{renderlang}`
 */
class FunctionCallHandler extends WikiLambdaRESTHandler {

	private ZObjectStore $zObjectStore;
	private ZLangRegistry $langRegistry;

	public function __construct( ZObjectStore $zObjectStore ) {
		$this->zObjectStore = $zObjectStore;
		$this->langRegistry = ZLangRegistry::singleton();
		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );
	}

	/**
	 * @param string $target
	 * @param string $arguments
	 * @param string $parseLang
	 * @param string $renderLang
	 * @return Response
	 */
	public function run(
		$target,
		$arguments = '',
		$parseLang = 'en',
		$renderLang = 'en'
	) {
		// Initial setup; logging and instrumentation
		$tracer = MediaWikiServices::getInstance()->getTracer();
		$span = $tracer->createSpan( 'WikiLambda FunctionCallHandler' )
			->setSpanKind( SpanInterface::SPAN_KIND_CLIENT )
			->start();
		$span->activate();

		$this->logger->debug(
			__METHOD__ . ' triggered to evaluate a call to {target}',
			[ 'target' => $target ]
		);

		// 0. Make sure that this call is not being run in a client instance
		$config = MediaWikiServices::getInstance()->getConfigFactory()->makeConfig( 'WikiLambda' );
		if ( !$config->get( 'WikiLambdaEnableRepoMode' ) ) {
			$errorMessage = __METHOD__ . ' called repo mode is not enabled';
			$this->logger->debug( $errorMessage );
			$span->setAttributes( [
					'response.status_code' => HttpStatus::BAD_REQUEST,
					'exception.message' => $errorMessage
				] );
			$span->end();
			// WikiLambda repo code isn't loaded, so we can't use a ZError here sadly.
			$this->dieRESTfully( 'wikilambda-restapi-disabled-repo-mode-only', [], HttpStatus::BAD_REQUEST );
		}

		// 1. Get the target function or die with ZError
		$targetFunction = $this->getTargetFunction( $target, $span );

		// 2. Validate parser and renderer language codes and get their Zids
		$parseLanguageZid = $this->getLanguageZid( $parseLang, 'parselang', $span );
		$renderLanguageZid = $this->getLanguageZid( $renderLang, 'renderlang', $span );

		// 3. Build the arguments for the call given their expected types (or dies if something is wrong)
		$argumentsForCall = $this->buildArgumentsForCall(
			$target,
			$arguments,
			$parseLanguageZid,
			$targetFunction,
			$config,
			$span
		);

		// 4. Set up the final, full call with all the above sub-calls embedded
		$callObject = new ZFunctionCall( new ZReference( $target ), $argumentsForCall );

		// 5. (T362252): Check if there's a renderer for this return type (if so, it will be used)
		$targetReturnType = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_RETURN_TYPE )->getZValue();

		// Types that can be directly rendered:
		// * String/Z6
		// * HTML Fragment/Z89
		// * Object/Z1 (only when the function call returns a string)
		$renderableOutputTypes = [
			ZTypeRegistry::Z_STRING,
			ZTypeRegistry::Z_HTML_FRAGMENT,
			ZTypeRegistry::Z_OBJECT
		];

		if ( !in_array( $targetReturnType, $renderableOutputTypes ) ) {
			$callObject = $this->buildRenderedOutput(
				$target,
				$targetReturnType,
				$renderLanguageZid,
				$callObject,
				$span
			);
		}

		// 6. Down-convert the ZFunctionCall Object to a stdClass object
		$call = $callObject->getSerialized();

		// 7. Execute the call
		try {
			$requestCall = json_encode( $call, JSON_THROW_ON_ERROR );
			$response = $this->makeRequest( $requestCall, $renderLang, $span );
		} catch ( ZErrorException $e ) {
			$errorMessage = __METHOD__ . ' called on {target} but got a ZErrorException, {error}';
			$this->logger->debug(
				$errorMessage,
				[
					'target' => $target,
					'error' => $e->getMessage()
				]
			);
			$span->setAttributes( [
					'response.status_code' => HttpStatus::BAD_REQUEST,
					'exception.message' => $errorMessage
				] );
			// Dies with one of these ZErrors:
			// * Z_ERROR_API_FAILURE/Z530
			// * Z_ERROR_EVALUATION/Z507
			// * Z_ERROR_INVALID_EVALUATION_RESULT/Z560
			$this->dieRESTfullyWithZError( $e->getZError(), HttpStatus::BAD_REQUEST, [ 'data' => $e->getZError() ] );
		} catch ( JsonException $e ) {
			$errorMessage = __METHOD__ . ' called on {target} but got a JsonException, {error}';
			$this->logger->info(
				$errorMessage,
				[
					'target' => $target,
					'error' => $e->getMessage()
				]
			);
			$span->setAttributes( [
					'response.status_code' => HttpStatus::BAD_REQUEST,
					'exception.message' => $errorMessage
				] );
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX, [
						'input' => var_export( $call, true ),
						'message' => $e->getMessage()
					]
				),
				HttpStatus::BAD_REQUEST,
				[
					'target' => $target,
					'error' => $e->getMessage()
				]
			);
		} finally {
			$span->end();
		}

		// Finally, return the values as JSON (if not already early-returned as an error)
		return $this->getResponseFactory()->createJson( $response );
	}

	/**
	 * Verifies the validity of the given target function Zid and returns its
	 * object (inner ZFunction object) if everything went well.
	 *
	 * Dies with ZError if:
	 * * Given function Id is not a valid Zid
	 * * Target function Zid does not exist
	 * * Target function cannot be fetched
	 * * Fetched target function is not valid
	 * * Fetched target Zid does not belong to a function
	 *
	 * @param string $target
	 * @param SpanInterface $span
	 * @return ZFunction
	 */
	private function getTargetFunction( $target, $span ) {
		// 1. Check if target function Id is a valid Zid
		if ( !ZObjectUtils::isValidOrNullZObjectReference( $target ) ) {
			$errorMessage = __METHOD__ . ' called on {target} which is a non-ZID, e.g. an inline function';
			$this->logger->debug(
				$errorMessage,
				[ 'target' => $target ]
			);
			$span->setAttributes( [
				'response.status_code' => HttpStatus::BAD_REQUEST,
				'exception.message' => $errorMessage
			] )->end();

			// Dies with Z_ERROR_ZID_NOT_FOUND
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND, [ 'data' => $target ] ),
				HttpStatus::BAD_REQUEST,
				[ 'target' => $target ]
			);
		}

		// 2. Check if target function Zid can be successfully fetched; try cache first, then DB
		$targetObject = $this->zObjectStore->fetchZObject( $target );
		if ( !$targetObject ) {
			$errorMessage = __METHOD__ . ' called on {target} which is somehow non-ZObject in our namespace';
			$this->logger->debug(
				$errorMessage,
				[ 'target' => $target ]
			);
			$span->setAttributes( [
				'response.status_code' => HttpStatus::BAD_REQUEST,
				'exception.message' => $errorMessage
			] )->end();

			// Dies with Z_ERROR_ZID_NOT_FOUND
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND, [ 'data' => $target ] ),
				HttpStatus::BAD_REQUEST,
				[ 'target' => $target ]
			);
		}

		// 3. Check if target function is valid
		if ( !$targetObject->isValid() ) {
			$errorMessage = __METHOD__ . ' called on {target} which is an invalid ZObject';
			$this->logger->info(
				$errorMessage,
				[
					'target' => $target,
					'childError' => $targetObject->getErrors()->getMessage(),
				]
			);
			$span->setAttributes( [
				'response.status_code' => HttpStatus::BAD_REQUEST,
				'exception.message' => $errorMessage
			] )->end();

			// Dies with Z_ERROR_NOT_WELLFORMED
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createValidationZError( $targetObject->getErrors() ),
				HttpStatus::BAD_REQUEST,
				[ 'target' => $target ]
			);
		}

		// 5. Check if target function is a function
		if ( $targetObject->getZType() !== ZTypeRegistry::Z_FUNCTION ) {
			$errorMessage = __METHOD__ . ' called on {target} which is not a Function but a {type}';
			$this->logger->debug(
				$errorMessage,
				[
					'target' => $target,
					'type' => $targetObject->getZType()
				]
			);
			$span->setAttributes( [
				'response.status_code' => HttpStatus::BAD_REQUEST,
				'exception.message' => $errorMessage
			] )->end();

			// Dies with Z_ERROR_ARGUMENT_TYPE_MISMATCH
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ARGUMENT_TYPE_MISMATCH,
					[
						'expected' => ZTypeRegistry::Z_FUNCTION,
						'actual' => $targetObject->getZType(),
						'argument' => $target
					]
				),
				HttpStatus::BAD_REQUEST,
				[
					'target' => $target,
					'mode' => 'function'
				]
			);
		}

		// Success! Return inner ZFunction object
		$functionObject = $targetObject->getInnerZObject();
		'@phan-var ZFunction $functionObject';
		return $functionObject;
	}

	/**
	 * Read a language Bcp47 code argument and find its equivalents Natural Language/Z60 Zid.
	 * This is called for:
	 * * parseLang
	 * * renderLang
	 * * input arguments of type Z60
	 *
	 * @param string $langCode
	 * @param string $argKey
	 * @param SpanInterface $span
	 * @return string language zid
	 */
	private function getLanguageZid( $langCode, $argKey, $span ): string {
		// Check that the requested language code is one we know of and support
		try {
			$languageZid = $this->langRegistry->getLanguageZidFromCode( $langCode );
		} catch ( ZErrorException $error ) {
			$errorMessage =
				__METHOD__ . ' called with {argKey} {langCode} which is not found / errored: {error}';
			$this->logger->debug(
				$errorMessage,
				[
					'argKey' => $argKey,
					'langCode' => $langCode,
					'error' => $error->getMessage()
				]
			);
			$span->setAttributes( [
				'response.status_code' => HttpStatus::BAD_REQUEST,
				'exception.message' => $errorMessage
			] )->end();

			// Die with Z_ERROR_LANG_NOT_FOUND
			$this->dieRESTfullyWithZError(
				$error->getZError(),
				HttpStatus::BAD_REQUEST,
				[ 'target' => $langCode ]
			);
		}

		// Success! Return the langugae zids
		return $languageZid;
	}

	/**
	 * @param string $target
	 * @param string $argumentsString
	 * @param string $parseLanguageZid
	 * @param ZFunction $targetFunction
	 * @param Config $config
	 * @param SpanInterface $span
	 * @return array
	 */
	private function buildArgumentsForCall(
		$target,
		$argumentsString,
		$parseLanguageZid,
		$targetFunction,
		$config,
		$span
	): array {
		// 1. Split and decode arguments
		$encodedArguments = explode( '|', $argumentsString );
		$arguments = array_map(
			static fn ( $val ): string => ZObjectUtils::decodeStringParamFromNetwork( $val ),
			$encodedArguments
		);

		// 2. Check that the given input count matches with the number of arguments in the function signature
		$expectedArguments = $targetFunction->getArgumentDeclarations();
		if ( count( $arguments ) !== count( $expectedArguments ) ) {
			$errorMessage =
				__METHOD__ . ' called on {target} with the wrong number of arguments, {givenCount} not {expectedCount}';
			$this->logger->debug(
				$errorMessage,
				[
					'target' => $target,
					'givenCount' => count( $arguments ),
					'expectedCount' => count( $expectedArguments )
				]
			);
			$span->setAttributes( [
				'response.status_code' => HttpStatus::BAD_REQUEST,
				'exception.message' => $errorMessage
			] )->end();

			// Die with Z_ERROR_ARGUMENT_COUNT_MISMATCH
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ARGUMENT_COUNT_MISMATCH,
					[
						'expected' => strval( count( $expectedArguments ) ),
						'actual' => strval( count( $arguments ) ),
						'arguments' => $arguments
					]
				),
				HttpStatus::BAD_REQUEST,
				[ 'target' => $target ]
			);
		}

		$argumentsForCall = [];

		// 3. For each argument in the function signature:
		//    * check that the input type is supported, and
		//    * build the appropriate input object from the string.
		foreach ( $expectedArguments as $expectedArgumentIndex => $expectedArgument ) {
			$argumentKey = $expectedArgument->getValueByKey( ZTypeRegistry::Z_ARGUMENTDECLARATION_ID )->getZValue();
			$providedArgument = $arguments[array_keys( $arguments )[$expectedArgumentIndex]];
			$targetTypeZid = $expectedArgument->getValueByKey( ZTypeRegistry::Z_ARGUMENTDECLARATION_TYPE )->getZValue();

			// A) If expected type is String/Z6 or Object/Z1: build String object (canonical or normal if zid)
			if ( ( $targetTypeZid === ZTypeRegistry::Z_STRING ) || ( $targetTypeZid === ZTypeRegistry::Z_OBJECT ) ) {
				$argumentsForCall[$argumentKey] = new ZString( $providedArgument );
				continue;
			}

			// B) If Wikidata input types feature flag is enabled:
			//    * If expected type is Wikidata entity: build wikidata fetch function call object
			//    * If expected type is Wikidata reference: build wikidata reference object
			if ( $config->get( 'WikifunctionsEnableWikidataInputTypes' ) ) {
				$allowedEntityTypes = [
					ZTypeRegistry::Z_WIKIDATA_LEXEME,
					ZTypeRegistry::Z_WIKIDATA_ITEM
				];
				$allowedReferenceTypes = [
					ZTypeRegistry::Z_WIKIDATA_REFERENCE_LEXEME,
					ZTypeRegistry::Z_WIKIDATA_REFERENCE_ITEM
				];

				// Handle Wikidata entity types (e.g., Z6001, Z6005, etc.) as function arguments:
				// We build a ZFunctionCall to the appropriate Wikidata fetch function (e.g., Z6825 for lexeme),
				// with the argument being a Wikidata reference type (e.g., { Z1K1: Z6095, Z6095K1: 'L123' })
				if ( in_array( $targetTypeZid, $allowedEntityTypes ) ) {
					$entityMap = ZTypeRegistry::WIKIDATA_ENTITY_TYPE_MAP[$targetTypeZid] ?? null;
					if ( $entityMap ) {
						$referenceType = $entityMap['reference_type'];
						$referenceKey = $entityMap['reference_key'];
						$fetchFunction = $entityMap['fetch_function'];
						$fetchKey = $entityMap['fetch_key'];

						// Build the reference ZObject for the entity (e.g., { Z1K1: Z6095, Z6095K1: 'L123' })
						$referenceObject = new ZObject(
							new ZReference( $referenceType ),
							[ $referenceKey => new ZString( $providedArgument ) ]
						);
						// Build the ZFunctionCall to the fetch function, passing the reference object as the argument
						$argumentsForCall[$argumentKey] = new ZFunctionCall(
							new ZReference( $fetchFunction ),
							[ $fetchKey => $referenceObject ]
						);
						continue;
					}
				}

				// Handle Wikidata reference types (e.g., Z6091, Z6095, etc.) as function arguments:
				// We build a ZObject of the given Wikidata reference type.
				if ( in_array( $targetTypeZid, $allowedReferenceTypes ) ) {
					$argumentsForCall[$argumentKey] = new ZObject(
						new ZReference( $targetTypeZid ),
						[ $targetTypeZid . 'K1' => new ZString( $providedArgument ) ]
					 );
					continue;
				}
			}

			// C) If any other type, build either parser function call or reference to enum instance
			$argumentsForCall[$argumentKey] = $this->buildParsedArgument(
				$target,
				$targetTypeZid,
				$argumentKey,
				$parseLanguageZid,
				$providedArgument,
				$span
			);
		}

		return $argumentsForCall;
	}

	/**
	 * Builds the argument for any other custom type, which means that we need to
	 * fetch the type first in order to figure out whether:
	 * * The type is an enum or any other type that can be referenced, and the arg is a reference
	 * * The type has a parser function so it can be parsed from an input string
	 *
	 * @param string $target - target function zid
	 * @param string $targetTypeZid - target function argument type zid
	 * @param string $argumentKey - target function argument key
	 * @param string $parseLanguageZid - zid of the parser language
	 * @param string $providedArgument - provided string value for the argument
	 * @param SpanInterface $span
	 * @return ZObject
	 */
	private function buildParsedArgument(
		$target,
		$targetTypeZid,
		$argumentKey,
		$parseLanguageZid,
		$providedArgument,
		$span
	): ZObject {
		// Fetch target input type to figure out if it has a parser function; try cache first, else DB
		$targetType = $this->zObjectStore->fetchZObject( $targetTypeZid );
		if ( !$targetType ) {
			$errorMessage = __METHOD__ . ' called on {target} which has a not-found input type {typeZid} at key {key}';
			$this->logger->debug(
				$errorMessage,
				[
					'target' => $target,
					'typeZid' => $targetTypeZid,
					'key' => $argumentKey
				]
			);
			$span->setAttributes( [
				'response.status_code' => HttpStatus::BAD_REQUEST,
				'exception.message' => $errorMessage
			] )->end();

			// Dies with Z_ERROR_ZID_NOT_FOUND
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND, [ 'data' => $targetTypeZid ]
				),
				HttpStatus::BAD_REQUEST,
				[
					'target' => $target,
					'mode' => 'input'
				]
			);
		}

		$targetTypeObject = $targetType->getInnerZObject();
		if ( !( $targetTypeObject instanceof ZType ) ) {
			// It's somehow not to a Type, because:
			// * Argument is a generic type; the function input is not supported.
			// * There is an error in the content; the function is not wellformed (not very likely).
			$errorMessage =
				__METHOD__ . ' called on {target} which has a non-Type argument, {typeZid} at key {key}';
			$this->logger->debug(
				$errorMessage,
				[
					'target' => $target,
					'typeZid' => $targetTypeZid,
					'key' => $argumentKey
				]
			);
			$span->setAttributes( [
				'response.status_code' => HttpStatus::BAD_REQUEST,
				'exception.message' => $errorMessage
			] )->end();

			// Die with Z_ERROR_NOT_IMPLEMENTED_YET
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET, [ 'data' => $target ]
				),
				HttpStatus::BAD_REQUEST,
				[
					'target' => $target,
					'mode' => 'input'
				]
			);
		}

		// Check if the argument is a ZID to an instance of the right Type:
		// * if so, builds a ZReference object
		// * if not a reference, proceeds with building parser function
		if ( $this->isArgumentValidReference( $providedArgument, $targetTypeObject, $target, $span ) ) {
			return new ZReference( $providedArgument );
		}

		// If type is a language and value is not a zid, get language zid from Bcp47code
		if ( $targetTypeZid === ZTypeRegistry::Z_LANGUAGE ) {
			$languageZid = $this->getLanguageZid( $providedArgument, $argumentKey, $span );
			return new ZReference( $languageZid );
		}

		// At this point, we know it's a string input to a non-string Type, so we need to parse it
		$typeParser = $targetTypeObject->getParserFunction();

		// Type has no parser
		if ( $typeParser === false ) {
			// User is trying to use a parameter that can't be parsed from text
			$errorMessage =
				__METHOD__ . ' called on {target} with an unparseable input, {targetTypeZid} in position {pos}';
			$this->logger->debug(
				$errorMessage,
				[
					'target' => $target,
					'targetTypeZid' => $targetTypeZid,
					'key' => $argumentKey
				]
			);
			$span->setAttributes( [
				'response.status_code' => HttpStatus::BAD_REQUEST,
				'exception.message' => $errorMessage
			] )->end();

			// Die with Z_ERROR_NOT_IMPLEMENTED_YET
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET, [ 'data' => $target ]
				),
				HttpStatus::BAD_REQUEST,
				[
					'target' => $target,
					'mode' => 'input'
				]
			);
		}

		// At this point, we know the argument should be parsed and a parser is available, so let's schedule it
		return new ZFunctionCall( new ZReference( $typeParser ), [
			$typeParser . "K1" => new ZString( $providedArgument ),
			$typeParser . "K2" => new ZReference( $parseLanguageZid )
		] );
	}

	/**
	 * Verifies the validity of a referenced argument with respect to the expected type:
	 * * if the string argument is a reference to a valid type, returns true
	 * * if the string argument is not a reference, returns false
	 * * if it's a wrong reference or a reference to a non-valid type, dies with error
	 *
	 * @param string $providedArgument
	 * @param ZType $targetTypeObject
	 * @param string $targetFunction
	 * @param SpanInterface $span
	 * @return bool
	 */
	private function isArgumentValidReference(
		$providedArgument,
		$targetTypeObject,
		$targetFunction,
		$span
	): bool {
		// The provided argument is a string value (not a reference): it should be parsed
		// This excludes Z6s and Z1s as they have already been handled.
		if ( !ZObjectUtils::isValidZObjectReference( $providedArgument ) ) {
			return false;
		}

		// If the provided argument is a reference to a ZObject, we fetch it; try cache first, else DB
		$referencedArgument = $this->zObjectStore->fetchZObject( $providedArgument );
		if ( $referencedArgument === false ) {
			// Fatal — it's a ZID but not to an extant Object.
			$errorMessage =
				__METHOD__ . ' called on {providedArgument} for function {targetFunction} but it doesn\'t exist';
			$this->logger->debug(
				$errorMessage,
				[
					'providedArgument' => $providedArgument,
					'targetFunction' => $targetFunction
				]
			);
			$span->setAttributes( [
				'response.status_code' => HttpStatus::BAD_REQUEST,
				'exception.message' => $errorMessage
			] )->end();

			// Die with Z_ERROR_ZID_NOT_FOUND
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND, [ 'data' => $providedArgument ]
				),
				HttpStatus::BAD_REQUEST,
				[
					'target' => $targetFunction,
					'mode' => 'input'
				]
			);
		}

		$referencedArgumentType = $referencedArgument->getInnerZObject()->getZType();
		$expectedArgumentType = $targetTypeObject->getTypeId()->getZValue();

		if ( $referencedArgumentType !== $expectedArgumentType ) {
			// Failure — it's a ZID but not to an instance of the right Type.
			$errorMessage = __METHOD__ . ' called on {arg} for function {function} but it\'s not a {expectedType}';
			$this->logger->debug(
				$errorMessage,
				[
					'arg' => $providedArgument,
					'function' => $targetFunction,
					'expectedType' => $expectedArgumentType
				]
			);
			$span->setAttributes( [
					'response.status_code' => HttpStatus::BAD_REQUEST,
					'exception.message' => $errorMessage
				] );
			$span->end();
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ARGUMENT_TYPE_MISMATCH,
					[
						'expected' => $expectedArgumentType,
						'actual' => $referencedArgumentType,
						'argument' => $providedArgument
					]
				),
				HttpStatus::BAD_REQUEST,
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
	 * Builds a renderer function call that wraps the given function call if:
	 * * The expected output type is a valid type, and
	 * * The output type has a renderer function
	 *
	 * @param string $target - zid of the target function
	 * @param string $targetReturnType - zid of the return type of the target function
	 * @param string $renderLanguageZid - zid of the render language
	 * @param ZFunctionCall $callObject - function call object
	 * @param SpanInterface $span
	 */
	private function buildRenderedOutput(
		$target,
		$targetReturnType,
		$renderLanguageZid,
		$callObject,
		$span
	): ZFunctionCall {
		// Fetch target output type to figure out if it has a renderer function; try cache first, else DB
		$typeObject = $this->zObjectStore->fetchZObject( $targetReturnType );
		if ( !$typeObject ) {
			$errorMessage = __METHOD__ . ' called on {target} which has a not-found output type {typeZid}';
			$this->logger->debug(
				$errorMessage,
				[
					'target' => $target,
					'typeZid' => $targetReturnType
				]
			);
			$span->setAttributes( [
				'response.status_code' => HttpStatus::BAD_REQUEST,
				'exception.message' => $errorMessage
			] )->end();

			// Dies with Z_ERROR_ZID_NOT_FOUND
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance( ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND, [ 'data' => $target ] ),
				HttpStatus::BAD_REQUEST,
				[
					'target' => $target,
					'mode' => 'output'
				]
			);
		}

		$targetReturnTypeObject = $typeObject->getInnerZObject();
		if ( !( $targetReturnTypeObject instanceof ZType ) ) {
			// It's somehow not to a Type, because:
			// * Output is a generic type; the function input is not supported.
			// * There is an error in the content; the function is not wellformed (not very likely).
			$errorMessage = __METHOD__ . ' called on {target} which has a non-Type output, {targetReturnType}';
			$this->logger->debug(
				$errorMessage,
				[
					'target' => $target,
					'targetReturnType' => $targetReturnType
				]
			);
			$span->setAttributes( [
				'response.status_code' => HttpStatus::BAD_REQUEST,
				'exception.message' => $errorMessage
			] )->end();

			// Die with Z_ERROR_NOT_IMPLEMENTED_YET
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET, [ 'data' => $target ]
				),
				HttpStatus::BAD_REQUEST,
				[
					'target' => $target,
					'mode' => 'output'
				]
			);
		}

		$rendererFunction = $targetReturnTypeObject->getRendererFunction();

		if ( $rendererFunction === false ) {
			// User is trying to use a ZFunction that returns something which doesn't have a renderer
			$errorMessage = __METHOD__ . ' called on {target} with an unrenderable output, {targetReturnType}';
			$this->logger->debug(
				$errorMessage,
				[
					'target' => $target,
					'targetReturnType' => $targetReturnType
				]
			);
			$span->setAttributes( [
				'response.status_code' => HttpStatus::BAD_REQUEST,
				'exception.message' => $errorMessage
			] )->end();

			// Die with Z_ERROR_NOT_IMPLEMENTED_YET
			$this->dieRESTfullyWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_NOT_IMPLEMENTED_YET, [ 'data' => $target ]
				),
				HttpStatus::BAD_REQUEST,
				[
					'target' => $target,
					'mode' => 'output'
				]
			);
		}

		// At this point, we know that we must render, so wrap the function call in that
		return new ZFunctionCall( new ZReference( $rendererFunction ), [
			$rendererFunction . "K1" => $callObject,
			$rendererFunction . "K2" => new ZReference( $renderLanguageZid )
		] );
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
	 * @param SpanInterface $span Trace instance for adding spans to a trace
	 * @return stdClass Currently the only permissable response objects are strings
	 * @throws ZErrorException
	 */
	private function makeRequest( $call, $renderLanguageCode, $span ): stdClass {
		// TODO (T407490): Can we do an Orchestrator call directly here using WikiLambdaApiBase::executeFunctionCall()
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
		// doesn't do any error handling. We need to catch any Exceptions:
		// * dieWithError: throws ApiUsageException with key="apierror-*"
		// * dieWithZError: throws ApiUsageException with key="wikilambda-zerror"
		// * other exceptions: throws MWException
		try {
			$api->execute();
		} catch ( ApiUsageException $e ) {
			$apiMessage = $e->getStatusValue()->getErrors()[0]['message'];
			'@phan-var \MediaWiki\Api\ApiMessage $apiMessage';

			// Log error message thrown by ApiFunctionCall; this is almost certainly a 429 /
			// "You have too many function calls executing right now." error.
			$errorMessage = __METHOD__ . ' executed ApiFunctionCall which threw an ApiUsageException: {error}';
			$this->logger->info(
				$errorMessage,
				[ 'error' => $e->getMessage() ]
			);
			$span->setSpanStatus( SpanInterface::SPAN_STATUS_ERROR )
				->setAttributes( [
					'error.message' => $errorMessage
				] );

			if ( $apiMessage->getApiCode() === 'wikilambda-zerror' ) {
				// Throw ZErrorException with Z_ERROR_API_FAILURE with propagated error:
				$zerror = ZObjectFactory::create( $apiMessage->getApiData()[ 'zerror' ] );
				$span->setSpanStatus( SpanInterface::SPAN_STATUS_ERROR )
					->setAttributes( [
						'error.message' => $zerror
					] );
				throw new ZErrorException( ZErrorFactory::createApiFailureError( $zerror, $call ) );
			}

			$errorMessage = $e->getMessage();
			$span->setSpanStatus( SpanInterface::SPAN_STATUS_ERROR )
				->setAttributes( [
					'error.message' => $errorMessage
				] );
			// Throw ZErrorException with Z_ERROR_API_FAILURE error:
			throw new ZErrorException( ZErrorFactory::createApiFailureError( $errorMessage, $call ) );
		} catch ( Exception $e ) {
			// Log unhandled exception thrown by ApiFunctionCall
			$errorMessage = __METHOD__ . ' executed ApiFunctionCall which threw an unhandled exception: {error}';
			$this->logger->warning(
				$errorMessage,
				[ 'error' => $e->getMessage() ]
			);
			$span->setSpanStatus( SpanInterface::SPAN_STATUS_ERROR )
				->setAttributes( [
					'error.message' => $errorMessage
				] );
			// Throw ZErrorException with Z_ERROR_API_FAILURE error:
			throw new ZErrorException( ZErrorFactory::createApiFailureError( $e->getMessage(), $call ) );
		} finally {
			$span->end();
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

			// Log non-valid Orchestrator response
			$errorMessage =
				__METHOD__ . ' got a non-valid response from the server of type {responseType} with call: {call}';
			$this->logger->error(
				$errorMessage,
				[
					'responseType' => $responseType,
					'call' => $call
				]
			);

			$span->setSpanStatus( SpanInterface::SPAN_STATUS_ERROR )
				->setAttributes( [
					'error.message' => $errorMessage
				] );
			$span->end();
			// Throw ZErrorException for evaluation error:
			throw new ZErrorException( ZErrorFactory::createEvaluationError(
				"Server returned a non-result of type '$responseType'!",
				$call
			) );
		}

		// 3. Handle valid Orchestrator responses that might have errors: throw Z_ERROR_EVALUATION

		if ( $response->hasErrors() ) {
			// If the server has responded with a Z22 with errors, throw evaluation error
			$zerror = $response->getErrors();

			// Log a debug message, Orchestrator returned a valid response but function call failed
			$errorMessage = __METHOD__ . ' got an error-ful Z22 back from the server: {error}';
			$this->logger->debug(
				$errorMessage,
				[ 'error' => $zerror->getSerialized() ]
			);
			$span->setSpanStatus( SpanInterface::SPAN_STATUS_ERROR )
				->setAttributes( [
					'error.message' => $errorMessage
				] );
			$span->end();
			if ( !( $zerror instanceof ZError ) ) {
				// Throw ZErrorException for evaluation error, wrap the non error in a Z500:
				throw new ZErrorException( ZErrorFactory::createEvaluationError( new ZQuote( $zerror ), $call ) );
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
		// If the response value is not a ZString or ZHtmlFragment, we can't handle it
		if (
			$responseValue->getZType() !== ZTypeRegistry::Z_STRING &&
			$responseValue->getZType() !== ZTypeRegistry::Z_HTML_FRAGMENT
		) {
			// Log a debug message, Orchestrator returned a valid response but not a string
			$errorMessage =
				__METHOD__ . ' got a non-string output from the server of type {responseType} with call: {call}';
			$this->logger->debug(
				$errorMessage,
				[
					'responseType' => $responseValue->getZType(),
					'call' => $call
				]
			);
			$span->setSpanStatus( SpanInterface::SPAN_STATUS_ERROR )
				->setAttributes( [
					'error.message' => $errorMessage
				] );
			$span->end();
			// Throw ZErrorException for invalid evaluator result
			throw new ZErrorException( ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_INVALID_EVALUATION_RESULT, [ 'result' => $responseValue ]
			) );
		}

		$span->setSpanStatus( SpanInterface::SPAN_STATUS_OK );
		$span->end();

		// SUCCESS! if type is Z6 (string) or Z89 (HTML fragment), return the value
		return (object)[
			'value' => trim( $responseValue->getZValue() ),
			'type' => $responseValue->getZType()
		];
	}

	/** @inheritDoc */
	public function applyCacheControl( ResponseInterface $response ) {
		if ( $response->getStatusCode() >= 200 && $response->getStatusCode() < 300 ) {
			$response->setHeader( 'Cache-Control', 'public,must-revalidate,s-maxage=' . 60 * 60 * 24 );
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
}
