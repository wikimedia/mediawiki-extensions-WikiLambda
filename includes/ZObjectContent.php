<?php
/**
 * WikiLambda ZObjectContent
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use AbstractContent;
use FormatJson;
use Html;
use Language;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\MediaWikiServices;
use ParserOptions;
use ParserOutput;
use RequestContext;
use Status;
use Title;
use User;
use WikiPage;

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
	 * @var ZError[]
	 */
	private $errors = [];

	/**
	 * Builds the Content object that can be saved in the Wiki
	 * Doesn't validate the ZObject, but checks for syntactical validity
	 *
	 * @param string $text
	 * @throws ZErrorException
	 */
	public function __construct( $text ) {
		parent::__construct( CONTENT_MODEL_ZOBJECT );

		// Check that the input is a valid string
		if ( !is_string( $text ) ) {
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_INVALID_FORMAT,
					new ZString( 'ZPersistentObject input is not a string.' )
				)
			);
		}

		// Check that the input is a valid JSON
		$parseStatus = FormatJson::parse( $text );
		if ( !$parseStatus->isGood() ) {
			$errorMessage = wfMessage( $parseStatus->getErrors()[0]['message'] )->inContentLanguage()->text();
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_INVALID_JSON,
					new ZString( "ZPersistentObject input is invalid JSON: $errorMessage." )
				)
			);
		}

		// Check that the input is a syntactically correct ZObject
		if ( !ZObjectUtils::isValidZObject( $parseStatus->getValue() ) ) {
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX,
					new ZString( 'ZPersistentObject input ZObject structure is invalid.' )
				)
			);
		}

		// Save the string and object content
		// TODO: We might not need the text content
		$this->text = $text;
		$this->object = $parseStatus->getValue();
	}

	/**
	 * Tries to build the wrapped ZObject by calling ZObjectFactory::create()
	 * and sets the resulting validation status on $this->status
	 */
	private function validateContent() {
		$this->status = new Status();
		try {
			$this->zobject = ZObjectFactory::createPersistentContent( $this->getObject() );
		} catch ( ZErrorException $e ) {
			$this->status->fatal( $e->getMessage() );
			$this->errors[] = $e->getZError();
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

	/**
	 * Returns a ZObjectContent object with pre save transformations applied.
	 *
	 * @param Title $title
	 * @param User $user
	 * @param ParserOptions $popts
	 * @return ZObjectContent
	 */
	public function preSaveTransform( Title $title, User $user, ParserOptions $popts ) {
		if ( !$this->isValid() ) {
			return $this;
		}

		$json = ZObjectUtils::canonicalize( $this->getObject() );
		$encoded = FormatJson::encode( $json, true, FormatJson::UTF8_OK );
		$encodedCleanedWhitespace = str_replace( [ "\r\n", "\r" ], "\n", rtrim( $encoded ) );

		return new static( $encodedCleanedWhitespace );
	}

	/**
	 * @return Status|null
	 */
	public function getStatus() {
		return $this->status;
	}

	/**
	 * @return ZError[]
	 */
	public function getErrors() {
		return $this->errors;
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
			// Error 501: Invalid syntax
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX,
					new ZList( $this->errors ) // errors is a list of ZErrors
				)
			);
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
			// Error 501: Invalid syntax
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX,
					new ZList( $this->errors ) // errors is a list of ZErrors
				)
			);
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
		$typeTitle = Title::newFromText( $type, NS_ZOBJECT );
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
			// Error 501: Invalid syntax
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX,
					new ZList( $this->errors ) // errors is a list of ZErrors
				)
			);
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
			// Error 501: Invalid syntax
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX,
					new ZList( $this->errors ) // errors is a list of ZErrors
				)
			);
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
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX,
					new ZList( $this->errors ) // errors is a list of ZErrors
				)
			);
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
			throw new ZErrorException(
				new ZError(
					ZErrorTypeRegistry::Z_ERROR_INVALID_SYNTAX,
					new ZList( $this->errors ) // errors is a list of ZErrors
				)
			);
		}
		return $this->zobject->getLabel( $language );
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
		$userLang = RequestContext::getMain()->getLanguage();

		// Ensure the stored content is valid; this also populates $this->getZObject() for us
		if ( !$this->isValid() ) {
			$output->setText(
				Html::element(
					'div',
					[
						'class' => [ 'ext-wikilambda-view-invalidcontent', 'warning' ],
					],
					wfMessage( 'wikilambda-invalidzobject' )->inLanguage( $userLang )->text()
				)
			);
		}

		$zobject = $this->getZObject();

		$label = Html::element(
			'span', [ 'class' => 'ext-wikilambda-viewpage-header-title' ],
			$zobject->getLabels()->getStringForLanguageOrEnglish( $userLang )
		);
		$id = Html::element(
			'span', [ 'class' => 'ext-wikilambda-viewpage-header-zid' ],
			$title->getText()
		);

		$type = Html::element(
			'div', [ 'class' => 'ext-wikilambda-viewpage-header-type' ],
			$this->getTypeString( $userLang )
		);

		$header = Html::rawElement(
			'span',
			[ 'class' => 'ext-wikilambda-viewpage-header' ],
			$label . ' ' . $id . $type
		);

		$output->addModuleStyles( 'ext.wikilambda.viewpage.styles' );
		$output->setTitleText( $header );

		$output->addModules( 'ext.wikilambda.edit' );

		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$zObject = $zObjectStore->fetchZObjectByTitle( $title );

		$zLangRegistry = ZLangRegistry::singleton();
		$userLangCode = $userLang->mCode;
		// If the userLang isn't recognised (e.g. it's qqx, or a language we don't support yet, or it's
		// nonsense), then fall back to English.
		$userLangZid = $zLangRegistry->getLanguageZidFromCode(
			( $zLangRegistry->isLanguageKnownGivenCode( $userLangCode ) )
				? $userLangCode
				: 'en'
			);

		$editingData = [
			// The following paramether may be the same now,
			// but will surely change in the future as we remove the Zds from the UI
			'title' => $title->getBaseText(),
			'zId' => $title->getBaseText(),
			'page' => $title->getPrefixedDBkey(),
			'zlang' => $userLangCode,
			'zlangZid' => $userLangZid,
			'createNewPage' => false,
			'viewmode' => true
		];

		$output->addJsConfigVars( 'wgWikiLambda', $editingData );

		$output->setText(
			// Placeholder div for the Vue template.
			Html::element( 'div', [ 'id' => 'ext-wikilambda-app' ] )
			// Fallback div for the warning.
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
				)
			)
		);
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
