<?php

/**
 * WikiLambda extension Parser-related ('client-mode') hooks
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\HookHandler;

use ApiMain;
use ApiUsageException;
use MediaWiki\Context\DerivativeContext;
use MediaWiki\Context\RequestContext;
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
use MediaWiki\Html\Html;
use MediaWiki\MediaWikiServices;
use MediaWiki\Parser\Parser;
use MediaWiki\Parser\Sanitizer;
use MediaWiki\Request\FauxRequest;
use MediaWiki\Title\Title;
use PPFrame;

class ClientHooks implements
	\MediaWiki\Hook\ParserFirstCallInitHook
{

	/**
	 * Register {{#function:…}} as a wikitext parser function to trigger function evaluation.
	 *
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/ParserFirstCallInit
	 *
	 * @param Parser $parser
	 */
	public function onParserFirstCallInit( $parser ) {
		$config = MediaWikiServices::getInstance()->getMainConfig();
		if ( $config->get( 'WikiLambdaEnableClientMode' ) ) {
			$parser->setFunctionHook( 'function', [ self::class, 'parserFunctionCallback' ], Parser::SFH_OBJECT_ARGS );
		}
	}

	/**
	 * @param Parser $parser
	 * @param PPFrame $frame
	 * @param array $args
	 * @return array
	 */
	public static function parserFunctionCallback( Parser $parser, $frame, $args = [] ) {
		// TODO (T362251): Turn $args into the request more properly.

		$cleanupInput = static function ( $input ) use ( $frame ) {
			return trim( Sanitizer::decodeCharReferences( $frame->expand( $input ) ) );
		};

		$cleanedArgs = array_map( $cleanupInput, $args );

		$target = $cleanedArgs[0];

		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$targetTitle = Title::newFromText( $target, NS_MAIN );
		if ( !( $targetTitle->exists() ) ) {
			// User is trying to use a function that doesn't exist
			// Triggers use of messages:
			// * wikilambda-functioncall-error-unknown-category
			// * wikilambda-functioncall-error-unknown-category-desc
			return static::generateTargetError( $parser, $target, 'wikilambda-functioncall-error-unknown' );
		}

		$targetObject = $zObjectStore->fetchZObjectByTitle( $targetTitle );

		// TODO (T272516): This will stop being our thing to check when we're remote-capable
		// ZObjectStore's fetchZObjectByTitle() will return a ZObjectContent, so just check it's a valid ZObject
		if ( !$targetObject->isValid() ) {
			// User is trying to use an invalid ZObject or somehow non-ZObject in our namespace
			// Triggers use of messages:
			// * wikilambda-functioncall-error-invalid-zobject-category
			// * wikilambda-functioncall-error-invalid-zobject-category-desc
			return static::generateTargetError( $parser, $target, 'wikilambda-functioncall-error-invalid-zobject' );
		}

		if ( $targetObject->getZType() !== ZTypeRegistry::Z_FUNCTION ) {
			// User is trying to use a ZObject that's not a ZFunction
			// Triggers use of messages:
			// * wikilambda-functioncall-error-nonfunction-category
			// * wikilambda-functioncall-error-nonfunction-category-desc
			return static::generateTargetError( $parser, $target, 'wikilambda-functioncall-error-nonfunction' );
		}

		$targetFunction = $targetObject->getInnerZObject();

		// TODO (T362252): Check for and use renderers rather than check for Z6 output
		$targetReturnType = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_RETURN_TYPE )->getZValue();
		if (
			$targetReturnType !== ZTypeRegistry::Z_STRING &&
			$targetReturnType !== ZTypeRegistry::Z_OBJECT
		) {
			// User is trying to use a ZFunction that returns something other than a Z6/String
			// Triggers use of messages:
			// * wikilambda-functioncall-error-nonstringoutput-category
			// * wikilambda-functioncall-error-nonstringoutput-category-desc
			return static::generateTargetError( $parser, $target, 'wikilambda-functioncall-error-nonstringoutput' );
		}

		// TODO (T362252): Check for and use renderers rather than check for Z6 output
		$targetFunctionArguments = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_ARGUMENTS );
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $targetFunctionArguments';
		$nonStringArgumentsDefinition = array_filter(
			$targetFunctionArguments->getAsArray(),
			static function ( $arg_value ) {
				return !(
					is_object( $arg_value )
					&& $arg_value->getValueByKey( ZTypeRegistry::Z_OBJECT_TYPE )->getZValue()
						=== ZTypeRegistry::Z_ARGUMENTDECLARATION
					&& (
						$arg_value->getValueByKey( ZTypeRegistry::Z_ARGUMENTDECLARATION_TYPE )->getZValue()
							=== ZTypeRegistry::Z_STRING ||
						$arg_value->getValueByKey( ZTypeRegistry::Z_ARGUMENTDECLARATION_TYPE )->getZValue()
							=== ZTypeRegistry::Z_OBJECT
					)
				);
			},
			ARRAY_FILTER_USE_BOTH
		);

		if ( count( $nonStringArgumentsDefinition ) ) {

			// TODO (T362252): Would be nice to deal with multiple
			$nonStringArgumentDefinition = $nonStringArgumentsDefinition[0];

			$nonStringArgumentType = $nonStringArgumentDefinition->getValueByKey(
				ZTypeRegistry::Z_ARGUMENTDECLARATION_TYPE
			);
			$nonStringArgument = $nonStringArgumentDefinition->getValueByKey(
				ZTypeRegistry::Z_ARGUMENTDECLARATION_ID
			);

			// User is trying to use a ZFunction that takes something other than a Z6/String
			$ret = Html::errorBox(
				wfMessage(
					'wikilambda-functioncall-error-nonstringinput',
					$target,
					$nonStringArgument,
					$nonStringArgumentType
				)->parseAsBlock()
			);
			// Triggers use of message wikilambda-functioncall-error-nonstringinput-category-desc
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-nonstringinput-category' );
			return [ $ret ];
		}

		// Turn [ 0 => 123, 1 => 345 ] into [ Z…K1 => 123, Z…K2 => 345 ]
		$unkeyedArguments = array_slice( $cleanedArgs, 1 );
		$arguments = [];
		foreach ( $unkeyedArguments as $key => $value ) {
			$arguments[ $target . 'K' . ( $key + 1 ) ] = $value;
		}

		$call = ( new ZFunctionCall( new ZReference( $target ), $arguments ) )->getSerialized();

		// TODO (T362254): We want a much finer control on execution time than this.
		// TODO (T362254): Actually do this, or something similar?
		// set_time_limit( 1 );
		// TODO (T362256): We should retain this object for re-use if there's more than one call per page.
		try {
			$ret = [
				static::makeRequest( json_encode( $call ) ),
				/* Force content to be escaped */ 'nowiki'
			];
		} catch ( \Throwable $th ) {
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-category' );
			if ( $th instanceof ZErrorException ) {
				// TODO (T362236): Pass in the rendering language as a parameter, don't default to English
				$errorMessage = $th->getZErrorMessage();
			} else {
				// Something went wrong elsewhere; no nice translatable ZError to show, sadly.
				$errorMessage = $th->getMessage();
			}

			$ret = Html::errorBox(
				wfMessage( 'wikilambda-functioncall-error', $errorMessage )->parseAsBlock()
			);
		} finally {
			// Restore time limits to status quo.
			// TODO (T362254): Actually do this, or something similar?
			// set_time_limit( 0 );
		}

		if ( is_string( $ret ) ) {
			$ret = [
				trim( $ret ),
				// Don't parse this, it's plain text
				'noparse' => true,
				// Force content to be escaped
				'nowiki' => true
			];
		}

		return $ret;
	}

	/**
	 * A convenience function for making a ZFunctionCall and returning its result to embed within a page.
	 *
	 * @param string $call The ZFunctionCall to make, as a JSON object turned into a string
	 * @return string Currently the only permissable response objects are strings
	 * @throws ZErrorException When the request is responded to oddly by the orchestrator
	 */
	private static function makeRequest( $call ): string {
		$api = new ApiMain( new FauxRequest() );
		$request = new FauxRequest(
			[
				'format' => 'json',
				'action' => 'wikilambda_function_call',
				'wikilambda_function_call_zobject' => $call,
			],
			/* wasPosted */ true
		);

		$context = new DerivativeContext( RequestContext::getMain() );
		$context->setRequest( $request );
		$api->setContext( $context );
		$api->execute();
		$outerResponse = $api->getResult()->getResultData( [], [ 'Strip' => 'all' ] );

		if ( isset( $outerResponse[ 'error' ] ) ) {
			try {
				$zerror = ZObjectFactory::create( $outerResponse['error'] );
			} catch ( ZErrorException $e ) {
				// Can't use $this->dieWithError() as we're static, so use the call indirectly
				throw ApiUsageException::newWithMessage(
					null,
					[
						'apierror-wikilambda_function_call-response-malformed',
						// TODO (T362236): Pass the rendering language in, don't default to English
						$e->getZError()->getMessage()
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
			throw new ZErrorException( $zerror );
		}

		return trim( $response->getZValue() );
	}

	/**
	 * Make a title-related error
	 *
	 * @param Parser $parser
	 * @param string $target
	 * @param string $error
	 * @return array
	 */
	private static function generateTargetError( Parser $parser, string $target, string $error ) {
		$parser->addTrackingCategory( $error . '-category' );
		return [
			Html::errorBox( wfMessage( $error, $target )->parseAsBlock() ),
			'noparse' => true,
			'isHTML' => true
		];
	}
}
