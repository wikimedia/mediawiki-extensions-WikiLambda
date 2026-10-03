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
use MediaWiki\Extension\CommunityConfiguration\Provider\ConfigurationProviderFactory;
use MediaWiki\Extension\WikiLambda\Jobs\WikifunctionsClientUsageUpdateJob;
use MediaWiki\Extension\WikiLambda\WikiLambdaMode;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\JobQueue\JobQueueGroup;
use MediaWiki\Linker\LinkTarget;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Logging\ManualLogEntry;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\ProperPageIdentity;
use MediaWiki\Parser\ParserCache;
use MediaWiki\Parser\ParserOptions;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Permissions\Authority;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\ResourceLoader\CodexModule;
use MediaWiki\ResourceLoader\ImageModule;
use MediaWiki\ResourceLoader\ResourceLoader;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Title\Title;
use MediaWiki\User\UserIdentity;
use MediaWiki\WikiMap\WikiMap;
use Psr\Log\LoggerInterface;
use Throwable;

class ClientHooks implements
	\MediaWiki\Parser\Hook\ParserCacheSaveCompleteHook,
	\MediaWiki\Page\Hook\PageDeleteCompleteHook,
	\MediaWiki\Hook\PageMoveCompleteHook,
	\MediaWiki\ResourceLoader\Hook\ResourceLoaderRegisterModulesHook,
	\MediaWiki\Output\Hook\MakeGlobalVariablesScriptHook
{
	private LoggerInterface $logger;

	public function __construct(
		private readonly Config $config,
		private readonly WikiLambdaMode $mode,
		private readonly JobQueueGroup $jobQueueGroup,
		private readonly ?ConfigurationProviderFactory $providerFactory,
	) {
		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/ParserCacheSaveComplete
	 *
	 * @param ParserCache $parserCache
	 * @param ParserOutput $parserOutput
	 * @param Title $title
	 * @param ParserOptions $popts
	 * @param int $revId
	 * @return bool|void
	 */
	public function onParserCacheSaveComplete( $parserCache, $parserOutput, $title, $popts, $revId ) {
		if ( !$this->mode->isClient() ) {
			// Nothing for us to do.
			return;
		}

		if ( defined( 'MW_UPDATER' ) || defined( 'MEDIAWIKI_INSTALL' ) ) {
			// During an install or schema upgrade the wiki's pages are being (re)created by
			// the bootstrap before the cross-wiki usage table exists (it lives on a virtual
			// domain, so its schema update runs in a later pass than the page creation).
			// Mirrors Echo's PageSaveComplete guard against the same install-time problem.
			return;
		}

		// Only Parsoid runs {{#function:…}}: it is registered as a Parsoid fragment handler,
		// and the legacy parser, which does not know the parser function, passes the call
		// through as text. So a legacy render always reports that the page uses no Functions,
		// and acting on it would delete every row. Once RefreshLinksJob runs on Parsoid
		// output (T393716) this can move to LinksUpdateComplete and read page_props, which
		// also covers the pages that a template edit changes.
		if ( !$popts->getUseParsoid() ) {
			return;
		}

		$pageId = $title->getId();
		if ( $pageId <= 0 ) {
			// A render of something that is not a stored page.
			return;
		}

		// Take the revision from the output; the hook's own parameter is on its way out
		// (T350538) and is null for the saves that ParserOutputAccess makes.
		$revisionId = $parserOutput->getCacheRevisionId() ?? $revId;
		if ( !$revisionId ) {
			return;
		}

		// Hand the whole set to the job rather than writing here: this hook fires on cache
		// misses during page views, and a GET must not write to the database.
		$this->logger->debug( __METHOD__ . ': Recording usage tracking for {page}', [
			'page' => $title->getPrefixedText(),
		] );
		$this->jobQueueGroup->lazyPush( new WikifunctionsClientUsageUpdateJob( [
			'pageId' => $pageId,
			'revId' => $revisionId,
			'functions' => self::getUsedFunctions( $parserOutput ),
		] ) );
	}

	/**
	 * Read the Functions that a page uses out of its Parsoid render.
	 *
	 * WikifunctionsPFragmentHandler records each call as a page property, so the property
	 * names hold the set. The repo writes other properties with the same 'wikilambda-'
	 * prefix, such as 'wikilambda-label-en', so check that what follows the prefix is a
	 * ZID rather than trusting the prefix alone.
	 *
	 * @param ParserOutput $parserOutput
	 * @return string[] The ZIDs used, sorted, so that equal sets give equal job parameters
	 *   and the queue can drop the repeats
	 */
	private static function getUsedFunctions( ParserOutput $parserOutput ): array {
		$prefix = 'wikilambda-';
		$functions = [];

		foreach ( array_keys( $parserOutput->getPageProperties() ) as $property ) {
			if ( !str_starts_with( (string)$property, $prefix ) ) {
				continue;
			}
			$zid = substr( (string)$property, strlen( $prefix ) );
			if ( ZObjectUtils::isValidZObjectReference( $zid ) ) {
				$functions[] = $zid;
			}
		}

		sort( $functions );
		return $functions;
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/PageDeleteComplete
	 *
	 * @param ProperPageIdentity $page
	 * @param Authority $deleter
	 * @param string $reason
	 * @param int $pageID
	 * @param RevisionRecord $deletedRev
	 * @param ManualLogEntry $logEntry
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
		if ( !$this->providerFactory ) {
			return [];
		}
		try {
			$provider = $this->providerFactory->newProvider( $providerId );
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

			$files[] = [
				'name' => 'init.js',
				'main' => true,
				'content' => array_reduce( $files, static function ( $carry, $file ) {
					return "$carry\nrequire('./$file');\n";
				}, '' ),
			];

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

		$this->registerFunctionLookupModule( $resourceLoader );
	}

	/**
	 * Register the form control that CommunityConfiguration uses for our lists of functions.
	 *
	 * This has to happen here and not in extension.json, because the module depends on a module of
	 * CommunityConfiguration, and CommunityConfiguration is a soft dependency of WikiLambda. A
	 * static dependency would make this module fail to register on a wiki that does not have
	 * CommunityConfiguration, which core's ResourcesTest reports as an error.
	 *
	 * The module registers whatever the feature modes are. CommunityConfigurationHooks hides each
	 * of our providers on a wiki where its own mode is off, and two different modes each bring a
	 * provider that wants this control, so tying the module to one mode would be wrong. A module
	 * that nothing asks for costs nothing beyond its entry in the registry.
	 *
	 * @param ResourceLoader $resourceLoader
	 * @return void
	 */
	private function registerFunctionLookupModule( ResourceLoader $resourceLoader ): void {
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			return;
		}

		$resourceLoader->register( 'ext.wikilambda.functionLookup', [
			'class' => CodexModule::class,
			'localBasePath' => __DIR__ . '/../../resources/ext.wikilambda.functionLookup',
			'remoteExtPath' => 'WikiLambda/resources/ext.wikilambda.functionLookup',
			'codexComponents' => [
				'CdxField',
				'CdxMultiselectLookup',
			],
			'packageFiles' => [
				'index.js',
				'FunctionLookupControl.vue',
				'functionLookupApi.js',
			],
			'dependencies' => [
				'vue',
				'mediawiki.api',
				'mediawiki.ForeignApi',
				'mediawiki.jqueryMsg',
				'ext.communityConfiguration.Editor.controls',
			],
			'messages' => [
				'wikilambda-functionlookup-placeholder',
				'wikilambda-functionlookup-offline-placeholder',
				'wikilambda-functionlookup-no-results',
				'wikilambda-functionlookup-remove-button-label',
			],
		] );
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
