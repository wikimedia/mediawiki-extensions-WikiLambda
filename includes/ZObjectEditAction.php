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
		$langList = $langUtils->getLanguageNames( $userLang );

		$createNewPage = false;
		$zObject = ZPersistentObject::getObjectFromDB( $this->page->getTitle() );
		if ( !$zObject ) {
			$contentHandler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
			$zObject = $contentHandler->makeEmptyContent();
			$createNewPage = true;
		}

		// TODO: Use an API request on the JS side to get the known types (maybe just the 'default'
		// /core ones?) and their label for the user's language, rather than ship in the page
		// payload.
		$types_list = [
			ZTypeRegistry::Z_OBJECT => 'ZObject',
			ZTypeRegistry::Z_PERSISTENTOBJECT => 'Persistent ZObject',
			ZTypeRegistry::Z_KEY => 'Key',
			ZTypeRegistry::Z_TYPE => 'Type',
			ZTypeRegistry::Z_RECORD => 'Record',
			ZTypeRegistry::Z_STRING => 'String',
			ZTypeRegistry::Z_LIST => 'List',
			ZTypeRegistry::Z_MONOLINGUALSTRING => 'Monolingual String',
			ZTypeRegistry::Z_MULTILINGUALSTRING => 'Multilingual String'
		];

		// TODO: Use an API request on the JS side to get the keys (and their label for the user's
		// language) for each type as it's used. Possibly pre-populate for the core ones?
		$key_labels = [
			ZTypeRegistry::Z_OBJECT_TYPE => 'type',
			ZTypeRegistry::Z_PERSISTENTOBJECT_ID => 'id',
			ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE => 'value',
			ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL => 'label',
			ZTypeRegistry::Z_KEY_TYPE => 'value type',
			ZTypeRegistry::Z_KEY_ID => 'key id',
			ZTypeRegistry::Z_KEY_LABEL => 'label',
			ZTypeRegistry::Z_TYPE_IDENTITY => 'identity',
			ZTypeRegistry::Z_TYPE_KEYS => 'keys',
			ZTypeRegistry::Z_TYPE_VALIDATOR => 'validator',
			ZTypeRegistry::Z_RECORD_VALUE => 'value',
			ZTypeRegistry::Z_STRING_VALUE => 'value',
			ZTypeRegistry::Z_LIST_HEAD => 'head',
			ZTypeRegistry::Z_LIST_TAIL => 'tail',
			ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => 'language',
			ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => 'text',
			ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE => 'texts'
		];

		$editingData = [
			'zobject' => $zObject->getData()->getValue(),
			'zlang' => $userLang,
			'ztypes' => $types_list,
			'zlanguages' => $langList,
			'zkeylabels' => $key_labels,
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
