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

use MediaWiki\Actions\Action;
use MediaWiki\Html\Html;
use MediaWiki\MainConfigNames;
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
	 * Get page title meta tag
	 * @return string
	 */
	protected function getPageMetaTitle() {
		// If the page doesn't exist (e.g. it's been deleted), return nothing.
		$targetZObject = $this->getTargetZObject();
		if ( !$targetZObject ) {
			return '';
		}

		$sitename = MediaWikiServices::getInstance()->getMainConfig()->get( MainConfigNames::Sitename );

		$zid = $targetZObject->getZid();
		$label = $targetZObject->getLabels()
			->buildStringForLanguage( $this->getLanguage() )
			->fallbackWithEnglish()
			->getString();

		return $this->msg( 'wikilambda-edit' )->text() . ' ' .
			( $label ?: $zid ) . ' - ' .
			$sitename;
	}

	/**
	 * Get page header message
	 * @return string
	 */
	protected function getPageTitleMsg() {
		// If the page doesn't exist (e.g. it's been deleted), return nothing.
		$targetZObject = $this->getTargetZObject();
		if ( !$targetZObject ) {
			return '';
		}

		// the language object of the user's preferred language
		$zObjectLabelsWithLang = $this->getTargetZObjectWithLabels();
		$label = $this->getLabelElement( $targetZObject );
		$zObjectId = $targetZObject->getZid();
		$id = Html::element(
			'span',
			[
				'class' => 'ext-wikilambda-editpage-header__zid'
			],
			$zObjectId
		);

		/* BCP47 Codes can occur in two places:
			(1) in front of the entire header - this happens if
				(a) ONLY the TYPE is in a non-user language OR
				(b) if both the TYPE and the NAME are in the SAME non-user language
			(2) in front of the name - this happens if the NAME is in a non-user language
		*/
		[ $BCP47CodeObjectName, $BCP47CodeObjectType ] = $this->getBCP47CodeElements(
			$targetZObject,
			$zObjectLabelsWithLang
		);

		$prefix = Html::element(
			'span', [ 'class' => 'ext-wikilambda-editpage-header__title' ],
			$this->msg( 'wikilambda-edit' )->text()
		);

		return Html::rawElement(
			'span',
			[ 'class' => 'ext-wikilambda-editpage-header' ],
			" " . $prefix . " " . $BCP47CodeObjectType . " " . $zObjectLabelsWithLang[ 'title' ]
			. $this->msg( 'colon-separator' )->text() . $BCP47CodeObjectName . $label . ' ' . $id );
	}

	/**
	 * Get the HTML element for the label.
	 *
	 * @param ZObjectContent $targetZObject The target ZObject.
	 * @return string The HTML string for the label element.
	 */
	protected function getLabelElement( ZObjectContent $targetZObject ) {
		[ 'title' => $labelText ] = $targetZObject->getLabels()
			->buildStringForLanguage( $this->getLanguage() )
			->fallbackWithEnglish()
			->placeholderForTitle()
			->getStringAndLanguageCode();
		$untitledStyle = $labelText === wfMessage( 'wikilambda-editor-default-name' )->text() ?
		'ext-wikilambda-editpage-header__title--untitled' : null;

		return Html::element(
			'span',
			[
				'class' => [
					'ext-wikilambda-editpage-header__title',
					'ext-wikilambda-editpage-header__title--function-name',
					$untitledStyle
				]
			],
			$labelText
		);
	}

	/**
	 * Get BCP47 code elements for name and type
	 *
	 * @param ZObjectContent $targetZObject The target ZObject.
	 * @param array $zObjectLabelsWithLang
	 * @return array
	 */
	protected function getBCP47CodeElements( ZObjectContent $targetZObject, array $zObjectLabelsWithLang ) {
		// used to go from LANG_CODE -> LANG_NAME
		// TODO (T362246): Dependency-inject
		$services = MediaWikiServices::getInstance();

		// the BCP47 code of the language currently being rendered for the zObject Type
		$typeLangCode = $zObjectLabelsWithLang['languageCode'] ?: '';
		$typeLangLabel = $services->getLanguageNameUtils()->getLanguageName( $typeLangCode );

		// the BCP47 code of the language currently being rendered for the zObject Type
		$userLangCode = $this->getLanguage()->getCode();
		$nameLangCode = $targetZObject
			->getLabels()
			->buildStringForLanguage( $this->getLanguage() )
			->fallbackWithEnglish()
			->getLanguageProvided() ?? $userLangCode;
		$nameLangLabel = $services->getLanguageNameUtils()->getLanguageName( $nameLangCode );

		$BCP47CodeObjectName = ZObjectUtils::wrapBCP47CodeInFakeCodexChip(
			$nameLangCode,
			$nameLangLabel,
			ZObjectUtils::getBCP47ClassName( 'name', $nameLangCode, $userLangCode ),
		);
		$BCP47CodeObjectType = ZObjectUtils::wrapBCP47CodeInFakeCodexChip(
			$typeLangCode,
			$typeLangLabel,
			ZObjectUtils::getBCP47ClassName( 'type', $typeLangCode, $userLangCode ),
		);

		return [ $BCP47CodeObjectName, $BCP47CodeObjectType ];
	}

	public function show() {
		$output = $this->getOutput();
		$output->addModules( [ 'ext.wikilambda.app' ] );

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

		// (T290217) Set page header
		$output->setPageTitle( $this->getPageTitleMsg() );

		// (T360169) Set page title meta tag
		$output->setHTMLTitle( $this->getPageMetaTitle() );

		$zObjectLabelsWithLang = $this->getTargetZObjectWithLabels();

		if ( $zObjectLabelsWithLang[ 'title' ] === 'Function' ) {
			$linkLabel = Html::element(
				'a',
				[
					'class' => 'ext-wikilambda-editpage-header__description--link',
					'href' => $this->msg( 'wikilambda-users-help-link' )->text()
				],
				$this->msg( 'wikilambda-special-edit-function-definition-special-permission-link-label' )->text()
			);

			$output->addHtml( Html::rawElement(
				'div', [ 'class' => 'ext-wikilambda-editpage-header__description' ],
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

	/** @inheritDoc */
	public function doesWrites() {
		return true;
	}
}
