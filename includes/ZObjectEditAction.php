<?php
/**
 * WikiLambda edit action for ZObjects
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Action;
use Html;
use MediaWiki\MediaWikiServices;

class ZObjectEditAction extends Action {
	public function getName() {
		return 'edit';
	}

	public function show() {
		$output = $this->getOutput();
		$output->addModules( 'ext.wikilambda.edit' );

		$userLang = $this->getLanguage()->getCode();

		$langUtils = MediaWikiServices::getInstance()->getLanguageNameUtils();

		$createNewPage = false;
		$zObject = ZPersistentObject::getObjectFromDB( $this->page->getTitle() );
		if ( !$zObject ) {
			$contentHandler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
			$zObject = $contentHandler->makeEmptyContent();
			$createNewPage = true;
		}

		$editingData = [
			'zobject' => $zObject->getData()->getValue(),
			'zlang' => $userLang,
			// TODO: Use an API request on the JS side to get the known types (maybe just the 'default'
			// /core ones?) and their label for the user's language, rather than ship in the page
			// payload.
			'ztypes' => ZTypeRegistry::TEMP_TYPES_IN_ENGLISH,
			'zlanguages' => $langUtils->getLanguageNames( $userLang ),
			// TODO: Use an API request on the JS side to get the keys (and their label for the user's
			// language) for each type as it's used. Possibly pre-populate for the core ones?
			'zkeylabels' => ZTypeRegistry::TEMP_KEY_LABELS_IN_ENGLISH,
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
