<?php
/**
 * WikiLambda edit action for ZObjects
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Action;
use Html;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;

class ZObjectEditAction extends Action {
	public function getName() {
		return 'edit';
	}

	public function show() {
		$output = $this->getOutput();
		$output->addModules( 'ext.wikilambda.edit' );

		$userLang = $this->getLanguage();

		// The page title is the current ZID
		$zId = $this->getPageTitle();

		// (T290217) Show page title
		// NOTE setPageTitle sets both the HTML <title> header and the <h1> tag
		$editingMsg = $this->msg( 'editing', $zId );
		$output->setPageTitle( $editingMsg );

		// Fallback no-JS notice.
		$output->addHtml( Html::element(
			'div',
			[ 'class' => [ 'client-nojs', 'ext-wikilambda-editor-nojswarning' ] ],
			$this->msg( 'wikilambda-special-createzobject-nojs' )->inLanguage( $userLang )->text()
		) );

		$userLangCode = $userLang->getCode();

		$createNewPage = false;

		// If the userLang isn't recognised (e.g. it's qqx, or a language we don't support yet, or it's
		// nonsense), then fall back to English.
		$zLangRegistry = ZLangRegistry::singleton();
		$userLangZid = $zLangRegistry->getLanguageZidFromCode(
			( $zLangRegistry->isLanguageKnownGivenCode( $userLangCode ) )
				? $userLangCode
				: 'en'
			);

		$editingData = [
			'zlang' => $userLangCode,
			'zlangZid' => $userLangZid,
			'createNewPage' => $createNewPage,
			'zId' => $zId,
			'viewmode' => false
		];

		$output->addJsConfigVars( 'wgWikiLambda', $editingData );

		// Vue app element
		$output->addHtml( Html::element( 'div', [ 'id' => 'ext-wikilambda-app' ] ) );
	}

	public function doesWrites() {
		return true;
	}
}
