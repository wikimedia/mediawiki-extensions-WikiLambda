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
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Output\OutputPage;
use MediaWiki\Page\WikiPage;
use MediaWiki\Registration\ExtensionRegistry;
use MediaWiki\ResourceLoader\CodexModule;
use MediaWiki\ResourceLoader\ImageModule;
use MediaWiki\ResourceLoader\ResourceLoader;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Storage\EditResult;
use MediaWiki\User\UserIdentity;
use Psr\Log\LoggerInterface;

class ClientHooks implements
	\MediaWiki\Storage\Hook\PageSaveCompleteHook,
	\MediaWiki\ResourceLoader\Hook\ResourceLoaderRegisterModulesHook,
	\MediaWiki\Output\Hook\MakeGlobalVariablesScriptHook
{
	private Config $config;

	private LoggerInterface $logger;

	public function __construct(
		Config $config
	) {
		$this->config = $config;

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
		if ( !$this->config->get( 'WikiLambdaEnableClientMode' ) ) {
			// Nothing for us to do.
			return;
		}

		// We use this hook to clear out cached tracking of Wikifunctions calls, if any.
		// Any new entries are added by WikifunctionsClientUsageUpdateJob, which runs later.
		$wikifunctionsClientStore = WikiLambdaServices::getWikifunctionsClientStore();
		$this->logger->debug( __METHOD__ . ': Clearing usage tracking for {page}', [
			'page' => $wikiPage->getTitle()->getFullText(),
		] );
		$wikifunctionsClientStore->deleteWikifunctionsUsage( $wikiPage->getTitle() );
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
					'wikilambda-suggested-functions.json',
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
					'wikilambda-visualeditor-wikifunctionscall-error-bad-function',
					'wikilambda-visualeditor-wikifunctionscall-error-enum',
					'wikilambda-visualeditor-wikifunctionscall-error-parser',
					'wikilambda-visualeditor-wikifunctionscall-error-parser-empty',
					'wikilambda-visualeditor-wikifunctionscall-dialog-read-more-description',
					'wikilambda-visualeditor-wikifunctionscall-dialog-read-less-description',
					'wikilambda-visualeditor-wikifunctionscall-info-missing-content',
					'brackets',
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
