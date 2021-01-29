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
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\MediaWikiServices;

class ZObjectEditAction extends Action {
	public function getName() {
		return 'edit';
	}

	public function show() {
		$output = $this->getOutput();
		$output->addModules( 'ext.wikilambda.edit' );

		$userLang = $this->getLanguage();

		// Fallback no-JS notice.
		$output->addHtml( Html::element(
			'div',
			[ 'class' => [ 'client-nojs', 'ext-wikilambda-editor-nojswarning' ] ],
			$this->msg( 'wikilambda-special-createzobject-nojs' )->inLanguage( $userLang )->text()
		) );

		$userLangCode = $userLang->getCode();

		$langUtils = MediaWikiServices::getInstance()->getLanguageNameUtils();

		$createNewPage = false;
		$zObject = ZPersistentObject::getObjectFromDB( $this->page->getTitle() );
		if ( !$zObject ) {
			$contentHandler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
			$zObject = $contentHandler->makeEmptyContent();
			$createNewPage = true;
		}

		$editingData = [
			'title' => $this->getTitle()->getBaseText(),
			'page' => $this->getTitle()->getPrefixedDBkey(),
			'zobject' => $zObject->getData()->getValue(),
			'zlang' => $userLangCode,
			'zlanguages' => $langUtils->getLanguageNames( $userLangCode ),
			'createNewPage' => $createNewPage
		];

		$output->addJsConfigVars( 'extWikilambdaEditingData', $editingData );

		// Vue app element
		$output->addHtml( Html::element( 'div', [ 'id' => 'ext-wikilambda-editor' ] ) );
	}

	public function doesWrites() {
		return true;
	}
}
