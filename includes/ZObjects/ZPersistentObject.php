<?php
/**
 * WikiLambda ZPersistentObject
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use FormatJson;
use Html;
use JsonContent;
use Language;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\RevisionStore;
use MediaWiki\Revision\SlotRecord;
use ParserOptions;
use ParserOutput;
use RequestContext;
use Status;
use Title;
use User;
use WikiPage;

/**
 * This class represents the top-level, persistent ZObject, as stored in MediaWiki.
 */
class ZPersistentObject extends JsonContent {

	/**
	 * Type of included ZObject, e.g. "ZList" or "ZString", as stored in the serialised
	 * form if a record (or implicit if a ZString or ZList).
	 *
	 * Lazily-set on request.
	 *
	 * @var string|null
	 */
	private $zObjectType;

	/** @var bool|null */
	private $validity;

	/** @var array */
	private $data = [];

	public static function getDefinition() : array {
		return [
			'type' => ZTypeRegistry::Z_PERSISTENTOBJECT,
			'keys' => [
				ZTypeRegistry::Z_PERSISTENTOBJECT_ID => [
					'type' => ZTypeRegistry::HACK_REFERENCE,
					'optional' => true,
					'default' => 'Z0',
				],
				ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE => [
					'type' => ZTypeRegistry::Z_OBJECT,
				],
				ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL => [
					'type' => ZTypeRegistry::Z_MULTILINGUALSTRING,
				],
			],
		];
	}

	public function __construct( $text = null, $modelId = CONTENT_MODEL_ZOBJECT ) {
		// NOTE: We don't bother to evaluate the Z_PERSISTENTOBJECT_LABEL at this point.
		try {
			$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] =
				ZObjectFactory::createFromSerialisedString( $text );
		} catch ( \InvalidArgumentException $e ) {
			$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] = $text;
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

		$revision = self::$revisionStore->getRevisionByTitle( $title );

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

		// If the page data is just a string and can't be turned into a JSON object, it's invalid.
		if ( is_string( $this->getData()->getValue() ) ) {
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
		if ( $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] === null ) {
			$valueObject = get_object_vars( $this->getData()->getValue() );
			$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] = ZObjectFactory::createFromSerialisedString(
				$valueObject[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ]
			);
		}
		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ];
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
				$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE ] = $attempt->getZType();
			}

			$this->zObjectType = $this->getInnerZObject()->getZType();
		}

		return $this->zObjectType;
	}

	/**
	 * Fetch the label set for this ZPersistentObject.
	 *
	 * @return ZMultiLingualString
	 */
	public function getLabels() {
		if (
			!isset( $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ] )
			|| $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ] === null
		) {
			$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ] = new ZMultiLingualString();

			$content = $this->getData()->getValue();
			if ( $content ) {
				$valueObject = get_object_vars( $this->getData()->getValue() );
				if ( array_key_exists( ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL, $valueObject ) ) {
					$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ] = ZObjectFactory::create(
						$valueObject[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ]
					);
				}
			}
		}

		return $this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ];
	}

	/**
	 * Replace the label set for this instantiation of the ZPersistentObject with the given input.
	 *
	 * NOTE: This replacement is not persisted to the MediaWiki back-end.
	 *
	 * @param ZMultiLingualString $labelSet
	 */
	public function setLabels( ZMultiLingualString $labelSet ) {
		$this->data[ ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL ] = $labelSet;
	}

	/**
	 * Fetch the label for a given Language (or its fallback).
	 *
	 * @param Language $language Language in which to provide the label.
	 * @return string
	 */
	public function getLabel( $language ) {
		return $this->getLabels()->getStringForLanguage( $language );
	}

	/**
	 * Set the HTML and add the appropriate styles.
	 *
	 * <span class="ext-wikilambda-viewpage-header">
	 *     <span class="ext-wikilambda-viewpage-header-label firstHeading">multiply</h1>
	 *     <span class="ext-wikilambda-viewpage-header-zid">Z12345</span>
	 *     <div class="ext-wikilambda-viewpage-header-type">ZFunction…</div>
	 * </span>
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
		$htmlJsonContent = $output->getText();

		$userLang = RequestContext::getMain()->getLanguage();

		$label = Html::element(
			'span', [ 'class' => 'ext-wikilambda-viewpage-header-title' ],
			$this->getLabel( $userLang )
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
			'span',
			[ 'class' => 'ext-wikilambda-viewpage-header' ],
			$label . ' ' . $id . $type
		);

		$output->addModuleStyles( 'ext.wikilambda.viewpage.styles' );
		$output->setTitleText( $header );

		$output->addModules( 'ext.wikilambda.edit' );
		$zObject = self::getObjectFromDB( $title );
		$userLangCode = $userLang->mCode;
		$langUtils = MediaWikiServices::getInstance()->getLanguageNameUtils();
		$editingData = [
			'title' => $title->getBaseText(),
			'page' => $title->getPrefixedDBkey(),
			'zobject' => $zObject->getData()->getValue(),
			'zlang' => $userLangCode,
			'zlanguages' => $langUtils->getLanguageNames( $userLangCode ),
			'createNewPage' => false
		];

		$output->addJsConfigVars( 'extWikilambdaEditingData', $editingData );

		$output->setText(
			// Placeholder div for the Vue template.
			Html::element( 'div', [ 'id' => 'ext-wikilambda-view' ] )
			// Fallback div for the HTML version and warning.
			. Html::rawElement(
				'div',
				[
					'class' => [ 'ext-wikilambda-view-nojsfallback' ],
				],
				Html::element(
					'div',
					[
						'class' => [ 'ext-wikilambda-view-nojswarning', 'warning' ],
					],
					wfMessage( 'wikilambda-viewmode-nojs' )->inLanguage( $userLang )->text()
				) .
				$htmlJsonContent
			)
		);
	}
}
