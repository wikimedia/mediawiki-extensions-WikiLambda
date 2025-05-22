<?php
/**
 * WikiLambda ZObject labels helper for the query API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiQuery;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\ParamValidator\TypeDef\IntegerDef;

class ApiQueryZObjectLabels extends WikiLambdaApiQueryGeneratorBase {

	/**
	 * @codeCoverageIgnore
	 */
	public function __construct( ApiQuery $query, string $moduleName ) {
		parent::__construct( $query, $moduleName, 'wikilambdasearch_' );
	}

	/**
	 * @inheritDoc
	 */
	protected function run( $resultPageSet = null ) {
		// Exit if we're running in non-repo mode (e.g. on a client wiki)
		if ( !$this->getConfig()->get( 'WikiLambdaEnableRepoMode' ) ) {
			WikiLambdaApiBase::dieWithZError(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_RUN,
					[]
				),
				400
			);
		}

		[
			'search' => $searchTerm,
			'exact' => $exact,
			'language' => $language,
			'type' => $types,
			'return_type' => $returnTypes,
			'limit' => $limit,
			'continue' => $continue,
		] = $this->extractRequestParams();

		// TODO (T348545): We can reduce this control limit to 100 when we have
		// have a system to return results already pre-ranked from the DB.
		$controlLimit = 5000;

		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$res = $zObjectStore->searchZObjectLabels(
			$searchTerm,
			$exact,
			[],
			$types ?? [],
			$returnTypes ?? [],
			null,
			$controlLimit
		);

		// 1. Set match_rate for every entry and eliminate duplicates with lower match rates
		// TODO (T349583): Improve this result sorting algorithm; e.g. should we prioritize matches with primary labels?
		$matches = [];
		$hasSearchTerm = ( $searchTerm !== '' );
		$matchField = ZObjectUtils::isValidZObjectReference( $searchTerm ) ? 'wlzl_zobject_zid' : 'wlzl_label';

		foreach ( $res as $row ) {
			$matchRate = $hasSearchTerm ? self::getMatchRate( $searchTerm, $row->{ $matchField }, $exact ) : 0;

			// If the current row is new or a better match, keep. Else, ignore.
			if ( !array_key_exists( $row->wlzl_zobject_zid, $matches ) ||
				( $matches[ $row->wlzl_zobject_zid ][ 'match_rate' ] < $matchRate ) ) {
				$matches[ $row->wlzl_zobject_zid ] = [
					// TODO (T338248): Implement, otherwise the generator won't work.
					'page_id' => 0,
					// TODO (T258915): When we support redirects, implement.
					'page_is_redirect' => false,
					'page_namespace' => NS_MAIN,
					'page_content_model' => CONTENT_MODEL_ZOBJECT,
					'page_title' => $row->wlzl_zobject_zid,
					'page_type' => $row->wlzl_type,
					'match_label' => $hasSearchTerm ? $row->{ $matchField } : null,
					'match_is_primary' => $hasSearchTerm ? $row->wlzl_label_primary : null,
					'match_lang' => $hasSearchTerm ? $row->wlzl_language : null,
					'match_rate' => $matchRate,
					// Labels in the user language will be set after selecting the page
					'label' => null,
					'type_label' => null,
				];
			}
		}

		// 2. Sort all results by match_rate to get best hits
		usort( $matches, static function ( $a, $b ) {
			return $b[ 'match_rate' ] <=> $a[ 'match_rate' ];
		} );

		// 3. Prune the result set to the limit, slice to requested page, and set continue
		$continue = $continue === null ? 0 : intval( $continue );
		$hits = array_slice( $matches, $continue * $limit, $limit );
		$pageSize = count( $matches ) - ( $continue * $limit );
		if ( $pageSize > $limit ) {
			$this->setContinueEnumParameter( 'continue', strval( $continue + 1 ) );
		}

		// 4. Add relevant user language labels to each hit: This will be the main
		// name shown in the selector, while the match_label set above will be used
		// as supporting text when the search text has matched an alias or a label in
		// a different language.
		foreach ( $hits as $index => $hit ) {
			$hits[ $index ][ 'label' ] = $zObjectStore->fetchZObjectLabel( $hit[ 'page_title' ], $language );
			$hits[ $index ][ 'type_label' ] = $zObjectStore->fetchZObjectLabel( $hit[ 'page_type' ], $language );
		}

		if ( $resultPageSet ) {
			// TODO (T362192): This needs to be an IResultWrapper, not an array of assoc. objects, irritatingly.
			// $resultPageSet->populateFromQueryResult( $dbr, $hits );
			foreach ( $hits as $index => $entry ) {
				$resultPageSet->setGeneratorData(
					Title::makeTitle( $entry['page_namespace'], $entry['page_title'] ),
					[ 'index' => $index + $continue + 1 ]
				);
			}
		} else {
			$result = $this->getResult();
			foreach ( $hits as $entry ) {
				$result->addValue( [ 'query', $this->getModuleName() ], null, $entry );
			}
		}
	}

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	protected function getAllowedParams(): array {
		return [
			'search' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => '',
			],
			'language' => [
				ParamValidator::PARAM_TYPE => array_keys(
					// TODO (T330033): Consider injecting this service rather than just fetching from main
					MediaWikiServices::getInstance()->getLanguageNameUtils()->getLanguageNames()
				),
				ParamValidator::PARAM_REQUIRED => true,
			],
			// This is the wrong way around logically, but MediaWiki's Action API doesn't allow for
			// default-true boolean flags to ever be set false.
			'nofallback' => [
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_DEFAULT => false,
			],
			'exact' => [
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_DEFAULT => false,
			],
			'type' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_ISMULTI => true,
			],
			'return_type' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_ISMULTI => true,
			],
			'limit' => [
				ParamValidator::PARAM_TYPE => 'limit',
				ParamValidator::PARAM_DEFAULT => 10,
				IntegerDef::PARAM_MIN => 1,
				IntegerDef::PARAM_MAX => ApiBase::LIMIT_BIG1,
				IntegerDef::PARAM_MAX2 => ApiBase::LIMIT_BIG2,
			],
			'continue' => [
				ApiBase::PARAM_HELP_MSG => 'api-help-param-continue',
			],
		];
	}

	/**
	 * @param string $substring
	 * @param string $hit
	 * @param bool $exact
	 * @return float
	 */
	private static function getMatchRate( $substring, $hit, $exact = false ) {
		if ( !$exact ) {
			$substring = ZObjectUtils::comparableString( $substring );
			$hit = ZObjectUtils::comparableString( $hit );
		}
		$distance = levenshtein( $substring, $hit );
		$max = max( strlen( $substring ), strlen( $hit ) );
		$percentage = ( $max - $distance ) / $max;
		return $percentage;
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages() {
		return [
			// search "foo" in language "en"
			'action=query&list=wikilambdasearch_labels&'
			. ' wikilambdasearch_search=foo&'
			. ' wikilambdasearch_language=en' => 'apihelp-query+wikilambda-example-simple',
			// search "foo" in language "fr" without fallbacks
			'action=query&list=wikilambdasearch_labels&'
			. 'wikilambdasearch_search=foo&'
			. 'wikilambdasearch_language=fr&'
			. 'wikilambdasearch_nofallback=true' => 'apihelp-query+wikilambda-example-nofallback',
			// Search for objects of type "Z4"
			'action=query&list=wikilambdasearch_labels&'
			. 'wikilambdasearch_type=Z4&'
			. 'wikilambdasearch_language=en' => 'apihelp-query+wikilambda-example-type',
			// Search for objects that resolve to "Z40"
			'action=query&list=wikilambdasearch_labels&'
			. 'wikilambdasearch_return_type=Z40&'
			. 'wikilambdasearch_language=en' => 'apihelp-query+wikilambda-example-return-type',
			// Search for functions that output "Z40" or "Z1"
			'action=query&list=wikilambdasearch_labels&'
			. 'wikilambdasearch_type=Z8&'
			. 'wikilambdasearch_return_type=Z40|Z1&'
			. 'wikilambdasearch_language=en' => 'apihelp-query+wikilambda-example-type-and-return-types',
			// Search for function calls equivalent to "Z4" or literal "Z4" objects
			'action=query&list=wikilambdasearch_labels&'
			. 'wikilambdasearch_type=Z4|Z7&'
			. 'wikilambdasearch_return_type=Z4&'
			. 'wikilambdasearch_language=en' => 'apihelp-query+wikilambda-example-types-and-return-type',
		];
	}
}
