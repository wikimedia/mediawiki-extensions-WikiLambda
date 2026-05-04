<?php
/**
 * WikiLambda HTMLSelectZTypeField extends HTMLSelectField
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Fields;

use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\HTMLForm\Field\HTMLSelectField;

class HTMLZTypeSelectField extends HTMLSelectField {

	/**
	 * @inheritDoc
	 */
	public function __construct( $params ) {
		parent::__construct( $params );

		// Get user language to select best labels for each item
		$languageCode = $this->mParent->getLanguage()->getCode();

		// Get all valid WikiLambda types with instances: zids and labels
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$types = $zObjectStore->fetchAllInstancedTypesWithLabels( $languageCode ) ?? [];

		// Create the options array with all existing ZTypes
		foreach ( $types as $row ) {
			$typeZid = htmlspecialchars( $row->wlzl_zobject_zid ?? '' );
			$info = $this->msg( 'parentheses' )->rawParams( $typeZid )->parse();
			$label = $row->wlzl_label . ' ' . $info;
			$this->mParams[ 'options' ][ $label ] = $row->wlzl_zobject_zid;
		}
	}

	/**
	 * @inheritDoc
	 */
	public function getOptions() {
		if ( $this->mOptions === null ) {
			return [];
		}

		return parent::getOptions();
	}

}
