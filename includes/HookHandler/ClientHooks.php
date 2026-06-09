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
use MediaWiki\Extension\WikiLambda\WikiLambdaMode;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Linker\LinkTarget;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\ProperPageIdentity;
use MediaWiki\Page\WikiPage;
use MediaWiki\Permissions\Authority;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\ResourceLoader\CodexModule;
use MediaWiki\ResourceLoader\ImageModule;
use MediaWiki\ResourceLoader\ResourceLoader;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Storage\EditResult;
use MediaWiki\Title\Title;
use MediaWiki\User\UserIdentity;
use MediaWiki\WikiMap\WikiMap;
use Psr\Log\LoggerInterface;
use Throwable;

class ClientHooks implements
	\MediaWiki\Storage\Hook\PageSaveCompleteHook,
	\MediaWiki\Page\Hook\PageDeleteCompleteHook,
	\MediaWiki\Hook\PageMoveCompleteHook,
	\MediaWiki\ResourceLoader\Hook\ResourceLoaderRegisterModulesHook,
	\MediaWiki\Output\Hook\MakeGlobalVariablesScriptHook
{
	private LoggerInterface $logger;

	public function __construct(
		private readonly Config $config,
		private readonly WikiLambdaMode $mode
	) {
		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
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
		if ( !$this->mode->isClient() ) {
			// Nothing for us to do.
			return;
		}

		if ( defined( 'MW_UPDATER' ) || defined( 'MEDIAWIKI_INSTALL' ) ) {
			// During an install or schema upgrade the wiki's pages are being (re)created by
			// the bootstrap before the cross-wiki usage table exists (it lives on a virtual
			// domain, so its schema update runs in a later pass than the page creation). A
			// freshly bootstrapped page has no prior usage to clear anyway, so skip the write.
			// Mirrors Echo's PageSaveComplete guard against the same install-time problem.
			return;
		}

		// Clear this page's rows from the shared cross-wiki usage table (T390557); any
		// Functions still in use are re-recorded afterwards by WikifunctionsClientUsageUpdateJob.
		//
		// NOTE: This fires on every page save and deletes by (wiki, page_id) even for the
		// vast majority of pages that never use a Function, so it is usually a no-op delete
		// against the shared x1 cluster. We accept that for now.
		$pageId = $wikiPage->getId();
		if ( $pageId > 0 ) {
			$this->logger->debug( __METHOD__ . ': Clearing usage tracking for {page}', [
				'page' => $wikiPage->getTitle()->getFullText(),
			] );
			WikiLambdaServices::getWikifunctionsUsageStore()->deleteUsageForPage(
				WikiMap::getCurrentWikiId(),
				$pageId
			);
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/PageDeleteComplete
	 *
	 * @param ProperPageIdentity $page
	 * @param Authority $deleter
	 * @param string $reason
	 * @param int $pageID
	 * @param RevisionRecord $deletedRev
	 * @param \ManualLogEntry $logEntry
	 * @param int $archivedRevisionCount
	 * @return bool|void
	 */
	public function onPageDeleteComplete(
		$page, $deleter, $reason, $pageID, $deletedRev, $logEntry, $archivedRevisionCount
	) {
		if ( !$this->config->get( 'WikiLambdaEnableClientMode' ) ) {
			// Nothing for us to do.
			return;
		}

		if ( defined( 'MW_UPDATER' ) || defined( 'MEDIAWIKI_INSTALL' ) ) {
			// Skip during install/upgrade: the cross-wiki usage table may not exist yet, and
			// the bootstrap does not delete pages. See onPageSaveComplete() for the full note.
			return;
		}

		// A deleted page no longer uses any Function, so drop its rows from the shared
		// cross-wiki usage table. Unlike an edit, deletion fires no re-render to reconcile
		// the rows, so without this they would leak permanently (page_ids are not reused).
		$wikifunctionsUsageStore = WikiLambdaServices::getWikifunctionsUsageStore();
		$this->logger->debug( __METHOD__ . ': Clearing usage tracking for deleted page {pageId}', [
			'pageId' => $pageID,
		] );
		$wikifunctionsUsageStore->deleteUsageForPage( WikiMap::getCurrentWikiId(), $pageID );
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/PageMoveComplete
	 *
	 * @param LinkTarget $old
	 * @param LinkTarget $new
	 * @param UserIdentity $userIdentity
	 * @param int $pageid
	 * @param int $redirid
	 * @param string $reason
	 * @param RevisionRecord $revision
	 * @return bool|void
	 */
	public function onPageMoveComplete(
		$old, $new, $userIdentity, $pageid, $redirid, $reason, $revision
	) {
		if ( !$this->config->get( 'WikiLambdaEnableClientMode' ) ) {
			// Nothing for us to do.
			return;
		}

		if ( defined( 'MW_UPDATER' ) || defined( 'MEDIAWIKI_INSTALL' ) ) {
			// Skip during install/upgrade: the cross-wiki usage table may not exist yet, and
			// the bootstrap does not move pages. See onPageSaveComplete() for the full note.
			return;
		}

		// A move keeps the page_id but may change the namespace and/or the title.
		$oldTitle = Title::newFromLinkTarget( $old );
		$newTitle = Title::newFromLinkTarget( $new );
		$wiki = WikiMap::getCurrentWikiId();
		$wikifunctionsUsageStore = WikiLambdaServices::getWikifunctionsUsageStore();
		$this->logger->debug( __METHOD__ . ': Updating usage tracking for moved page {pageId}', [
			'pageId' => $pageid,
		] );

		if ( $oldTitle->getNamespace() === $newTitle->getNamespace() ) {
			// In-namespace rename: the row's identity (wfu_wiki_id, encoding the namespace) is
			// unchanged, so only the denormalised title is stale. Refresh it in place so the
			// repo shows the new name immediately, rather than only after the moved page is
			// next re-rendered.
			$wikifunctionsUsageStore->updatePageTitle( $wiki, $pageid, $newTitle->getDBkey() );
		} else {
			// A namespace change moves the row to a different wfu_wiki_id, which is part of its
			// identity, so it can't be updated in place; and we don't know the Functions the
			// page uses here to re-insert under the new id. Clear the stale rows — the page's
			// next re-render re-records them with the correct namespace via the usage job.
			$wikifunctionsUsageStore->deleteUsageForPage( $wiki, $pageid );
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/MakeGlobalVariablesScript
	 *
	 * @param array &$vars
	 * @param OutputPage $out
	 */
	public function onMakeGlobalVariablesScript( &$vars, $out ): void {
		// 1. Add configuration flags
		$vars['wgWikiLambdaEnableAbstractMode'] = $this->config->get( 'WikiLambdaEnableAbstractMode' );
		$vars['wgWikiLambdaEnableRepoMode'] = $this->config->get( 'WikiLambdaEnableRepoMode' );

		// 2. Add wgWikifunctionsBaseUrl when the setup is non-repo
		if ( !$this->mode->isRepo() ) {
			$vars['wgWikifunctionsBaseUrl'] = $this->getClientTargetUrl();
		}

		// 3. Add primary namespace for Abstract content
		if ( $this->mode->isAbstract() ) {
			$namespaces = $this->config->get( 'WikiLambdaAbstractNamespaces' );
			$vars['wgWikiLambdaAbstractPrimaryNamespace'] = array_values( $namespaces )[0][0];
		}

		// 4. In client mode, expose the recommended-Wikifunctions list for the VE dialog.
		// Sourced from CommunityConfiguration (T394410).
		if ( $this->mode->isClient() ) {
			$vars['wgWikiLambdaSuggestedFunctions'] = $this->loadProviderList(
				'WikifunctionsSuggestions'
			);
		}

		// 5. In abstract mode, expose the suggested HTML-returning Wikifunctions shown
		// in the Abstract Article "Add fragment" menu.
		if ( $this->mode->isAbstract() ) {
			$vars['wgWikiLambdaAbstractSuggestions'] = $this->loadProviderList(
				'AbstractWikiSuggestedWikifunctions'
			);
		}
	}

	/**
	 * Resolve a CommunityConfiguration-managed list of ZIDs for injection into
	 * wgWikiLambda* config. Returns an empty list if CommunityConfiguration is
	 * not loaded or the lookup fails.
	 *
	 * @param string $providerId CC provider ID (e.g. "WikifunctionsSuggestions")
	 * @return string[]
	 */
	private function loadProviderList( string $providerId ): array {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			return [];
		}
		try {
			$provider = MediaWikiServices::getInstance()
				->getService( 'CommunityConfiguration.ProviderFactory' )
				->newProvider( $providerId );
			$status = $provider->loadValidConfiguration();
			if ( $status->isOK() ) {
				$value = $status->getValue();
				return array_values( (array)( $value->SuggestedFunctions ?? [] ) );
			}
		} catch ( Throwable $e ) {
			$this->logger->warning(
				__METHOD__ . ': CommunityConfiguration lookup for {id} failed: {msg}',
				[ 'id' => $providerId, 'msg' => $e->getMessage() ]
			);
		}
		return [];
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
			$this->mode->isClient()
			&& ExtensionRegistry::getInstance()->isLoaded( 'VisualEditor' )
		) {
			$directoryName = __DIR__ . '/../../resources/ext.wikilambda.visualeditor';

			// First, register our custom icons so we can depend on them
			$resourceLoader->register( 'ext.wikilambda.visualeditor.icons', [
				'class' => ImageModule::class,
				// We're writing to the global OOUI icon namespace for now.
				'selector' => '.oo-ui-icon-{name}',
				'images' => [
					'functionObject' => [ "file" => "icons/functionObject.svg" ]
				],
				'localBasePath' => $directoryName,
				'remoteExtPath' => 'WikiLambda/resources'
			] );

			// Now register our actual bundle
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
					'ext.wikilambda.visualeditor.icons',
				],
				'localBasePath' => $directoryName,
				'remoteExtPath' => 'WikiLambda/resources',
				'packageFiles' => $files,
				'messages' => [
					'wikilambda-visualeditor-wikifunctionscall-ce-loading',
					'wikilambda-visualeditor-wikifunctionscall-ce-abort',
					'wikilambda-visualeditor-wikifunctionscall-error',
					'wikilambda-visualeditor-wikifunctionscall-title',
					'wikilambda-visualeditor-wikifunctionscall-popup-loading',
					'wikilambda-visualeditor-wikifunctionscall-dialog-search-no-results',
					'wikilambda-visualeditor-wikifunctionscall-dialog-search-placeholder',
					'wikilambda-visualeditor-wikifunctionscall-dialog-search-results-title',
					'wikilambda-visualeditor-wikifunctionscall-dialog-suggested-functions-title',
					'wikilambda-visualeditor-wikifunctionscall-dialog-string-input-placeholder',
					'wikilambda-visualeditor-wikifunctionscall-dialog-enum-selector-placeholder',
					'wikilambda-visualeditor-wikifunctionscall-dialog-function-link-footer',
					'wikilambda-visualeditor-wikifunctionscall-dialog-cta-suggest-title',
					'wikilambda-visualeditor-wikifunctionscall-dialog-cta-suggest-description',
					'wikilambda-visualeditor-wikifunctionscall-dialog-cta-create-title',
					'wikilambda-visualeditor-wikifunctionscall-dialog-cta-create-description',
					'wikilambda-visualeditor-wikifunctionscall-dialog-cta-explore-title',
					'wikilambda-visualeditor-wikifunctionscall-dialog-cta-explore-description',
					'wikilambda-visualeditor-wikifunctionscall-error-bad-function',
					'wikilambda-visualeditor-wikifunctionscall-error-enum',
					'wikilambda-visualeditor-wikifunctionscall-error-language',
					'wikilambda-visualeditor-wikifunctionscall-error-parser',
					'wikilambda-visualeditor-wikifunctionscall-error-parser-empty',
					'wikilambda-visualeditor-wikifunctionscall-error-wikidata-lexeme',
					'wikilambda-visualeditor-wikifunctionscall-error-wikidata-property',
					'wikilambda-visualeditor-wikifunctionscall-error-wikidata-item',
					'wikilambda-visualeditor-wikifunctionscall-error-wikidata-lexeme-form',
					'wikilambda-visualeditor-wikifunctionscall-dialog-read-more-description',
					'wikilambda-visualeditor-wikifunctionscall-dialog-read-less-description',
					'wikilambda-visualeditor-wikifunctionscall-info-missing-content',
					'brackets',
					'wikilambda-visualeditor-wikifunctionscall-back',
					'wikilambda-visualeditor-wikifunctionscall-changedesc-title',
					'wikilambda-visualeditor-wikifunctionscall-no-name',
					'wikilambda-visualeditor-wikifunctionscall-no-description',
					'wikilambda-visualeditor-wikifunctionscall-no-input-label',
					'wikilambda-visualeditor-wikifunctionscall-preview-title',
					'wikilambda-visualeditor-wikifunctionscall-preview-no-result',
					'wikilambda-visualeditor-wikifunctionscall-preview-retry-button-label',
					'wikilambda-visualeditor-wikifunctionscall-preview-cancel-button-label',
					'wikilambda-visualeditor-wikifunctionscall-preview-cancelled',
					'wikilambda-visualeditor-wikifunctionscall-preview-error',
					'wikilambda-visualeditor-wikifunctionscall-preview-html-fragment-toggle',
					'wikilambda-visualeditor-wikifunctionscall-default-value-date',
					'wikilambda-visualeditor-wikifunctionscall-default-value-wikidata-item',
					'wikilambda-visualeditor-wikifunctionscall-default-value-language',
					'wikilambda-functioncall-error-message',
					"wikilambda-functioncall-error-message-unknown",
					"wikilambda-functioncall-error-message-not-supported",
					"wikilambda-functioncall-error-message-bad-inputs",
					"wikilambda-functioncall-error-message-bad-input-type",
					"wikilambda-functioncall-error-message-bad-langs",
					"wikilambda-functioncall-error-message-disabled",
					"wikilambda-functioncall-error-message-system",
					'wikilambda-functioncall-error',
					'wikilambda-functioncall-error-evaluation',
					"wikilambda-functioncall-error-unclear",
					"wikilambda-functioncall-error-unknown-zid",
					"wikilambda-functioncall-error-invalid-zobject",
					"wikilambda-functioncall-error-nonfunction",
					"wikilambda-functioncall-error-nonstringinput",
					"wikilambda-functioncall-error-nonstringoutput",
					"wikilambda-functioncall-error-bad-langs",
					"wikilambda-functioncall-error-bad-inputs",
					"wikilambda-functioncall-error-bad-input-type",
					"wikilambda-functioncall-error-bad-output",
				],
				'styles' => [
					'ext.wikilambda.visualeditor.less',
				]
			];

			$resourceLoader->register( 'ext.wikilambda.visualeditor', $visualEditorWfConfig );

			// Finally, register the Codex module for the inline errors
			$resourceLoader->register( 'ext.wikilambda.inlineerrors', [
				'class' => CodexModule::class,
				'codexStyleOnly' => true,
				'codexComponents' => [
					'CdxInfoChip',
				],
			] );
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
