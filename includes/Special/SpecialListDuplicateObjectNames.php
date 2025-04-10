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
use MediaWiki\User\User;

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
		return parent::userCanExecute( $user );
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $ignoredSubPage ) {
		if ( !$this->userCanExecute( $this->getUser() ) ) {
			$this->displayRestrictionError();
		}

		$this->setHeaders();
		$this->outputHeader( 'wikilambda-special-listduplicateobjectlabels-summary' );

		$output = $this->getOutput();

		$output->enableOOUI();

		$output->addModuleStyles( [ 'mediawiki.special' ] );
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
