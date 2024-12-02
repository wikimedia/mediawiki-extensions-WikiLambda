<?php
/**
 * WikiLambda content handler for ZObjects
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use InvalidArgumentException;
use MediaWiki\Content\Content;
use MediaWiki\Content\ContentHandler;
use MediaWiki\Content\Renderer\ContentParseParams;
use MediaWiki\Content\Transform\PreSaveTransformParams;
use MediaWiki\Content\ValidationParams;
use MediaWiki\Context\IContextSource;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Diff\ZObjectContentDifferenceEngine;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Html\Html;
use MediaWiki\Json\FormatJson;
use MediaWiki\Language\Language;
use MediaWiki\MainConfigNames;
use MediaWiki\MediaWikiServices;
use MediaWiki\Parser\ParserOutput;
use MediaWiki\Revision\SlotRenderingProvider;
use MediaWiki\Title\Title;
use MWContentSerializationException;
use StatusValue;

class ZObjectContentHandler extends ContentHandler {
	use ZObjectEditingPageTrait;

	/**
	 * @param string $modelId
	 */
	public function __construct( $modelId ) {
		if ( $modelId !== CONTENT_MODEL_ZOBJECT ) {
			throw new InvalidArgumentException( __CLASS__ . " initialised for invalid content model" );
		}

		// Triggers use of message content-model-zobject
		parent::__construct( CONTENT_MODEL_ZOBJECT, [ CONTENT_FORMAT_TEXT ] );
	}

	/**
	 * @param Title $title Page to check
	 * @return bool
	 */
	public function canBeUsedOn( Title $title ) {
		return $title->inNamespace( NS_MAIN );
	}

	/**
	 * @return ZObjectContent
	 */
	public function makeEmptyContent() {
		$class = $this->getContentClass();
		return new $class(
			'{' . "\n"
			. '"' . ZTypeRegistry::Z_OBJECT_TYPE . '": "' . ZTypeRegistry::Z_PERSISTENTOBJECT . '",' . "\n"
			. '"' . ZTypeRegistry::Z_PERSISTENTOBJECT_ID . '": {' . "\n"
			. '"' . ZTypeRegistry::Z_OBJECT_TYPE . '": "' . ZTypeRegistry::Z_STRING . '",' . "\n"
			. '"' . ZTypeRegistry::Z_STRING_VALUE . '": "' . ZTypeRegistry::Z_NULL_REFERENCE . '"},' . "\n"
			. '"' . ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE . '": "",' . "\n"
			. '"' . ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL . '": {' . "\n"
			. '"' . ZTypeRegistry::Z_OBJECT_TYPE . '": "' . ZTypeRegistry::Z_MULTILINGUALSTRING . '",' . "\n"
			. '"' . ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE . '":'
			. '["' . ZTypeRegistry::Z_MONOLINGUALSTRING . '"]' . "\n"
			. '},' . "\n"
			. '"' . ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES . '": {' . "\n"
			. '"' . ZTypeRegistry::Z_OBJECT_TYPE . '": "' . ZTypeRegistry::Z_MULTILINGUALSTRINGSET . '",' . "\n"
			. '"' . ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE . '":'
			. '["' . ZTypeRegistry::Z_MONOLINGUALSTRINGSET . '"]' . "\n"
			. '},' . "\n"
			. '"' . ZTypeRegistry::Z_PERSISTENTOBJECT_DESCRIPTION . '": {' . "\n"
			. '"' . ZTypeRegistry::Z_OBJECT_TYPE . '": "' . ZTypeRegistry::Z_MULTILINGUALSTRING . '",' . "\n"
			. '"' . ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE . '":'
			. '["' . ZTypeRegistry::Z_MONOLINGUALSTRING . '"]' . "\n"
			. '}' . "\n"
			. '}'
		);
	}

	/**
	 * @param string $data
	 * @param Title|null $title
	 * @param string|null $modelId
	 * @param string|null $format
	 * @return ZObjectContent
	 */
	public static function makeContent( $data, ?Title $title = null, $modelId = null, $format = null ) {
		// @phan-suppress-next-line PhanTypeMismatchReturnSuperType
		return parent::makeContent( $data, $title, $modelId, $format );
	}

	/**
	 * @return string
	 */
	protected function getContentClass() {
		return ZObjectContent::class;
	}

	/**
	 * @param Content $content
	 * @param string|null $format
	 * @return string
	 */
	public function serializeContent( Content $content, $format = null ) {
		$this->checkFormat( $format );

		if ( !( $content instanceof ZObjectContent ) ) {
			// Throw?
			return '';
		}

		return $content->getText();
	}

	/**
	 * @param string $text
	 * @param string|null $format
	 * @return ZObjectContent
	 * @throws MWContentSerializationException if input causes an error
	 */
	public function unserializeContent( $text, $format = null ) {
		$this->checkFormat( $format );

		$class = $this->getContentClass();
		try {
			return new $class( $text );
		} catch ( ZErrorException $zerror ) {
			// (T381115) If the passed user input isn't valid, we're expected to throw this particular MW error
			throw new MWContentSerializationException( $zerror->getZError()->getMessage() );
		}
	}

	/**
	 * @param Title $zObjectTitle The page to fetch.
	 * @param string|null $languageCode The language in which to return results. If unset, all results are returned.
	 * @param int|null $revision The revision ID of the page to fetch. If unset, the latest is returned.
	 * @return string The external JSON form of the given title.
	 * @throws ZErrorException
	 */
	public static function getExternalRepresentation(
		Title $zObjectTitle, ?string $languageCode = null, ?int $revision = null
	): string {
		if ( $zObjectTitle->getNamespace() !== NS_MAIN ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_WRONG_NAMESPACE,
					[ 'title' => (string)$zObjectTitle ]
				)
			);
		}

		if ( $zObjectTitle->getContentModel() !== CONTENT_MODEL_ZOBJECT ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_WRONG_CONTENT_TYPE,
					[ 'title' => (string)$zObjectTitle ]
				)
			);
		}

		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$zObject = $zObjectStore->fetchZObjectByTitle( $zObjectTitle, $revision );

		if ( $zObject === false ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
					[ 'data' => (string)$zObjectTitle ]
				)
			);
		}

		$object = ZObjectUtils::canonicalize( $zObject->getObject() );

		if ( $languageCode ) {
			// TODO (T362246): Dependency-inject
			$services = MediaWikiServices::getInstance();

			// If language code is not valid, throws ZErrorException of Z540/Invalid language code
			if ( !$services->getLanguageNameUtils()->isValidCode( $languageCode ) ) {
				throw new ZErrorException(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_INVALID_LANG_CODE,
						[ 'lang' => $languageCode ]
					)
				);
			}

			// If language doesn't have a Zid, throws ZErrorException of Z541/Language code not found
			$languageZid = ZLangRegistry::singleton()->getLanguageZidFromCode( $languageCode );

			// Filter all Multilingual Strings and Stringsets if language is present and valid
			$object = ZObjectUtils::filterZMultilingualStringsToLanguage( $object, [ $languageZid ] );
		}

		// Replace Z2K1: Z0 with the actual page ID.
		$object->{ ZTypeRegistry::Z_PERSISTENTOBJECT_ID } = [
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_STRING,
			ZTypeRegistry::Z_STRING_VALUE => $zObjectTitle->getDBkey()
		];

		return FormatJson::encode( $object, true, FormatJson::UTF8_OK );
	}

	/**
	 * @inheritDoc
	 */
	public function getSecondaryDataUpdates(
		Title $title,
		Content $content,
		$role,
		SlotRenderingProvider $slotOutput
	) {
		return array_merge(
			parent::getSecondaryDataUpdates( $title, $content, $role, $slotOutput ),
			[ new ZObjectSecondaryDataUpdate( $title, $content ) ]
		);
	}

	/**
	 * @inheritDoc
	 */
	public function getDeletionUpdates( Title $title, $role ) {
		return array_merge(
			parent::getDeletionUpdates( $title, $role ),
			[ new ZObjectSecondaryDataRemoval( $title ) ]
		);
	}

	/**
	 * @inheritDoc
	 */
	public function supportsDirectEditing() {
		return false;
	}

	/**
	 * @inheritDoc
	 */
	public function getActionOverrides() {
		return [
			'edit' => ZObjectEditAction::class,
			'history' => ZObjectHistoryAction::class
		];
	}

	/**
	 * Do not render HTML on edit (T285987)
	 *
	 * @return bool
	 */
	public function generateHTMLOnEdit(): bool {
		return false;
	}

	/**
	 * Set the HTML and add the appropriate styles.
	 *
	 * @inheritDoc
	 * @param Content $content
	 * @param ContentParseParams $cpoParams
	 * @param ParserOutput &$parserOutput The output object to fill (reference).
	 */
	protected function fillParserOutput(
		Content $content,
		ContentParseParams $cpoParams,
		ParserOutput &$parserOutput
	) {
		$userLang = RequestContext::getMain()->getLanguage();

		// Ensure the stored content is a valid ZObject; this also populates $this->getZObject() for us
		if ( !( $content instanceof ZObjectContent ) || !$content->isValid() ) {
			$parserOutput->setText(
				Html::element(
					'div',
					[
						'class' => [ 'ext-wikilambda-view-invalidcontent', 'warning' ],
					],
					wfMessage( 'wikilambda-invalidzobject' )->inLanguage( $userLang )->text()
				)
			);
			// Exit early, as the rest of the code relies on the stored content being well-formed and valid.
			return;
		}

		// Add links to other ZObjects
		// (T361701) Do this ahead of the early return, as LinkUpdater asks for the non-HTML version
		foreach ( $content->getInnerZObject()->getLinkedZObjects() as $link ) {
			$title = Title::newFromText( $link, NS_MAIN );
			$parserOutput->addLink( $title, $title->getArticleID() );
		}

		// Don't do further work if the requester doesn't want the HTML version generated.
		if ( !$cpoParams->getGenerateHtml() ) {
			$parserOutput->setText( '' );
			return;
		}

		$pageIdentity = $cpoParams->getPage();

		// TODO (T362245): Re-work our code to use PageReferences rather than Titles
		$title = Title::castFromPageReference( $pageIdentity );
		'@phan-var Title $title';

		$parserOutput->addModuleStyles( [ 'ext.wikilambda.viewpage.styles' ] );
		$parserOutput->addModules( [ 'ext.wikilambda.app' ] );

		$zLangRegistry = ZLangRegistry::singleton();
		$userLangCode = $userLang->getCode();

		// If the userLang isn't recognised (e.g. it's qqx, or a language we don't support yet, or it's
		// nonsense), then fall back to English.
		$userLangZid = $zLangRegistry->getLanguageZidFromCode( $userLangCode, true );
		// Normalise our used language code from what the Language object says
		$userLangCode = $zLangRegistry->getLanguageCodeFromZid( $userLangZid );

		// Add the canonical page link to /view/<lang>/<zid>
		$output = RequestContext::getMain()->getOutput();

		// Set page header
		$header = static::createZObjectViewHeader( $content, $title, $userLang );
		$output->setPageTitle( $header );

		// (T360169) Set page title meta tag
		$metaTitle = static::createZObjectViewTitle( $content, $title, $userLang );
		$output->setHTMLTitle( $metaTitle );

		$output->addLink( [
				'rel' => 'canonical',
				'hreflang' => $userLangCode,
				'href' => "/view/$userLangCode/" . $title->getDBkey(),
			] );

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

		$parserOutput->setJsConfigVar( 'wgWikiLambda', $editingData );

		$parserOutput->setText(
			// Placeholder div for the Vue template.
			Html::element( 'div', [ 'id' => 'ext-wikilambda-app' ] )
			// Fallback div for the warning.
			. Html::rawElement(
				'div',
				[
					'class' => [ 'ext-wikilambda-view-nojsfallback', 'client-nojs' ],
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
	 * Generate the special "title" shown on view pages
	 *
	 * <span lang="es" class="ext-wikilambda-viewpage-header">
	 * 		<span data-title="English" class="ext-wikilambda-viewpage-header__bcp47-code">en</span>
	 * 		<span class="ext-wikilambda-viewpage-header__title ext-wikilambda-viewpage-header__title--function-name">
	 * 			multiply
	 * 		</span>
	 * 		<span class="ext-wikilambda-viewpage-header__zid">Z12345</span>
	 * 		<div class="ext-wikilambda-viewpage-header__type">
	 * 			<span data-title="English" class="ext-wikilambda-viewpage-header__bcp47-code">en</span>
	 * 			<span class="ext-wikilambda-viewpage-header__type-label">Function</span>
	 * 		</div>
	 * </span>
	 *
	 * @param ZObjectContent $content
	 * @param Title $title
	 * @param Language $userLang
	 * @return string
	 */
	public static function createZObjectViewHeader(
		ZObjectContent $content, Title $title, Language $userLang
	): string {
		// TODO (T362246): Dependency-inject
		$services = MediaWikiServices::getInstance();

		$zobject = $content->getZObject();

		if ( !$zobject || !$zobject->isValid() ) {
			// Something's bad, let's give up.
			return '';
		}

		// Get best-available label (and its language code) for the target object's type, given the request language.
		[
			'title' => $targetTypeLabel,
			'languageCode' => $targetTypeLabelLanguage
		] = $content->getTypeStringAndLanguage( $userLang );

		// OBJECT TYPE Language code, which is usually a BCP47 code (e.g. 'en') but sometimes tests inject it as a
		// Language object(!)
		$targetTypeDisplayCode = gettype( $targetTypeLabelLanguage ) === 'string'
			? $targetTypeLabelLanguage : $targetTypeLabelLanguage->getCode();
		// OBJECT TYPE language label (e.g. 'Function') of the language currently being rendered
		$targetTypeDisplayLabelLanguageName = $services->getLanguageNameUtils()->getLanguageName(
			$targetTypeDisplayCode
		);

		// Get best-available label (and its language code) for the target object's name, given the request language.

		// OBJECT NAME label (e.g. 'My function' or 'Unknown') and language code (e.g. 'en')
		[
			'title' => $targetLabel,
			'languageCode' => $targetLabelLanguageCode
		] = $zobject->getLabels()->buildStringForLanguage( $userLang )
			->fallbackWithEnglish()
			->placeholderForTitle()
			->getStringAndLanguageCode();

		// OBJECT NAME language label (e.g. 'English') of the language currently being rendered
		$targetDisplayLabelLanguageName = $services->getLanguageNameUtils()->getLanguageName(
			$targetLabelLanguageCode
		);

		$bcp47CodeClassName = 'ext-wikilambda-viewpage-header__bcp47-code';

		$targetDisplayLabelWidget = '';
		// If the object type label (e.g. 'Function') is not in the user's language, show a BCP47 code widget
		// for the language used instead
		if ( $targetLabelLanguageCode !== $userLang->getCode() ) {
			$targetDisplayLabelWidget = ZObjectUtils::wrapBCP47CodeInFakeCodexChip(
				$targetLabelLanguageCode, $targetDisplayLabelLanguageName, $bcp47CodeClassName
			);
		}

		$targetDisplayTypeWidget = '';
		// If the object label (e.g. 'Echo') is not in the user's language, show a BCP47 code widget
		// for the language used instead
		if ( $targetTypeDisplayCode !== $userLang->getCode() ) {
			$targetDisplayTypeWidget = ZObjectUtils::wrapBCP47CodeInFakeCodexChip(
				$targetTypeDisplayCode, $targetTypeDisplayLabelLanguageName, $bcp47CodeClassName
			);
		}

		$untitledStyle = $targetLabel === wfMessage( 'wikilambda-editor-default-name' )->text() ?
			'ext-wikilambda-viewpage-header__title--untitled' : null;

		$labelSpan = Html::element(
			'span',
			[
				'class' => [
					'ext-wikilambda-viewpage-header__title ext-wikilambda-viewpage-header__title--function-name',
					$untitledStyle
				]
			],
			$targetLabel
		);

		$zidSpan = Html::element(
			'span',
			[
				'class' => 'ext-wikilambda-viewpage-header__zid'
			],
			$title->getText()
		);

		$labelTitle =
			// (T356731) When $targetDisplayLabelWidget is an empty string, colon-separator already
			// adds/removes the needed/unneeded whitespace for languages. Always adding a
			// space would unexpectedly add unneeded extra whitespace for languages including
			// zh-hans, zh-hant, etc.
			( $targetDisplayLabelWidget === '' ? '' : $targetDisplayLabelWidget . ' ' )
				. $labelSpan . ' ' . $zidSpan;

		$typeSubtitle = Html::rawElement(
			'div', [ 'class' => 'ext-wikilambda-viewpage-header__type' ],
			$targetDisplayTypeWidget . ' ' . Html::element(
				'span',
				[
					'class' => 'ext-wikilambda-viewpage-header__type-label'
				],
				$targetTypeLabel
			)
		);

		return Html::rawElement(
			'span',
			[
				// Mark the header in the correct language, regardless of the rest of the page
				// … but mark it back into their requested language if it's actually untitled
				'lang' => ( $untitledStyle === null ? $userLang->getCode() : $targetTypeDisplayCode ),
				'class' => 'ext-wikilambda-viewpage-header'
			],
			$labelTitle . $typeSubtitle
		);
	}

	/**
	 * Generate the HTML "title" tag for the view page
	 *
	 * @param ZObjectContent $content
	 * @param Title $title
	 * @param Language $userLang
	 * @return string
	 */
	public static function createZObjectViewTitle(
		ZObjectContent $content, Title $title, Language $userLang
	): string {
		$zobject = $content->getZObject();
		if ( !$zobject || !$zobject->isValid() ) {
			// Something's bad, let's give up.
			return '';
		}

		$sitename = MediaWikiServices::getInstance()->getMainConfig()->get( MainConfigNames::Sitename );

		// Get label, english fallback, or zid if no available option
		$label = $zobject->getLabels()->buildStringForLanguage( $userLang )
			->fallbackWithEnglish()
			->getString();

		// Return Label/Zid - Sitename
		return ( $label ?: $title->getBaseText() ) . ' - ' .
			$sitename;
	}

	/**
	 * @param Content $content
	 * @param ValidationParams $validationParams
	 * @return StatusValue
	 */
	public function validateSave( $content, $validationParams ) {
		if ( $content->isValid() ) {
			return StatusValue::newGood();
		}
		return StatusValue::newFatal( "wikilambda-invalidzobject" );
	}

	/**
	 * @inheritDoc
	 */
	public function preSaveTransform( Content $content, PreSaveTransformParams $pstParams ): Content {
		'@phan-var ZObjectContent $content';

		if ( !$content->isValid() ) {
			return $content;
		}

		$json = ZObjectUtils::canonicalize( $content->getObject() );
		$encoded = FormatJson::encode( $json, true, FormatJson::UTF8_OK );
		$encodedCleanedWhitespace = str_replace( [ "\r\n", "\r" ], "\n", rtrim( $encoded ) );

		if ( $content->getText() !== $encodedCleanedWhitespace ) {
			$contentClass = $this->getContentClass();
			return new $contentClass( $encodedCleanedWhitespace );
		}

		return $content;
	}

	/**
	 * @inheritDoc
	 */
	public function createDifferenceEngine(
		IContextSource $context,
		$oldContentRevisionId = 0,
		$newContentRevisionId = 0,
		$recentChangesId = 0,
		$refreshCache = false,
		$unhide = false
	) {
		return new ZObjectContentDifferenceEngine(
			$context, $oldContentRevisionId, $newContentRevisionId, $recentChangesId, $refreshCache, $unhide
		);
	}
}
