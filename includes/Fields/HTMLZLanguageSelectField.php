<?php
/**
 * WikiLambda HTMLSelectZLanguageField extends HTMLSelectField
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Fields;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\HTMLForm\Field\HTMLSelectField;
use MediaWiki\HTMLForm\HTMLForm;

class HTMLZLanguageSelectField extends HTMLSelectField {

	/**
	 * @inheritDoc
	 */
	public function __construct( $params ) {
		parent::__construct( $params );

		// Get user language to select best labels for each item
		$language = ( $this->mParent instanceof HTMLForm ) ?
			$this->mParent->getLanguage() :
			RequestContext::getMain()->getLanguage();
		$languageCode = $language->getCode();

		// Get all valid WikiLambda languages: zids, codes and labels
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$languages = $zObjectStore->fetchAllZLanguagesWithLabels( $languageCode );
		$languageZid = ZLangRegistry::singleton()->getLanguageZidFromCode( $languageCode );

		// Create the options array with all existing ZLanguages
		foreach ( $languages as $row ) {
			$langCode = htmlspecialchars( $row->wlzlangs_language ?? '' );
			$langZid = htmlspecialchars( $row->wlzl_zobject_zid ?? '' );
			$info = $this->msg( 'parentheses' )
				->rawParams( $language->commaList( [ $langCode, $langZid ] ) )
				->parse();
			$label = $row->wlzl_label . ' ' . $info;
			$this->mParams[ 'options' ][ $label ] = $row->wlzl_zobject_zid;
		}

		$this->mParams[ 'default' ] ??= $languageZid;
	}
}
