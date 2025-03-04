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

use JobQueueGroup;
use MediaWiki\Config\Config;
use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsUsageUpdateJob;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikifunctionCallException;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Html\Html;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Output\OutputPage;
use MediaWiki\Parser\Parser;
use MediaWiki\Parser\PPFrame;
use MediaWiki\Parser\Sanitizer;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\ResourceLoader\ResourceLoader;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Storage\EditResult;
use MediaWiki\User\UserIdentity;
use MWHttpRequest;
use Psr\Log\LoggerInterface;
use Wikimedia\ObjectCache\BagOStuff;
use WikiPage;

class ClientHooks implements
	\MediaWiki\Hook\ParserFirstCallInitHook,
	\MediaWiki\Storage\Hook\PageSaveCompleteHook,
	\MediaWiki\ResourceLoader\Hook\ResourceLoaderRegisterModulesHook,
	\MediaWiki\Output\Hook\MakeGlobalVariablesScriptHook
{
	private Config $config;
	private HttpRequestFactory $httpRequestFactory;
	private JobQueueGroup $jobQueueGroup;

	private LoggerInterface $logger;
	private BagOStuff $objectCache;

	public function __construct(
		Config $config,
		HttpRequestFactory $httpRequestFactory,
		JobQueueGroup $jobQueueGroup
	) {
		$this->config = $config;
		$this->httpRequestFactory = $httpRequestFactory;
		$this->jobQueueGroup = $jobQueueGroup;

		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
		$this->objectCache = WikiLambdaServices::getZObjectStash();
	}

	/**
	 * Register {{#function:…}} as a wikitext parser function to trigger function evaluation.
	 *
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/ParserFirstCallInit
	 *
	 * @param Parser $parser
	 */
	public function onParserFirstCallInit( $parser ) {
		if ( $this->config->get( 'WikiLambdaEnableClientMode' ) ) {
			// TODO (T373253): Enable this in new DOM-style with Parsoid's registry, somehow
			$parser->setFunctionHook( 'function', [ $this, 'parserFunctionCallback' ], Parser::SFH_OBJECT_ARGS );
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/PageSaveComplete
	 *
	 * @param WikiPage $wikiPage
	 * @param UserIdentity $user
	 * @param string $summary
	 * @param int $flags
	 * @param RevisionRecord $revisionRecord
	 * @param EditResult $editResult
	 * @return bool|void
	 */
	public function onPageSaveComplete(
		$wikiPage,
		$user,
		$summary,
		$flags,
		$revisionRecord,
		$editResult
	) {
		if ( !$this->config->get( 'WikiLambdaEnableClientMode' ) ) {
			// Nothing for us to do.
			return;
		}

		// We use this hook to clear out cached tracking of Wikifunctions calls, if any.
		$wikifunctionsClientStore = WikiLambdaServices::getWikifunctionsClientStore();
		$wikifunctionsClientStore->deleteWikifunctionsUsage( $wikiPage->getTitle() );
	}

	/**
	 * @param Parser $parser
	 * @param PPFrame $frame
	 * @param array $args
	 * @return array
	 */
	public function parserFunctionCallback( Parser $parser, $frame, $args = [] ) {
		// TODO (T362251): Turn $args into the request more properly, in a way that doesn't blindly trim strings.
		$cleanupInput = static function ( $input ) use ( $frame ) {
			return trim( Sanitizer::decodeCharReferences( $frame->expand( $input ) ) );
		};

		// Get the arguments from the wikitext with the HTML entities decoded and with whitespace trimmed.
		// E.g.:
		// * given an input of `{{#function:Z802 | Z41 | h&eacute;llõ |   1234}}`, $cleanedArgs will be:
		//   [ 'Z802', 'héllõ', '1234' ]
		// * given an input of `{{#function:Z802|Z41|hello|1234|renderlang=es}}`, $cleanedArgs will be:
		//   [ 'Z802', 'hello', '1234', 'renderlang' => 'es' ]
		$cleanedArgs = [];
		foreach ( $args as $index => $arg ) {
			// Extract only the value
			$splitArg = explode( '=', $cleanupInput( $arg ), 2 );
			if ( count( $splitArg ) === 2 ) {
				$cleanedArgs[ $splitArg[0] ] = $splitArg[1];
			} else {
				$cleanedArgs[ $index ] = $splitArg[0];
			}
		}

		// Get the target function from the first argument.
		// e.g. given an input of `{{#function:Z802|Z41|héllõ|1234}}`, $cleanedArgs[0] will be: 'Z802'
		$targetFunction = $cleanedArgs[0];

		// Parse and render languages are set to the parser's target language for the context by default.
		$parseLang = $parser->getTargetLanguage()->getCode();
		$renderLang = $parser->getTargetLanguage()->getCode();
		// Allow users to specify language in-line, e.g. if you want something copy-pastable
		// or to demonstrate content in different languages. This is expected to be primarily useful for
		// multi-lingual wikis.
		if ( array_key_exists( 'parselang', $cleanedArgs ) ) {
			$parseLang = $cleanedArgs['parselang'];
			unset( $cleanedArgs['parselang'] );
		}
		if ( array_key_exists( 'renderlang', $cleanedArgs ) ) {
			$parseLang = $cleanedArgs['renderlang'];
			unset( $cleanedArgs['renderlang'] );
		}

		// Convert the raw unnamed arguments into the keys for the function call.
		// e.g. given an input of `{{#function:Z802|Z41|hello|1234}}`, $arguments will be:
		// [ 'Z802K1' => 'Z41', 'Z802K2' => 'hello', 'Z802K3' => '1234' ]
		$unkeyedArguments = array_slice( $cleanedArgs, 1 );
		$arguments = [];
		foreach ( $unkeyedArguments as $key => $value ) {
			if ( !is_int( $key ) ) {
				// Ignore any other named arguments:
				// E.g. {{#function:Z10000|Hello|World|bad=argument|foo=bar}}
				continue;
			}
			$arguments[$targetFunction . 'K' . ( $key + 1 )] = $value;
		}

		// On Wikibase client wikis, loop over each argument, in case it's a Wikidata item reference,
		// and mark us as a user of said item if so.
		if ( ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			$wikibaseEntityParser = \Wikibase\Client\WikibaseClient::getEntityIdParser();

			foreach ( $arguments as $key => $value ) {
				if (
					ZObjectUtils::isValidId( $value )
					// Short-cut to skip ZObject references which are Wikidata-esque
					&& !ZObjectUtils::isValidZObjectReference( $value )
				) {
					try {
						// Convert the string into a Wikidata `EntityId`
						$itemId = $wikibaseEntityParser->parse( $value );
						\Wikibase\Client\WikibaseClient::getUsageAccumulatorFactory()
							->newFromParser( $parser )
							// TODO (T385631): Only track some usage, somehow?
							->addAllUsage( $itemId );
					} catch ( \Wikibase\DataModel\Entity\EntityIdParsingException $error ) {
						// Not a valid Wikidata reference, so treat as a string.
					}
				}
			}
		}

		// (T362256): Cache in memcached on the client side code here, rather than only at the server side.
		$clientCacheKey = $this->objectCache->makeKey(
			'WikiLambdaClientFunctionCall',
			// Note that we can't use ZObjectUtils::makeCacheKeyFromZObject here, as that's repo-mode only.
			// This means that this cache key doesn't have the revision IDs of the referenced ZObjects.
			json_encode( [
				'target' => $targetFunction,
				'arguments' => $arguments,
				'parseLang' => $parseLang,
				'renderLang' => $renderLang
			] )
		);

		// Schedule a job to update the usage tracking to say that we use this function on this page.
		// We clear out the tracking each time the page is saved, via onPageSaveComplete above.
		$usageJob = new WikifunctionsUsageUpdateJob( [
			'targetFunction' => $targetFunction,
			'targetPage' => $frame->getTitle()
		] );
		$this->jobQueueGroup->lazyPush( $usageJob );

		// TODO (T362254): Implement some timeout mechanism here?
		try {
			$ret = $this->objectCache->getWithSetCallback(
				$clientCacheKey,
				$this->objectCache::TTL_WEEK,
				function () use ( $targetFunction, $arguments, $parseLang, $renderLang ) {
					return $this->remoteCall( $targetFunction, $arguments, $parseLang, $renderLang );
				}
			);
		} catch ( WikifunctionCallException $callException ) {
			$error = $callException->getErrorMessageKey();

			$parser->addTrackingCategory( $error . '-category' );

			// TODO (T385633): This is rather messily entangled between client and server. Can we do better?
			if ( $error === 'wikilambda-functioncall-error-nonstringinput' ) {
				$nonStringArgument = $callException->getZError()->getZValue()[1];
				$nonStringArgumentType = $callException->getZError()->getZValue()[2];
				return [
					Html::errorBox(
						wfMessage(
							$error,
							$targetFunction,
							$nonStringArgument,
							$nonStringArgumentType
						)->parseAsBlock()
					),
					'noparse' => true,
					'isHTML' => true
				];
			}

			return [
				Html::errorBox( wfMessage( $error, $targetFunction )->parseAsBlock() ),
				'noparse' => true,
				'isRawHTML' => true
			];
		} catch ( ZErrorException $zerror ) {
			$this->logger->error(
				__METHOD__ . ' threw an ZErrorException we don\'t know how to handle: {zerror}',
				[
					'zerror' => $zerror->getZErrorMessage(),
					'exception' => $zerror
				]
			);
			// TODO (T385629): Different tracking for this and below?
			// Uses message wikilambda-functioncall-error-category-desc implicitly.
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-category' );
			$errorMessage = $zerror->getZError()->getMessage( $renderLang );
			$ret = Html::errorBox(
				wfMessage( 'wikilambda-functioncall-error', $errorMessage )->parseAsBlock()
			);
		} catch ( \Throwable $th ) {
			$this->logger->error(
				__METHOD__ . ' threw an Exception we didn\'t recognise: {error}',
				[
					'error' => $th->getMessage(),
					'exception' => $th
				]
			);
			// Uses message wikilambda-functioncall-error-category-desc implicitly.
			$parser->addTrackingCategory( 'wikilambda-functioncall-error-category' );
			// Something went wrong elsewhere; no nice translatable ZError to show, sadly.
			$errorMessage = $th->getMessage();

			$ret = Html::errorBox(
				wfMessage( 'wikilambda-functioncall-error', $errorMessage )->parseAsBlock()
			);
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
	 *
	 * @param string $target The ZID of the function to call
	 * @param string[] $arguments The function call parameters
	 * @param string $parseLanguageCode The language code in which to parse inputs, e.g. 'de'
	 * @param string $renderLanguageCode The language code in which to render outputs, e.g. 'fr'
	 */
	private function remoteCall(
		string $target,
		array $arguments,
		string $parseLanguageCode,
		string $renderLanguageCode
	): array {
		$request = $this->buildRequest( $target, $arguments, $parseLanguageCode, $renderLanguageCode );
		$responseStatus = $request->execute();

		// Http 0: Request didn't fly
		$httpStatusCode = $request->getStatus();
		if ( $httpStatusCode === 0 ) {
			throw new WikifunctionCallException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
					[ "message" => $responseStatus->getMessages()[0]->getKey() ]
				),
				// Triggers use of messages:
				// * wikilambda-functioncall-error-category
				// * wikilambda-functioncall-error-category-desc
				'wikilambda-functioncall-error'
			);
		}

		// Http 200: Response successful
		$response = json_decode( $request->getContent() );
		if ( $responseStatus->isOK() ) {
			return [
				$response->value,
				/* Force content to be escaped */
				'nowiki'
			];
		}

		// If not OK, process error responses:
		// If errorKey is 'wikilambda-zerror', extract ZError and ZError code
		$zerror = null;
		$zerrorCode = null;
		if ( property_exists( $response, 'errorKey' ) && $response->errorKey === 'wikilambda-zerror' ) {
			$zerror = ZObjectFactory::create( $response->errorData->zerror );
			'@phan-var ZError $zerror';
			$zerrorCode = $zerror->getZErrorType();
		} else {
			$zerror = ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[ "message" => $response->httpReason ]
			);
			// Triggers use of messages:
			// * wikilambda-functioncall-error-unknown-category
			// * wikilambda-functioncall-error-unknown-category-desc
			throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error-unclear' );
		}

		switch ( $httpStatusCode ) {
			// "We" did something wrong (likely user error in the wikitext, or in the on-wiki content on WF.org)
			case 400:
			case 404:
				switch ( $zerrorCode ) {
					case ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND:
						// Triggers use of messages:
						// * wikilambda-functioncall-error-unknown-category
						// * wikilambda-functioncall-error-unknown-category-desc
						throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error-unknown' );

					case ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED:
						switch ( $response->mode ) {
							case 'output':
								// Triggers use of messages:
								// * wikilambda-functioncall-error-nonstringoutput-category
								// * wikilambda-functioncall-error-nonstringoutput-category-desc
								throw new WikifunctionCallException(
									$zerror,
									'wikilambda-functioncall-error-nonstringoutput'
								);

							case 'input':
								// Triggers use of messages:
								// * wikilambda-functioncall-error-nonstringinput-category
								// * wikilambda-functioncall-error-nonstringinput-category-desc
								throw new WikifunctionCallException(
									$zerror,
									'wikilambda-functioncall-error-nonstringinput'
								);
							default:
								// Triggers use of messages:
								// * wikilambda-functioncall-error-invalid-zobject-category
								// * wikilambda-functioncall-error-invalid-zobject-category-desc
								throw new WikifunctionCallException(
									$zerror,
								'wikilambda-functioncall-error-invalid-zobject'
							);
						}

					case ZErrorTypeRegistry::Z_ERROR_UNKNOWN:
					case ZErrorTypeRegistry::Z_ERROR_ARGUMENT_COUNT_MISMATCH:
					case ZErrorTypeRegistry::Z_ERROR_ARGUMENT_TYPE_MISMATCH:
					case ZErrorTypeRegistry::Z_ERROR_LANG_NOT_FOUND:
						// Triggers use of messages:
						// * wikilambda-functioncall-error-nonfunction-category
						// * wikilambda-functioncall-error-nonfunction-category-desc
						throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error-invalid-zobject' );

					default:
						// Non zerror, or Unknown zerror:
						$this->logger->error(
							__METHOD__ . ' encountered a {$httpStatusCode} HTTP error with an unknown zerror',
							[
								'zerror' => $zerror->getSerialized(),
								'zerrorCode' => $zerrorCode,
								'httpStatusCode' => $httpStatusCode,
								'response' => $response
							]
						);
				}
				// Fallback to default handling, below.
				break;

			// Something went wrong in the server's code (not user-written code or user error)
			case 500:
			case 501:
				switch ( $zerrorCode ) {
					case ZErrorTypeRegistry::Z_ERROR_EVALUATION:
						// Triggers use of messages:
						// * wikilambda-functioncall-error-category
						// * wikilambda-functioncall-error-category-desc
						throw new WikifunctionCallException( $zerror, 'wikilambda-functioncall-error' );

					default:
						$this->logger->error(
							__METHOD__ . ' encountered a {$httpStatusCode} HTTP error with an unknown zerror',
							[
								'zerror' => $zerror->getSerialized(),
								'zerrorCode' => $zerrorCode,
								'httpStatusCode' => $httpStatusCode,
								'response' => $response
							]
						);
						// Fall-back to default handling, below.
						break;
				}
				break;

			default:
				$this->logger->warning(
					__METHOD__ . ' encountered an unknown HTTP error code',
					[
						'zerror' => $zerror->getSerialized(),
						'zerrorCode' => $zerrorCode,
						'httpStatusCode' => $httpStatusCode,
						'response' => $response
					]
				);
				// Fall-back to default handling, below.
				break;
		}
		throw new WikifunctionCallException(
			ZErrorFactory::createZErrorInstance(
				ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
				[ "message" => 'Something happened, but details weren\'t passed on' ]
			),
			// Triggers use of messages:
			// * wikilambda-functioncall-error-category
			// * wikilambda-functioncall-error-category-desc
			'wikilambda-functioncall-error'
		);
	}

	private function buildRequest( string $target, array $args, string $parseLang, string $renderLang ): MWHttpRequest {
		// This is a slightly hacky way to ensure that user inputs are transmit-safe, and that e.g.
		// inputs with '|'s in them can be ferried across the network without
		$encodedArguments = implode(
			'|',
			array_map( static fn ( $val ): string => base64_encode( $val ), $args )
		);

		$requestUri = $this->getClientTargetUrl()
			. $this->config->get( 'RestPath' )
			. '/wikifunctions/v0/call'
			. '/' . $target
			. '/' . $encodedArguments
			. '/' . $parseLang
			. '/' . $renderLang;

		// HttpRequestFactory->create() returns GuzzleHttpRequest (extends MWHttpRequest):
		// https://doc.wikimedia.org/mediawiki-core/master/php/classGuzzleHttpRequest.html
		// https://doc.wikimedia.org/mediawiki-core/master/php/classMWHttpRequest.html
		$request = $this->httpRequestFactory->create( $requestUri, [ 'method' => 'GET' ], __METHOD__ );

		return $request;
	}

	/**
	 * @param array &$vars
	 * @param OutputPage $out
	 */
	public function onMakeGlobalVariablesScript( &$vars, $out ): void {
		// Client mode is disabled, no foreign Wikifunctions url to add:
		if ( !$this->config->get( 'WikiLambdaEnableClientMode' ) ) {
			return;
		}
		// Repo mode is enabled, no foreign Wikifunctions url to add:
		if ( $this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			return;
		}
		// Pass targetUri onto JavaScript vars
		$vars['wgWikifunctionsBaseUrl'] = $this->getClientTargetUrl();
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/ResourceLoaderRegisterModules
	 *
	 * @param ResourceLoader $resourceLoader
	 * @return void
	 */
	public function onResourceLoaderRegisterModules( ResourceLoader $resourceLoader ): void {
		// TODO (T386013): Once client mode is always enabled, register this statically in extension.json
		// via the ResourceModules definition.

		if (
			$this->config->get( 'WikiLambdaEnableClientMode' )
			&& ExtensionRegistry::getInstance()->isLoaded( 'VisualEditor' )
		) {
			$directoryName = __DIR__ . '/../../resources/ext.wikilambda.visualeditor';

			$files = [
				've.init.mw.WikifunctionsCall.js',
				've.dm.WikifunctionsCallNode.js',
				've.ce.WikifunctionsCallNode.js',
				've.ui.WikifunctionsCallContextItem.js',
				've.ui.WikifunctionsCallDialogTool.js',
				've.ui.WikifunctionsCallDialog.js',
			];

			array_push( $files, [
				'name' => 'init.js',
				'main' => true,
				'content' => array_reduce( $files, static function ( $carry, $file ) {
					return "$carry\nrequire('./$file');\n";
				}, '' ),
			] );

			$visualEditorWfConfig = [
				'dependencies' => [
					'ext.visualEditor.mwcore',
					'ext.visualEditor.mwtransclusion',
					'oojs-ui.styles.icons-editing-functions',
				],
				'localBasePath' => $directoryName,
				'remoteExtPath' => 'WikiLambda/resources',
				'packageFiles' => $files,
				'messages' => [
					'wikilambda-suggested-functions.json',
					'wikilambda-visualeditor-wikifunctionscall-title',
					'wikilambda-visualeditor-wikifunctionscall-popup-loading',
					'wikilambda-visualeditor-wikifunctionscall-popup-no-function',
					'wikilambda-visualeditor-wikifunctionscall-dialog-search-placeholder',
					'wikilambda-visualeditor-wikifunctionscall-dialog-search-results-title',
					'wikilambda-visualeditor-wikifunctionscall-dialog-suggested-functions-title',
					'wikilambda-visualeditor-wikifunctionscall-dialog-search-no-results',
					'wikilambda-visualeditor-wikifunctionscall-dialog-string-input-placeholder',
					'wikilambda-visualeditor-wikifunctionscall-dialog-function-link-footer',
					'wikilambda-visualeditor-wikifunctionscall-error-bad-function',
				]
			];

			$resourceLoader->register( 'ext.wikilambda.visualeditor', $visualEditorWfConfig );
		}
	}

	/**
	 * Return the Url of the Wikilambda server instance,
	 * and if not available in the configuration variables,
	 * returns an empty string and logs an error.
	 *
	 * @return string
	 */
	private function getClientTargetUrl(): string {
		$targetUrl = $this->config->get( 'WikiLambdaClientTargetAPI' );
		if ( !$targetUrl ) {
			$this->logger->error( __METHOD__ . ': missing configuration variable WikiLambdaClientTargetAPI' );
		}
		return $targetUrl ?? '';
	}
}
