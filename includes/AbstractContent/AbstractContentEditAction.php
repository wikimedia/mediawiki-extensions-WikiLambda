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

class AbstractContentEditAction extends Action {
	use AbstractContentPageTrait;

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

		// Load styles and Vue app module
		$output->addModuleStyles( [ 'ext.wikilambda.editpage.styles' ] );
		$output->addModules( [ 'ext.wikilambda.app' ] );

		$pageTitle = $this->getTitle()->getPrefixedText();

		$configVars = $this->generateAbstractContentPayload(
			$output,
			$this->getContext(),
			$pageTitle
		);

		// Set page header (edit or create, depending on the returned config vars)
		$output->setPageTitle( $this->getPageTitleMsg( $configVars ) );
	}

	/**
	 * Get page header title for an edit page:
	 * * when content is new: show create title
	 * * when content exists: show edit tile
	 *
	 * @param array $configVars
	 * @return string
	 */
	protected function getPageTitleMsg( $configVars ) {
		$newPage = $configVars[ 'createNewPage' ];
		$title = $configVars[ 'title' ];

		return $newPage ?
			$this->msg( 'wikilambda-abstract-special-create-qid' )->params( $title )->text() :
			$this->msg( 'wikilambda-abstract-edit-title' )->params( $title )->text();
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
