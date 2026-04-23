<?php
/**
 * Page title (H1) HTML builders.
 *
 * @file
 * @ingroup Extensions
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\PageTitle;

use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContent;
use MediaWiki\Html\Html;
use MediaWiki\Language\Language;
use MediaWiki\Language\MessageLocalizer;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;

class PageTitleBuilder {
	private const VIEW_HEADER_CLASS = 'ext-wikilambda-viewpage-header';
	private const EDIT_HEADER_CLASS = 'ext-wikilambda-editpage-header';

	/**
	 * Render a copyable identifier element for page titles (e.g. ZID or QID).
	 *
	 * This is handled by the global clipboard manager in the Vue app.
	 *
	 * @param string $wrapperClass The page-title wrapper BEM block
	 * @param string $identifierType Identifier type ('qid' or 'zid')
	 * @param string $value Identifier value to display (e.g. 'Z123' or 'Q42')
	 * @return string
	 */
	private static function createCopyableIdentifierSpan(
		string $wrapperClass,
		string $identifierType,
		string $value
	): string {
		$class = $wrapperClass . '__' . $identifierType;
		return Html::element(
			'span',
			[
				'class' => $class,
				'role' => 'button',
				'tabindex' => '0',
				'aria-live' => 'polite'
			],
			$value
		);
	}

	/**
	 * Render the ZObject title span.
	 *
	 * @param string $wrapperClass Wrapper base class
	 * @param string $labelText Function label
	 * @param bool $isUntitled Whether to include the `__title--untitled` modifier
	 * @return string
	 */
	private static function createZObjectTitleSpan(
		string $wrapperClass,
		string $labelText,
		bool $isUntitled
	): string {
		$untitledStyle = $isUntitled ? $wrapperClass . '__title--untitled' : null;

		return Html::element(
			'span',
			[
				'class' => [
					$wrapperClass . '__title',
					$wrapperClass . '__title--function-name',
					$untitledStyle
				]
			],
			$labelText
		);
	}

	/**
	 * Render the ZObject type subtitle block for page titles.
	 *
	 * @param string $wrapperClass Wrapper base class
	 * @param string $typeLabel Type label text
	 * @param string $typeLanguageWidget Optional BCP47 chip HTML
	 * @return string
	 */
	private static function createZObjectTypeSubtitle(
		string $wrapperClass,
		string $typeLabel,
		string $typeLanguageWidget = ''
	): string {
		return Html::rawElement(
			'div',
			[ 'class' => $wrapperClass . '__type' ],
			$typeLanguageWidget . ' ' . Html::element(
				'span',
				[ 'class' => $wrapperClass . '__type-label' ],
				$typeLabel
			)
		);
	}

	/**
	 * Shared renderer for ZObject page titles (view/edit wrappers differ only by wrapper class).
	 *
	 * @param string $wrapperClass
	 * @param string $titleHtml
	 * @param string $identifierValue
	 * @param string|null $subtitleHtml
	 * @param array $wrapperAttrs
	 * @return string
	 */
	private static function createZObjectPageTitle(
		string $wrapperClass,
		string $titleHtml,
		string $identifierValue,
		?string $subtitleHtml,
		array $wrapperAttrs = []
	): string {
		$wrapperAttrs['class'] = $wrapperClass;

		$html = $titleHtml;
		$html .= ' ' . self::createCopyableIdentifierSpan( $wrapperClass, 'zid', $identifierValue );
		if ( $subtitleHtml !== null ) {
			$html .= $subtitleHtml;
		}

		return Html::rawElement( 'span', $wrapperAttrs, $html );
	}

	/**
	 * Generate the special "title" shown on ZObject view pages.
	 *
	 * <span lang="es" class="ext-wikilambda-viewpage-header">
	 *     <span data-title="English" class="ext-wikilambda-viewpage-header__bcp47-code">en</span>
	 *     <span class="ext-wikilambda-viewpage-header__title ext-wikilambda-viewpage-header__title--function-name">
	 *         multiply
	 *     </span>
	 *     <span class="ext-wikilambda-viewpage-header__zid">Z12345</span>
	 *     <div class="ext-wikilambda-viewpage-header__type">
	 *         <span data-title="English" class="ext-wikilambda-viewpage-header__bcp47-code">en</span>
	 *         <span class="ext-wikilambda-viewpage-header__type-label">Function</span>
	 *     </div>
	 * </span>
	 *
	 * @param ZObjectContent $content
	 * @param Title $title
	 * @param Language $userLang
	 * @return string
	 */
	public static function createZObjectViewPageTitle(
		ZObjectContent $content,
		Title $title,
		Language $userLang
	): string {
		$zobject = $content->getZObject();

		if ( !$zobject || !$zobject->isValid() ) {
			// Something's bad, let's give up.
			return '';
		}

		// Get best-available label (and its language code) for the target object's type, given the request language.
		[
			'typeLabel' => $targetTypeLabel,
			'typeCode' => $targetTypeDisplayCode,
			'typeLanguageName' => $targetTypeDisplayLabelLanguageName
		] = self::getZObjectViewPageTypeData( $content, $userLang );
		[
			'nameLabel' => $targetLabel,
			'nameCode' => $targetLabelLanguageCode,
			'nameLanguageName' => $targetDisplayLabelLanguageName,
			'isUntitled' => $isUntitled
		] = self::getZObjectViewPageNameData( $content, $userLang );

		// If the object label (e.g. 'Echo') is not in the user's language, show a
		// BCP47 code widget for the language used instead.
		$targetDisplayLabelWidget = self::createZObjectViewPageBcp47ChipOrEmpty(
			$targetLabelLanguageCode,
			$targetDisplayLabelLanguageName,
			$userLang->getCode()
		);
		// If the object type label (e.g. 'Function') is not in the user's language, show a
		// BCP47 code widget for the language used instead.
		$targetDisplayTypeWidget = self::createZObjectViewPageBcp47ChipOrEmpty(
			$targetTypeDisplayCode,
			$targetTypeDisplayLabelLanguageName,
			$userLang->getCode()
		);
		$labelSpan = self::createZObjectTitleSpan(
			self::VIEW_HEADER_CLASS,
			$targetLabel,
			$isUntitled
		);
		// (T356731) When $targetDisplayLabelWidget is an empty string, colon-separator already
		// adds/removes the needed/unneeded whitespace for languages. Always adding a
		// space would unexpectedly add unneeded extra whitespace for languages including
		// zh-hans, zh-hant, etc.
		$titleHtml = ( $targetDisplayLabelWidget === '' ? '' : $targetDisplayLabelWidget . ' ' ) . $labelSpan;

		$typeSubtitle = self::createZObjectTypeSubtitle(
			self::VIEW_HEADER_CLASS,
			$targetTypeLabel,
			$targetDisplayTypeWidget
		);

		return self::createZObjectPageTitle(
			self::VIEW_HEADER_CLASS,
			$titleHtml,
			$title->getBaseText(),
			$typeSubtitle,
			[
				// Mark the header in the correct language, regardless of the rest of the page
				// … but mark it back into their requested language if it's actually untitled
				'lang' => $isUntitled ? $targetTypeDisplayCode : $userLang->getCode()
			]
		);
	}

	/**
	 * Resolve type label/code/language-name for ZObject view-page title presentation.
	 *
	 * @param ZObjectContent $content
	 * @param Language $userLang
	 * @return array{typeLabel:string,typeCode:string,typeLanguageName:string}
	 */
	private static function getZObjectViewPageTypeData(
		ZObjectContent $content,
		Language $userLang
	): array {
		// TODO (T362246): Dependency-inject
		$services = MediaWikiServices::getInstance();
		// Get best-available label (and its language code) for the target object's type,
		// given the request language.
		[
			'title' => $targetTypeLabel,
			'languageCode' => $targetTypeLabelLanguage
		] = $content->getTypeStringAndLanguage( $userLang );

		// OBJECT TYPE Language code, which is usually a BCP47 code (e.g. 'en') but sometimes
		// tests inject it as a Language object(!)
		$targetTypeDisplayCode = gettype( $targetTypeLabelLanguage ) === 'string'
			? $targetTypeLabelLanguage
			: $targetTypeLabelLanguage->getCode();

		return [
			'typeLabel' => $targetTypeLabel,
			'typeCode' => $targetTypeDisplayCode,
			// OBJECT TYPE language label (e.g. 'Function') of the language currently being rendered
			'typeLanguageName' => $services->getLanguageNameUtils()->getLanguageName( $targetTypeDisplayCode )
		];
	}

	/**
	 * Resolve name label/code/language-name/untitled state for ZObject view-page title presentation.
	 *
	 * @param ZObjectContent $content
	 * @param Language $userLang
	 * @return array{nameLabel:string,nameCode:string,nameLanguageName:string,isUntitled:bool}
	 */
	private static function getZObjectViewPageNameData(
		ZObjectContent $content,
		Language $userLang
	): array {
		// TODO (T362246): Dependency-inject
		$services = MediaWikiServices::getInstance();
		$zobject = $content->getZObject();
		// Get best-available label (and its language code) for the target object's name,
		// given the request language.
		// OBJECT NAME label (e.g. 'My function' or 'Unknown') and language code (e.g. 'en')
		[
			'title' => $targetLabel,
			'languageCode' => $targetLabelLanguageCode
		] = $zobject->getLabels()->buildStringForLanguage( $userLang )
			->fallbackWithEnglish()
			->placeholderForTitle()
			->getStringAndLanguageCode();

		return [
			'nameLabel' => $targetLabel,
			'nameCode' => $targetLabelLanguageCode,
			// OBJECT NAME language label (e.g. 'English') of the language currently being rendered
			'nameLanguageName' => $services->getLanguageNameUtils()->getLanguageName( $targetLabelLanguageCode ),
			'isUntitled' => $targetLabel === wfMessage( 'wikilambda-editor-default-name' )->text()
		];
	}

	/**
	 * Create a view-page BCP47 chip only when the display language differs from user language.
	 *
	 * @param string $langCode
	 * @param string $langLabel
	 * @param string $userLangCode
	 * @return string
	 */
	private static function createZObjectViewPageBcp47ChipOrEmpty(
		string $langCode,
		string $langLabel,
		string $userLangCode
	): string {
		// Keep chip visibility rules unchanged: only render when the chosen display language
		// differs from the user's requested language.
		if ( $langCode === $userLangCode ) {
			return '';
		}

		return self::createFakeCodexBcp47Chip(
			$langCode,
			$langLabel,
			self::VIEW_HEADER_CLASS . '__bcp47-code'
		);
	}

	/**
	 * Create the ZObject edit-page title HTML (`OutputPage::setPageTitle()`).
	 *
	 * @param ZObjectContent $targetZObject
	 * @param Language $userLang
	 * @param MessageLocalizer $context
	 * @return string
	 */
	public static function createZObjectEditPageTitle(
		ZObjectContent $targetZObject,
		Language $userLang,
		MessageLocalizer $context
	): string {
		// the language object of the user's preferred language
		$zObjectLabelsWithLang = $targetZObject->getTypeStringAndLanguage( $userLang );
		$label = self::createZObjectEditPageNameTitleSpan( $targetZObject, $userLang );

		/* BCP47 Codes can occur in two places:
			(1) in front of the entire header - this happens if
				(a) ONLY the TYPE is in a non-user language OR
				(b) if both the TYPE and the NAME are in the SAME non-user language
			(2) in front of the name - this happens if the NAME is in a non-user language
		*/
		[ $BCP47CodeObjectName, $BCP47CodeObjectType ] = self::createZObjectEditPageBcp47Chips(
			$targetZObject,
			$zObjectLabelsWithLang,
			$userLang
		);

		$prefix = Html::element(
			'span',
			[ 'class' => self::EDIT_HEADER_CLASS . '__title' ],
			$context->msg( 'wikilambda-edit' )->text()
		);

		$titleHtml =
			" " . $prefix . " " . $BCP47CodeObjectType . " " . $zObjectLabelsWithLang[ 'title' ]
			. $context->msg( 'colon-separator' )->text() . $BCP47CodeObjectName . $label;

		return self::createZObjectPageTitle(
			self::EDIT_HEADER_CLASS,
			$titleHtml,
			$targetZObject->getZid(),
			null
		);
	}

	/**
	 * Get the HTML element for the ZObject edit label.
	 *
	 * @param ZObjectContent $targetZObject
	 * @return string
	 */
	private static function createZObjectEditPageNameTitleSpan(
		ZObjectContent $targetZObject,
		Language $userLang
	): string {
		[ 'title' => $labelText ] = $targetZObject->getLabels()
			->buildStringForLanguage( $userLang )
			->fallbackWithEnglish()
			->placeholderForTitle()
			->getStringAndLanguageCode();

		return self::createZObjectTitleSpan(
			self::EDIT_HEADER_CLASS,
			$labelText,
			$labelText === wfMessage( 'wikilambda-editor-default-name' )->text()
		);
	}

	/**
	 * Get BCP47 code elements for name and type for the ZObject edit heading.
	 *
	 * @param ZObjectContent $targetZObject
	 * @param array $zObjectLabelsWithLang
	 * @param Language $userLang
	 * @return array
	 */
	private static function createZObjectEditPageBcp47Chips(
		ZObjectContent $targetZObject,
		array $zObjectLabelsWithLang,
		Language $userLang
	): array {
		// used to go from LANG_CODE -> LANG_NAME
		// TODO (T362246): Dependency-inject
		$services = MediaWikiServices::getInstance();

		// the BCP47 code of the language currently being rendered for the zObject Type
		$typeLangCode = $zObjectLabelsWithLang['languageCode'] ?: '';
		$typeLangLabel = $services->getLanguageNameUtils()->getLanguageName( $typeLangCode );

		// the BCP47 code of the language currently being rendered for the zObject Type
		$userLangCode = $userLang->getCode();
		$nameLangCode = $targetZObject
			->getLabels()
			->buildStringForLanguage( $userLang )
			->fallbackWithEnglish()
			->getLanguageProvided() ?? $userLangCode;
		$nameLangLabel = $services->getLanguageNameUtils()->getLanguageName( $nameLangCode );

		$BCP47CodeObjectName = self::createZObjectEditPageBcp47Chip(
			'name',
			$nameLangCode,
			$nameLangLabel,
			$userLangCode
		);
		$BCP47CodeObjectType = self::createZObjectEditPageBcp47Chip(
			'type',
			$typeLangCode,
			$typeLangLabel,
			$userLangCode
		);

		return [ $BCP47CodeObjectName, $BCP47CodeObjectType ];
	}

	/**
	 * Build a BCP47 chip for the ZObject edit page title (name/type).
	 *
	 * @param string $kind Either 'name' or 'type'
	 * @param string $langCode
	 * @param string $langLabel
	 * @param string $userLangCode
	 * @return string
	 */
	private static function createZObjectEditPageBcp47Chip(
		string $kind,
		string $langCode,
		string $langLabel,
		string $userLangCode
	): string {
		return self::createFakeCodexBcp47Chip(
			$langCode,
			$langLabel,
			self::createZObjectEditPageBcp47ClassName( $kind, $langCode, $userLangCode )
		);
	}

	/**
	 * Render a language 'Chip' of a language code with a hover-title of the language's label.
	 *
	 * TODO (T309039): use the actual Vue Chip component from Codex and ZID language object here instead
	 *
	 * @param string $code The BCP47 language code, e.g. 'fr' or 'en-US'.
	 * @param string $label The plain text label of the language, e.g. 'français' or 'American English'
	 * @param string $class The name of the class for the HTML element in which to wrap the label
	 * @return string The HTML of the element to be rendered
	 */
	private static function createFakeCodexBcp47Chip( string $code, string $label, string $class ): string {
		return Html::element(
			'span',
			[
				'title' => $label,
				'class' => $class,
			],
			$code
		);
	}

	/**
	 * Get the CSS class name for the ZObject edit-page BCP47 code based on the type and language codes.
	 *
	 * @param string $type
	 * @param string $langCode
	 * @param string $userLangCode
	 * @return string
	 */
	private static function createZObjectEditPageBcp47ClassName(
		string $type,
		string $langCode,
		string $userLangCode
	): string {
		$baseClass = self::EDIT_HEADER_CLASS . '__bcp47-code';
		$modifierClass = $type === 'name'
			? self::EDIT_HEADER_CLASS . '__bcp47-code-name'
			: self::EDIT_HEADER_CLASS . '__bcp47-code-type';
		$className = $baseClass . ' ' . $modifierClass;
		if ( $langCode === $userLangCode ) {
			$className .= ' ' . self::EDIT_HEADER_CLASS . '__bcp47-code--hidden';
		}
		return $className;
	}

	/**
	 * Create Abstract view-page title HTML (`OutputPage::setPageTitle()`).
	 *
	 * @param string $titleText Plain text
	 * @param string $qid Wikidata QID string (displayed only; not fetched server-side)
	 * @param string $lang
	 * @param string $dir
	 * @param array $wrapperAttrs
	 * @return string
	 */
	public static function createAbstractViewPageTitle(
		string $titleText,
		string $qid,
		string $lang,
		string $dir,
		array $wrapperAttrs = []
	): string {
		return self::createAbstractPageTitle(
			self::VIEW_HEADER_CLASS,
			$titleText,
			$qid,
			$lang,
			$dir,
			$wrapperAttrs
		);
	}

	/**
	 * Create Abstract edit-page title HTML (`OutputPage::setPageTitle()`).
	 *
	 * @param string $titleText Plain text
	 * @param string $qid Wikidata QID string (displayed only; not fetched server-side)
	 * @param string $lang
	 * @param string $dir
	 * @param array $wrapperAttrs
	 * @return string
	 */
	public static function createAbstractEditPageTitle(
		string $titleText,
		string $qid,
		string $lang,
		string $dir,
		array $wrapperAttrs = []
	): string {
		return self::createAbstractPageTitle(
			self::EDIT_HEADER_CLASS,
			$titleText,
			$qid,
			$lang,
			$dir,
			$wrapperAttrs
		);
	}

	/**
	 * Shared renderer for Abstract page titles (view/edit wrappers differ only by wrapper class).
	 *
	 * @param string $wrapperClass
	 * @param string $titleText
	 * @param string|null $qid
	 * @param string|null $lang
	 * @param string|null $dir
	 * @param array $wrapperAttrs
	 * @return string
	 */
	private static function createAbstractPageTitle(
		string $wrapperClass,
		string $titleText,
		?string $qid,
		?string $lang,
		?string $dir,
		array $wrapperAttrs
	): string {
		$wrapperAttrs['class'] = $wrapperClass;

		$titleAttrs = [ 'class' => $wrapperClass . '__title' ];
		if ( $lang !== null ) {
			$titleAttrs['lang'] = $lang;
		}
		if ( $dir !== null ) {
			$titleAttrs['dir'] = $dir;
		}
		$html = Html::element( 'span', $titleAttrs, $titleText );
		if ( $qid !== null ) {
			$html .= ' ' . self::createCopyableIdentifierSpan( $wrapperClass, 'qid', $qid );
		}

		return Html::rawElement( 'span', $wrapperAttrs, $html );
	}

}
