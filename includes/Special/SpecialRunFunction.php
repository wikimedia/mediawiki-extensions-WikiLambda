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

use Html;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use SpecialPage;

class SpecialRunFunction extends SpecialPage {

	public function __construct() {
		parent::__construct( 'RunFunction', 'wikilambda-execute' );
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
		return $this->msg( 'wikilambda-special-runfunction' )->text();
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subPage ) {
		// TODO: Use $subPage to extract and pre-fill target Z8?

		$this->setHeaders();
		$this->outputHeader( 'wikilambda-special-runfunction-summary' );

		$output = $this->getOutput();
		$output->addModules( [ 'ext.wikilambda.edit','mediawiki.special' ] );

		$output->addWikiMsg( 'wikilambda-special-runfunction-intro' );

		// TODO (T300515): Make this help page.
		$this->addHelpLink( 'Extension:WikiLambda/Run function' );

		// TODO: De-dupe a bit more from ZObjectEditAction?
		$userLang = $this->getLanguage();

		// Fallback no-JS notice.
		$output->addHtml( Html::element(
			'div',
			[ 'class' => [ 'client-nojs', 'ext-wikilambda-editor-nojswarning' ] ],
			$this->msg( 'wikilambda-special-runfunction-nojs' )->inLanguage( $userLang )->text()
		) );

		$userLangCode = $userLang->getCode();

		// If the userLang isn't recognised (e.g. it's qqx, or a language we don't support yet, or it's
		// nonsense), then fall back to English.
		$zLangRegistry = ZLangRegistry::singleton();
		$userLangZid = $zLangRegistry->getLanguageZidFromCode( $userLangCode, true );

		$editingData = [
			'zlang' => $userLangCode,
			'zlangZid' => $userLangZid,
			'createNewPage' => false,
			'runFunction' => true,
			'viewmode' => false
		];

		$output->addJsConfigVars( 'wgWikiLambda', $editingData );

		// Vue app element
		$output->addHtml( Html::element( 'div', [ 'id' => 'ext-wikilambda-app' ] ) );
	}
}