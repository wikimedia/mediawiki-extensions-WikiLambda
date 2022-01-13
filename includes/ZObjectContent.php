<?php
/**
 * WikiLambda ZObjectContent
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use AbstractContent;
use FormatJson;
use Language;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualStringSet;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\MediaWikiServices;
use Status;
use Title;

/**
 * This class represents the wrapper for a ZObject, as stored in MediaWiki. Though its form is
 * intentionally similar to that of a ZObject, representing a 'Persistent ZObject' or Z2, it
 * has several differences to account for the Content hierarchy and how it serves as the bridge
 * between MediaWiki 'real' content and the functional model.
 */
class ZObjectContent extends AbstractContent {

	/**
	 * Fundamental internal representation, as stored in MediaWiki.
	 *
	 * In practice, this currently is a JSON stringification of the object model. However, this
	 * is an implementation detail, and in future might change; it should not be relied upon.
	 *
	 * @var string
	 */
	private $text;

	/**
	 * Object representation of the content, as specified in the Functional Model.
	 *
	 * @var \stdClass
	 */
	private $object;

	/**
	 * ZPersistentObject that wraps the ZObject represented in this content object.
	 *
	 * @var ZPersistentObject|null
	 */
	private $zobject = null;

	/**
	 * @var Status|null
	 */
	private $status = null;

	/**
	 * @var ZError
	 */
	private $error = null;

