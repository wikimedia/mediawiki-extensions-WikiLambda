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

use MediaWiki\Config\Config;
use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsRecentChangesInsertJob;
use MediaWiki\Html\FormOptions;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\RecentChanges\ChangesListBooleanFilter;
use MediaWiki\RecentChanges\EnhancedChangesList;
use MediaWiki\RecentChanges\OldChangesList;
use MediaWiki\RecentChanges\RecentChange;
use MediaWiki\SpecialPage\ChangesListSpecialPage;
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

	private LoggerInterface $logger;

	private bool $showWikifunctionsChanges = false;

	public function __construct(
		UserOptionsLookup $userOptionsLookup, IConnectionProvider $dbProvider, Config $config
	) {
		$this->userOptionsLookup = $userOptionsLookup;
		$this->dbProvider = $dbProvider;
		$this->config = $config;

		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
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
	public function onEnhancedChangesListModifyLineData(
		$changesList,
		&$data,
		$block,
		$rc,
		&$classes,
		&$attribs
	) {
		if ( !$this::isJobFromWikifunctions( $rc ) ) {
			// Not one of ours.
			$data['recentChangesFlags']['wikifunctions-edit'] = false;
			return;
		}

		// XXX: FIXME.
		throw new \RuntimeException( 'Not implemented ECLMLD' );

		// …
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/EnhancedChangesListModifyBlockLineData
	 *
	 * @param EnhancedChangesList $changesList
	 * @param array &$data
	 * @param RecentChange $rc
	 */
	public function onEnhancedChangesListModifyBlockLineData(
		$changesList,
		&$data,
		$rc
	) {
		if ( !$this::isJobFromWikifunctions( $rc ) ) {
			// Not one of ours.
			$data['recentChangesFlags']['wikifunctions-edit'] = false;
			return;
		}

		// XXX: FIXME.
		throw new \RuntimeException( 'Not implemented ECLMBLD' );
		// …
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/OldChangesListRecentChangesLine
	 *
	 * @param OldChangesList $changeslist
	 * @param string &$s
	 * @param RecentChange $rc
	 * @param string[] &$classes
	 * @param string[] &$attribs
	 * @return bool|void
	 */
	public function onOldChangesListRecentChangesLine(
		$changeslist,
		&$s,
		$rc,
		&$classes,
		&$attribs
	) {
		if ( !$this::isJobFromWikifunctions( $rc ) ) {
			// $data['recentChangesFlags']['wikifunctions-edit'] = false;
			// Not one of ours.
			return;
		}

		// XXX: FIXME.
		throw new \RuntimeException( 'Not implemented OCLRCD' );
		// …
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
		if ( $this->showWikifunctionsChanges ) {
			$changeTypeGroup = $specialPage->getFilterGroup( 'changeType' );

			$wikidataFilter = new ChangesListBooleanFilter( [
				'name' => 'hideWikifunctions',
				'group' => $changeTypeGroup,
				'priority' => -5,
				'label' => 'wikilambda-recentchanges-filter-label',
				'description' => 'wikilambda-recentchanges-filter-description',
				'showHide' => 'wikilambda-rc-hide-wikifunctions',
				// If the user preference is enabled, then don't hide Wikifunctions edits
				'default' => !(bool)$this->userOptionsLookup->getOption(
					$specialPage->getUser(),
					$this->getOptionName( $specialPage->getName() )
				),
				'queryCallable' => static function (
					// All these upstream parameters, and we only use two of them!
					$specialClassName, $ctx, $dbr, &$tables, &$fields, &$conds, &$query_options, &$join_conds
					)
				{
					$conds[] = $dbr->expr( 'rc_source', '!=', WikifunctionsRecentChangesInsertJob::SRC_WIKIFUNCTIONS );
				},
				'cssClassSuffix' => 'src-mw-wikifunctions',
				'isRowApplicableCallable' => static function ( $ctx, $rc ) {
					return ClientChangeHooks::isJobFromWikifunctions( $rc );
				},
			] );
		}
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
