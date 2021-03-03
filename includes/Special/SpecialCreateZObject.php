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
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use SpecialPage;

class SpecialCreateZObject extends SpecialPage {

	public function __construct() {
		parent::__construct( 'CreateZObject', 'createpage' );
	}

	/**
	 * @inheritDoc
	 */
	protected function getGroupName() {
		return 'wiki';
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
		$contentHandler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$zObject = $contentHandler->makeEmptyContent();

		$dbr = wfGetDB( DB_REPLICA );
		$res = $dbr->select(
			/* FROM */ 'page',
			/* SELECT */ [ 'page_title' ],
			/* WHERE */ [
				'page_namespace' => NS_ZOBJECT,
			],
			__METHOD__,
			[
				'GROUP BY' => 'page_id',
				'ORDER BY' => 'page_id DESC',
				'LIMIT' => 1,
			]
		);

		// NOTE: This picks either Z10000 or the next ZID after the latest one created; maybe just
		// down-stream this to the editor entirely?

		// If something went wrong with the query, just use Z9999, giving us Z10000.
		$maxCurrentZID = $res->numRows() > 0 ? $res->fetchRow()[ 0 ] : 'Z9999';

		// TODO: If a page has been deleted and then undeleted while the original page_id was re-used, &
		// its undeletion is the most recent page 'create', the ZID returned will be wrong; fix this.
		$targetZid = 'Z' . ( max( intval( substr( $maxCurrentZID, 1 ) ) + 1, 10000 ) );

		$editingData = [
			'title' => $targetZid,
			'page' => 'ZObject:' . $targetZid,
			'zobject' => $zObject->getData()->getValue(),
			'zlang' => $userLangCode,
			'createNewPage' => true,
			'viewmode' => false
		];

		$output->addJsConfigVars( 'wgWikiLambda', $editingData );

		// Vue app element
		$output->addHtml( Html::element( 'div', [ 'id' => 'ext-wikilambda-app' ] ) );
	}
}
