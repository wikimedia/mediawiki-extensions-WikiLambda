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

use MediaWiki\Cache\LinkBatchFactory;
use MediaWiki\Languages\LanguageNameUtils;
use MediaWiki\Parser\ParserOptions;
use MediaWiki\SpecialPage\SpecialPage;

class SpecialListDuplicateObjectNames extends SpecialPage {
	private LanguageNameUtils $languageNameUtils;
	private LinkBatchFactory $linkBatchFactory;

	public function __construct(
		LanguageNameUtils $languageNameUtils,
		LinkBatchFactory $linkBatchFactory
	) {
		parent::__construct( 'ListDuplicateObjectNames' );
		$this->languageNameUtils = $languageNameUtils;
		$this->linkBatchFactory = $linkBatchFactory;
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

		$pager = new DuplicateObjectLabelsPager(
			$this,
			$this->getLinkRenderer(),
			$this->linkBatchFactory,
			$this->languageNameUtils
		);

		if ( $pager->getNumRows() === 0 ) {
			$output->addWikiMsg( 'wikilambda-special-listduplicateobjectlabels-empty' );
			return;
		}

		$output->addParserOutputContent(
			$pager->getFullOutput(),
			ParserOptions::newFromContext( $this->getContext() )
		);
	}
}
