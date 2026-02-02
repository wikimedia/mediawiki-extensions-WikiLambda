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
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentEditPageTrait;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\Title\Title;
use MediaWiki\User\User;

class SpecialCreateAbstract extends SpecialPage {
	use AbstractContentEditPageTrait;

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
		return $this->msg( 'wikilambda-abstract-special-create' );
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
		$titleMessage = $this->msg( 'wikilambda-abstract-special-create-not-enabled-title' );
		$errorMessage = $this->msg( 'wikilambda-abstract-special-create-not-enabled' );
		throw new ErrorPageError( $titleMessage, $errorMessage );
	}

	/**
	 * Get target title from subpage and parameters:
	 * 1. If there is subpage, that will contain namespace:qid, or just qid for main ns
	 * 	  * Special:CreateAbstract/Abstract_Wikipedia:Q42
	 * 	  * Special:CreateAbstract/Q42
	 * 2. Else, look into request parameters qid, which might contain title or ns:qid
	 *    * Special:CreateAbstract?qid=Q42
	 *    * Special:CreateAbstract?qid=Abstract_Wikipedia:Q42
	 * We ignore oldid= parameter in Special:CreateAbstract page
	 *
	 * @param string|null $subpage
	 * @return Title
	 */
	private function getTargetTitle( $subpage ): Title {
		$request = $this->getRequest();

		// Get qid, if any, either in subpage or as the url parameter 'qid'
		$rawTitle = $subpage ?: $request->getVal( 'qid' ) ?: '';

		// Get primary namespace: first of WikiLambdaAbstractNamespaces or NS_MAIN
		$namespaces = $this->getContext()->getConfig()->get( 'WikiLambdaAbstractNamespaces' );
		$namespaceIds = is_array( $namespaces ) && ( count( $namespaces ) > 0 )
			? array_map( 'intval', array_keys( $namespaces ) )
			: [ NS_MAIN ];
		$primaryNamespace = $namespaceIds[0];

		// Parse as full title
		$title = Title::newFromText( $rawTitle );

		// Invalid or empty raw title; return empty title in primary NS
		if ( !$title ) {
			return Title::makeTitle( $primaryNamespace, '' );
		}

		// If namespace is not a configured abstract namespace, overwrite it with primary AW ns
		$ns = $title->getNamespace();
		if ( !in_array( $ns, $namespaceIds, true ) ) {
			return Title::makeTitle( $primaryNamespace, $title->getText() );
		}

		return $title;
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

		$output = $this->getOutput();
		$context = $this->getContext();

		$userLangCode = $context->getLanguage()->getCode();

		$title = $this->getTargetTitle( $subpage );

		// If title exists, we redirect to Special:ViewAbstract/<lang>/<title>
		if ( $title->exists() ) {
			$redirectSubpage = $userLangCode . '/' . $title->getPrefixedText();
			$redirectTitle = SpecialPage::getTitleFor( 'ViewAbstract', $redirectSubpage );
			$redirectParams = [ 'created' => 1 ];
			$redirectURL = $redirectTitle->getFullURL( $redirectParams );
			$output->redirect( $redirectURL );
			return;
		}

		// If title doesn't exist, start building the page:
		$this->setHeaders();

		// Generate Abstract Content payload and pass data through JS config vars
		$this->generateAbstractContentPayload( $context, $output, $title );

		// Override page title if we are creating a new page for a pre-selected qid
		if ( $title->getText() !== '' ) {
			$titleMsg = $this->msg( 'wikilambda-abstract-special-create-qid' )->params( $title->getText() );
			$output->setPageTitleMsg( $titleMsg );
		}

		$output->addModules( [ 'ext.wikilambda.app', 'mediawiki.special' ] );
		$output->addModuleStyles( [ 'ext.wikilambda.special.styles' ] );

		$output->addWikiMsg(
			'wikilambda-abstract-special-create-intro',
			'Special:MyLanguage/Abstract:List_of_policies_and_guidelines'
		);

		// TODO (T411722): Add and link help page for creating Abstract articles
		$this->addHelpLink( 'Extension:WikiLambda/Creating Objects' );
	}
}
