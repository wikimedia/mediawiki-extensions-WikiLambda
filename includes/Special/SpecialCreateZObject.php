<?php
/**
 * WikiLambda Special:CreateZObject page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\Extension\WikiLambda\ZObjectEditingPageTrait;
use SpecialPage;

class SpecialCreateZObject extends SpecialPage {
	use ZObjectEditingPageTrait;

	public function __construct() {
		parent::__construct( 'CreateZObject', 'createpage' );
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
		return $this->msg( 'wikilambda-special-createzobject' )->text();
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subPage ) {
		// TODO: Use $subPage to extract and pre-fill type/etc.?

		$this->setHeaders();
		// TODO (T312532): determine if there should be object type agnostic text here
		// $this->outputHeader( 'wikilambda-special-define-function-summary' );

		$output = $this->getOutput();
		$output->addModules( [ 'ext.wikilambda.edit', 'mediawiki.special' ] );

		$output->addWikiMsg( 'wikilambda-special-createzobject-intro' );

		// TODO (T300517): Make this help page.
		$this->addHelpLink( 'Extension:WikiLambda/Creating ZObjects' );

		$this->generateZObjectPayload( $output, $this->getContext(), [
			'createNewPage' => true,
		] );
	}
}
