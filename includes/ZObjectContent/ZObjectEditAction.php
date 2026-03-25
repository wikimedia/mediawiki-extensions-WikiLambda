<?php
/**
 * WikiLambda edit action for ZObjects
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjectContent;

use MediaWiki\Actions\Action;
use MediaWiki\Extension\WikiLambda\PageTitle\PageTitleBuilder;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Html\Html;
use MediaWiki\MainConfigNames;
use MediaWiki\Skin\Skin;
use MediaWiki\SpecialPage\SpecialPage;

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
	protected function getZObjectEditPageHTMLTitle() {
		// If the page doesn't exist (e.g. it's been deleted), return nothing.
		$targetZObject = $this->getTargetZObject();
		if ( !$targetZObject ) {
			return '';
		}

		$sitename = $this->getContext()->getConfig()->get( MainConfigNames::Sitename );

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
	protected function getZObjectEditTitle() {
		// If the page doesn't exist (e.g. it's been deleted), return nothing.
		$targetZObject = $this->getTargetZObject();
		if ( !$targetZObject ) {
			return '';
		}
		return PageTitleBuilder::createZObjectEditPageTitle( $targetZObject, $this->getLanguage(), $this );
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
			$specialTitle = SpecialPage::getTitleFor( 'CreateObject' );
			$this->getOutput()->redirect( $specialTitle->getFullURL() );
			return;
		}

		// (T290217) Set page header
		$pageTitle = $this->getZObjectEditTitle();
		$output->setPageTitle( $pageTitle );

		// (T360169) Set page title meta tag
		$htmlTitle = $this->getZObjectEditPageHTMLTitle();
		$output->setHTMLTitle( $htmlTitle );

		$zObjectLabelsWithLang = $this->getTargetZObjectWithLabels();

		if ( $zObjectLabelsWithLang[ 'title' ] === 'Function' ) {
			$url = Skin::makeInternalOrExternalUrl( $this->msg( 'wikilambda-users-help-link' )->text() );
			$linkLabel = Html::element(
				'a',
				[
					'class' => 'ext-wikilambda-editpage-header__description--link',
					'href' => $url
				],
				$this->msg( 'wikilambda-special-edit-function-definition-special-permission-link-label' )->text()
			);

			$output->addHtml( Html::rawElement(
				'div', [ 'class' => 'ext-wikilambda-editpage-header__description' ],
				$this->msg( 'wikilambda-special-edit-function-definition-description' )->rawParams( $linkLabel )
				->escaped()
			) );
		}

		$this->generateZObjectPayload( $this->getContext(), $output, [
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
