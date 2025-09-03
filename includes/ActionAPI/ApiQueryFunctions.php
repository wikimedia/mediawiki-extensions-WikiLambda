<?php
/**
 * WikiLambda API to search functions
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ActionAPI;

use MediaWiki\Api\ApiBase;
use MediaWiki\Api\ApiQuery;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\ParamValidator\TypeDef\IntegerDef;

class ApiQueryFunctions extends WikiLambdaApiQueryGeneratorBase {

	protected LanguageFallback $languageFallback;
	protected ZObjectStore $zObjectStore;
	protected ZLangRegistry $langRegistry;

	/**
	 * @codeCoverageIgnore
	 */
	public function __construct(
		ApiQuery $query,
		string $moduleName,
		LanguageFallback $languageFallback,
		ZObjectStore $zObjectStore
	) {
		parent::__construct( $query, $moduleName, 'wikilambdasearch_functions_' );

		$this->languageFallback = $languageFallback;
		$this->zObjectStore = $zObjectStore;
		$this->langRegistry = ZLangRegistry::singleton();
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
				HttpStatus::BAD_REQUEST
			);
		}

		[
			'search' => $searchTerm,
			'language' => $language,
			'renderable' => $renderable,
			'input_types' => $inputTypes,
			'output_type' => $outputType,
			'limit' => $limit,
			'continue' => $continue,
		] = $this->extractRequestParams();

		$languageZids = $this->langRegistry->getListOfFallbackLanguageZids( $this->languageFallback, $language );
		$outputType = $outputType ?: null;
		$inputArray = $inputTypes ? array_count_values( $inputTypes ) : [];

		$res = $this->zObjectStore->searchFunctions(
			$searchTerm,
			$languageZids,
			$renderable,
			$inputArray,
			$outputType
		);

		// 1. Set match_rate for every entry and eliminate duplicates with lower match rates
		$matches = [];
		$hasSearchTerm = ( $searchTerm !== '' );
		$matchField = ZObjectUtils::isValidZObjectReference( $searchTerm ) ? 'wlzl_zobject_zid' : 'wlzl_label';

		foreach ( $res as $row ) {
			$matchRate = $hasSearchTerm ? self::getMatchRate( $searchTerm, $row->{ $matchField } ) : 0;

			// If the current row is new or a better match, keep. Else, ignore.
			if ( !array_key_exists( $row->wlzl_zobject_zid, $matches ) ||
				( $matches[ $row->wlzl_zobject_zid ][ 'match_rate' ] < $matchRate ) ) {
				$matches[ $row->wlzl_zobject_zid ] = [
					'page_id' => $row->page_id,
					// TODO (T258915): When we support redirects, implement.
					'page_is_redirect' => false,
					'page_namespace' => NS_MAIN,
					'page_content_model' => CONTENT_MODEL_ZOBJECT,
					'page_title' => $row->wlzl_zobject_zid,
					'match_label' => $hasSearchTerm ? $row->{ $matchField } : null,
					'match_lang' => $hasSearchTerm ? $row->wlzl_language : null,
					'match_rate' => $matchRate,
					'label' => $row->preferred_label,
					'language' => $row->preferred_language
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

		if ( $resultPageSet ) {
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
		// Don't try to read the supported languages from the DB on client wikis, we can't.
		$supportedLanguageCodes =
			( MediaWikiServices::getInstance()->getMainConfig()->get( 'WikiLambdaEnableRepoMode' ) ) ?
			$this->zObjectStore->fetchAllZLanguageCodes() :
			[];

		return [
			'search' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => '',
			],
			'language' => [
				ParamValidator::PARAM_TYPE => $supportedLanguageCodes,
				ParamValidator::PARAM_REQUIRED => true,
			],
			'renderable' => [
				ParamValidator::PARAM_TYPE => 'boolean',
				ParamValidator::PARAM_DEFAULT => false,
			],
			'input_types' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_ISMULTI => true,
				ParamValidator::PARAM_ALLOW_DUPLICATES => true,
				ParamValidator::PARAM_REQUIRED => false,
			],
			'output_type' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_REQUIRED => false,
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
	 * @see ApiBase::getExamplesMessages()
	 * @return array
	 * @codeCoverageIgnore
	 */
	protected function getExamplesMessages() {
		return [
			// Functions with label that matches 'Engl' and have renderable IOs
			'action=query&list=wikilambdasearch_functions'
			. '&wikilambdasearch_functions_search=Engl'
			. '&wikilambdasearch_functions_language=en'
			. '&wikilambdasearch_functions_renderable=1'
			=> 'apihelp-query+wikilambdasearch_functions-example-renderable',
			// Functions that have at least two String inputs and output String
			'action=query&list=wikilambdasearch_functions'
			. '&wikilambdasearch_functions_language=en'
			. '&wikilambdasearch_functions_input_types=Z6%7CZ6'
			. '&wikilambdasearch_functions_output_type=Z6'
			=> 'apihelp-query+wikilambdasearch_functions-example-io-types',
		];
	}
}
