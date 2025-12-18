<?php
/**
 * WikiLambda Special:RunFunction page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\UIUtils;
use MediaWiki\Html\Html;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\User\User;

class SpecialRunFunction extends SpecialPage {

	public function __construct() {
		parent::__construct( 'RunFunction', 'wikilambda-execute' );
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
		return $this->msg( 'wikilambda-special-runfunction' );
	}

	/** @inheritDoc */
	public function isListed() {
		// No usage allowed on client-mode wikis.
		return $this->getConfig()->get( 'WikiLambdaEnableRepoMode' );
	}

	/**
	 * @inheritDoc
	 *
	 * @param User $user
	 * @return bool
	 */
	public function userCanExecute( User $user ) {
		if ( !$this->getConfig()->get( 'WikiLambdaEnableRepoMode' ) ) {
			// No usage allowed on client-mode wikis.
			return false;
		}

		$block = $user->getBlock();

		return (
			// Does the user have the relevant right (wikilambda-execute, as set above)?
			parent::userCanExecute( $user ) &&
			// If they're blocked in some way, is it site-wide?
			( !$block || !$block->isSitewide() )
		);
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subPage ) {
		if ( !$this->userCanExecute( $this->getUser() ) ) {
			$this->displayRestrictionError();
		}

		// TODO (T359573): Use $subPage to extract and pre-fill target Z8?

		$this->setHeaders();
		$this->outputHeader( 'wikilambda-special-runfunction-summary' );

		$output = $this->getOutput();
		$output->addModules( [ 'ext.wikilambda.app', 'mediawiki.special' ] );
		$output->addModuleStyles( [ 'ext.wikilambda.special.styles' ] );

		$output->addWikiMsg( 'wikilambda-special-runfunction-intro' );

		$this->addHelpLink( 'Help:Wikifunctions/Run function' );

		// TODO (T362240): Can we re-use parts of ZObjectEditingPageTrait rather than re-use?
		$userLang = $this->getLanguage();

		// Fallback no-JS notice.
		$output->addHtml( Html::rawElement(
			'noscript',
			[],
			$this->msg( 'wikilambda-nojs' )->inLanguage( $userLang )->parse()
		) );
		// Vue app element with Codex progress indicator
		$loadingMessage = $this->msg( 'wikilambda-loading' )->inLanguage( $userLang )->text();
		$output->addHtml( Html::rawElement(
			'div',
			[ 'id' => 'ext-wikilambda-app' ],
			UIUtils::createCodexProgressIndicator( $loadingMessage )
		) );

		$userLangCode = $userLang->getCode();

		$zLangRegistry = ZLangRegistry::singleton();
		// If the userLang isn't recognised (e.g. it's qqx, or a language we don't support yet, or it's
		// nonsense), then fall back to English.
		$userLangZid = $zLangRegistry->getLanguageZidFromCode( $userLangCode, true );
		// Normalise our used language code from what the Language object says
		$userLangCode = $zLangRegistry->getLanguageCodeFromZid( $userLangZid );

		$editingData = [
			'zlang' => $userLangCode,
			'zlangZid' => $userLangZid,
			'createNewPage' => false,
			'runFunction' => true,
			'viewmode' => false
		];

		$output->addJsConfigVars( 'wgWikiLambda', $editingData );
	}
}
