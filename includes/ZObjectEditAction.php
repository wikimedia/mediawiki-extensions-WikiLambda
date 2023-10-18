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
use MediaWiki\MediaWikiServices;

class ZObjectEditAction extends Action {
	use ZObjectEditingPageTrait;

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
		// If the page doesn't exist (e.g. it's been deleted), return nothing.
		if ( !$this->getTargetZObject() ) {
			return '';
		}

		// the language object of the user's preferred language
		$zObjectLabelsWithLang = $this->getTargetZObjectWithLabels();

		[ 'title' => $labelText ] = $this->getTargetZObject()->getLabels()
			->buildStringForLanguage( $this->getLanguage() )
			->fallbackWithEnglish()
			->placeholderForTitle()
			->getStringAndLanguageCode();

		$untitledStyle = $labelText === wfMessage( 'wikilambda-editor-default-name' )->text() ?
			'ext-wikilambda-editpage-header--title-untitled' : null;

		$label = Html::element(
			'span',
			[
				'class' => [
					'ext-wikilambda-editpage-header-title',
					'ext-wikilambda-editpage-header-title--function-name',
					$untitledStyle
				]
			],
			$labelText
		);

		$zObjectId = $this->getTargetZObject()->getZid();
		$id = Html::element(
			'span',
			[
				'class' => 'ext-wikilambda-editpage-header-zid'
			],
			$zObjectId
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
		$typeLangName = $services->getLanguageNameUtils()->getLanguageName( $typeLangCode );

		// the iso code of the language currently being rendered for the zObject Type
		$userLangCode = $this->getLanguage()->getCode();

		$nameLangCode = $this->getTargetZObject()
			->getLabels()
			->buildStringForLanguage( $this->getLanguage() )
			->fallbackWithEnglish()
			->getLanguageProvided() ?? $userLangCode;
		$nameLangTitle = $services->getLanguageNameUtils()->getLanguageName( $nameLangCode );

		$isoCodeClassName = 'ext-wikilambda-editpage-header--iso-code';

		if ( $typeLangCode !== $nameLangCode ) {
			$isoCodeObjectName = $this->getIsoCodeIfUserLangIsDifferent(
				$nameLangCode, $nameLangTitle, $userLangCode, $isoCodeClassName
			);
		} else {
			// if we have two iso codes showing the same fallback language, only render the first one
			$isoCodeObjectName = '';
		}

		// show a language label if the text is not the user's preferred language
		$isoCodeObjectType = $this->getIsoCodeIfUserLangIsDifferent(
			$typeLangCode, $typeLangName, $userLangCode, $isoCodeClassName
		);

		$prefix = Html::element(
			'span', [ 'class' => 'ext-wikilambda-editpage-header-title' ],
			$this->msg( 'wikilambda-edit' )->text()
		);

		return Html::rawElement(
			'span',
			[ 'class' => 'ext-wikilambda-editpage-header' ],
			" " . $prefix . " " . $isoCodeObjectType . " " . $zObjectLabelsWithLang[ 'title' ]
			. $this->msg( 'colon-separator' )->text() . $isoCodeObjectName . $label . ' ' . $id );
	}

	public function show() {
		$output = $this->getOutput();
		$output->addModules( [ 'ext.wikilambda.edit' ] );

		// (T347528) The action's Title object, not the Message getPageTitle() for the HTML page heading
		$zId = $this->getTitle()->getBaseText();

		$output->addModuleStyles( [ 'ext.wikilambda.editpage.styles' ] );

		// (T328679) If the page doesn't exist yet, route the user to the ZObject creation system
		// rather than running the code below that assumes the ZObject exists.
		if ( !$this->getTitle()->exists() ) {
			$this->generateZObjectPayload( $output, $this->getContext(), [
				'createNewPage' => true,
				'zId' => $zId,
			] );
			return;
		}

		// (T290217) Show page title
		// NOTE setPageTitle sets both the HTML <title> header and the <h1> tag
		$output->setPageTitle( $this->getPageTitleMsg() );

		$zObjectLabelsWithLang = $this->getTargetZObjectWithLabels();

		if ( $zObjectLabelsWithLang[ 'title' ] === 'Function' ) {
			$linkLabel = Html::element(
				'a',
				[
					'class' => 'ext-wikilambda-editpage-header-description--link',
					'href' => $this->msg( 'wikilambda-users-help-link' )->text()
				],
				$this->msg( 'wikilambda-special-edit-function-definition-special-permission-link-label' )->text()
			);

			$output->addHtml( Html::rawElement(
				'div', [ 'class' => 'ext-wikilambda-editpage-header-description' ],
				$this->msg( 'wikilambda-special-edit-function-definition-description' )->rawParams( $linkLabel )
				->escaped()
			) );
		}

		$this->generateZObjectPayload( $output, $this->getContext(), [
			'createNewPage' => false,
			'zId' => $zId,
		] );
	}

	/**
	 * @inheritDoc
	 */
	public function getRestriction() {
		// This is a very basic check; proper type-specific checking depends on the attemped
		// edit/creation content, which isn't available yet
		return 'wikilambda-create';
	}

	public function doesWrites() {
		return true;
	}
}
