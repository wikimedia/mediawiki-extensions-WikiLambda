<?php
/**
 * WikiLambda Special:FunctionUsage page
 *
 * Lists the local and cross-wiki pages on which a given Function is used, so that
 * Wikifunctions editors can see the impact of changing it (T390557). The data is read
 * from the shared cross-wiki wikifunctions_usage table on x1 via WikifunctionsUsageStore;
 * this page is therefore repo-mode only, as only the repo reads that table.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\Extension\WikiLambda\WikifunctionsUsageStore;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Html\Html;
use MediaWiki\HTMLForm\HTMLForm;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\Title\Title;
use MediaWiki\User\User;
use MediaWiki\WikiMap\WikiMap;

class SpecialFunctionUsage extends SpecialPage {

	/** Number of using pages shown per page of results. */
	private const PAGE_LIMIT = 50;

	/**
	 * @param WikifunctionsUsageStore $usageStore
	 * @param ZObjectStore $zObjectStore
	 */
	public function __construct(
		private readonly WikifunctionsUsageStore $usageStore,
		private readonly ZObjectStore $zObjectStore
	) {
		parent::__construct( 'FunctionUsage' );
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
		return $this->msg( 'wikilambda-special-functionusage' );
	}

	/** @inheritDoc */
	public function isListed() {
		// Only the repo reads the shared usage table; no usage on client-mode wikis.
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
			// Only the repo reads the shared usage table; no usage on client-mode wikis.
			return false;
		}
		return parent::userCanExecute( $user );
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $subpage ) {
		if ( !$this->userCanExecute( $this->getUser() ) ) {
			$this->displayRestrictionError();
		}

		$this->setHeaders();
		$this->outputHeader( 'wikilambda-special-functionusage-summary' );
		$this->addHelpLink( 'Help:Wikifunctions/Function usage' );

		$output = $this->getOutput();
		$output->enableOOUI();
		$output->addModuleStyles( [ 'mediawiki.special' ] );

		// Target Function ZID from the request, falling back to the subpage.
		$target = trim( $this->getRequest()->getText( 'function', $subpage ?? '' ) );

		// Always show the form so the target can be entered or changed.
		$output->addHTML( $this->getTargetForm( $target ) );

		if ( $target === '' ) {
			return;
		}

		if ( !ZObjectUtils::isValidZObjectReference( $target ) ) {
			$output->addHTML( Html::errorBox(
				$this->msg( 'wikilambda-special-functionusage-invalid' )->plaintextParams( $target )->parse()
			) );
			return;
		}

		$offset = max( 0, $this->getRequest()->getInt( 'offset' ) );
		$total = $this->usageStore->countUsage( $target );

		// Header naming the Function, linked to its page.
		$label = $this->zObjectStore->fetchZObjectLabel( $target, $this->getLanguage()->getCode() );
		$functionLink = $this->getLinkRenderer()->makeLink(
			Title::makeTitle( NS_MAIN, $target ),
			$label ?? $target
		);
		$output->addHTML( Html::rawElement(
			'p',
			[],
			$this->msg( 'wikilambda-special-functionusage-header' )->rawParams( $functionLink )->escaped()
		) );

		// Point at Special:WhatLinksHere for the complementary, repo-local kind of usage:
		// Objects (including other Functions) that reference this one within their own
		// definitions register normal page links there, and so are not tracked in the
		// cross-wiki embedding table this page reports on. Shown even when there is no
		// embedding usage, so an empty list does not read as "unused".
		$whatLinksHereLink = $this->getLinkRenderer()->makeLink(
			$this->getTitleFor( 'Whatlinkshere', $target ),
			$this->msg( 'wikilambda-special-functionusage-whatlinkshere-label' )->text()
		);
		$output->addHTML( Html::rawElement(
			'p',
			[],
			$this->msg( 'wikilambda-special-functionusage-whatlinkshere' )->rawParams( $whatLinksHereLink )->escaped()
		) );

		if ( $total === 0 ) {
			$output->addHTML( Html::noticeBox(
				$this->msg( 'wikilambda-special-functionusage-empty' )->escaped(),
				''
			) );
			return;
		}

		$output->addHTML( Html::rawElement(
			'p',
			[],
			$this->msg( 'wikilambda-special-functionusage-count' )->numParams( $total )->parse()
		) );

		$rows = $this->usageStore->fetchUsage( $target, null, self::PAGE_LIMIT, $offset );
		$output->addHTML( $this->renderUsageList( $rows ) );
		$output->addHTML( $this->renderPagination( $target, $offset, $total ) );
	}

	/**
	 * Build the form for entering or changing the target Function.
	 *
	 * @param string $target The current target Function ZID, possibly empty.
	 * @return string HTML
	 */
	private function getTargetForm( string $target ): string {
		$formDescriptor = [
			'function' => [
				'type' => 'text',
				'name' => 'function',
				'label' => $this->msg( 'wikilambda-special-functionusage-form-function' )->text(),
				'default' => $target,
			],
		];
		$htmlForm = HTMLForm::factory( 'ooui', $formDescriptor, $this->getContext() )
			->setWrapperLegend( $this->msg( 'wikilambda-special-functionusage' )->text() )
			->setMethod( 'get' )
			->setSubmitTextMsg( 'wikilambda-special-functionusage-form-submit' );
		return $htmlForm->prepareForm()->getHTML( false );
	}

	/**
	 * Render the using pages, grouped by wiki, each linked to the page on its own wiki.
	 *
	 * The rows arrive ordered by wiki then page, so grouping by wiki preserves that order.
	 *
	 * @param array<int,array{wiki:string,pageId:int,namespaceId:int,namespaceText:?string,title:string}> $rows
	 * @return string HTML
	 */
	private function renderUsageList( array $rows ): string {
		$byWiki = [];
		foreach ( $rows as $row ) {
			$byWiki[ $row['wiki'] ][] = $row;
		}

		$html = '';
		foreach ( $byWiki as $wiki => $wikiRows ) {
			$wikiName = WikiMap::getWikiName( $wiki );
			$html .= Html::element( 'h3', [], $wikiName !== false ? $wikiName : $wiki );

			$items = '';
			foreach ( $wikiRows as $row ) {
				$prefixedDbKey = ( $row['namespaceText'] !== null && $row['namespaceText'] !== '' )
					? $row['namespaceText'] . ':' . $row['title']
					: $row['title'];
				// Titles are stored as DBkeys; show spaces, not underscores.
				$displayText = strtr( $prefixedDbKey, '_', ' ' );

				$url = WikiMap::getForeignURL( $wiki, $prefixedDbKey );
				$link = ( $url === false )
					? htmlspecialchars( $displayText )
					: Html::element( 'a', [ 'href' => $url ], $displayText );

				$items .= Html::rawElement( 'li', [], $link );
			}
			$html .= Html::rawElement( 'ul', [], $items );
		}

		return Html::rawElement(
			'div',
			[ 'class' => 'ext-wikilambda-functionusage-list' ],
			$html
		);
	}

	/**
	 * Render previous/next navigation for the offset-paginated list.
	 *
	 * @param string $target The target Function ZID.
	 * @param int $offset The current offset.
	 * @param int $total The total number of using pages.
	 * @return string HTML
	 */
	private function renderPagination( string $target, int $offset, int $total ): string {
		$links = [];

		if ( $offset > 0 ) {
			$links[] = Html::element(
				'a',
				[ 'href' => $this->getPageTitle()->getLocalURL( [
					'function' => $target,
					'offset' => max( 0, $offset - self::PAGE_LIMIT ),
				] ) ],
				$this->msg( 'prevn' )->numParams( self::PAGE_LIMIT )->text()
			);
		}

		if ( $offset + self::PAGE_LIMIT < $total ) {
			$links[] = Html::element(
				'a',
				[ 'href' => $this->getPageTitle()->getLocalURL( [
					'function' => $target,
					'offset' => $offset + self::PAGE_LIMIT,
				] ) ],
				$this->msg( 'nextn' )->numParams( self::PAGE_LIMIT )->text()
			);
		}

		if ( !$links ) {
			return '';
		}

		return Html::rawElement(
			'div',
			[ 'class' => 'ext-wikilambda-functionusage-pagination' ],
			implode( $this->msg( 'pipe-separator' )->escaped(), $links )
		);
	}
}
