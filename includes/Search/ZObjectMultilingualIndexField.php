<?php
/**
 * WikiLambda per-language multilingual CirrusSearch index field
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Search;

use CirrusSearch\CirrusSearch;
use CirrusSearch\Search\CirrusIndexField;
use MediaWiki\Search\SearchEngine;
use MediaWiki\Search\SearchIndexField;
use MediaWiki\Search\SearchIndexFieldDefinition;

/**
 * A reusable nested object field holding one text sub-field per allowlisted language code, used for
 * the ZObject labels, aliases and descriptions.
 *
 * The mapping and the hints are CirrusSearch-specific. Other search engines get nothing.
 */
class ZObjectMultilingualIndexField extends SearchIndexFieldDefinition {

	/** @var string[] */
	private array $languageCodes;

	/**
	 * @param string $name
	 * @param string[] $languageCodes
	 */
	public function __construct( string $name, array $languageCodes ) {
		parent::__construct( $name, SearchIndexField::INDEX_TYPE_NESTED );
		$this->languageCodes = $languageCodes;
	}

	/**
	 * @inheritDoc
	 */
	public function getMapping( SearchEngine $engine ) {
		if ( !( $engine instanceof CirrusSearch ) ) {
			return [];
		}

		// The Search Platform review (2026-08) found three limits in this mapping. They are
		// acceptable while we only display and highlight these fields. Correct them when we add a
		// custom query builder that filters or ranks on them:
		//  - The 'text' analyser tokenises and stems every language as the wiki content language.
		//    Wikibase sets a different analyser for each language. We can do the same, though the
		//    number of languages in Wikibase is already a problem and we have even more.
		//  - 'index_options' => 'docs' keeps no term frequencies, so these fields give no score.
		//  - There is no 'lowercase_keyword' sub-field, so an exact match in one language is not
		//    possible, although the catch-all zobject_labels_all field may permit one across all
		//    languages. Add such a sub-field for labels and aliases only, and not for descriptions.
		$props = [];
		foreach ( $this->languageCodes as $code ) {
			// The index-time analysers add token variants, e.g. 'television' for 'télévision'. The
			// paired search-time analysers do not. This keeps the query and the highlighter correct.
			$props[$code] = [
				'type' => 'text',
				'analyzer' => 'text',
				'search_analyzer' => 'text_search',
				'index_options' => 'docs',
				'fields' => [
					'plain' => [
						'type' => 'text',
						'analyzer' => 'plain',
						'search_analyzer' => 'plain_search',
						'index_options' => 'docs',
					],
				],
			];
		}

		return [
			'type' => 'object',
			'properties' => $props,
		];
	}

	/**
	 * @inheritDoc
	 */
	public function getEngineHints( SearchEngine $engine ) {
		if ( !( $engine instanceof CirrusSearch ) ) {
			return [];
		}

		return [ CirrusIndexField::NOOP_HINT => 'equals' ];
	}
}
