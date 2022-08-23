<?php
/**
 * WikiLambda edit action for ZObjects
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Action;
use Html;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\MediaWikiServices;

class ZObjectEditAction extends Action {

	/**
	 * @inheritDoc
	 */
	public function getName() {
		return 'edit';
	}

	/**
	 * Get the type and language labels of the target zObject
	 * @return array
	 */
	public function getTargetZObjectWithLabels() {
		return $this->getTargetZObject()->getTypeStringAndLanguage( $this->getLanguage() );
	}

	/**
	 * Get the target zObject
	 * @return ZObjectContent|bool Found ZObject
	 */
	public function getTargetZObject() {
		$zObjectStore = WikiLambdaServices::getZObjectStore();
		return $zObjectStore->fetchZObjectByTitle( $this->getTitle() );
	}

	/**
	 * Get page title message
	 * @return string
	 */
	protected function getPageTitleMsg() {
		// the language object of the user's preferred language
		$zObjectLabelsWithLang = $this->getTargetZObjectWithLabels();

		$stringForLanguageBuilder = $this->getTargetZObject()->getLabels()->buildStringForLanguage(
			$this->getLanguage()
		);

		$label = Html::element(
			'span',
			[
				'class' => [
					'ext-wikilambda-editpage-header-title',
					'ext-wikilambda-editpage-header-title--function-name'
				]
			],
			$stringForLanguageBuilder
				->fallbackWithEnglish()
				->placeholderNoFallback()
				->getString() ?? ''
		);

		/* isoCodes can occur in two places:
			(1) in front of the entire header - this happens if
				(a) ONLY the TYPE is in a non-user language OR
				(b) if both the TYPE and the NAME are in the SAME non-user language
			(2) in front of the name - this happens if the NAME is in a non-user language
		*/

		// used to go from LANG_CODE -> LANG_NAME
		$services = MediaWikiServices::getInstance();

		// the iso code of the language currently being rendered for the zObject Type
		$typeLangCode = $zObjectLabelsWithLang[ 'languageCode' ] ?: '';
		wfDebugLog( "error", var_export( $typeLangCode, true ) );
		$typeLangName = $services->getLanguageNameUtils()->getLanguageName( $typeLangCode );

		$isoCodeObjectName = '';
		// the iso code of the language currently being rendered for the zObject Type
		$nameLang = $this->getTargetZObject()->getLabels()->buildStringForLanguage( $this->getLanguage() )
			->fallbackWithEnglish()
			->placeholderForTitle()
			->getStringAndLanguageCode();
		$nameLangCode = $nameLang[ 'languageCode' ];
		$nameLangTitle = $services->getLanguageNameUtils()->getLanguageName( $nameLangCode );

		// show a language label if the text is not the user's preferred language
		// TODO (T309039): use the chip component and ZID language object here instead
		$isoCodeClassName = 'ext-wikilambda-editpage-header--iso-code';
		if ( $nameLangCode !== $this->getLanguage()->getCode() ) {
			$isoCodeObjectName = ZObjectUtils::getIsoCode( $nameLangCode, $nameLangTitle, $isoCodeClassName );
		}

		// show a language label if the text is not the user's preferred language
		$isoCodeObjectType = $typeLangCode === $this->getLanguage()->getCode() ? ''
			: ZObjectUtils::getIsoCode( $typeLangCode, $typeLangName, $isoCodeClassName );

		$prefix = Html::element(
			'span', [ 'class' => 'ext-wikilambda-editpage-header-title' ],
			$this->msg( 'wikilambda-edit' )->text()
		);

		// if we have two iso codes showing the same fallback language, only render the first one
		if ( $typeLangCode === $nameLangCode ) {
			$isoCodeObjectName = '';
		}

		return Html::rawElement(
			'span',
			[ 'class' => 'ext-wikilambda-editpage-header' ],
			" " . $prefix . " " . $isoCodeObjectType . " " . $zObjectLabelsWithLang[ 'title' ]
			. $this->msg( 'colon-separator' )->text() . $isoCodeObjectName . $label
		);
	}

	public function show() {
		$output = $this->getOutput();
		$output->addModules( [ 'ext.wikilambda.edit' ] );

		// The page title is the current ZID
		$zId = $this->getPageTitle();

		$output->addModuleStyles( [ 'ext.wikilambda.editpage.styles' ] );

		// (T290217) Show page title
		// NOTE setPageTitle sets both the HTML <title> header and the <h1> tag
		$output->setPageTitle( $this->getPageTitleMsg() );

		$zObjectLabelsWithLang = $this->getTargetZObjectWithLabels();
		if ( $zObjectLabelsWithLang[ 'title' ] === 'Function' ) {
			$linkLabel = Html::element(
				'a',
				[ 'class' => 'ext-wikilambda-editpage-header-description--link' ],
				$this->msg( 'wikilambda-special-edit-function-definition-special-permission-link-label' )->text()
			);

			$output->addHtml( Html::rawElement(
				'div', [ 'class' => 'ext-wikilambda-editpage-header-description' ],
				$this->msg( 'wikilambda-special-edit-function-definition-description' )->rawParams( $linkLabel )
				->escaped()
			) );
		}

		// Fallback no-JS notice.
		$output->addHtml( Html::element(
			'div',
			[ 'class' => [ 'client-nojs', 'ext-wikilambda-editor-nojswarning' ] ],
			$this->msg( 'wikilambda-special-createzobject-nojs' )->inLanguage( $this->getLanguage() )->text()
		) );

		$userLangCode = $this->getLanguage()->getCode();

		$createNewPage = false;

		// If the userLang isn't recognised (e.g. it's qqx, or a language we don't support yet, or it's
		// nonsense), then fall back to English.
		$zLangRegistry = ZLangRegistry::singleton();
		$userLangZid = $zLangRegistry->getLanguageZidFromCode( $userLangCode, true );

		$editingData = [
			'zlang' => $userLangCode,
			'zlangZid' => $userLangZid,
			'createNewPage' => $createNewPage,
			'zId' => $zId,
			'viewmode' => false
		];

		$output->addJsConfigVars( 'wgWikiLambda', $editingData );

		// Vue app element
		$output->addHtml( Html::element( 'div', [ 'id' => 'ext-wikilambda-app' ] ) );
	}

	public function doesWrites() {
		return true;
	}
}
