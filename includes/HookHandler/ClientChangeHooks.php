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

use HtmlArmor;
use MediaWiki\Config\Config;
use MediaWiki\Config\ConfigException;
use MediaWiki\Context\IContextSource;
use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsRecentChangesInsertJob;
use MediaWiki\Html\FormOptions;
use MediaWiki\Html\Html;
use MediaWiki\Linker\Linker;
use MediaWiki\Linker\LinkRenderer;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\RecentChanges\ChangesList;
use MediaWiki\RecentChanges\ChangesListBooleanFilter;
use MediaWiki\RecentChanges\EnhancedChangesList;
use MediaWiki\RecentChanges\OldChangesList;
use MediaWiki\RecentChanges\RecentChange;
use MediaWiki\SpecialPage\ChangesListSpecialPage;
use MediaWiki\Title\Title;
use MediaWiki\User\Options\UserOptionsLookup;
use MediaWiki\User\User;
use Psr\Log\LoggerInterface;
use Wikimedia\Rdbms\IConnectionProvider;

class ClientChangeHooks implements
	\MediaWiki\Hook\EnhancedChangesListModifyLineDataHook,
	\MediaWiki\Hook\EnhancedChangesListModifyBlockLineDataHook,
	\MediaWiki\Hook\OldChangesListRecentChangesLineHook,
	\MediaWiki\SpecialPage\Hook\ChangesListSpecialPageQueryHook,
	\MediaWiki\SpecialPage\Hook\ChangesListSpecialPageStructuredFiltersHook,
	\MediaWiki\Preferences\Hook\GetPreferencesHook
{
	private UserOptionsLookup $userOptionsLookup;
	private IConnectionProvider $dbProvider;
	private Config $config;
	private LinkRenderer $linkRenderer;

	private LoggerInterface $logger;

	private bool $showWikifunctionsChanges = false;

	public function __construct(
		UserOptionsLookup $userOptionsLookup,
		IConnectionProvider $dbProvider,
		Config $config,
		LinkRenderer $linkRenderer
	) {
		$this->userOptionsLookup = $userOptionsLookup;
		$this->dbProvider = $dbProvider;
		$this->config = $config;
		$this->linkRenderer = $linkRenderer;

		$this->showWikifunctionsChanges = $this->config->get( 'WikiLambdaClientDefaultShowChanges' );

		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
	}

	private function makeTitleForPossiblyRemoteZObject( string $zObject ): Title {
		// If we're in "repo" mode, we don't want an interwiki Title
		if ( $this->config->get( 'WikiLambdaEnableRepoMode' ) ) {
			$title = Title::makeTitleSafe( 0, $zObject );
		} else {
			$title = Title::makeTitleSafe( 0, $zObject, '', 'wikifunctionswiki' );
		}

		if ( !$title ) {
			throw new ConfigException( 'Could not create Title for ' . $zObject );
		}

		return $title;
	}

	private function getDiffAndHistLinks( Title $target, IContextSource $context, int $newId, int $oldId ): string {
		// The 'diff' and 'hist' links; we can't use ChangesList->insertDiffHist as our targets are remote.
		return Html::rawElement(
			'span',
			[ 'class' => 'mw-changeslist-links' ],
			Html::rawElement(
				'span',
				[],
				$this->linkRenderer->makeKnownLink(
					$target,
					new HtmlArmor( $context->msg( 'diff' )->escaped() ),
					[ 'class' => 'mw-changeslist-diff' ],
					[ 'diff' => $newId, 'oldid' => $oldId ]
				)
			) .
			Html::rawElement(
				'span',
				[],
				$this->linkRenderer->makeKnownLink(
					$target,
					new HtmlArmor( $context->msg( 'hist' )->escaped() ),
					[ 'class' => 'mw-changeslist-history' ],
					[ 'action' => 'history' ]
				)
			)
		);
	}

	private function getComment(
		IContextSource $context, string $message, ?array $messageParams, string $humanComment
	): string {
		// Use the supplied message, including parameters, to make a message in the current user's language
		$commentString = Html::rawElement(
			'span',
			[ 'class' => 'ext-wikilambda-recentchange-autocomment' ],
			$context->msg( $message, $messageParams ?? [] )->escaped()
		);

		// If there was also a human-written message, show that as well
		if ( $humanComment ) {
			$commentString .= Html::rawElement(
				'span',
				[ 'class' => 'ext-wikilambda-recentchange-editcomment' ],
				$context->msg( 'colon-separator' )->plain() . $humanComment
			);
		}

		return Html::rawElement( 'span', [ 'class' => 'comment' ], $context->msg(
			'parentheses',
			[ $commentString ]
		)->parse() );
	}

	private function getFlags( RecentChange $recentChange ): array {
		return [
			'wikifunctions-edit' => true,
			'minor' => $recentChange->getAttribute( 'rc_minor' ),
			'bot' => $recentChange->getAttribute( 'rc_bot' ),
		];
	}

	private function getTimeStampLink(
		Title $target, string $timestamp, ChangesList $changesList, User $user, int $newId, int $oldId
	): string {
		// Time timestamp of the edit; we can't use ChangesList::revDateLink() as we don't have a local RevisionRecord
		return $this->linkRenderer->makeKnownLink(
			$target,
			$changesList->getLanguage()->userTime( $timestamp, $user ),
			[ 'class' => 'mw-changeslist-date' ],
			[
				'title' => $target->getDBkey(),
				'diff' => $newId,
				'oldid' => $oldId,
			]
		);
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/EnhancedChangesListModifyLineData
	 *
	 * @param EnhancedChangesList $changesList
	 * @param array &$data
	 * @param RecentChange[] $block
	 * @param RecentChange $rc
	 * @param string[] &$classes
	 * @param string[] &$attribs
	 */
	public function onEnhancedChangesListModifyLineData( $changesList, &$data, $block, $rc, &$classes, &$attribs ) {
		if ( !$this::isJobFromWikifunctions( $rc ) ) {
			// Not one of ours.
			$data['recentChangesFlags']['wikifunctions-edit'] = false;
			return;
		}

		// We don't do anything special for runs of affected updates, so we can re-use our regular method
		$this->onEnhancedChangesListModifyBlockLineData( $changesList, $data, $rc );
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/EnhancedChangesListModifyBlockLineData
	 *
	 * @param EnhancedChangesList $changesList
	 * @param array &$data
	 * @param RecentChange $rc
	 */
	public function onEnhancedChangesListModifyBlockLineData( $changesList, &$data, $rc ) {
		if ( !$this::isJobFromWikifunctions( $rc ) ) {
			// Not one of ours.
			$data['recentChangesFlags']['wikifunctions-edit'] = false;
			return;
		}

		if ( !$rc->getPage() ) {
			$this->logger->warning(
				__METHOD__ . ' called for a false page somehow on rc_id "{rcId}"',
				[
					'rcId' => $rc->getAttribute( 'rc_id' )
				]
			);
			return;
		}

		$context = $changesList->getContext();

		$decodedParams = json_decode( $rc->getAttribute( 'rc_params' ), true );
		if ( !$decodedParams ) {
			$this->logger->warning(
				__METHOD__ . ' called for {page} but couldn\'t decode rc_params: "{params}"',
				[
					'page' => $rc->getPage()->getDBkey(),
					'params' => $rc->getAttribute( 'rc_params' ),
				]
			);
			return;
		}

		$targetItem = $decodedParams['target'];
		if ( !$targetItem ) {
			$this->logger->warning(
				__METHOD__ . ' called for {page} but couldn\'t decode target: "{params}"',
				[
					'page' => $rc->getPage()->getDBkey(),
					'params' => var_export( $decodedParams, true ),
				]
			);
			return;
		}
		$targetItemTitleObject = $this->makeTitleForPossiblyRemoteZObject( $targetItem );

		// Note that we're +='ing the flags, as the array might have flags we don't know about from other extensions
		$data['recentChangesFlags'] += $this->getFlags( $rc );

		$newId = $decodedParams['newId'];
		if ( !$newId ) {
			$this->logger->warning(
				__METHOD__ . ' called for {page} but newId was not set: "{params}"',
				[
					'page' => $rc->getPage()->getDBkey(),
					'params' => var_export( $decodedParams, true ),
				]
			);
			return;
		}

		$oldId = $decodedParams['oldId'] ?? 0;

		$data['timestampLink'] = $this->getTimeStampLink(
			$targetItemTitleObject,
			$rc->getAttribute( 'rc_timestamp' ),
			$changesList,
			$context->getUser(),
			$newId,
			$oldId
		);

		$data['currentAndLastLinks'] = $this->getDiffAndHistLinks( $targetItemTitleObject, $context, $newId, $oldId );

		$data['comment'] = $this->getComment(
			$context,
			$decodedParams['message'],
			$decodedParams['messageParams'] ?? [],
			$rc->getAttribute( 'rc_comment' )
		);

		// Value passed by reference, so this completes our work.
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/OldChangesListRecentChangesLine
	 *
	 * @param OldChangesList $changesList
	 * @param string &$s
	 * @param RecentChange $rc
	 * @param string[] &$classes
	 * @param string[] &$attribs
	 * @return bool|void
	 */
	public function onOldChangesListRecentChangesLine( $changesList, &$s, $rc, &$classes, &$attribs ) {
		if ( !$this::isJobFromWikifunctions( $rc ) ) {
			// Not one of ours.
			return;
		}

		if ( !$rc->getPage() ) {
			$this->logger->warning(
				__METHOD__ . ' called for a false page somehow on rc_id "{rcId}"',
				[
					'rcId' => $rc->getAttribute( 'rc_id' )
				]
			);
			return;
		}

		$context = $changesList->getContext();

		$decodedParams = json_decode( $rc->getAttribute( 'rc_params' ), true );
		if ( !$decodedParams ) {
			$this->logger->warning(
				__METHOD__ . ' called for {page} but couldn\'t decode rc_params: "{params}"',
				[
					'page' => $rc->getPage()->getDBkey(),
					'params' => $rc->getAttribute( 'rc_params' ),
				]
			);
			return;
		}

		$targetItem = $decodedParams['target'];
		$targetItemTitleObject = $this->makeTitleForPossiblyRemoteZObject( $targetItem );

		$targetFunction = $decodedParams['function'];

		$wordSeparator = $context->msg( 'word-separator' )->plain();
		$conceptSeparator = ' ' . Html::element( 'span', [ 'class' => 'mw-changeslist-separator' ], '' ) . ' ';

		$spanContents =
			$this->getDiffAndHistLinks(
				$targetItemTitleObject, $context, $decodedParams['newId'], $decodedParams['oldId']
			) .
			$conceptSeparator .
			// The appropriate Flags ('F' for us, 'm' or 'b' for minor/bot)
			$changesList->recentChangesFlags( $this->getFlags( $rc ) ) .
			$wordSeparator .
			// Link to the article affected
			Html::rawElement(
				'span',
				[ 'class' => 'mw-title' ],
				// @phan-suppress-next-line PhanTypeMismatchArgumentNullable; we've checked $rc->getPage() is non-null
				$this->linkRenderer->makeKnownLink( $rc->getPage() )
			) .
			$wordSeparator .
			// Link to the Function being used
			Html::rawElement(
				'span',
				[ 'class' => 'mw-wikilambda-function' ],
				$this->linkRenderer->makeKnownLink(
					$this->makeTitleForPossiblyRemoteZObject( $targetFunction ),
					// As a display title, we want "Function: Foo" rather than "Z12345"
					$context->msg( 'wikilambda-recentchanges-entry-function' )->plain()
						. $context->msg( 'colon-separator' )->plain()
						// FIXME: Change this to the name of the Function in this language, not the ZID
						. $targetFunction
				)
			) .
			$wordSeparator .
			$this->getTimeStampLink(
				$targetItemTitleObject,
				$rc->getAttribute( 'rc_timestamp' ),
				$changesList,
				$context->getUser(),
				$decodedParams['newId'], $decodedParams['oldId'] ?? 0
			) .
			$conceptSeparator .
			// Links to this user
			Linker::userToolLinks( $rc->getPerformerIdentity()->getId(), $rc->getPerformerIdentity()->getName() ) .
			$wordSeparator .
			// Comments
			$this->getComment(
				$context,
				$decodedParams['message'],
				$decodedParams['messageParams'],
				$rc->getAttribute( 'rc_comment' )
			);

		// Value passed by reference, so this completes our work.
		$s = Html::rawElement( 'span', [ 'class' => 'mw-changeslist-line-inner' ], $spanContents );
	}

	/**
	 * Static so that it can be used in a callback.
	 *
	 * @param RecentChange $rc
	 * @return bool
	 */
	public static function isJobFromWikifunctions( RecentChange $rc ): bool {
		return ( $rc->getAttribute( 'rc_source' ) === WikifunctionsRecentChangesInsertJob::SRC_WIKIFUNCTIONS );
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/OldChangesListRecentChangesLine
	 *
	 * @param string $name
	 * @param array &$tables
	 * @param array &$fields
	 * @param array &$conds
	 * @param array &$query_options
	 * @param array &$join_conds
	 * @param FormOptions $opts
	 */
	public function onChangesListSpecialPageQuery(
		$name, &$tables, &$fields, &$conds, &$query_options, &$join_conds, $opts
	) {
		// Drop server-side our changes if the user hasn't opted to see them (as set below,
		// in onChangesListSpecialPageStructuredFilters).
		if ( !$this->showWikifunctionsChanges ) {
			$dbr = $this->dbProvider->getReplicaDatabase();
			$conds[] = $dbr->expr( 'rc_source', '!=', WikifunctionsRecentChangesInsertJob::SRC_WIKIFUNCTIONS );
		}
	}

	/**
	 * @param ChangesListSpecialPage $specialPage
	 */
	public function onChangesListSpecialPageStructuredFilters( $specialPage ) {
		// @phan-suppress-next-line PhanNoopNew
		new ChangesListBooleanFilter( [
			'name' => 'hideWikifunctions',
			'group' => $specialPage->getFilterGroup( 'changeType' ),
			'priority' => -5,
			'label' => 'wikilambda-recentchanges-filter-label',
			'description' => 'wikilambda-recentchanges-filter-description',
			'showHide' => 'wikilambda-rc-hide-wikifunctions',
			'default' => !(
				// True (i.e., show these) if the default is to show them …
				$this->showWikifunctionsChanges &&
				// … and the user preference isn't different.
				(bool)$this->userOptionsLookup->getOption(
					$specialPage->getUser(),
					$this->getOptionName( $specialPage->getName() )
				)
			),
			'queryCallable' => static function (
				// All these upstream parameters, and we only use two of them!
				$specialClassName, $ctx, $dbr, &$tables, &$fields, &$conds, &$query_options, &$join_conds
			) {
				$conds[] = $dbr->expr( 'rc_source', '!=', WikifunctionsRecentChangesInsertJob::SRC_WIKIFUNCTIONS );
			},
			'cssClassSuffix' => 'src-mw-wikifunctions',
			'isRowApplicableCallable' => static function ( $ctx, $rc ) {
				return ClientChangeHooks::isJobFromWikifunctions( $rc );
			},
		] );
	}

	/**
	 * Adds a preference for showing or hiding Wikidata entries in recent changes
	 *
	 * @param User $user
	 * @param array[] &$prefs
	 */
	public function onGetPreferences( $user, &$prefs ) {
		if ( !$this->config->get( 'WikiLambdaEnableClientMode' ) ) {
			return;
		}

		$prefs['rcshowwikifunctions'] = [
			'type' => 'toggle',
			'label-message' => 'wikilambda-recentchanges-filter-rc-pref',
			'section' => 'rc/advancedrc',
		];

		$prefs['wlshowwikifunctions'] = [
			'type' => 'toggle',
			'label-message' => 'wikilambda-recentchanges-filter-wl-pref',
			'section' => 'watchlist/advancedwatchlist',
		];
	}

	private function getOptionName( string $pageName ): string {
		if ( $pageName === 'Watchlist' ) {
			return 'wlshowwikifunctions';
		}

		return 'rcshowwikifunctions';
	}

}
