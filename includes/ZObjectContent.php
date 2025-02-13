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

use MediaWiki\Content\AbstractContent;
use MediaWiki\Content\TextContent;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualStringSet;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Json\FormatJson;
use MediaWiki\Language\Language;
use MediaWiki\MediaWikiServices;
use MediaWiki\Status\Status;
use MediaWiki\Title\Title;
use MessageLocalizer;

/**
 * This class represents the wrapper for a ZObject, as stored in MediaWiki. Though its form is
 * intentionally similar to that of a ZObject, representing a Z2/Persistent ZObject, it has several
 * differences to account for the Content hierarchy and how it serves as the bridge between
 * MediaWiki 'real' content and the functional model.
 */
class ZObjectContent extends AbstractContent {

	// Define the constant for the description and label length limit
	// TODO (T371882) Set these constants to their final values: 200 and 50
	private const DESCRIPTION_LENGTH_LIMIT = 500;
	private const LABEL_LENGTH_LIMIT = 500;

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
		// TODO (T284473): We might not need the text content once we have proper diffs
		$this->text = $text;
		$this->object = $parseStatus->getValue();
	}

	/**
	 * Validate fields and throws a ZErrorException if any of the following validations
	 * don't pass successfully:
	 * - ZPersistentObject description: validate the length of the description field
	 * - ZPersistentObject name: validate the length of the name field
	 *
	 * @param MessageLocalizer $context The context of the action operation, for localisation of messages
	 * @throws ZErrorException
	 */
	public function validateFields( $context ) {
		$invalidDescriptionLanguages = $this
			->getZObject()
			->validateDescriptionLength( self::DESCRIPTION_LENGTH_LIMIT, $context );
		$invalidLabelLanguages = $this
			->getZObject()
			->validateLabelLength( self::LABEL_LENGTH_LIMIT, $context );

		$errors = [];
		if ( count( $invalidDescriptionLanguages ) > 0 ) {
			foreach ( $invalidDescriptionLanguages as $invalidLang ) {
				// Create message for language and limit
				$message = wfMessage( 'wikilambda-validation-error-description-toolong',
					$invalidLang, self::DESCRIPTION_LENGTH_LIMIT )->text();
				// Create Z500 and add to list
				$errors[] = ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
					[ 'message' => $message ]
				);
			}
		}

		if ( count( $invalidLabelLanguages ) > 0 ) {
			foreach ( $invalidLabelLanguages as $invalidLang ) {
				// Create message for language and limit
				$message = wfMessage( 'wikilambda-validation-error-name-toolong',
					$invalidLang, self::LABEL_LENGTH_LIMIT )->text();
				// Create Z500 and add to list
				$errors[] = ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_UNKNOWN,
					[ 'message' => $message ]
				);
			}
		}

		if ( count( $errors ) > 0 ) {
			// Return Z500 if there's only one error
			// Return Z509 if there are more than one
			$error = ( count( $errors ) > 1 ) ? ZErrorFactory::createZErrorList( $errors ) : $errors[ 0 ];
			throw new ZErrorException( $error );
		}
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
			// TODO (T362236): Add the rendering language as a parameter, don't default to English
			$errorMessage = $e->getZError()->getMessage( 'en' );
			$this->status->fatal( $errorMessage );
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
		return $this->getTypeStringAndLanguage( $language )[ 'type' ];
	}

	/**
	 * Two string representations (and the language code of that representation) of this ZObject
	 *
	 * @param Language $language Language in which to provide the string.
	 * @return array An array containing the following keys (all in string form):
	 * 		title => the label of the type
	 * 		type => which is the label of the type and the zCode of the type
	 * 		languageCode
	 * @throws ZErrorException
	 */
	public function getTypeStringAndLanguage( $language ) {
		$type = $this->getZType();
		$typeTitle = Title::newFromText( $type, NS_MAIN );
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$typeObject = $zObjectStore->fetchZObjectByTitle( $typeTitle );

		$chosenLang = $language;

		if ( $typeObject ) {
			$labelAndLang = $typeObject->getLabels()->buildStringForLanguage( $language )
				->fallbackWithEnglish()
				->placeholderNoFallback()
				->getStringAndLanguageCode();
			$label = $labelAndLang[ 'title' ];
			$chosenLang = $labelAndLang[ 'languageCode' ];
		} else {
			$label = wfMessage( 'wikilambda-typeunavailable' )->inContentLanguage()->text();
		}

		return [
			'title' => $label,
			'type' => $label
				// (T356731) The language for word-separator and parentheses interface messages
				// must be consistent, otherwise the word-separator would add unneeded whitespace
				// when the parentheses is the full-width form for languages including zh-hans,
				// zh-hant, etc.
				. wfMessage( 'word-separator' )->text()
				. wfMessage( 'parentheses' )->rawParams( $this->getZType() )->text(),
			'languageCode' => $chosenLang
		];
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
	 * @return ?string
	 * @throws ZErrorException
	 */
	public function getLabel( $language ): ?string {
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
		// TODO (T271963): We'll probably want to inject something special for search with facets/etc.
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
		// TODO (T362246): Dependency-inject
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
	public function convert( $toModel, $lossy = '' ) {
		if ( $toModel === CONTENT_MODEL_ZOBJECT ) {
			return $this;
		}

		if ( $toModel === CONTENT_MODEL_TEXT ) {
			return new TextContent( $this->text );
		}

		return false;
	}

	/**
	 * @inheritDoc
	 */
	public function isCountable( $hasLinks = null ) {
		// TODO (T362246): Dependency-inject
		$config = MediaWikiServices::getInstance()->getMainConfig();

		return (
			!$this->isRedirect()
			&& ( $config->get( 'ArticleCountMethod' ) === 'any' )
		);
	}
}