	/**
	 * Builds the Content object that can be saved in the Wiki
	 * Doesn't validate the ZObject, but checks for syntactical validity
	 *
	 * @param string $text
	 * @throws ZErrorException
	 */
	public function __construct( $text ) {
		// Some unit tests somehow don't load our constant by this point, so defensively provide it as needed.
		$ourModel = defined( 'CONTENT_MODEL_ZOBJECT' ) ? CONTENT_MODEL_ZOBJECT : 'zobject';
		parent::__construct( $ourModel );

		// Check that the input is a valid string
		if ( !is_string( $text ) ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_INVALID_FORMAT, [
						'data' => $text
					] )
			);
		}

		// Check that the input is a valid JSON
		$parseStatus = FormatJson::parse( $text );
		if ( !$parseStatus->isGood() ) {
			$errorMessage = wfMessage( $parseStatus->getErrors()[0]['message'] )->inContentLanguage()->text();
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_INVALID_JSON, [
						'message' => $errorMessage,
						'data' => $text
					] )
			);
		}

		// Save the string and object content
		// TODO: We might not need the text content
		$this->text = $text;
		$this->object = $parseStatus->getValue();
	}

	/**
	 * Tries to build the wrapped ZObject by calling ZObjectFactory::createPersistentContent()
	 * and sets the resulting validation status on $this->status
	 */
	private function validateContent() {
		$this->status = new Status();
		try {
			$this->zobject = ZObjectFactory::createPersistentContent( $this->getObject() );
		} catch ( ZErrorException $e ) {
			$this->status->fatal( $e->getMessage() );
			$this->error = $e->getZError();
		}
	}

	/**
	 * @inheritDoc
	 */
	public function isValid() {
		if ( !( $this->status instanceof Status ) ) {
			$this->validateContent();
		}
		return $this->status->isOK();
	}

	/**
	 * @return Status|null
	 */
	public function getStatus() {
		return $this->status;
	}

	/**
	 * @return ZError
	 */
	public function getErrors() {
		return $this->error;
	}

	/**
	 * @inheritDoc
	 */
	public function getText() {
		return $this->text;
	}

	/**
	 * @return \stdClass
	 */
	public function getObject() {
		return $this->object;
	}

	/**
	 * @return ZPersistentObject|null
	 */
	public function getZObject() {
		return $this->zobject;
	}

	/**
	 * Wrapper for ZPersistentObject getInnerZObject method. Returns the inner ZObject.
	 *
	 * @return ZObject
	 * @throws ZErrorException
	 */
	public function getInnerZObject(): ZObject {
		if ( !$this->isValid() ) {
			throw new ZErrorException( $this->error );
		}
		return $this->zobject->getInnerZObject();
	}

	/**
	 * Wrapper for ZPersistentObject getZid method. Returns the Zid of the persistent object
	 *
	 * @return string The persisted (or null) Zid
	 * @throws ZErrorException
	 */
	public function getZid() {
		if ( !$this->isValid() ) {
			throw new ZErrorException( $this->error );
		}
		return $this->zobject->getZid();
	}

	/**
	 * String representation of the type of this ZObject
	 *
	 * @param Language $language Language in which to provide the string.
	 * @return string
	 * @throws ZErrorException
	 */
	public function getTypeString( $language ): string {
		$type = $this->getZType();
		$typeTitle = Title::newFromText( $type, NS_MAIN );
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$typeObject = $zObjectStore->fetchZObjectByTitle( $typeTitle );
		if ( $typeObject ) {
			$label = $typeObject->getLabels()->getStringForLanguageOrEnglish( $language );
		} else {
			$label = wfMessage( 'wikilambda-typeunavailable' )->inContentLanguage()->text();
		}
		return $label
			. wfMessage( 'word-separator' )->inContentLanguage()->text()
			. wfMessage( 'parentheses' )->rawParams( $this->getZType() )->text();
	}

	/**
	 * Wrapper for ZPersistentObject getInternalZType method. Returns the ZType of the internal ZObject.
	 *
	 * @return string
	 * @throws ZErrorException
	 */
	public function getZType(): string {
		if ( !$this->isValid() ) {
			throw new ZErrorException( $this->error );
		}
		return $this->zobject->getInternalZType();
	}

	/**
	 * Wrapper for ZPersistentObject getZValue method. Returns the value of the internal ZObject.
	 *
	 * @return mixed
	 * @throws ZErrorException
	 */
	public function getZValue() {
		if ( !$this->isValid() ) {
			throw new ZErrorException( $this->error );
		}
		return $this->zobject->getZValue();
	}

	/**
	 * Wrapper for ZPersistentObject getLabels method. Returns the labels of the ZPersistentObject.
	 *
	 * @return ZMultilingualString
	 * @throws ZErrorException
	 */
	public function getLabels(): ZMultiLingualString {
		if ( !$this->isValid() ) {
			throw new ZErrorException( $this->error );
		}
		return $this->zobject->getLabels();
	}

	/**
	 * Wrapper for ZPersistentObject getLabel method. Returns the label for a given Language (or its fallback).
	 *
	 * @param Language $language Language in which to provide the label.
	 * @return string
	 * @throws ZErrorException
	 */
	public function getLabel( $language ): string {
		if ( !$this->isValid() ) {
			throw new ZErrorException( $this->error );
		}
		return $this->zobject->getLabel( $language );
	}

	/**
	 * Wrapper for ZPersistentObject getAliases method. Returns the aliases of the ZPersistentObject.
	 *
	 * @return ZMultiLingualStringSet
	 * @throws ZErrorException
	 */
	public function getAliases(): ZMultiLingualStringSet {
		if ( !$this->isValid() ) {
			throw new ZErrorException( $this->error );
		}
		return $this->zobject->getAliases();
	}

	/**
	 * @inheritDoc
	 */
	public function getTextForSearchIndex() {
		// TODO: (T271963) We'll probably want to inject something special for search with facets/etc.
		return $this->getText();
	}

	/**
	 * @inheritDoc
	 */
	public function getWikitextForTransclusion() {
		// ZObject pages are not transcludable.
		return false;
	}

	/**
	 * @inheritDoc
	 */
	public function getTextForSummary( $maxLength = 250 ) {
		$contentLanguage = MediaWikiServices::getInstance()->getContentLanguage();
		// Splice out newlines from content.
		$textWithoutNewlines = preg_replace( "/[\n\r]/", ' ', $this->getText() );
		$trimLength = max( 0, $maxLength );
		return $contentLanguage->truncateForDatabase( $textWithoutNewlines, $trimLength );
	}

	/**
	 * @inheritDoc
	 */
	public function getNativeData() {
		return $this->getObject();
	}

	/**
	 * @inheritDoc
	 */
	public function getSize() {
		return strlen( $this->getText() );
	}

	/**
	 * @inheritDoc
	 */
	public function copy() {
		// We're immutable.
		return $this;
	}

	/**
	 * @inheritDoc
	 */
	public function isCountable( $hasLinks = null ) {
		// TODO: Dependency-inject
		$config = MediaWikiServices::getInstance()->getMainConfig();

		return (
			!$this->isRedirect()
			&& ( $config->get( 'ArticleCountMethod' ) === 'any' )
		);
	}
}
