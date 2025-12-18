<?php
/**
 * WikiLambda Object page util (trait) for edition or creation
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Context\IContextSource;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Html\Html;
use MediaWiki\Output\OutputPage;

trait ZObjectEditingPageTrait {
	/**
	 * Generate the edition or creation header and render it in the output.
	 *
	 * @param OutputPage $output
	 * @param IContextSource $context
	 * @param array $jsEditingConfigVarOverride variables to pass to the mw.config in JavaScript.
	 */
	public function generateZObjectPayload(
		OutputPage $output, IContextSource $context, array $jsEditingConfigVarOverride
	) {
		$userLang = $context->getLanguage();

		// Only add no-JS notice for edit/create modes, not view mode (content handler handles it)
		$isViewMode = ( $jsEditingConfigVarOverride['viewmode'] ?? false ) === true;
		if ( !$isViewMode ) {
			// Fallback no-JS notice.
			$output->addHtml( Html::rawElement(
				'noscript',
				[],
				$context->msg( 'wikilambda-nojs' )->inLanguage( $userLang )->parse()
			) );
			// Vue app element with Codex progress indicator
			$loadingMessage = $context->msg( 'wikilambda-loading' )->inLanguage( $userLang )->text();
			$output->addHtml( Html::rawElement(
				'div',
				[ 'id' => 'ext-wikilambda-app' ],
				UIUtils::createCodexProgressIndicator( $loadingMessage )
			) );
		}

		$userLangCode = $userLang->getCode();

		$zLangRegistry = ZLangRegistry::singleton();
		// If the userLang isn't recognised (e.g. it's qqx, or a language we don't support yet, or it's
		// nonsense), then fall back to English.
		$userLangZid = $zLangRegistry->getLanguageZidFromCode( $userLangCode, true );
		// Normalise our used language code from what the Language object says
		$userLangCode = $zLangRegistry->getLanguageCodeFromZid( $userLangZid );

		$jsEditingConfigVarBase = [
			'zlang' => $userLangCode,
			'zlangZid' => $userLangZid,
			'viewmode' => false
		];
		$jsEditingConfigVar = array_merge( $jsEditingConfigVarBase, $jsEditingConfigVarOverride );

		$output->addJsConfigVars( 'wgWikiLambda', $jsEditingConfigVar );
	}
}
