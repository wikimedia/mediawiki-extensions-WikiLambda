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

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\SpecialPage\SpecialPage;

class SpecialListObjectsByType extends SpecialPage {
	/** @var ZObjectStore */
	protected $zObjectStore;

	/** @var LanguageFallback */
	private $languageFallback;

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

		$langRegistry = ZLangRegistry::singleton();

		// Make list of fallback language Zids
		$languages = array_merge(
			[ $this->getLanguage()->getCode() ],
			$this->languageFallback->getAll(
				$this->getLanguage()->getCode(),
				/* Try for en, even if it's not an explicit fallback. */ LanguageFallback::MESSAGES
			)
		);

		$languageZids = $langRegistry->getLanguageZids( $languages );

		$typesList = $this->fetchZObjects( ZTypeRegistry::Z_TYPE, $languageZids );

		$wikitext = '';
		if ( $type !== null && $type !== '' && isset( $typesList[$type] ) ) {
			$typeLabel = $typesList[$type];
			$zobjectList = $this->fetchZObjects( $type, $languageZids );
			$wikitext .= "\n== ";
			$wikitext .= $this->msg( 'wikilambda-special-objectsbytype-listheader' )
				->rawParams( htmlspecialchars( $typeLabel ), $type )
				->parse();
			$wikitext .= " ==\n";
			foreach ( $zobjectList as $zid => $label ) {
				// Let the usual linker de-reference the label as appropriate
				$wikitext .= "# [[$zid]]\n";
			}

			if ( count( $zobjectList ) === 0 ) {
				$wikitext .= $this->msg( 'wikilambda-special-objectsbytype-empty' );
			}
		}
		$wikitext .= "\n== ";
		$wikitext .= $this->msg( 'wikilambda-special-objectsbytype-typeheader' );
		$wikitext .= " ==\n";
		$wikitext .= $this->msg( 'wikilambda-special-objectsbytype-summary' );
		$wikitext .= "\n";
		foreach ( $typesList as $type => $label ) {
			$wikitext .= ": [[Special:ListObjectsByType/$type|$label]] ($type)\n";
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
		// Don't take down the site; limit listings to 5000(!) rows regardless.
		$pageLimit = 5000;

		// Paginate our DB query at 100 items per request
		$queryLimit = 100;

		$continue = null;

		$zobjects = [];

		while ( $pageLimit > 0 ) {
			$pageLimit -= $queryLimit;

			$res = $this->zObjectStore->searchZObjectLabels(
				'',
				true,
				$languageZids,
				$type,
				null,
				false,
				$continue,
				$queryLimit
			);

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
				$continue = $row->wlzl_id;
			}

			if ( $res->numRows() < $queryLimit ) {
				// We got fewer than our limit last time, so exit the loop.
				break;
			}
		}

		asort( $zobjects );

		return $zobjects;
	}
}
