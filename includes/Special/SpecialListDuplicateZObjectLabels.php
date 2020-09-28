<?php
/**
 * WikiLambda Special:ListDuplicateZObjectLabels page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\MediaWikiServices;
use SpecialPage;

class SpecialListDuplicateZObjectLabels extends SpecialPage {
	public function __construct() {
		parent::__construct( 'ListDuplicateZObjectLabels' );
	}

	/**
	 * @inheritDoc
	 */
	protected function getGroupName() {
		return 'maintenance';
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $ignoredSubPage ) {
		$this->setHeaders();
		$this->outputHeader();

		$output = $this->getOutput();

		$output->enableOOUI();

		$output->addModuleStyles( [ 'mediawiki.special', 'ext.wikilambda.specialpages.styles' ] );
		// TODO: Make this help page.
		$this->addHelpLink( 'Extension:WikiLambda/Duplicate ZObject labels' );

		$pager = new DuplicateZObjectLabelsPager(
			$this,
			$this->getLinkRenderer(),
			MediaWikiServices::getInstance()->getLinkBatchFactory(),
			MediaWikiServices::getInstance()->getLanguageNameUtils()
		);

		if ( $pager->getNumRows() === 0 ) {
			$output->addWikiMsg( 'wikilambda-speciallistduplicatezobjectlabels-empty' );
			return;
		}

		$output->addParserOutputContent( $pager->getFullOutput() );
	}
}
