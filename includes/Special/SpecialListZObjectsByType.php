<?php
/**
 * WikiLambda Special:ListZObjectsByType page
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Special;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Languages\LanguageFallback;
use SpecialPage;
use Title;

class SpecialListZObjectsByType extends SpecialPage {
	/** @var ZObjectStore */
	protected $zObjectStore;

	/** @var LanguageFallback */
	private $languageFallback;

	/**
	 * @param ZObjectStore $zObjectStore
	 * @param LanguageFallback $languageFallback
	 */
	public function __construct( ZObjectStore $zObjectStore, LanguageFallback $languageFallback ) {
		parent::__construct( 'ListZObjectsByType' );
		$this->zObjectStore = $zObjectStore;
		$this->languageFallback = $languageFallback;
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
		return $this->msg( 'wikilambda-special-objectsbytype' )->text();
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $type ) {
		$this->setHeaders();
		$this->outputHeader( 'wikilambda-special-objectsbytype-summary' );

		$output = $this->getOutput();

		$output->enableOOUI();

		$output->addModuleStyles( [ 'mediawiki.special', 'ext.wikilambda.specialpages.styles' ] );
		// TODO: Make this help page.
		$this->addHelpLink( 'Extension:WikiLambda/ZObjects by type' );

		$langRegistry = ZLangRegistry::singleton();

		// Make list of fallback language Zids
		$languages = array_merge(
			[ $this->getLanguage()->getCode() ],
			$this->languageFallback->getAll(
				$this->getLanguage()->getCode(),
				LanguageFallback::MESSAGES /* Try for en, even if it's not an explicit fallback. */
			)
		);

		$languageZids = $langRegistry->getLanguageZids( $languages );

		$typesList = $this->fetchZObjects( ZTypeRegistry::Z_TYPE, $languageZids );

		$wikitext = '';
		if ( $type !== null && $type != '' ) {
			$typeLabel = $typesList[$type];
			$zobjectList = $this->fetchZObjects( $type, $languageZids );
			$wikitext .= "\n== ";
			$wikitext .= $this->msg( 'wikilambda-special-objectsbytype-listheader' );
			$wikitext .= " $typeLabel ($type) ==\n";
			foreach ( $zobjectList as $zid => $label ) {
				$title = Title::newFromText( $zid, NS_MAIN );
				// Let the usual linker de-reference the label as appropriate
				$wikitext .= "# [[$title]] ($zid)\n";
			}
			if ( count( $zobjectList ) == 0 ) {
				$wikitext .= $this->msg( 'wikilambda-special-objectsbytype-empty' );
			}
		}
		$wikitext .= "\n== ";
		$wikitext .= $this->msg( 'wikilambda-special-objectsbytype-typeheader' );
		$wikitext .= " ==\n";
		foreach ( $typesList as $type => $label ) {
			$wikitext .= ": [[Special:ListZObjectsByType/$type|$label]] ($type)\n";
		}

		$output->addWikiTextAsInterface( $wikitext );
	}

	/**
	 * Use ZObjectStore to fetch all ZObjects with appropriate labels for the provided type
	 *
	 * @param string $type
	 * @param string[] $languageZids
	 * @return array
	 */
	private function fetchZObjects( $type, $languageZids ) {
		$res = $this->zObjectStore->searchZObjectLabels(
			'',
			true,
			$languageZids,
			$type,
			null,
			5000 // TODO: Add paging
		);
		$zobjects = [];
		foreach ( $res as $row ) {
			// Only set the label if we don't have one already, or it's the first-requested language.
			// TODO: This means that if you're asking for uk > ru > en and we only have ru and en
			// labels, we'll return whichever is first, rather than your preferred ru label over en.
			if (
				!isset( $zobjects[$row->wlzl_zobject_zid] )
				|| array_search( $row->wlzl_language, $languageZids ) === 0
			) {
				$zobjects[$row->wlzl_zobject_zid] = $row->wlzl_label;
			}
		}
		asort( $zobjects );

		return $zobjects;
	}
}
