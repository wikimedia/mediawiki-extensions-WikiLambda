<?php
/**
 * WikiLambda Special:CreateObject page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\Extension\WikiLambda\ZObjectEditingPageTrait;
use SpecialPage;

class SpecialCreateObject extends SpecialPage {
	use ZObjectEditingPageTrait;

	public function __construct() {
		parent::__construct( 'CreateObject', 'wikilambda-create' );
	}

	/**
	 * @inheritDoc
	 */
	protected function getGroupName() {
		return 'wikilambda';
	}

	/**
	 * @inheritDoc
	 */
	public function getDescription() {
		// we do not know which object type will be created, so we need to be generic here
		return $this->msg( 'wikilambda-special-createobject' );
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subPage ) {
		if ( !$this->userCanExecute( $this->getUser() ) ) {
			$this->displayRestrictionError();
		}

		// TODO: Use $subPage to extract and pre-fill type/etc.?

		$this->setHeaders();
		// TODO (T312532): determine if there should be object type agnostic text here
		// $this->outputHeader( 'wikilambda-special-define-function-summary' );

		$output = $this->getOutput();

		$output->addModules( [ 'ext.wikilambda.edit', 'mediawiki.special' ] );

		$output->addWikiMsg( 'wikilambda-special-createobject-intro' );

		$this->addHelpLink( 'Extension:WikiLambda/Creating Objects' );

		$this->generateZObjectPayload( $output, $this->getContext(), [
			'createNewPage' => true,
		] );
	}
}
