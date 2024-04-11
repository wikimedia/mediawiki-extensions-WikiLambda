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
use MediaWiki\SpecialPage\SpecialPage;

class SpecialListDuplicateObjectNames extends SpecialPage {
	public function __construct() {
		parent::__construct( 'ListDuplicateObjectNames' );
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
		$this->addHelpLink( 'Help:Wikifunctions/Duplicate Object labels' );

		// TODO (T362246): Dependency-inject
		$services = MediaWikiServices::getInstance();
		$pager = new DuplicateObjectLabelsPager(
			$this,
			$this->getLinkRenderer(),
			$services->getLinkBatchFactory(),
			$services->getLanguageNameUtils()
		);

		if ( $pager->getNumRows() === 0 ) {
			$output->addWikiMsg( 'wikilambda-special-listduplicateobjectlabels-empty' );
			return;
		}

		$output->addParserOutputContent( $pager->getFullOutput() );
	}
}
