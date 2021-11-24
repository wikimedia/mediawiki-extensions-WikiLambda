<?php
/**
 * WikiLambda content handler for ZObjects
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Content;
use ContentHandler;
use FormatJson;
use Html;
use IContextSource;
use MediaWiki\Content\Renderer\ContentParseParams;
use MediaWiki\Content\Transform\PreSaveTransformParams;
use MediaWiki\Content\ValidationParams;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\SlotRenderingProvider;
use MWException;
use ParserOutput;
use RequestContext;
use StatusValue;
use Title;

class ZObjectContentHandler extends ContentHandler {

	/**
	 * @param string $modelId
	 */
	public function __construct( $modelId ) {
		if ( $modelId !== CONTENT_MODEL_ZOBJECT ) {
			throw new MWException( __CLASS__ . " initialised for invalid content model" );
		}

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
				. '  "' . ZTypeRegistry::Z_OBJECT_TYPE . '": "' . ZTypeRegistry::Z_PERSISTENTOBJECT . '",' . "\n"
				 . '  "' . ZTypeRegistry::Z_PERSISTENTOBJECT_ID . '": "' . ZTypeRegistry::Z_NULL_REFERENCE . '",' . "\n"
				 . '  "' . ZTypeRegistry::Z_PERSISTENTOBJECT_VALUE . '": "",' . "\n"
				 . '  "' . ZTypeRegistry::Z_PERSISTENTOBJECT_LABEL . '": {' . "\n"
				 . '    "' . ZTypeRegistry::Z_OBJECT_TYPE . '": "'
					. ZTypeRegistry::Z_MULTILINGUALSTRING . '",' . "\n"
				 . '    "' . ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE . '": []' . "\n"
				 . '  },' . "\n"
				 . '  "' . ZTypeRegistry::Z_PERSISTENTOBJECT_ALIASES . '": {' . "\n"
				 . '    "' . ZTypeRegistry::Z_OBJECT_TYPE . '": "'
					. ZTypeRegistry::Z_MULTILINGUALSTRINGSET . '",' . "\n"
				 . '    "' . ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE . '": []' . "\n"
				 . '  }' . "\n"
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
	public static function makeContent( $data, Title $title = null, $modelId = null, $format = null ) {
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
	 */
	public function unserializeContent( $text, $format = null ) {
		$this->checkFormat( $format );

		$class = $this->getContentClass();
		return new $class( $text );
	}

	/**
	 * @param Title $zObjectTitle The page to fetch.
	 * @param string|null $languageCode The language in which to return results. If unset, all results are returned.
	 * @return string The external JSON form of the given title.
	 * @throws ZErrorException
	 */
	public static function getExternalRepresentation( Title $zObjectTitle, ?string $languageCode = null ): string {
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
		$zObject = $zObjectStore->fetchZObjectByTitle( $zObjectTitle );

		if ( $zObject === false ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
					[ 'data' => (string)$zObjectTitle ]
				)
			);
		}

		$object = get_object_vars( ZObjectUtils::canonicalize( $zObject->getObject() ) );

		if ( $languageCode ) {
			$services = MediaWikiServices::getInstance();

			if ( !$services->getLanguageNameUtils()->isValidCode( $languageCode ) ) {
				throw new ZErrorException(
					ZErrorFactory::createZErrorInstance(
						ZErrorTypeRegistry::Z_ERROR_INVALID_LANG_CODE,
						[ 'lang' => $languageCode ]
					)
				);
			}

			// If language doesn't have a Zid, throws ZErrorException (Z541)
			$languageZid = ZLangRegistry::singleton()->getLanguageZidFromCode( $languageCode );

			$fullLabels = $zObject->getLabels();
			$returnLanguage = new \Language(
				$languageCode,
				$services->getLocalisationCache(),
				$services->getLanguageNameUtils(),
				$services->getLanguageFallback(),
				$services->getLanguageConverterFactory(),
				$services->getHookContainer()
			);
			$returnLabel = $fullLabels->getStringForLanguage( $returnLanguage );

			$returnLabelObject = (object)[
				'Z1K1' => 'Z12',
				'Z12K1' => [ [ 'Z1K1' => 'Z11', 'Z11K1' => $languageZid, 'Z11K2' => $returnLabel ] ]
			];
			// new ZMultiLingualString( [ new ZMonoLingualString( $languageCode, $returnLabel ) ] );
			$object['Z2K3'] = $returnLabelObject;
		}

		// Replace Z2K1: Z0 with the actual page ID.
		$object['Z2K1'] = [ 'Z1K1' => 'Z6', 'Z6K1' => $zObjectTitle->getDBkey() ];

		$encoded = FormatJson::encode( $object, true, FormatJson::UTF8_OK );

		return $encoded;
	}

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

	public function getDeletionUpdates( Title $title, $role ) {
		return array_merge(
			parent::getDeletionUpdates( $title, $role ),
			[ new ZObjectSecondaryDataRemoval( $title ) ]
		);
	}

	public function supportsDirectEditing() {
		return false;
	}

	public function getActionOverrides() {
		return [
			'edit' => ZObjectEditAction::class,
			'history' => ZObjectHistoryAction::class
		];
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
	 * @inheritDoc
	 * @param Content $content
	 * @param ContentParseParams $cpoParams
	 * @param ParserOutput &$output The output object to fill (reference).
	 *
	 * @throws MWException
	 */
	protected function fillParserOutput(
		Content $content,
		ContentParseParams $cpoParams,
		ParserOutput &$output
	) {
		$userLang = RequestContext::getMain()->getLanguage();

		// Ensure the stored content is a valid ZObject; this also populates $this->getZObject() for us
		if ( !( $content instanceof ZObjectContent ) || !$content->isValid() ) {
			$output->setText(
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

		$pageIdentity = $cpoParams->getPage();
		// TODO: Re-work our code to use PageReferences rather than Titles
		$title = Title::castFromPageReference( $pageIdentity );
		'@phan-var Title $title';

		$zobject = $content->getZObject();

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
			$content->getTypeString( $userLang )
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
		$userLangCode = $userLang->getCode();
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

		// Add links to other ZObjects
		foreach ( $content->getInnerZObject()->getLinkedZObjects() as $link ) {
			$output->addLink( Title::newFromText( $link, NS_MAIN ) );
		}
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

	/**
	 * @inheritDoc
	 */
	protected function getSlotDiffRendererWithOptions( IContextSource $context, $options = [] ) {
		return new ZObjectSlotDiffRenderer();
	}
}
