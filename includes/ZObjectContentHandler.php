<?php
/**
 * WikiLambda ZObjectContentHanlder
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use JsonContentHandler;
use MWException;
use Title;

class ZObjectContentHandler extends JsonContentHandler {

	public function __construct( $modelId ) {
		if ( $modelId !== CONTENT_MODEL_ZOBJECT ) {
			throw new MWException( __CLASS__ . " initialised for invalid content model" );
		}

		parent::__construct( CONTENT_MODEL_ZOBJECT );
	}

	public function canBeUsedOn( Title $title ) {
		return $title->inNamespace( NS_ZOBJECT );
	}

	/**
	 * @return ZPersistentObject
	 */
	public function makeEmptyContent() {
		// { Z1K1: Z2, Z2K2: "" }
		return new ZPersistentObject( '{"Z1K1":"Z2","Z2K2":""}' );
	}

	/**
	 * @return string
	 */
	protected function getContentClass() {
		return ZPersistentObject::class;
	}

}
