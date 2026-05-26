<?php

/**
 * WikiLambda handler for CDN cache invalidation of /view/ pages
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\HookHandler;

use MediaWiki\Cache\HTMLCacheUpdater;
use MediaWiki\Config\Config;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Language\LanguageNameUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Page\Hook\PageDeleteCompleteHook;
use MediaWiki\Storage\Hook\PageSaveCompleteHook;
use MediaWiki\Title\Title;
use MediaWiki\Utils\UrlUtils;
use Psr\Log\LoggerInterface;

/**
 * SpecialViewObject (repo mode) and SpecialViewAbstract (abstract mode) serve content under
 * per-language canonical URLs (/view/<lang>/<page>) and mark anonymous responses as
 * CDN-cacheable. The rendered page embeds the source object and a per-language label, so an
 * edit invalidates the cached HTML in *every* language it has been viewed in. MediaWiki's
 * standard post-edit purge only covers the title's own action/article URLs, not these /view/
 * variants, so we purge them here.
 */
class ViewUrlCacheHandler implements
	PageSaveCompleteHook,
	PageDeleteCompleteHook
{
	private LoggerInterface $logger;

	public function __construct(
		private readonly Config $config,
		private readonly HTMLCacheUpdater $htmlCacheUpdater,
		private readonly LanguageNameUtils $languageNameUtils,
		private readonly UrlUtils $urlUtils
	) {
		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/PageSaveComplete
	 * @inheritDoc
	 */
	public function onPageSaveComplete(
		$wikiPage,
		$user,
		$summary,
		$flags,
		$revisionRecord,
		$editResult
	) {
		$this->purgeViewUrls( $wikiPage->getTitle() );
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/PageDeleteComplete
	 * @inheritDoc
	 */
	public function onPageDeleteComplete(
		$page,
		$deleter,
		$reason,
		$pageID,
		$deletedRev,
		$logEntry,
		$archivedRevisionCount
	) {
		$this->purgeViewUrls( Title::newFromPageIdentity( $page ) );
	}

	/**
	 * Purge the CDN-cached /view/<lang>/<page> URLs for a title, if it is one we serve at a
	 * /view/ URL on this wiki.
	 *
	 * Note that the purgeUrls() call triggers a DeferredUpdate; the only synchronous code
	 * we're adding to the hook is to generate the list of pages, which is just a DB call
	 * plus string manipulation.
	 *
	 * @param Title $title
	 */
	private function purgeViewUrls( Title $title ): void {
		$languages = $this->getViewLanguages( $title );
		if ( $languages === null ) {
			// Not a /view/-served page on this wiki; nothing for us to do.
			return;
		}

		$pageName = $title->getPrefixedDBkey();
		$urls = [];
		foreach ( $languages as $langCode ) {
			$url = $this->urlUtils->expand( "/view/$langCode/$pageName", PROTO_INTERNAL );
			if ( $url !== null ) {
				$urls[] = $url;
			}
		}

		if ( $urls === [] ) {
			return;
		}

		$this->logger->debug(
			__METHOD__ . ': Purging {count} /view/ URLs for {page}',
			[
				'count' => count( $urls ),
				'page' => $pageName,
			]
		);

		$this->htmlCacheUpdater->purgeUrls( $urls );
	}

	/**
	 * Determine the set of languages whose /view/<lang>/<page> URLs should be purged for this
	 * title, or null if the title isn't served at a /view/ URL on this wiki.
	 *
	 * The two modes differ in how the language set is bounded:
	 *
	 * - Repo mode (ZObjects): a ZObject can only render in the languages it has labels for, so
	 *   we purge exactly fetchAllZLanguageCodes() — the same set SpecialViewObject emits as
	 *   <link rel="alternate" hreflang> entries.
	 * - Abstract mode: the same abstract source renders into any requested language at view
	 *   time, so the complete set is unbounded. We bound it to languages MediaWiki has
	 *   localisation for (SUPPORTED); views in rarer known-but-unsupported language tags fall
	 *   back to TTL expiry. This is a deliberately broad fan-out (hundreds of URLs per edit).
	 *
	 * @param Title $title
	 * @return string[]|null Language codes to purge, or null if not a /view/ page
	 */
	private function getViewLanguages( Title $title ): ?array {
		// Repo mode: ZObject pages in the Main namespace, served at /view/<lang>/<Zid>.
		if (
			$this->config->get( 'WikiLambdaEnableRepoMode' ) &&
			$title->inNamespace( NS_MAIN ) &&
			ZObjectUtils::isValidZObjectReference( $title->getDBkey() )
		) {
			// WikiLambdaZObjectStore is only available on repo wikis, so we fetch it lazily here —
			// inside the repo-mode guard — rather than as a constructor dependency, since this same
			// handler also runs on abstract-mode wikis where the service isn't available.
			return WikiLambdaServices::getZObjectStore()->fetchAllZLanguageCodes();
		}

		// Abstract mode: pages in a configured Abstract namespace, served at /view/<lang>/<Qid>.
		if ( $this->config->get( 'WikiLambdaEnableAbstractMode' ) ) {
			$abstractNamespaces = array_keys( $this->config->get( 'WikiLambdaAbstractNamespaces' ) );
			if ( in_array( $title->getNamespace(), $abstractNamespaces, true ) ) {
				return array_keys( $this->languageNameUtils->getLanguageNames(
					LanguageNameUtils::AUTONYMS,
					LanguageNameUtils::SUPPORTED
				) );
			}
		}

		return null;
	}
}
