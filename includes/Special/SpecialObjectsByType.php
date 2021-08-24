<?php
/**
 * WikiLambda Special:ObjectsByType page
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
use SpecialPage;
use Title;

class SpecialObjectsByType extends SpecialPage {
	/** @var ZObjectStore */
	protected $zObjectStore;

	/**
	 * @param ZObjectStore $zObjectStore
	 */
	public function __construct( ZObjectStore $zObjectStore ) {
		parent::__construct( 'ObjectsByType' );
		$this->zObjectStore = $zObjectStore;
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

		// Make list of language Zids
		$language = $this->getLanguage()->getCode();
		$langRegistry = ZLangRegistry::singleton();
		$languageZid = $langRegistry->getLanguageZidFromCode( $language );

		$typesList = $this->fetchZObjects( ZTypeRegistry::Z_TYPE, $languageZid );

		$wikitext = '';
		if ( $type !== null && $type != '' ) {
			$typeLabel = $typesList[$type];
			$zobjectList = $this->fetchZObjects( $type, $languageZid );
			$wikitext .= "\n== ";
			$wikitext .= $this->msg( 'wikilambda-special-objectsbytype-listheader' );
			$wikitext .= " $typeLabel ($type) ==\n";
			foreach ( $zobjectList as $zid => $label ) {
				$title = Title::newFromText( $zid, NS_ZOBJECT );
				$wikitext .= "# [[$title|$label]] ($zid)\n";
			}
			if ( count( $zobjectList ) == 0 ) {
				$wikitext .= $this->msg( 'wikilambda-special-objectsbytype-empty' );
			}
		}
		$wikitext .= "\n== ";
		$wikitext .= $this->msg( 'wikilambda-special-objectsbytype-typeheader' );
		$wikitext .= " ==\n";
		foreach ( $typesList as $type => $label ) {
			$wikitext .= ": [[Special:ObjectsByType/$type|$label]] ($type)\n";
		}

		$output->addWikiTextAsInterface( $wikitext );
	}

	/**
	 * Use ZObjectStore to fetch all ZObjects with appropriate labels
	 * for the provided type
	 * @param string $type
	 * @param string $languageZid
	 * @return array
	 */
	private function fetchZObjects( $type, $languageZid ) {
		$res = $this->zObjectStore->fetchZObjectLabels(
			'',
			true,
			[ $languageZid ],
			$type,
			null,
			5000 // TODO: Add paging
		);
		$zobjects = [];
		foreach ( $res as $row ) {
			$zobjects[$row->wlzl_zobject_zid] = $row->wlzl_label;
		}
		asort( $zobjects );

		return $zobjects;
	}
}
