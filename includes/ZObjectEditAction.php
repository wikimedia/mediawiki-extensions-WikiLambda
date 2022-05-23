<?php
/**
 * WikiLambda edit action for ZObjects
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Action;
use Html;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;

class ZObjectEditAction extends Action {

	/**
	 * @inheritDoc
	 */
	public function getName() {
		return 'edit';
	}

	/**
	 * Get page title message
	 * @return string
	 */
	protected function getPageTitleMsg() {
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$targetZObject = $zObjectStore->fetchZObjectByTitle( $this->getTitle() );

		$prefix = Html::element(
			'span', [ 'class' => 'ext-wikilambda-editpage-header-title' ],
			$this->msg( 'wikilambda-special-edit-function-definition-title' )->text()
		);

		$label = Html::element(
			'span',
			[
				'class' => 'ext-wikilambda-editpage-header-title
					ext-wikilambda-editpage-header-title--function-name'
			],
			$targetZObject->getLabels()->getStringForLanguageOrEnglish( $this->getLanguage() )
		);

		$isoCode = '';
		// the MW code of the language currently being rendered (usually ISO code)
		$currLangCode = $this->msg( 'wikilambda-special-edit-function-definition-title' )->getLanguage()->getCode();
		// the MW code of the user's preferred language (usually ISO code)
		$userLanguageCode = $this->getLanguage()->getCode();
		// the string text of the language currently being rendered
		$currLangName = $this->msg(
			'wikilambda-special-edit-function-definition-title'
		)->getLanguage()->fetchLanguageName( $currLangCode );

		// show a language label if the text is not the user's preferred language
		// TODO (T309039): use the chip component and ZID language object here instead
		if ( $currLangCode !== $userLanguageCode ) {
			$isoCode = Html::element(
				"span data-title=$currLangName",
				[
					'class' => 'ext-wikilambda-editpage-header-title
						ext-wikilambda-editpage-header-title--iso-code'
				],
				$currLangCode
			);
		}

		return Html::rawElement(
			'span',
			[ 'class' => 'ext-wikilambda-editpage-header' ],
			$isoCode . " " . $prefix . $this->msg( 'colon-separator' )->text() . $label . "'"
		);
	}

	public function show() {
		$output = $this->getOutput();
		$output->addModules( [ 'ext.wikilambda.edit' ] );

		$userLang = $this->getLanguage();

		// The page title is the current ZID
		$zId = $this->getPageTitle();

		$output->addModuleStyles( [ 'ext.wikilambda.editpage.styles' ] );

		// (T290217) Show page title
		// NOTE setPageTitle sets both the HTML <title> header and the <h1> tag
		$output->setPageTitle( $this->getPageTitleMsg() );

		$linkLabel = Html::element(
			'a',
			[ 'class' => 'ext-wikilambda-editpage-header-description--link' ],
			$this->msg( 'wikilambda-special-edit-function-definition-special-permission-link-label' )->text()
		);

		$output->addHtml( Html::rawElement(
			'div', [ 'class' => 'ext-wikilambda-editpage-header-description' ],
			$this->msg( 'wikilambda-special-edit-function-definition-description' )->rawParams( $linkLabel )
			->escaped()
		) );

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
		$userLangZid = $zLangRegistry->getLanguageZidFromCode( $userLangCode, true );

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
