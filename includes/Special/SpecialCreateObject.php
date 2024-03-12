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

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
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
		// Triggers use of message specialpages-group-wikilambda
		return 'wikilambda';
	}

	/**
	 * @inheritDoc
	 */
	public function getDescription() {
		// we do not know which object type will be created, so we need to be generic here
		$request = $this->getRequest();
		$zid = $request->getText( 'zid' );
		$description = null;

		switch ( $zid ) {
			case ZTypeRegistry::Z_TYPE:
				$description = $this->msg( 'wikilambda-special-create-type' );
				break;
			case ZTypeRegistry::Z_FUNCTION:
				$description = $this->msg( 'wikilambda-special-create-function' );
				break;
			case ZTypeRegistry::Z_IMPLEMENTATION:
				$description = $this->msg( 'wikilambda-special-create-implementation' );
				break;
			case ZTypeRegistry::Z_TESTER:
				$description = $this->msg( 'wikilambda-special-create-test' );
				break;
			default:
				$description = $this->msg( 'wikilambda-special-createobject' );
		}
		return $description;
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

		$output = $this->getOutput();

		$output->addModules( [ 'ext.wikilambda.edit', 'mediawiki.special' ] );

		$output->addWikiMsg( 'wikilambda-special-createobject-intro' );

		$this->addHelpLink( 'Extension:WikiLambda/Creating Objects' );

		$this->generateZObjectPayload( $output, $this->getContext(), [
			'createNewPage' => true,
		] );
	}
}
