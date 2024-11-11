<?php
/**
 * WikiLambda Special:ListObjectsByType page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\Extension\WikiLambda\Pagers\ZObjectAlphabeticPager;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\SpecialPage\SpecialPage;

class SpecialListObjectsByType extends SpecialPage {

	private ZObjectStore $zObjectStore;
	private LanguageFallback $languageFallback;

	/**
	 * @param ZObjectStore $zObjectStore
	 * @param LanguageFallback $languageFallback
	 */
	public function __construct( ZObjectStore $zObjectStore, LanguageFallback $languageFallback ) {
		parent::__construct( 'ListObjectsByType' );
		$this->zObjectStore = $zObjectStore;
		$this->languageFallback = $languageFallback;
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
		return $this->msg( 'wikilambda-special-objectsbytype' );
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $type ) {
		$this->setHeaders();

		$output = $this->getOutput();

		$output->enableOOUI();

		$output->addModuleStyles( [ 'mediawiki.special' ] );

		// TODO (T300519): Make this help page.
		$this->addHelpLink( 'Help:Wikifunctions/Objects by type' );

		// Make list of fallback language Zids
		$languages = array_merge(
			[ $this->getLanguage()->getCode() ],
			$this->languageFallback->getAll(
				$this->getLanguage()->getCode(),
				/* Try for en, even if it's not an explicit fallback. */ LanguageFallback::MESSAGES
			)
		);
		$langRegistry = ZLangRegistry::singleton();
		$languageZids = $langRegistry->getLanguageZids( array_unique( $languages ) );

		// Build ZObjectAlphabeticalPager for the given filters
		$filters = ( ( $type === null ) || ( $type === '' ) ) ? [] : [ 'type' => $type ];
		$pager = new ZObjectAlphabeticPager( $this->getContext(), $this->zObjectStore, $filters, $languageZids );

		// Add the header
		$output->addWikiTextAsInterface( $this->getZObjectListHeader( $type ) );

		// Add the top pagination controls
		$output->addHTML( $pager->getNavigationBar() );
		// Add the item list body
		$output->addWikiTextAsInterface( $pager->getBody() );
		// Add the bottom pagination controls
		$output->addHTML( $pager->getNavigationBar() );

		// Add bottom pagination controls
		$output->addWikiTextAsInterface( $pager->getBottomLinks() );
	}

	/**
	 * Render the header for listing ZObjects by a specific type.
	 *
	 * @param string|null $type - The type of ZObjects being listed.
	 * @return string - The wikitext for the header.
	 */
	private function getZObjectListHeader( $type ) {
		$header = '';
		$subheader = '';

		if ( ( $type === null ) || ( $type === '' ) ) {
			$header = $this->msg( 'wikilambda-special-objectsbytype-allheader' );
			$subheader = $this->msg( 'wikilambda-special-objectsbytype-summary' );
			return "\n== $header ==\n\n$subheader\n";
		}

		$typeLabel = $this->zObjectStore->fetchZObjectLabel( $type, $this->getLanguage()->getCode() );
		$header = $this->msg( 'wikilambda-special-objectsbytype-listheader' )
			->rawParams( htmlspecialchars( $typeLabel ?? $type ), $type )
			->parse();
		return "\n== $header ==\n";
	}
}
