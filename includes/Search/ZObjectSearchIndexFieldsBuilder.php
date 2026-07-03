<?php
/**
 * WikiLambda builder for the structured CirrusSearch index fields of a ZObject
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Search;

use CirrusSearch\CirrusSearch;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunction;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Search\SearchIndexField;
use Psr\Log\LoggerInterface;

/**
 * Isolates all CirrusSearch-dependent logic for building the structured ZObject search-index
 * fields, so the content handler only references this class from inside its guard. Nothing here
 * may be reached unless CirrusSearch is loaded and is the active search engine.
 */
class ZObjectSearchIndexFieldsBuilder {

	private LoggerInterface $logger;

	/**
	 * @param string[] $languageCodes Allowlist of language codes that get their own per-language fields
	 * @param ZLangRegistry $langRegistry
	 */
	public function __construct(
		private readonly array $languageCodes,
		private readonly ZLangRegistry $langRegistry
	) {
		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );
	}

	/**
	 * Declare the structured search-index field mappings.
	 *
	 * @param CirrusSearch $engine
	 * @return SearchIndexField[] Map of field name to field definition
	 */
	public function getFields( CirrusSearch $engine ): array {
		return [
			'zobject_type' => $engine->makeSearchFieldMapping(
				'zobject_type', SearchIndexField::INDEX_TYPE_KEYWORD ),
			'zobject_labels_all' => $engine->makeSearchFieldMapping(
				'zobject_labels_all', SearchIndexField::INDEX_TYPE_TEXT ),
			'zobject_labels' => new ZObjectMultilingualIndexField(
				'zobject_labels', $this->languageCodes ),
			'zobject_aliases' => new ZObjectMultilingualIndexField(
				'zobject_aliases', $this->languageCodes ),
			'zobject_descriptions' => new ZObjectMultilingualIndexField(
				'zobject_descriptions', $this->languageCodes ),
			'function_input_types' => $engine->makeSearchFieldMapping(
				'function_input_types', SearchIndexField::INDEX_TYPE_KEYWORD ),
			'function_output_type' => $engine->makeSearchFieldMapping(
				'function_output_type', SearchIndexField::INDEX_TYPE_KEYWORD ),
		];
	}

	/**
	 * Populate the structured search-index field values for a single ZObject document.
	 *
	 * @param ZObjectContent $content
	 * @return array Map of field name to value
	 */
	public function getData( ZObjectContent $content ): array {
		if ( !$content->isValid() ) {
			return [];
		}

		$zid = $content->getZObject()->getZid();

		$labelsByZid = $content->getLabels()->getValueAsList();
		$aliasesByZid = $content->getAliases()->getValueAsList();
		$descByZid = $content->getZObject()->getDescriptions()?->getValueAsList() ?? [];

		$labelsAll = [];
		$labels = [];
		$aliases = [];
		$descriptions = [];

		$langZids = array_unique( array_merge(
			array_keys( $labelsByZid ),
			array_keys( $aliasesByZid ),
			array_keys( $descByZid )
		) );

		foreach ( $langZids as $langZid ) {
			$label = $labelsByZid[$langZid] ?? null;
			$aliasList = $aliasesByZid[$langZid] ?? [];

			// All languages feed the catch-all field for recall, regardless of the allowlist
			if ( $label !== null && $label !== '' ) {
				$labelsAll[] = $label;
			}
			foreach ( $aliasList as $alias ) {
				$labelsAll[] = $alias;
			}

			if ( !$langZid ) {
				// (T402670) Something's wrong with this entry; skip it
				$this->logger->debug(
					'Skipping search-index field for entry in blank language ZID when indexing "{page}"',
					[ 'page' => $zid ]
				);
				continue;
			}

			try {
				$code = $this->langRegistry->getLanguageCodeFromZid( $langZid );
			} catch ( ZErrorException ) {
				$this->logger->debug(
					'Skipping search-index field for entry in unknown language "{langZid}" when indexing "{page}"',
					[ 'langZid' => $langZid, 'page' => $zid ]
				);
				continue;
			}

			if ( !in_array( $code, $this->languageCodes, true ) ) {
				continue;
			}

			if ( $label !== null && $label !== '' ) {
				$labels[$code] = $label;
			}
			if ( $aliasList ) {
				$aliases[$code] = $aliasList;
			}
			if ( isset( $descByZid[$langZid] ) && $descByZid[$langZid] !== '' ) {
				$descriptions[$code] = $descByZid[$langZid];
			}
		}

		$data = [];
		$data['zobject_type'] = $content->getZType();
		$data['zobject_labels_all'] = $labelsAll;
		if ( $labels ) {
			$data['zobject_labels'] = $labels;
		}
		if ( $aliases ) {
			$data['zobject_aliases'] = $aliases;
		}
		if ( $descriptions ) {
			$data['zobject_descriptions'] = $descriptions;
		}

		if ( $content->getZType() === ZTypeRegistry::Z_FUNCTION ) {
			$fn = $content->getInnerZObject();
			'@phan-var ZFunction $fn';

			$inputTypes = [];
			foreach ( $fn->getArgumentDeclarations() as $decl ) {
				$typeObj = $decl->getValueByKey( ZTypeRegistry::Z_ARGUMENTDECLARATION_TYPE );
				if ( $typeObj instanceof ZObject ) {
					$inputTypes = array_merge( $inputTypes, $this->typeTokens( $typeObj ) );
				}
			}

			$outputTypes = [];
			$outObj = $fn->getValueByKey( ZTypeRegistry::Z_FUNCTION_RETURN_TYPE );
			if ( $outObj instanceof ZObject ) {
				$outputTypes = $this->typeTokens( $outObj );
			}

			$data['function_input_types'] = array_values( array_unique( $inputTypes ) );
			$data['function_output_type'] = array_values( array_unique( $outputTypes ) );
		}

		return $data;
	}

	/**
	 * Derive the searchable tokens for a type object: both the head reference (e.g. 'Z6' / 'Z881')
	 * and the full fingerprint (e.g. 'Z6' / 'Z881(Z6)'), skipping nulls and empties.
	 *
	 * @param ZObject $typeObj
	 * @return string[]
	 */
	private function typeTokens( ZObject $typeObj ): array {
		$tokens = [];

		$head = $typeObj->getZValue();
		if ( is_string( $head ) && $head !== '' ) {
			$tokens[] = $head;
		}

		$fingerprint = ZObjectUtils::makeTypeFingerprint( $typeObj->getSerialized() );
		if ( $fingerprint !== null && $fingerprint !== '' ) {
			$tokens[] = $fingerprint;
		}

		return $tokens;
	}
}
