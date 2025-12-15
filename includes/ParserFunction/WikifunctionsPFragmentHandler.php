<?php

/**
 * WikiLambda extension Parsoid handler for our parser function
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ParserFunction;

use MediaWiki\Config\Config;
use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientRequestJob;
use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientUsageUpdateJob;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikifunctionsClientStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Html\Html;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\WikiMap\WikiMap;
use Psr\Log\LoggerInterface;
use Wikimedia\Parsoid\Ext\Arguments;
use Wikimedia\Parsoid\Ext\ParsoidExtensionAPI;
use Wikimedia\Parsoid\Ext\PFragmentHandler;
use Wikimedia\Parsoid\Fragments\HtmlPFragment;
use Wikimedia\Parsoid\Fragments\PFragment;
use Wikimedia\Stats\Metrics\NullMetric;
use Wikimedia\Stats\Metrics\TimingMetric;

class WikifunctionsPFragmentHandler extends PFragmentHandler {

	private Config $config;
	private JobQueueGroup $jobQueueGroup;
	private HttpRequestFactory $httpRequestFactory;

	/**
	 * @var WikifunctionsClientStore (but not explicitly typed, as this is a service mocked in tests)
	 */
	private $wikifunctionsClientStore;
	private LoggerInterface $logger;
	/**
	 * @var TimingMetric|NullMetric (might be a NullMetric in some circumstances)
	 */
	private $statsFactoryTimer;

	public function __construct(
		Config $config,
		JobQueueGroup $jobQueueGroup,
		HttpRequestFactory $httpRequestFactory
	) {
		$this->config = $config;
		$this->jobQueueGroup = $jobQueueGroup;
		$this->httpRequestFactory = $httpRequestFactory;

		$this->wikifunctionsClientStore = WikiLambdaServices::getWikifunctionsClientStore();
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );

		$this->statsFactoryTimer = MediaWikiServices::getInstance()->getStatsFactory()
			// Will end up as 'mediawiki.WikiLambdaClient.parsoid_to_fragment_handler_seconds{response=…}'
			->withComponent( 'WikiLambdaClient' )
			->getTiming( 'parsoid_to_fragment_handler_seconds' )
			->setLabel( 'wiki', WikiMap::getCurrentWikiId() );
	}

	/**
	 * @inheritDoc
	 */
	public function sourceToFragment( ParsoidExtensionAPI $extApi, Arguments $callArgs, bool $tagSyntax ) {
		$this->statsFactoryTimer->start();

		// Note: We can't hint this as `: PFragment|AsyncResult` as we're still in PHP 7.4-land
		// If client mode isn't enabled on this wiki, there's nothing to do, just show an error message
		if ( !$this->config->get( 'WikiLambdaEnableClientMode' ) ) {
			// TODO: Make this a proper error box or inline error.
			$errorMsgString = wfMessage(
				'wikilambda-functioncall-error-message',
				[
					wfMessage( 'wikilambda-functioncall-error-disabled' )->text()
				]
			)->text();

			$this->statsFactoryTimer->setLabel( 'response', 'disabled' )->stop();
			return WikifunctionsPFragment::newFromLiteral( $errorMsgString, null );
		}

		// Extract arguments:
		$expansion = $this->extractWikifunctionCallArguments( $extApi, $callArgs );

		// Fill empty arguments with default values:
		$expansion = $this->fillEmptyArgsWithDefaultValues( $extApi, $expansion );

		// On Wikibase client wikis, loop over each argument, in case it's a Wikidata item reference,
		// and mark us as a user of said item if so. Doing this after default value filling, in case
		// the default value ends up being a Wikidata item reference (e.g. item for current page).
		if ( ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
			// Note: An absolute reference to avoid CI issues with references to unknown classes.
			$wikibaseEntityParser = \Wikibase\Client\WikibaseClient::getEntityIdParser();

			$parserOutputProvider = new ParsoidWrappingParserOutputProvider( $extApi->getMetadata() );
			$usageAccumulator = \Wikibase\Client\WikibaseClient::getUsageAccumulatorFactory()
				->newFromParserOutputProvider( $parserOutputProvider );

			foreach ( $expansion['arguments'] as $key => $value ) {
				if (
					ZObjectUtils::isValidId( $value )
					// Short-cut to skip ZObject references which are Wikidata-esque
					&& !ZObjectUtils::isValidZObjectReference( $value )
				) {
					try {
						// Convert the string into a Wikidata `EntityId`
						$itemId = $wikibaseEntityParser->parse( $value );

						// TODO (T385631): Only track some usage, somehow?
						$usageAccumulator->addAllUsage( $itemId );

					} catch ( \Wikibase\DataModel\Entity\EntityIdParsingException ) {
						// Not a valid Wikidata reference (e.g. "X123"), so treat as a string.
					}
				}
			}
		}

		$this->logger->debug(
			'WikiLambda client call made for {function} on {page}',
			[
				'function' => $expansion['target'],
				'page' => $extApi->getPageConfig()->getLinkTarget()->__toString()
			]
		);

		// (T362256): This is the key we use to cache on the client wiki code here, rather than only at the repo wiki.
		$clientCacheKey = $this->wikifunctionsClientStore->makeFunctionCallCacheKey( $expansion );

		// Schedule a job to update the usage tracking to say that we use this function on this page.
		// We clear out the tracking each time the page is saved, via onPageSaveComplete above.

		// FIXME: This will run whether or not we're a saved edit, or just a stash/edit preview. Fix by moving
		// to page properties, which are only stored for the current revision?
		$usageJob = new WikifunctionsClientUsageUpdateJob( [
			'targetFunction' => $expansion['target'],
			'targetPageText' => $extApi->getPageConfig()->getLinkTarget()->getDBkey(),
			'targetPageNamespace' => $extApi->getPageConfig()->getLinkTarget()->getNamespace()
		] );
		$this->jobQueueGroup->lazyPush( $usageJob );

		// Set a special flag on the page, so that we can track usage of pages with at least one function call.
		$extApi->getMetadata()->setExtensionData( 'wikilambda', 'present' );

		// (Temporarily not done, as it doesn't seem we need it immediately.)
		// Add our special styles to the page, we know they're likely to be used somewhere
		// $extApi->getMetadata()->appendOutputStrings(
		// 	\MediaWiki\Parser\ParserOutputStringSets::MODULE_STYLE,
		// 	[ 'ext.wikilambda.client.styles' ]
		// );

		$cachedValue = $this->wikifunctionsClientStore->fetchFromFunctionCallCache( $clientCacheKey );

		if ( $cachedValue ) {
			// Good news, this request has already been cached; examine what it is

			if ( $cachedValue['success'] === true ) {
				// It was a successful run!
				// If output type is Z89, return as HTML fragment;
				if (
					isset( $cachedValue['type'] )
					&& $cachedValue['type'] === ZTypeRegistry::Z_HTML_FRAGMENT
				) {
					if ( $this->config->get( 'WikifunctionsEnableHTMLOutput' ) ) {
						$this->statsFactoryTimer->setLabel( 'response', 'cached' )->stop();
						$html = $this->getSanitisedHtmlFragment( $cachedValue['value'] ?? '' );
						return HtmlPFragment::newFromHtmlString( $html, null );
					} else {
						$this->statsFactoryTimer->setLabel( 'response', 'cachedError' )->stop();
						return $this->createErrorfulFragment(
							$extApi,
							'wikilambda-functioncall-error-nonstringoutput'
						);
					}
				}
				// Otherwise, return as literal
				$this->statsFactoryTimer->setLabel( 'response', 'cached' )->stop();
				return WikifunctionsPFragment::newFromLiteral( $cachedValue['value'] ?? '', null );
			}

			// It failed for some reason; show the error message instead
			$errorMessageKey = $cachedValue['errorMessageKey'];

			$extApi->addTrackingCategory( $errorMessageKey . '-category' );

			$this->logger->info(
				'WikiLambda client request failed, returned {error} for request to {targetFunction} on {page}',
				[
					'error' => $errorMessageKey,
					'targetFunction' => $expansion['target'],
					'page' => $extApi->getPageConfig()->getLinkTarget()->__toString()
				]
			);

			// Load ext.wikilambda.inlineerrors css
			$extApi->getMetadata()->appendOutputStrings(
				// @phan-suppress-next-line PhanTypeMismatchArgumentReal Parsoid's type hint should be updated
				\MediaWiki\Parser\ParserOutputStringSets::MODULE,
				[ 'ext.wikilambda.inlineerrors' ]
			);

			$this->statsFactoryTimer->setLabel( 'response', 'cachedError' )->stop();

			return $this->createErrorfulFragment( $extApi, $errorMessageKey );
		}

		// At this point, we know our request hasn't yet been stored in the cache, so we need to trigger it,
		// and return a placeholder for now

		$this->logger->info(
			'WikiLambda client request was uncached for request to {targetFunction} on {page}',
			[
				'targetFunction' => $expansion['target'],
				'page' => $extApi->getPageConfig()->getLinkTarget()->__toString()
			]
		);

		// Check if SRE have set this wiki (probably all wikis) temporarily to not try to use Wikifunctions.
		if ( $this->config->get( 'WikiLambdaClientModeOffline' ) ) {
			$this->statsFactoryTimer->setLabel( 'response', 'offline' )->stop();
			return HtmlPFragment::newFromHtmlString( Html::errorBox(
				wfMessage( 'wikilambda-fragment-disabled' )->text()
			), null );
		}

		// This job triggers the request, will store the result in the cache. We don't pass in the location of
		// the usage, as that's the responsibility of this class (to add tracking categories etc.) or of Parsoid
		// (to purge the page once our fragment is available etc.).
		$renderJob = new WikifunctionsClientRequestJob( [
			'request' => $expansion,
			'clientCacheKey' => $clientCacheKey,
		] );
		$this->jobQueueGroup->lazyPush( $renderJob );

		// As we're async, return a "sorry, no content yet" fragment
		$this->statsFactoryTimer->setLabel( 'response', 'pending' )->stop();
		return new WikifunctionsPendingFragment(
			$extApi->getPageConfig()->getPageLanguageBcp47(), null
		);
	}

	/**
	 * Sets empty arguments with their default value (if available)
	 *
	 * @param ParsoidExtensionAPI $extApi
	 * @param array $functionCall
	 * @return array
	 */
	private function fillEmptyArgsWithDefaultValues( ParsoidExtensionAPI $extApi, array $functionCall ): array {
		// 1. See if there's an empty string arg
		// 2. If there's any:
		//  2.1. fetch Function Zid from Memcached
		//  2.2. fetch Function Zid from Wikifunctions
		//  2.3. look into the argument key
		//  2.4. check if it has a default value callback
		//  2.5. generate default value
		// 3. Then proceed, with new arg set for cache key, etc.
		foreach ( $functionCall[ 'arguments' ] as $argKey => $argValue ) {
			// If argValue is not empty, continue
			if ( $argValue !== '' ) {
				continue;
			}

			// 2.1. Fetch Function Zid from Memcached
			$zobject = $this->wikifunctionsClientStore->fetchFromZObjectCache( $functionCall[ 'target' ] );
			if ( !$zobject ) {
				// 2.2. Fetch Function Zid from Wikifunctions
				$this->logger->info(
					__METHOD__ . ' cache miss while fetching {zid} for empty argument {arg}, falling back to API',
					[
						'zid' => $functionCall[ 'target' ],
						'arg' => $argKey
					]
				);
				$zobject = $this->fetchFunctionFromWikifunctionsApi( $functionCall[ 'target' ], $argKey );
			}

			// If function is not found, return on first iteration:
			if ( !$zobject ) {
				return $functionCall;
			}

			// If object is not a function, return on first iteration:
			$function = $zobject[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ];
			if ( $function[ ZTypeRegistry::Z_OBJECT_TYPE ] !== ZTypeRegistry::Z_FUNCTION ) {
				return $functionCall;
			}

			// 2.3. Get argument type zid
			$args = array_slice( $function[ ZTypeRegistry::Z_FUNCTION_ARGUMENTS ], 1 );
			$matches = array_filter( $args, static function ( $item ) use ( $argKey ) {
				return isset( $item[ ZTypeRegistry::Z_ARGUMENTDECLARATION_ID ] ) &&
					$item[ ZTypeRegistry::Z_ARGUMENTDECLARATION_ID ] === $argKey;
			} );
			$arg = reset( $matches ) ?: null;

			// If argKey is not found, continue
			if ( !$arg ) {
				continue;
			}

			$argType = $arg[ ZTypeRegistry::Z_ARGUMENTDECLARATION_TYPE ];

			// 2.4. Check if the argument type has a default value callback defined
			if ( is_string( $argType ) && WikifunctionsCallDefaultValues::hasDefaultValueCallback( $argType ) ) {
				$defaultValueCallback = WikifunctionsCallDefaultValues::getDefaultValueForType( $argType );
				$defaultValueContext = [
					'contentMetadataCollector' => $extApi->getMetadata(),
					'linkTarget' => $extApi->getPageConfig()->getLinkTarget(),
					'pageLanguage' => $extApi->getPageConfig()->getPageLanguageBcp47()->toBcp47Code(),
				];
				// 2.5. Generate the default value
				$functionCall[ 'arguments' ][ $argKey ] = $defaultValueCallback( $defaultValueContext );
			}
		}

		return $functionCall;
	}

	/**
	 * Requests the given function Zid from the Wikifunctions ActionAPI.
	 * Returns null if the function Zid is not found.
	 *
	 * @param string $zid
	 * @param string $argKey
	 * @return ?array
	 */
	private function fetchFunctionFromWikifunctionsApi( $zid, $argKey ): ?array {
		$requestParams = [
			'action' => 'wikilambda_fetch',
			'format' => 'json',
			'zids' => $zid,
			'formatversion' => 2,
		];
		$baseUrl = WikifunctionsClientRequestJob::getClientTargetUrl( $this->config, $this->logger );
		$apiUrl = wfAppendQuery( $baseUrl . wfScript( 'api' ), $requestParams );
		$request = $this->httpRequestFactory->create( $apiUrl, [ 'method' => 'GET' ], __METHOD__ );

		if ( !$request ) {
			$this->logger->error(
				__METHOD__ . ' failed to create a request to {url}',
				[
					'url' => $apiUrl
				]
			);
			return null;
		}

		// Execute request:
		$status = $request->execute();
		$response = json_decode( $request->getContent() );

		// Failed request:
		if ( !$response || !$status->isOK() ) {
			$httpStatusCode = $request->getStatus();
			$this->logger->warning(
				__METHOD__ . ' received error {status} while fetching {zid} for empty argument {arg}: {request}',
				[
					'status' => $httpStatusCode,
					'zid' => $zid,
					'arg' => $argKey,
					'request' => $request->getFinalUrl()
				]
			);
			return null;
		}

		// Successful request:
		$json = json_decode( $response->{ $zid }->wikilambda_fetch, true );
		if ( !$json ) {
			$this->logger->warning(
				__METHOD__ . ' failed parsing the Json response to fetching	{zid} for empty argument {arg}: {request}',
				[
					'zid' => $zid,
					'arg' => $argKey,
					'request' => $request->getFinalUrl()
				]
			);
		}

		// Return successfully parsed Json or null
		return $json;
	}

	/**
	 * Extracts the arguments from the wikitext and turn it into the request we'll need
	 *
	 * @param ParsoidExtensionAPI $extApi
	 * @param Arguments $arguments
	 */
	private function extractWikifunctionCallArguments( $extApi, $arguments ): array {
		// Get the arguments from the wikitext with the HTML entities decoded and with whitespace trimmed.
		// E.g.:
		// * unnamed arguments:
		//   given an input of `{{#function:Z802 | Z41 | h&eacute;llõ |   1234}}`
		//   $cleanedArgs will be: [ 'Z802', 'héllõ', '1234' ]
		// * named arguments (renderlang and parselang):
		//   given an input of `{{#function:Z802|Z41|hello|1234|renderlang=es}}`
		//   $cleanedArgs will be: [ 'Z802', 'hello', '1234', 'renderlang=es' ]
		// * trim all arguments except when arg is all whitespaces:
		//   given an input of ``{{#function:Z15175| hello |world | }}
		//   $cleanedArgs will be [ 'Z15175', 'hello', 'world', ' ' ]

		// First call to getOrderedArgs with trim=false to find the only-whitespace arguments:
		$rawArgs = $arguments->getOrderedArgs( $extApi, false );
		$isOnlyWhitespace = array_map( static function ( $v ) use ( $extApi ) {
			return trim( $v->toRawText( $extApi ) ) !== '';
		}, array_values( $rawArgs ) );

		// TODO (T390344): Switch to getNamedArgs() once Parsoid supports that
		// All arguments are expanded and trimmed, except for those which are just a whitespace
		$cleanedArgs = $arguments->getOrderedArgs( $extApi, $isOnlyWhitespace );

		// Parse and render languages are set to Parsoid's page target language by default.
		$parseLang = $extApi->getPageConfig()->getPageLanguageBcp47()->toBcp47Code();
		$renderLang = $parseLang;

		// We allow users to specify language in-line, e.g. if you want something copy-pastable
		// or to demonstrate content in different languages. This is expected to be primarily useful for
		// multi-lingual wikis.
		// TODO (T390344): This won't work for now, we we only have ordered arguments, not named ones.
		// if ( array_key_exists( 'parselang', $cleanedArgs ) && $cleanedArgs['parselang'] instanceof PFragment ) {
		// 	$parseLang = $cleanedArgs['parselang']->killMarkers();
		// }
		// if ( array_key_exists( 'renderlang', $cleanedArgs ) && $cleanedArgs['renderlang'] instanceof PFragment ) {
		// 	$renderLang = $cleanedArgs['renderlang']->killMarkers();
		// }

		// Get the target function from the first argument.
		// e.g. given an input of `{{#function:Z802|Z41|héllõ|1234}}`, $cleanedArgs[0] will be: 'Z802'
		$targetFunction = $cleanedArgs[0]->killMarkers();

		// Convert the raw unnamed arguments into the keys for the function call.
		// e.g. given an input of `{{#function:Z802|Z41|hello|1234}}`, $arguments will be:
		// [ 'Z802K1' => 'Z41', 'Z802K2' => 'hello', 'Z802K3' => '1234' ]
		$unkeyedArguments = array_slice( $cleanedArgs, 1 );
		$arguments = [];
		foreach ( $unkeyedArguments as $key => $value ) {
			if ( !( $value instanceof PFragment ) ) {
				// Ignore any non-PFragment arguments that have somehow snuck in (probably nulls?)
				continue;
			}

			$valueText = $this->convertPFragmentToZFunctionCallParameter( $value, $extApi );
			$argKey = $targetFunction . 'K' . ( $key + 1 );

			// named argument (e.g. 1=hello, foo=bar, renderlang=en)
			if ( strpos( $valueText, '=' ) !== false ) {
				$argKeyParts = explode( '=', $valueText, 2 );
				// key is not numeric:
				// * renderlang=es (save as $renderLang)
				// * parselang=es (save as $parseLang)
				// * any=other (ignore)
				if ( !is_numeric( $argKeyParts[0] ) ) {
					if ( $argKeyParts[0] === 'parselang' ) {
						$parseLang = $argKeyParts[1];
					} elseif ( $argKeyParts[0] === 'renderlang' ) {
						$renderLang = $argKeyParts[1];
					}
					continue;
				}
				// key is numeric:
				// * trust the key, keep the value
				$argKey = $targetFunction . 'K' . $argKeyParts[0];
				$valueText = $argKeyParts[1];
			}

			$arguments[$argKey] = $valueText;
		}

		return [
			'target' => $targetFunction,
			'arguments' => $arguments,
			'parseLang' => $parseLang,
			'renderLang' => $renderLang
		];
	}

	/**
	 * Coerce an PFragment into a string to be used as a parameter in the ZObject function call.
	 *
	 * For now this is a trivial conversion, but in the future we may want to do smarter things (e.g. for
	 * whitespace handling, see T362251).
	 *
	 * @param PFragment $value
	 * @param ParsoidExtensionAPI $extApi
	 * @return string
	 */
	private function convertPFragmentToZFunctionCallParameter( PFragment $value, ParsoidExtensionAPI $extApi ): string {
		return $value->toRawText( $extApi );
	}

	/**
	 * Decode and sanitise a possibly JSON-encoded HTML fragment string.
	 *
	 * @param string $value
	 * @return string
	 */
	private function getSanitisedHtmlFragment( string $value ): string {
		$html = $this->decodeHtmlFragmentValue( $value );
		return WikifunctionsPFragmentSanitiserTokenHandler::sanitiseHtmlFragment( $this->logger, $html );
	}

	/**
	 * Decode a possibly JSON-encoded HTML fragment string.
	 *
	 * @param string $value
	 * @return string
	 */
	private function decodeHtmlFragmentValue( string $value ): string {
		if ( $value === '' ) {
			return '';
		}
		// Try to decode as JSON, but only use the result if it's a string
		$decoded = json_decode( $value, true );
		if ( is_string( $decoded ) ) {
			return $decoded;
		}
		// If not JSON or not a string, return as-is
		return $value;
	}

	/**
	 * Helper to create an error fragment for failed function calls.
	 */
	private function createErrorfulFragment( ParsoidExtensionAPI $extApi, ?string $errorMessageKey ): HTMLPFragment {
		$cmc = $extApi->getMetadata();
		if ( $cmc instanceof ParserOutput ) {
			// Make sure our fragment's cache expiry is set to at most 1 hour, as we're adding an errorful piece of
			// content that is likely to be fixed next time around, but we don't want to slam the server.
			$cmc->updateRuntimeAdaptiveExpiry( 60 * 60 );
		}

		// Codex will not support inline rendering of error chips or error messages, so we need to
		// add inline styles to align it inline with the body text and to make it scale properly.
		return HtmlPFragment::newFromHtmlString(
			'<span class="cdx-info-chip cdx-info-chip--error"'
				. 'style="position:relative;line-height: var(--line-height-medium, 1.375rem); padding-left:calc('
					. 'var(--font-size-medium, 1rem) + calc(var(--font-size-medium,1rem) - 6px));"'
				. 'data-error-key="' . htmlspecialchars( $errorMessageKey ?? '' ) . '">'
				. '<span class="cdx-info-chip__icon"'
					. 'style="position:absolute;left:calc((var(--font-size-medium,1rem) - 2px) * .5);"'
					. 'aria-hidden="true"></span>'
				. '<span class="cdx-info-chip__text" style="font-size:var(--font-size-medium,1rem);">'
					. wfMessage( 'wikilambda-visualeditor-wikifunctionscall-error' )->text()
				. '</span>'
			. '</span>',
			null
		);
	}
}
