<?php
/**
 * WikiLambda ZPersistentObject
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
class ZPersistentObject extends JsonContent implements ZObject {

	/*
	 * Type of included ZObject, e.g. "ZList" or "ZString", as stored in Z1K1 in the serialised
	 * form if a record (or implicit if a ZString or ZList).
	 *
	 * Lazily-set on request.
	 */
	private $zObjectType;

	private $value;

	private $validity;

	public function __construct( $text = null, $modelId = CONTENT_MODEL_ZOBJECT ) {
		try {
			$this->value = ZObjectFactory::createFromSerialisedString( $text );
		} catch ( \InvalidArgumentException $e ) {
			$this->value = $text;
			$this->validity = false;
		}

		parent::__construct( $text, $modelId );
	}

	/**
	 * Validate this ZObject against our schema, to prevent creation and saving of invalid items.
	 *
	 * @return bool Whether content is valid
	 */
	public function isValid() : bool {
		if ( $this->validity !== null ) {
			return $this->validity;
		}

		if ( !parent::isValid() ) {
			$this->validity = false;
			return false;
		}

		$contentBlob = $this->getData()->getValue();
		if ( !ZObjectUtils::isValidZObject( $contentBlob ) ) {
			$this->validity = false;
			return false;
		}

		// HACK: This gets the value and deserialises it, and throws if invalid, but it's heavy
		// and not very pretty.
		try {
			$this->getZObject();
			$this->getZType();
		} catch ( \InvalidArgumentException $e ) {
			$this->validity = false;
			return false;
		}

		$this->validity = true;
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

	private function getZObject() {
		if ( $this->value === null ) {
			$this->value = ZObjectFactory::createFromSerialisedString( $this->getData()->getValue() );
		}
		return $this->value;
	}

	public function getZValue() {
		return $this->getZObject()->getZValue();
	}

	public function getZType() : string {
		if ( $this->zObjectType === null ) {
			$registry = ZTypeRegistry::singleton();

			$this->zObjectType = $this->getZObject()->getZType();
		}

		return $this->zObjectType;
	}
}
