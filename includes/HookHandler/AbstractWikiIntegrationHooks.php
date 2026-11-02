<?php

/**
 * WikiLambda hooks that keep the shared abstractwiki_integrations table in step with the abstract
 * articles that this wiki shows (abstract client mode with integration on).
 *
 * All writes to the shared table are deferred, so that a failure on x1 does not roll back the
 * page change or the other updates of the same transaction.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\HookHandler;

use MediaWiki\Content\JsonContent;
use MediaWiki\Deferred\DeferredUpdates;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiConfigProvider;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiIntegrationStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaMode;
use MediaWiki\Hook\PageMoveCompleteHook;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Page\Hook\PageDeleteCompleteHook;
use MediaWiki\Page\Hook\PageUndeleteCompleteHook;
use MediaWiki\Page\PageStore;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Storage\Hook\PageSaveCompleteHook;
use MediaWiki\Title\MalformedTitleException;
use MediaWiki\Title\TitleParser;
use MediaWiki\WikiMap\WikiMap;
use Psr\Log\LoggerInterface;

class AbstractWikiIntegrationHooks implements
	PageSaveCompleteHook,
	PageMoveCompleteHook,
	PageDeleteCompleteHook,
	PageUndeleteCompleteHook
{

	private LoggerInterface $logger;

	public function __construct(
		private readonly WikiLambdaMode $mode,
		private readonly PageStore $pageStore,
		private readonly TitleParser $titleParser,
		private readonly AbstractWikiConfigProvider $configProvider,
		private readonly AbstractWikiIntegrationStore $integrationStore
	) {
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstractClient' );
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/PageSaveComplete
	 * @inheritDoc
	 */
	public function onPageSaveComplete( $wikiPage, $user, $summary, $flags, $revisionRecord, $editResult ) {
		if ( !$this->mode->isAbstractClientIntegration() ) {
			return;
		}

		$page = $wikiPage->getTitle();
		$timestamp = $revisionRecord->getTimestamp();
		if ( $page->getNamespace() === NS_MAIN ) {
			if ( $editResult->isNew() ) {
				$this->closeIfOptedIn( $page->getDBkey(), $timestamp );
			}
		} elseif (
			$page->getNamespace() === NS_MEDIAWIKI &&
			$page->getDBkey() === 'AbstractWikiOptedInArticles.json'
		) {
			$content = $revisionRecord->getContent( SlotRecord::MAIN );
			$items = $content instanceof JsonContent ?
				json_decode( $content->getText(), true )['OptedInArticles'] ?? [] :
				[];
			DeferredUpdates::addCallableUpdate( fn () => $this->syncWiki( $items, $timestamp ) );
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/PageMoveComplete
	 * @inheritDoc
	 */
	public function onPageMoveComplete( $old, $new, $userIdentity, $pageid, $redirid, $reason, $revision ) {
		if ( !$this->mode->isAbstractClientIntegration() ) {
			return;
		}

		$timestamp = $revision->getTimestamp();
		// A redirect left at the old title is a local page, so the wiki still shows no abstract article.
		if ( !$redirid && $old->getNamespace() === NS_MAIN ) {
			$this->openIfOptedIn( $old->getDBkey(), $timestamp );
		}
		if ( $new->getNamespace() === NS_MAIN ) {
			$this->closeIfOptedIn( $new->getDBkey(), $timestamp );
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/PageDeleteComplete
	 * @inheritDoc
	 */
	public function onPageDeleteComplete(
		$page, $deleter, $reason, $pageID, $deletedRev, $logEntry, $archivedRevisionCount
	) {
		if ( $this->mode->isAbstractClientIntegration() && $page->getNamespace() === NS_MAIN ) {
			$this->openIfOptedIn( $page->getDBkey(), $logEntry->getTimestamp() );
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/PageUndeleteComplete
	 * @inheritDoc
	 */
	public function onPageUndeleteComplete(
		$page, $restorer, $reason, $restoredRev, $logEntry, $restoredRevisionCount, $created, $restoredPageIds
	): void {
		if ( $this->mode->isAbstractClientIntegration() && $created && $page->getNamespace() === NS_MAIN ) {
			$this->closeIfOptedIn( $page->getDBkey(), $logEntry->getTimestamp() );
		}
	}

	/**
	 * Make the live rows match the opted-in primary titles, except titles that have a local
	 * article, which the wiki shows instead.
	 *
	 * @param array $items The OptedInArticles list of the config page
	 * @param string $timestamp
	 */
	private function syncWiki( array $items, string $timestamp ): void {
		$qidsByTitle = [];
		foreach ( $items as $item ) {
			$primaryTitle = (string)( $item['title'][0] ?? '' );
			$dbKey = $this->getShownDBkey( $primaryTitle );
			if ( $dbKey === null ) {
				// The renderer matches the exact title text, so it never shows this entry.
				$this->logger->warning( __METHOD__ . ': Opted-in title "{title}" is not in canonical form', [
					'title' => $primaryTitle,
					'qid' => $item['qid'] ?? '',
				] );
				continue;
			}
			$qidsByTitle[ $dbKey ] = $item['qid'] ?? '';
		}

		if ( $qidsByTitle ) {
			$localPages = $this->pageStore->newSelectQueryBuilder()
				->whereTitles( NS_MAIN, array_map( 'strval', array_keys( $qidsByTitle ) ) )
				->fetchPageRecords();
			foreach ( $localPages as $localPage ) {
				unset( $qidsByTitle[ $localPage->getDBkey() ] );
			}
		}

		$this->integrationStore->syncWiki( WikiMap::getCurrentWikiId(), $qidsByTitle, $timestamp );
	}

	/**
	 * @param string $titleText An opted-in title, as entered in the config
	 * @return string|null The DB key, or null if the entry is not the canonical text of a
	 *   main-namespace title, which is the only form that the renderer matches
	 */
	private function getShownDBkey( string $titleText ): ?string {
		try {
			$title = $this->titleParser->parseTitle( $titleText );
		} catch ( MalformedTitleException ) {
			return null;
		}
		if (
			$title->getNamespace() !== NS_MAIN || $title->isExternal() || $title->hasFragment() ||
			$title->getText() !== $titleText
		) {
			return null;
		}
		return $title->getDBkey();
	}

	/**
	 * @param string $dbKey A main-namespace title that the wiki now shows no local article at
	 * @param string $timestamp
	 */
	private function openIfOptedIn( string $dbKey, string $timestamp ): void {
		$qid = $this->getOptedInPrimaryQid( $dbKey );
		if ( $qid !== null ) {
			$wiki = WikiMap::getCurrentWikiId();
			DeferredUpdates::addCallableUpdate(
				fn () => $this->integrationStore->openTitle( $wiki, $dbKey, $qid, $timestamp )
			);
		}
	}

	/**
	 * @param string $dbKey A main-namespace title that now has a local article
	 * @param string $timestamp
	 */
	private function closeIfOptedIn( string $dbKey, string $timestamp ): void {
		if ( $this->getOptedInPrimaryQid( $dbKey ) !== null ) {
			$wiki = WikiMap::getCurrentWikiId();
			DeferredUpdates::addCallableUpdate( fn () => $this->integrationStore->closeTitle(
				$wiki, $dbKey, AbstractWikiIntegrationStore::REASON_LOCAL_ARTICLE, $timestamp
			) );
		}
	}

	private function getOptedInPrimaryQid( string $dbKey ): ?string {
		$optedIn = $this->configProvider->provideOptedIn()[ strtr( $dbKey, '_', ' ' ) ] ?? null;
		return $optedIn && $optedIn['redirect'] === false ? $optedIn['qid'] : null;
	}
}
