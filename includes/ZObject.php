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
use Status;
use User;
use WikiPage;

/**
 * This class represents the top-level, persistent ZObject, as stored in MediaWiki.
 */
class ZObject extends JsonContent {

	public function __construct( $text = null, $modelId = CONTENT_MODEL_ZOBJECT ) {
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

		$contentBlob = $this->getData()->getValue();
		if ( !ZObjectUtils::isValidZObject( $contentBlob ) ) {
			return false;
		}

		return true;
	}

	/**
	 * @param WikiPage $page
	 * @param int $flags
	 * @param int $parentRevId
	 * @param User $user
	 * @return Status
	 */
	public function prepareSave( WikiPage $page, $flags, $parentRevId, User $user ) {
		if ( !$this->isValid() ) {
			return Status::newFatal( "wikilambda-invalidzobject" );
		}

		return Status::newGood();
	}
}
