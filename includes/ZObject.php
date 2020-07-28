<?php
/**
 * WikiLambda ZObject
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use JsonContent;

class ZObject extends JsonContent {

	public function __construct( $text = null, $modelId = CONTENT_MODEL_JSON ) {
		// FIXME: This needs to be a factory to instantiate a ZFunction or whatever instead.
		parent::__construct( $text, $modelId );
	}

	/**
	 * Validate this ZObject against our schema, to prevent creation and saving of invalid items.
	 *
	 * @return bool Whether content is valid
	 */
	public function isValid() {
		if ( !parent::isValid() ) {
			return false;
		}

		return true;
	}
}
