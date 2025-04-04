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
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\Logger\LoggerFactory;
use Psr\Log\LoggerInterface;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\Parsoid\Ext\Arguments;
use Wikimedia\Parsoid\Ext\ParsoidExtensionAPI;
use Wikimedia\Parsoid\Ext\PFragmentHandler;
use Wikimedia\Parsoid\Fragments\PFragment;
use Wikimedia\Parsoid\Fragments\WikitextPFragment;

class WikifunctionsPFragmentHandler extends PFragmentHandler {

	private Config $config;
	private JobQueueGroup $jobQueueGroup;
	private BagOStuff $objectCache;

	private LoggerInterface $logger;

	public function __construct(
		Config $config, JobQueueGroup $jobQueueGroup, BagOStuff $objectCache
	) {
		$this->config = $config;
		$this->jobQueueGroup = $jobQueueGroup;
		$this->objectCache = $objectCache;

		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
	}

	/**
	 * @inheritDoc
	 */
	public function sourceToFragment( ParsoidExtensionAPI $extApi, Arguments $callArgs, bool $tagSyntax ) {
		// Note: We can't hint this as `: PFragment|AsyncResult` as we're still in PHP 7.4-land

		if ( !$this->config->get( 'WikiLambdaEnableClientMode' ) ) {
			// Nothing for us to do, show an error message in a (non-pending, final) fragment.
			// TODO: Make this a proper error box or inline error.
			$errorMsgString = wfMessage(
				'wikilambda-functioncall-error-message',
				[
					wfMessage( 'wikilambda-functioncall-error-disabled' )->text()
				]
			)->text();

			return WikifunctionsPFragment::newFromLiteral( $errorMsgString, null );
		}

		$expansion = $this->extractWikifunctionCallArguments( $extApi, $callArgs );

		$this->logger->debug(
			'WikiLambda client call made for {function} on {page}',
			[
				'function' => $expansion['target'],
				'page' => $extApi->getPageConfig()->getLinkTarget()->getText()
			]
		);

		// (T362256): This is the key we use to cache on the client wiki code here, rather than only at the repo wiki.
		$clientCacheKey = $this->objectCache->makeKey(
			'WikiLambdaClientFunctionCall',
			// Note that we can't use ZObjectUtils::makeCacheKeyFromZObject here, as that's repo-mode only.
			// This means that this cache key doesn't have the revision IDs of the referenced ZObjects.
			json_encode( $expansion )
		);

		$cachedValue = $this->objectCache->get( $clientCacheKey );

		// Schedule a job to update the usage tracking to say that we use this function on this page.
		// We clear out the tracking each time the page is saved, via onPageSaveComplete above.
		$usageJob = new WikifunctionsClientUsageUpdateJob( [
			'targetFunction' => $expansion['target'],
			'targetPage' => $extApi->getPageConfig()->getLinkTarget()
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

		// On Wikibase client wikis, loop over each argument, in case it's a Wikidata item reference,
		// and mark us as a user of said item if so.
		// FIXME: Disabled as this relies on the legacy Parser
		// if ( ExtensionRegistry::getInstance()->isLoaded( 'WikibaseClient' ) ) {
		// 	$wikibaseEntityParser = \Wikibase\Client\WikibaseClient::getEntityIdParser();
		// 	foreach ( $arguments as $key => $value ) {
		// 		if (
		// 			ZObjectUtils::isValidId( $value )
		// 			// Short-cut to skip ZObject references which are Wikidata-esque
		// 			&& !ZObjectUtils::isValidZObjectReference( $value )
		// 		) {
		// 			try {
		// 				// Convert the string into a Wikidata `EntityId`
		// 				$itemId = $wikibaseEntityParser->parse( $value );
		// 				\Wikibase\Client\WikibaseClient::getUsageAccumulatorFactory()
		// 					->newFromParser( $parser )
		// 					// TODO (T385631): Only track some usage, somehow?
		// 					->addAllUsage( $itemId );
		// 			} catch ( \Wikibase\DataModel\Entity\EntityIdParsingException $error ) {
		// 				// Not a valid Wikidata reference, so treat as a string.
		// 			}
		// 		}
		// 	}
		// }

		if ( $cachedValue ) {
			if ( !is_array( $cachedValue ) || !array_key_exists( 'success', $cachedValue ) ) {
				// Corrupted/invalid cache entry, so delete it and re-trigger the request
				$this->logger->warning(
					'WikiLambda client cache entry for {key} is mal-formed, deleting it',
					[
						'key' => $clientCacheKey
					]
				);
				$this->objectCache->delete( $clientCacheKey );
			} else {
				// Good news, this request has already been cached; examine what it is
				if ( $cachedValue['success'] === true ) {
					if ( $cachedValue['value'][0] !== null && is_string( $cachedValue['value'][0] ) ) {
						$this->logger->debug(
							'WikiLambda client cache hit for {key}, trimmed value is "{trimmedReturn}"',
							[
								'key' => $clientCacheKey,
								'trimmedReturn' => substr( $cachedValue['value'][0], 0, 100 ),
							]
						);
						// just return it
						return WikifunctionsPFragment::newFromLiteral( $cachedValue['value'][0], null );
					}
					$this->logger->warning(
						'WikiLambda client cache hit for {key}, but value {cachedValue} is not a string; deleting it',
						[
							'key' => $clientCacheKey,
							'cachedValue' => var_export( $cachedValue, true )
						]
					);
					$this->objectCache->delete( $clientCacheKey );
				}
				if ( !array_key_exists( 'errorMessageKey', $cachedValue ) ) {
					// Corrupted/invalid cache entry, so delete it and re-trigger the request
					$this->logger->warning(
						'WikiLambda client cache entry for {key} is a failure but missing an error key; deleting it',
						[
							'key' => $clientCacheKey
						]
					);
					$this->objectCache->delete( $clientCacheKey );
				} else {
					$errorMessageKey = $cachedValue['errorMessageKey'];

					$extApi->addTrackingCategory( $errorMessageKey . '-category' );

					$this->logger->info(
						'WikiLambda client request failed, returned {error} for request to {targetFunction} on {page}',
						[
							'error' => $errorMessageKey,
							'targetFunction' => $expansion['target'],
							'page' => $extApi->getPageConfig()->getLinkTarget()->getText()
						]
					);

					// TODO: Switch to $extApi->createPageContentI18nFragment()? Except that returns a DocumentFragment
					$errorMsgString = wfMessage( 'wikilambda-functioncall-error-message', [
						wfMessage( $errorMessageKey )->text()
					] )->text();

					// TODO (T391117): Rather than use Html::errorBox, build and use an inline error element
					// TODO (T391007): Can't use HtmlPFragment for now due to missing support in Parsoid.
					// $errorfulFragment = HtmlPFragment::newFromHtmlString(Html::errorBox($errorMsgString), null);
					$errorfulFragment = WikitextPFragment::newFromWt(
						'<div class="cdx-message cdx-message--block cdx-message--error">'
							. '<div class="cdx-message__content">'
								. $errorMsgString
							. '</div>'
						. '</div>',
						null
					);

					// TODO: Do we want to have a special kind of fragment for this? We don't want to retry generally,
					// but maybe it needs tracking or a longer-but-not-infinite TTL?
					return $errorfulFragment;
				}
			}
		}

		// At this point, we know our request hasn't yet been stored in the cache, so we need to trigger it,
		// and return a placeholder for now

		// This job triggers the request, will store the result in the cache. We don't pass in the location of
		// the usage, as that's the responsibility of this class (to add tracking categories etc.) or of Parsoid
		// (to purge the page once our fragment is available etc.).
		$renderJob = new WikifunctionsClientRequestJob( [
			'request' => $expansion,
			'clientCacheKey' => $clientCacheKey,
		] );
		$this->jobQueueGroup->lazyPush( $renderJob );

		// As we're async, return a "sorry, no content yet" fragment
		return new WikifunctionsPendingFragment(
			$extApi->getPageConfig()->getPageLanguageBcp47(), null
		);
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
		// * given an input of `{{#function:Z802 | Z41 | h&eacute;llõ |   1234}}`, $cleanedArgs will be:
		//   [ 'Z802', 'héllõ', '1234' ]
		// * given an input of `{{#function:Z802|Z41|hello|1234|renderlang=es}}`, $cleanedArgs will be:
		//   [ 'Z802', 'hello', '1234', 'renderlang' => 'es' ]
		// TODO (T390344): Switch to getNamedArgs() once Parsoid supports that
		$cleanedArgs = $arguments->getOrderedArgs(
			$extApi,
			// We want all our arguments now, expanded and trimmed
			// TODO (T362251): Deal with $arguments in a way that doesn't fully trim, e.g. for whitespace-only inputs.
			true
		);

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
			if ( !is_int( $key ) ) {
				// Ignore any other named arguments:
				// E.g. {{#function:Z10000|Hello|World|bad=argument|foo=bar}}
				continue;
			}
			if ( !( $value instanceof PFragment ) ) {
				// Ignore any non-PFragment arguments that have somehow snuck in (probably nulls?)
				continue;
			}
			$arguments[$targetFunction . 'K' . ( $key + 1 )] =
				$this->convertPFragmentToZFunctionCallParameter( $value, $extApi );
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
}
