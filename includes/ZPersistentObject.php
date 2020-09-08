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
use Html;
use JsonContent;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\Revision\SlotRecord;
use ParserOptions;
use ParserOutput;
use Status;
use Title;
use User;
use WikiPage;

/**
 * This class represents the top-level, persistent ZObject, as stored in MediaWiki.
 */
class ZPersistentObject extends JsonContent implements ZObject {

	/*
	 * Type of included ZObject, e.g. "ZList" or "ZString", as stored in the serialised
	 * form if a record (or implicit if a ZString or ZList).
	 *
	 * Lazily-set on request.
	 */
	private $zObjectType;

	private $validity;

	private $keys = [
		// TODO: Provide a JSON dump function that substitues the page name for Z_PERSISTENTOBJECT_ID.
		ZTypeRegistry::Z_PERSISTENTOBJECT_ID => 'Z0',
		ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE => null,
		ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL => null
	];

	public function __construct( $text = null, $modelId = CONTENT_MODEL_ZOBJECT ) {
		// NOTE: We don't bother to evaluate the Z_PERSISTENTOBJECT_LABEL at this point.
		try {
			$this->keys[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] = ZObjectFactory::createFromSerialisedString( $text );
		} catch ( \InvalidArgumentException $e ) {
			$this->keys[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] = $text;
			$this->validity = false;
		}

		parent::__construct( $text, $modelId );
	}

	public static function create( array $objectVars ) : ZObject {
		if ( !array_key_exists( ZTypeRegistry::Z_PERSISTENTOBJECT_ID, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZPersistentObject missing the id key." );
		}
		if ( !array_key_exists( ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZPersistentObject missing the value key." );
		}
		if ( !array_key_exists( ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL, $objectVars ) ) {
			throw new \InvalidArgumentException( "ZPersistentObject missing the label key." );
		}
		// NOTE: For ZPersistentObject, we care about the *inner object*, not the ZPO itself
		return ZObjectFactory::create( $objectVars[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] );
	}

	/** @var RevisionStore */
	private static $revisionStore;

	/**
	 * Fetch a given Title's ZPersistentObject from the database, and inflate it.
	 *
	 * @param Title $title The page to fetch.
	 * @return ZPersistentObject|false The ZPersistentObject requested.
	 */
	public static function getObjectFromDB( Title $title ) {
		if ( !$title->isKnown() ) {
			return false;
		}

		if ( self::$revisionStore === null ) {
			self::$revisionStore = MediaWikiServices::getInstance()->getRevisionStore();
		}

		$revision = self::$revisionStore->getRevisionById( $title->getLatestRevID() );

		if ( !$revision ) {
			return false;
		}

		// NOTE: Hard-coding use of MAIN slot; if we're going the MCR route, we may wish to change this (or not).
		$text = $revision->getSlot( SlotRecord::MAIN, RevisionRecord::RAW )->getContent()->getNativeData();

		$zObject = new ZPersistentObject( $text );

		return $zObject;
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
			$this->getInnerZObject();
			$this->getZType();
			$this->getLabels();
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
		if ( !$this->isValid() ) {
			return $this;
		}

		$json = ZObjectUtils::canonicalize( $this->getData()->getValue() );
		$encoded = FormatJson::encode( $json, true, FormatJson::UTF8_OK );

		return new static( self::normalizeLineEndings( $encoded ) );
	}

	public function getInnerZObject() {
		if ( $this->keys[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] === null ) {
			$valueObject = get_object_vars( $this->getData()->getValue() );
			$this->keys[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] = ZObjectFactory::createFromSerialisedString(
				$valueObject[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ]
			);
		}
		return $this->keys[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ];
	}

	public function getZValue() {
		return $this->getInnerZObject()->getZValue();
	}

	public function getZType() : string {
		if ( $this->zObjectType === null ) {
			$zObject = $this->getInnerZObject();
			// For situations where the ZPO was created in an invalid state, it's possible to reach
			// this point. TODO: Consider re-factoring to avoid this secondary check?
			if ( is_string( $zObject ) ) {
				$attempt = ZObjectFactory::createFromSerialisedString( $zObject );
				$this->keys[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] = $attempt->getZType();
			}

			$this->zObjectType = $this->getInnerZObject()->getZType();
		}

		return $this->zObjectType;
	}

	public function getLabels() {
		if ( $this->keys[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ] === null ) {
			$this->keys[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ] = new ZMultiLingualString();

			$content = $this->getData()->getValue();
			if ( $content ) {
				$valueObject = get_object_vars( $this->getData()->getValue() );
				if ( array_key_exists( ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL, $valueObject ) ) {
					$this->keys[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ] = ZObjectFactory::create(
						$valueObject[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ]
					);
				}
			}
		}

		return $this->keys[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ];
	}

	public function getLabel( $language ) {
		return $this->getLabels()->getStringForLanguage( $language );
	}

	/**
	 * Set the HTML and add the appropriate styles.
	 *
	 * <div class="ext-wikilambda-viewpage-header">
	 *     <span class="ext-wikilambda-viewpage-header-label firstHeading">multiply</h1>
	 *     <span class="ext-wikilambda-viewpage-header-zid">Z12345</div>
	 *     <div class="ext-wikilambda-viewpage-header-type">ZFunction…</div>
	 * </div>
	 *
	 * @param Title $title
	 * @param int $revId
	 * @param ParserOptions $options
	 * @param bool $generateHtml
	 * @param ParserOutput &$output
	 */
	protected function fillParserOutput(
		Title $title, $revId, ParserOptions $options, $generateHtml, ParserOutput &$output
	) {
		parent::fillParserOutput( $title, $revId, $options, $generateHtml, $output );

		$label = Html::element(
			'span', [ 'class' => 'ext-wikilambda-viewpage-header-title' ],
			$this->getLabel( \RequestContext::getMain()->getLanguage() )
		);
		$id = Html::element(
			'span', [ 'class' => 'ext-wikilambda-viewpage-header-zid' ],
			$title->getText()
		);

		$type = Html::element(
			'div', [ 'class' => 'ext-wikilambda-viewpage-header-type' ],
			wfMessage( 'wikilambda-persistentzobject' )->inContentLanguage()->text()
				. wfMessage( 'colon-separator' )->inContentLanguage()->text()
				. $this->getZType()
		);

		$header = Html::rawElement(
			'div',
			[ 'class' => 'ext-wikilambda-viewpage-header' ],
			$label . $id . $type
		);

		$output->addModuleStyles( 'ext.wikilambda.viewpage.styles' );
		$output->setTitleText( $header );
	}
}
