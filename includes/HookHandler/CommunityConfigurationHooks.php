<?php

/**
 * WikiLambda CommunityConfiguration integration hooks.
 *
 * Kept as a separate class (rather than extending ClientHooks) so the
 * CommunityConfigurationProvider_initListHook interface is only autoloaded
 * when the CommunityConfiguration extension is present. This preserves
 * CommunityConfiguration as a soft dependency.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\HookHandler;

use MediaWiki\Content\JsonContent;
use MediaWiki\Extension\CommunityConfiguration\Hooks\CommunityConfigurationProvider_initListHook;
use MediaWiki\Extension\WikiLambda\WikiLambdaMode;
use MediaWiki\Logging\ManualLogEntry;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Storage\Hook\PageSaveCompleteHook;
use MediaWiki\Title\TitleValue;

class CommunityConfigurationHooks implements
	CommunityConfigurationProvider_initListHook,
	PageSaveCompleteHook
{

	public function __construct(
		private readonly WikiLambdaMode $mode,
		private readonly RevisionStore $revisionStore
	) {
	}

	/**
	 * Hide each of our CC providers on wikis where its feature mode is off,
	 * so the Special:CommunityConfiguration dashboard only shows providers
	 * whose data is actually consumed on this wiki.
	 *
	 * @param array &$providers
	 * @return void
	 */
	public function onCommunityConfigurationProvider_initList( array &$providers ): void {
		if ( !$this->mode->isClient() ) {
			unset( $providers['WikifunctionsSuggestions'] );
		}
		if ( !$this->mode->isAbstract() ) {
			unset( $providers['AbstractWikiSuggestedWikifunctions'] );
		}
		if ( !$this->mode->isAbstractClient() ) {
			unset( $providers['AbstractWikiOptedInArticles'] );
		}
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
		$pageIdentity = $wikiPage->getTitle();
		if ( $pageIdentity->getDBkey() !== 'AbstractWikiOptedInArticles.json' ) {
			return;
		}

		// Get new content
		$newContent = $revisionRecord->getContent( SlotRecord::MAIN );
		$newData = $newContent instanceof JsonContent ? json_decode( $newContent->getText(), true ) : [];
		$newItems = $newData['OptedInArticles'] ?? [];

		// Get old content from parent revision
		$oldRevId = $revisionRecord->getParentId() ?? 0;
		$oldContent = null;
		if ( $oldRevId ) {
			$oldRev = $this->revisionStore->getRevisionById( $oldRevId );
			$oldContent = $oldRev ? $oldRev->getContent( SlotRecord::MAIN ) : null;
		}
		$oldData = $oldContent instanceof JsonContent ? json_decode( $oldContent->getText(), true ) : [];
		$oldItems = $oldData['OptedInArticles'] ?? [];

		// Diff by title
		$newFlat = $this->flattenItems( $newItems );
		$oldFlat = $this->flattenItems( $oldItems );

		$addedTitles = array_diff_key( $newFlat, $oldFlat );
		$removedTitles = array_diff_key( $oldFlat, $newFlat );

		// Log abstractwiki/optin actions
		foreach ( $addedTitles as $title => $item ) {
			$targetTitle = new TitleValue( NS_MAIN, $title );

			$logEntry = new ManualLogEntry( 'abstractwiki', 'optin' );

			$logEntry->setPerformer( $user );
			$logEntry->setTarget( $targetTitle );
			$logEntry->setComment( '' );
			$logEntry->setParameters( [
				'4::qid' => $item[ 'qid' ],
				'5::redirect' => $item[ 'redirect' ] ?: ''
			] );

				$logId = $logEntry->insert();
				$logEntry->publish( $logId );
		}

		// Log abstractwiki/optout actions
		foreach ( $removedTitles as $title => $item ) {
			$targetTitle = new TitleValue( NS_MAIN, $title );

			$logEntry = new ManualLogEntry( 'abstractwiki', 'optout' );

			$logEntry->setPerformer( $user );
			$logEntry->setTarget( $targetTitle );
			$logEntry->setComment( '' );
			$logEntry->setParameters( [
				'4::qid' => $item[ 'qid' ],
			] );

			$logId = $logEntry->insert();
			$logEntry->publish( $logId );
		}
		return true;
	}

	/**
	 * Transforms the OptInArticles structure from:
	 * [
	 *   [
	 *    'title' => [ 'Primary title', 'Redirect title' ],
	 *    'qid' => Qid
	 *   ]
	 * ]
	 *
	 * To a flat structure keyed by the opted-in/out page title:
	 * [
	 *  'Primary title ' => [ 'qid' => Qid, 'redirect' => false ]
	 *  'Redirect title ' => [ 'qid' => Qid, 'redirect' => 'Primary title' ]
	 * ]
	 *
	 * @param array $items
	 * @return array
	 */
	private function flattenItems( array $items ): array {
		$flat = [];
		foreach ( $items as $item ) {
			$titles = $item[ 'title' ] ?? [];
			$qid = $item[ 'qid' ] ?? '';
			foreach ( $titles as $index => $title ) {
				$flat[ $title ] = [
					'qid' => $qid,
					'redirect' => $index === 0 ? false : $titles[0]
				];
			}
		}
		return $flat;
	}
}
