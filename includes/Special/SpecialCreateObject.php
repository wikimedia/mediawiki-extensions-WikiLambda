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

use MediaWiki\Exception\ErrorPageError;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectEditingPageTrait;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\User\User;

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

		$description = match ( $zid ) {
			ZTypeRegistry::Z_TYPE => $this->msg( 'wikilambda-special-create-type' ),
			ZTypeRegistry::Z_FUNCTION => $this->msg( 'wikilambda-special-create-function' ),
			ZTypeRegistry::Z_IMPLEMENTATION => $this->msg( 'wikilambda-special-create-implementation' ),
			ZTypeRegistry::Z_TESTER => $this->msg( 'wikilambda-special-create-test' ),
			default => $this->msg( 'wikilambda-special-createobject' ),
		};

		return $description;
	}

	/**
	 * @inheritDoc
	 */
	public function isListed() {
		// No usage allowed on client-mode wikis.
		return $this->getConfig()->get( 'WikiLambdaEnableRepoMode' );
	}

	/**
	 * @inheritDoc
	 */
	public function userCanExecute( User $user ) {
		$block = $user->getBlock();

		return (
			// Does the user have the relevant right (wikilambda-create, as set above)?
			parent::userCanExecute( $user ) &&
			// If they're blocked in some way, does it block page creations or is site-wide?
			( !$block || !$block->appliesToRight( 'createpage' ) || !$block->isSitewide() )
		);
	}

	/**
	 * Output an error message telling the user that the Repo Mode is not enabled
	 *
	 * @throws ErrorPageError
	 * @return never
	 */
	private function displayNotAvailableError() {
		$titleMessage = $this->msg( 'wikilambda-special-create-zobject-not-enabled-title' );
		$errorMessage = $this->msg( 'wikilambda-special-create-zobject-not-enabled' );
		throw new ErrorPageError( $titleMessage, $errorMessage );
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subPage ) {
		// Throw ErrorPageError if Abtract Mode is not enabled
		if ( !$this->getConfig()->get( 'WikiLambdaEnableRepoMode' ) ) {
			$this->displayNotAvailableError();
		}

		// Throw PermissionsError if user doesn't have the necessary rights
		if ( !$this->userCanExecute( $this->getUser() ) ) {
			$this->displayRestrictionError();
		}

		// NOTE: We ignore $subPage server-side, and extract and pre-fill type/etc. in Vue

		$this->setHeaders();

		$output = $this->getOutput();

		$output->addModules( [ 'ext.wikilambda.app', 'mediawiki.special' ] );
		$output->addModuleStyles( [ 'ext.wikilambda.special.styles' ] );

		$output->addWikiMsg(
			'wikilambda-special-createobject-intro',
			'Special:MyLanguage/Wikifunctions:List_of_policies_and_guidelines'
		);

		$this->addHelpLink( 'Extension:WikiLambda/Creating Objects' );

		$this->generateZObjectPayload( $output, $this->getContext(), [
			'createNewPage' => true,
		] );
	}
}
