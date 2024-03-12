<?php
/**
 * WikiLambda extension Parser-related hooks
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Html;
use MediaWiki\Extension\WikiLambda\API\ApiFunctionCall;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use Parser;
use PPFrame;
use Sanitizer;

class ParserHooks implements
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
		if ( $config->get( 'WikiLambdaEnableParserFunction' ) ) {
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
		// TODO: Turn $args into the request more properly.

		$cleanupInput = static function ( $input ) use ( $frame ) {
			return trim( Sanitizer::decodeCharReferences( $frame->expand( $input ) ) );
		};

		$cleanedArgs = array_map( $cleanupInput, $args );

		$target = $cleanedArgs[0];

		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$targetTitle = Title::newFromText( $target, NS_MAIN );
		if ( !( $targetTitle->exists() ) ) {
			// User is trying to use a function that doesn't exist
			$ret = Html::errorBox(
				wfMessage(
					'wikilambda-functioncall-error-unknown',
					$target
				)->parseAsBlock()
			);
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-unknown-category' );
			return [ $ret ];
		}

		$targetObject = $zObjectStore->fetchZObjectByTitle( $targetTitle );

		// ZObjectStore's fetchZObjectByTitle() will return a ZObjectContent, so just check it's a valid ZObject
		if ( !$targetObject->isValid() ) {
			// User is trying to use an invalid ZObject or somehow non-ZObject in our namespace
			$ret = Html::errorBox(
				wfMessage(
					'wikilambda-functioncall-error-invalid-zobject',
					$target
				)->parseAsBlock()
			);
			// Triggers use of message wikilambda-functioncall-error-invalid-zobject-category-desc
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-invalid-zobject-category' );
			return [ $ret ];
		}

		if ( $targetObject->getZType() !== ZTypeRegistry::Z_FUNCTION ) {
			// User is trying to use a ZObject that's not a ZFunction
			$ret = Html::errorBox(
				wfMessage(
					'wikilambda-functioncall-error-nonfunction',
					$target
				)->parseAsBlock()
			);
			// Triggers use of message wikilambda-functioncall-error-nonfunction-category-desc
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-nonfunction-category' );
			return [ $ret ];
		}

		$targetFunction = $targetObject->getInnerZObject();

		if (
			$targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_RETURN_TYPE )->getZValue()
				!== ZTypeRegistry::Z_STRING
			) {
			// User is trying to use a ZFunction that returns something other than a Z6/String
			$ret = Html::errorBox(
				wfMessage(
					'wikilambda-functioncall-error-nonstringoutput',
					$target
				)->parseAsBlock()
			);
			// Triggers use of message wikilambda-functioncall-error-nonstringoutput-category-desc
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-nonstringoutput-category' );
			return [ $ret ];
		}

		$targetFunctionArguments = $targetFunction->getValueByKey( ZTypeRegistry::Z_FUNCTION_ARGUMENTS );
		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $targetFunctionArguments';
		$nonStringArgumentsDefinition = array_filter(
			$targetFunctionArguments->getAsArray(),
			static function ( $arg_value ) {
				return !(
					is_object( $arg_value )
					&& $arg_value->getValueByKey( ZTypeRegistry::Z_OBJECT_TYPE )->getZValue()
						=== ZTypeRegistry::Z_ARGUMENTDECLARATION
					&& $arg_value->getValueByKey( ZTypeRegistry::Z_ARGUMENTDECLARATION_TYPE )->getZValue()
						=== ZTypeRegistry::Z_STRING
				);
			},
			ARRAY_FILTER_USE_BOTH
		);

		if ( count( $nonStringArgumentsDefinition ) ) {

			// TODO: Would be nice to deal with multiple
			$nonStringArgumentDefinition = $nonStringArgumentsDefinition[ 0 ];

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

		$arguments = array_slice( $cleanedArgs, 1 );

		$call = ( new ZFunctionCall( $target, $arguments ) )->getSerialized();

		// TODO: We want a much finer control on execution time than this.
		// TODO: Actually do this, or something similar?
		// set_time_limit( 1 );
		// TODO: We should retain this object for re-use if there's more than one call per page.
		try {
			$ret = [
				ApiFunctionCall::makeRequest( $call ),
				/* Force content to be escaped */ 'nowiki'
			];
		} catch ( \Throwable $th ) {
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-category' );
			if ( $th instanceof ZErrorException ) {
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
			// TODO: Actually do this, or something similar?
			// set_time_limit( 0 );
		}

		return [
			trim( $ret ),
			/* Force content to be escaped */ 'nowiki'
		];
	}
}
