<?php
/**
 * WikiLambda Special:CreateZObject page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use Html;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use SpecialPage;

class SpecialCreateZObject extends SpecialPage {

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
		return $this->msg( 'wikilambda-special-createzobject' )->text();
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subPage ) {
		// TODO: Use $subPage to extract and pre-fill type/etc.?

		$this->setHeaders();
		$this->outputHeader( 'wikilambda-special-createzobject-summary' );

		$output = $this->getOutput();
		$output->addModules( [ 'ext.wikilambda.edit','ext.wikilambda.specialpages.styles', 'mediawiki.special' ] );

		$output->addWikiMsg( 'wikilambda-special-createzobject-intro' );

		// TODO: Make this help page.
		$this->addHelpLink( 'Extension:WikiLambda/Creating ZObjects' );

		// TODO: De-dupe a bit more from ZObjectEditAction?
		$userLang = $this->getLanguage();

		// Fallback no-JS notice.
		$output->addHtml( Html::element(
			'div',
			[ 'class' => [ 'client-nojs', 'ext-wikilambda-editor-nojswarning' ] ],
			$this->msg( 'wikilambda-special-createzobject-nojs' )->inLanguage( $userLang )->text()
		) );

		$userLangCode = $userLang->getCode();

		// If the userLang isn't recognised (e.g. it's qqx, or a language we don't support yet, or it's
		// nonsense), then fall back to English.
		$zLangRegistry = ZLangRegistry::singleton();
		$userLangZid = $zLangRegistry->getLanguageZidFromCode(
			( $zLangRegistry->isLanguageKnownGivenCode( $userLangCode ) )
				? $userLangCode
				: 'en'
			);

		$editingData = [
			'zlang' => $userLangCode,
			'zlangZid' => $userLangZid,
			'createNewPage' => true,
			'viewmode' => false
		];

		$output->addJsConfigVars( 'wgWikiLambda', $editingData );

		// Vue app element
		$output->addHtml( Html::element( 'div', [ 'id' => 'ext-wikilambda-app' ] ) );
	}
}
