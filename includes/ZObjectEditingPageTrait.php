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

use Html;
use IContextSource;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use OutputPage;

trait ZObjectEditingPageTrait {
	/**
	 * Generate the edition or creation header and render it in the output.
	 *
	 * @param OutputPage $output
	 * @param IContextSource $context
	 * @param array $jsEditingConfigVarOverride variables to pass to the mw.config in JavaScript.
	 *
	 */
	public function generateZObjectPayload(
		OutputPage $output, IContextSource $context, array $jsEditingConfigVarOverride
	) {
		$userLang = $context->getLanguage();

		// Fallback no-JS notice.
		$output->addHtml( Html::element(
			'div',
			[ 'class' => [ 'client-nojs', 'ext-wikilambda-editor-nojswarning' ] ],
			$context->msg( 'wikilambda-special-createzobject-nojs' )->inLanguage( $userLang )->text()
		) );

		$userLangCode = $userLang->getCode();

		// If the userLang isn't recognised (e.g. it's qqx, or a language we don't support yet, or it's
		// nonsense), then fall back to English.
		$zLangRegistry = ZLangRegistry::singleton();
		$userLangZid = $zLangRegistry->getLanguageZidFromCode( $userLangCode, true );

		$jsEditingConfigVarBase = [
			'zlang' => $userLangCode,
			'zlangZid' => $userLangZid,
			'viewMode' => false
		];
		$jsEditingConfigVar = array_merge( $jsEditingConfigVarBase, $jsEditingConfigVarOverride );

		$output->addJsConfigVars( 'wgWikiLambda', $jsEditingConfigVar );

		// Vue app element
		$output->addHtml( Html::element( 'div', [ 'id' => 'ext-wikilambda-app' ] ) );
	}

	/**
	 * show a language label if the text is not the user's preferred language
	 *
	 * @param string $langCode
	 * @param string $langTitle
	 * @param string $userLangCode
	 * @param string $isoCodeClassName
	 *
	 * @return string
	 */
	public function getIsoCodeIfUserLangIsDifferent(
		string $langCode, string $langTitle, string $userLangCode, string $isoCodeClassName
	): string {
		return $langCode === $userLangCode ? '' :
			ZObjectUtils::getIsoCode( $langCode, $langTitle, $isoCodeClassName );
	}
}
