<?php
/**
 * WikiLambda edit action for Abstract Wiki content
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

use MediaWiki\Actions\Action;
use MediaWiki\Context\IContextSource;
use MediaWiki\Extension\WikiLambda\UIUtils;
use MediaWiki\Html\Html;
use MediaWiki\MainConfigNames;
use MediaWiki\MediaWikiServices;
use MediaWiki\Output\OutputPage;

class AbstractContentEditAction extends Action {
	/**
	 * @inheritDoc
	 */
	public function getName() {
		return 'edit';
	}

	/**
	 * Get page title meta tag
	 * @return string
	 */
	protected function getPageMetaTitle() {
		// If the page doesn't exist (e.g. it's been deleted), return nothing.
		if ( !$this->getTitle()->exists() ) {
			return '';
		}

		$sitename = MediaWikiServices::getInstance()->getMainConfig()->get( MainConfigNames::Sitename );

		return $this->msg( 'wikilambda-abstract-edit-metatitle' )->text() . ' ' . $this->getTitle()->getText()
			. ' - ' . $sitename;
	}

	/**
	 * Get page header message
	 * @return string
	 */
	protected function getPageTitleMsg() {
		// If the page doesn't exist (e.g. it's been deleted), return nothing.
		if ( !$this->getTitle()->exists() ) {
			return '';
		}

		return Html::rawElement(
			'span',
			[ 'class' => 'ext-wikilambda-abstractcontent-editpage-header' ],
			$this->getTitle()->getText()
		);
	}

	/**
	 * Generate the edition or creation header and render it in the output.
	 *
	 * @param OutputPage $output
	 * @param IContextSource $context
	 * @param array $jsEditingConfigVarOverride variables to pass to the mw.config in JavaScript.
	 */
	private function generateAbstractObjectPayload(
		OutputPage $output, IContextSource $context, array $jsEditingConfigVarOverride
	) {
		// TODO (T411705): Provide the edit page content

		$userLang = $context->getLanguage();

		// Only add no-JS notice for edit/create modes, not view mode (content handler handles it)
		$isViewMode = ( $jsEditingConfigVarOverride['viewmode'] ?? false ) === true;
		if ( !$isViewMode ) {
			// Fallback no-JS notice.
			$output->addHtml( Html::rawElement(
				'noscript',
				[],
				$context->msg( 'wikilambda-nojs' )->inLanguage( $userLang )->parse()
			) );
			// Vue app element with Codex progress indicator
			$loadingMessage = $context->msg( 'wikilambda-loading' )->inLanguage( $userLang )->text();
			$output->addHtml( Html::rawElement(
				'div',
				[ 'id' => 'ext-wikilambda-app' ],
				UIUtils::createCodexProgressIndicator( $loadingMessage )
			) );
		}
	}

	public function show() {
		$output = $this->getOutput();
		$output->addModules( [ 'ext.wikilambda.app' ] );

		$qId = $this->getTitle()->getBaseText();

		$output->addModuleStyles( [ 'ext.wikilambda.editpage.styles' ] );

		if ( !$this->getTitle()->exists() ) {
			$this->generateAbstractObjectPayload( $output, $this->getContext(), [
				'createNewPage' => true,
				'qId' => $qId,
			] );
			return;
		}

		// (T290217) Set page header
		$output->setPageTitle( $this->getPageTitleMsg() );

		// (T360169) Set page title meta tag
		$output->setHTMLTitle( $this->getPageMetaTitle() );
	}

	/**
	 * @inheritDoc
	 */
	public function getRestriction() {
		// This is a very basic check; proper type-specific checking depends on the attemped
		// edit/creation content, which isn't available yet
		return 'wikilambda-abstract-create';
	}

	/** @inheritDoc */
	public function doesWrites() {
		return true;
	}
}
