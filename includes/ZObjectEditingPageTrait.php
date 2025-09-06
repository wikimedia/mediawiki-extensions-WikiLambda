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

		// Fallback no-JS notice.
		$output->addHtml( Html::element(
			'div',
			[ 'class' => [ 'client-nojs', 'ext-wikilambda-editor-nojswarning' ] ],
			$context->msg( 'wikilambda-special-createobject-nojs' )->inLanguage( $userLang )->text()
		) );

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

		// Vue app element
		$output->addHtml( Html::element( 'div', [ 'id' => 'ext-wikilambda-app' ] ) );
	}
}
