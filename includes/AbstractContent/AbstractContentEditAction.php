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
use MediaWiki\Extension\WikiLambda\PageTitle\PageTitleBuilder;
use MediaWiki\Title\Title;

class AbstractContentEditAction extends Action {
	use AbstractContentEditPageTrait;

	/**
	 * @inheritDoc
	 */
	public function getName() {
		return 'edit';
	}

	/**
	 * @inheritDoc
	 */
	public function show() {
		$output = $this->getOutput();

		$pageTitle = $this->getTitle();
		$this->generateAbstractContentPayload( $this->getContext(), $output, $pageTitle );

		// Load styles and Vue app module
		$output->addModuleStyles( [ 'ext.wikilambda.editpage.styles' ] );
		$output->addModules( [ 'ext.wikilambda.app' ] );

		// Set page header (edit or create, depending on the returned config vars)
		$lang = $this->getContext()->getLanguage();
		$qid = $pageTitle->getBaseText();
		$editPageTitle = $this->getPageTitleMsg( $pageTitle );

		// Rich HTML for the H1 display
		$output->setPageTitle(
			PageTitleBuilder::createAbstractEditPageTitle(
				$editPageTitle,
				$qid,
				$lang->getCode(),
				$lang->getDir(),
			)
		);
		// Plain-text override for the browser <title> tag
		$output->setHTMLTitle( $editPageTitle . ' (' . $qid . ')' );
	}

	/**
	 * Get page header title for an edit page:
	 * * when content is new: show create title
	 * * when content exists: show edit tile
	 *
	 * @param Title $title
	 * @return string
	 */
	protected function getPageTitleMsg( Title $title ): string {
		$pageExists = $title->exists();

		if ( !$pageExists ) {
			return $this->msg( 'wikilambda-abstract-special-create-qid' )
				->params( $title->getText() )->text();
		}

		$label = AbstractContentUtils::resolveAbstractLabel(
			$title->getText(),
			$this->getLanguage()->getCode()
		);

		if ( $label === null ) {
			return $this->msg( 'wikilambda-abstract-edit-title' )
				->params( $title->getText() )->text();
		}

		// fallback when no label found
		return $this->msg( 'wikilambda-abstract-edit-title-with-label' )
			->params( $label, $title->getText() )->text();
	}

	/**
	 * @inheritDoc
	 */
	public function getRestriction() {
		return 'wikilambda-abstract-create';
	}

	/**
	 * @inheritDoc
	 */
	public function doesWrites() {
		return true;
	}
}
