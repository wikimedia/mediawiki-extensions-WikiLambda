<?php
/**
 * WikiLambda Special:CreateAbstract page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\Exception\ErrorPageError;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentPageTrait;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\User\User;

class SpecialCreateAbstract extends SpecialPage {
	use AbstractContentPageTrait;

	public function __construct() {
		parent::__construct( 'CreateAbstract', 'wikilambda-abstract-create' );
	}

	/**
	 * @inheritDoc
	 */
	protected function getGroupName() {
		// Triggers use of message specialpages-group-abstractwiki
		return 'abstractwiki';
	}

	/**
	 * @inheritDoc
	 */
	public function getDescription() {
		return $this->msg( 'wikilambda-special-create-abstract' );
	}

	/**
	 * @inheritDoc
	 */
	public function isListed() {
		return $this->getConfig()->get( 'WikiLambdaEnableAbstractMode' );
	}

	/**
	 * @inheritDoc
	 */
	public function userCanExecute( User $user ) {
		// Does the user have the relevant right (wikilambda-abstract-create, as set above)?
		$userCanExecute = parent::userCanExecute( $user );

		// If they're blocked in some way, does it block page creations or is site-wide?
		$block = $user->getBlock();
		$userNotBlocked = ( !$block || !$block->appliesToRight( 'createpage' ) || !$block->isSitewide() );

		return $userCanExecute && $userNotBlocked;
	}

	/**
	 * Output an error message telling the user that the Abstract Mode is not enabled
	 *
	 * @throws ErrorPageError
	 * @return never
	 */
	private function displayNotAvailableError() {
		$titleMessage = $this->msg( 'wikilambda-special-create-abstract-not-enabled-title' );
		$errorMessage = $this->msg( 'wikilambda-special-create-abstract-not-enabled' );
		throw new ErrorPageError( $titleMessage, $errorMessage );
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subpage ) {
		// Throw ErrorPageError if Abtract Mode is not enabled
		if ( !$this->getConfig()->get( 'WikiLambdaEnableAbstractMode' ) ) {
			$this->displayNotAvailableError();
		}

		// Throw PermissionsError if user doesn't have the necessary rights
		if ( !$this->userCanExecute( $this->getUser() ) ) {
			$this->displayRestrictionError();
		}

		$this->setHeaders();

		$output = $this->getOutput();
		$configVars = $this->generateAbstractContentPayload(
			$output,
			$this->getContext(),
			$subpage
		);

		// Override page title if:
		// * we are creating a new page for a pre-selected qid
		// * we are editing an existing page
		if ( $configVars[ 'title' ] !== '' ) {
			$titleMsg = $configVars[ 'createNewPage' ] ?
				$this->msg( 'wikilambda-special-create-abstract-qid' )->params( $configVars[ 'title' ] ) :
				$this->msg( 'wikilambda-abstract-edit-title' )->params( $configVars[ 'title' ] );
			$output->setPageTitleMsg( $titleMsg );
		}

		$output->addModules( [ 'ext.wikilambda.app', 'mediawiki.special' ] );
		$output->addModuleStyles( [ 'ext.wikilambda.special.styles' ] );

		$output->addWikiMsg( 'wikilambda-special-create-abstract-intro' );

		// TODO (T411722): Add and link help page for creating Abstract articles
		$this->addHelpLink( 'Extension:WikiLambda/Creating Objects' );
	}
}
