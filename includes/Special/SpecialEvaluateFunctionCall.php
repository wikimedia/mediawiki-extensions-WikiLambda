<?php
/**
 * WikiLambda Special:EvaluateFunctionCall page
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

class SpecialEvaluateFunctionCall extends SpecialPage {

	public function __construct() {
		// TODO: (T278651) Switch this restriction to a custom user right
		parent::__construct( 'EvaluateFunctionCall', 'createpage' );
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
		return $this->msg( 'wikilambda-special-evaluatefunctioncall' )->text();
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subPage ) {
		// TODO: Use $subPage to extract and pre-fill target Z8?

		$this->setHeaders();
		$this->outputHeader( 'wikilambda-special-evaluatefunctioncall-summary' );

		$output = $this->getOutput();
		$output->addModules( [ 'ext.wikilambda.edit','ext.wikilambda.specialpages.styles', 'mediawiki.special' ] );

		$output->addWikiMsg( 'wikilambda-special-evaluatefunctioncall-intro' );

		// TODO: Make this help page.
		$this->addHelpLink( 'Extension:WikiLambda/Evaluate function call' );

		// TODO: De-dupe a bit more from ZObjectEditAction?
		$userLang = $this->getLanguage();

		// Fallback no-JS notice.
		$output->addHtml( Html::element(
			'div',
			[ 'class' => [ 'client-nojs', 'ext-wikilambda-editor-nojswarning' ] ],
			$this->msg( 'wikilambda-special-evaluatefunctioncall-nojs' )->inLanguage( $userLang )->text()
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
			'viewmode' => false
		];

		$output->addJsConfigVars( 'wgWikiLambda', $editingData );

		// Vue app element
		$output->addHtml( Html::element( 'div', [ 'id' => 'ext-wikilambda-app' ] ) );
	}
}
