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

use FormatJson;
use JsonContent;
use ParserOptions;
use Status;
use Title;
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

	public function preSaveTransform( Title $title, User $user, ParserOptions $popts ) {
		// FIXME: WikiPage::doEditContent invokes PST before validation. As such, native data
		// may be invalid (though PST result is discarded later in that case).
		if ( !$this->isValid() ) {
			return $this;
		}

		$json = ZObjectUtils::canonicalize( $this->getData()->getValue() );
		$encoded = FormatJson::encode( $json, true, FormatJson::UTF8_OK );

		return new static( self::normalizeLineEndings( $encoded ) );
	}
}
