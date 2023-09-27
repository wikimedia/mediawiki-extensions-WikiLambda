<?php
/**
 * WikiLambda Special:ListDuplicateObjectNames page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\MediaWikiServices;
use SpecialPage;

class SpecialListDuplicateObjectNames extends SpecialPage {
	public function __construct() {
		parent::__construct( 'ListDuplicateObjectNames' );
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
		return $this->msg( 'wikilambda-special-listduplicateobjectlabels' );
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $ignoredSubPage ) {
		$this->setHeaders();
		$this->outputHeader( 'wikilambda-special-listduplicateobjectlabels-summary' );

		$output = $this->getOutput();

		$output->enableOOUI();

		$output->addModuleStyles( [ 'mediawiki.special' ] );
		// TODO (T300516): Make this help page.
		$this->addHelpLink( 'Extension:WikiLambda/Duplicate Object labels' );

		$pager = new DuplicateObjectLabelsPager(
			$this,
			$this->getLinkRenderer(),
			MediaWikiServices::getInstance()->getLinkBatchFactory(),
			MediaWikiServices::getInstance()->getLanguageNameUtils()
		);

		if ( $pager->getNumRows() === 0 ) {
			$output->addWikiMsg( 'wikilambda-special-listduplicateobjectlabels-empty' );
			return;
		}

		$output->addParserOutputContent( $pager->getFullOutput() );
	}
}
