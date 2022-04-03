<?php
/**
 * WikiLambda ZObject labels helper for the query API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
use ApiPageSet;
use ApiQueryGeneratorBase;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\MediaWikiServices;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\ParamValidator\TypeDef\IntegerDef;

class ApiQueryZObjectLabels extends ApiQueryGeneratorBase {

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	public function __construct( $query, $moduleName ) {
		parent::__construct( $query, $moduleName, 'wikilambdasearch_' );
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		$this->run();
	}

	/**
	 * @inheritDoc
	 */
	public function executeGenerator( $resultPageSet ) {
		$this->run( $resultPageSet );
	}

	/**
	 * @param ApiPageSet|null $resultPageSet
	 */
	private function run( $resultPageSet = null ) {
		[
			'search' => $searchTerm,
			'language' => $language,
			'nofallback' => $nofallback,
			'exact' => $exact,
			'type' => $type,
			'return_type' => $returnType,
			'strict_return_type' => $strictReturnType,
			'limit' => $limit,
			'continue' => $continue,
		] = $this->extractRequestParams();

		// Make list of language Zids
		$languages = [ $language ];
		if ( !$nofallback ) {
			$languages = array_merge(
				$languages,
				MediaWikiServices::getInstance()->getLanguageFallback()->getAll(
					$language,
					/* Try for en, even if it's not an explicit fallback. */ LanguageFallback::MESSAGES
				)
			);
		}
		$langRegistry = ZLangRegistry::singleton();
		$languageZids = $langRegistry->getLanguageZids( $languages );

		$zObjectStore = WikiLambdaServices::getZObjectStore();
		$res = $zObjectStore->searchZObjectLabels(
			$searchTerm,
			$exact,
			$languageZids,
			$type,
			$returnType,
			$strictReturnType,
			$continue,
			$limit + 1
		);

		$suggestions = [];
		$i = 0;
		$lastId = 0;
		foreach ( $res as $row ) {
			if ( $i >= $limit ) {
				break;
			}
			$suggestions[] = [
				'page_namespace' => NS_MAIN,
				'page_title' => $row->wlzl_zobject_zid,
				'page_type' => $row->wlzl_type,
				'return_type' => $row->wlzl_return_type,
				'label' => $row->wlzl_label,
				'is_primary' => $row->wlzl_label_primary,
				// FIXME: Implement, otherwise the generator won't work.
				'page_id' => 0,
				// TODO: When we support redirects, implement.
				'page_is_redirect' => false,
				'page_content_model' => CONTENT_MODEL_ZOBJECT,
				'page_lang' => $row->wlzl_language,
			];
			$lastId = $row->wlzl_id;
			$i++;
		}
		unset( $i );

		if ( $res->numRows() > $limit ) {
			$this->setContinueEnumParameter( 'continue', strval( $lastId + 1 ) );
		}

		if ( $resultPageSet ) {
			// FIXME: This needs to be an IResultWrapper, not an array of assoc. objects, irritatingly.
			// $resultPageSet->populateFromQueryResult( $dbr, $suggestions );
			foreach ( $suggestions as $index => $entry ) {
				$resultPageSet->setGeneratorData(
					\Title::makeTitle( $entry['page_namespace'], $entry['page_title'] ),
					[ 'index' => $index + $continue + 1 ]
				);
			}
		} else {
			$result = $this->getResult();
			foreach ( $suggestions as $entry ) {
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
				ApiBase::PARAM_DFLT => '',
			],
			'language' => [
				ParamValidator::PARAM_TYPE => array_keys(
					MediaWikiServices::getInstance()->getLanguageNameUtils()->getLanguageNames()
				),
				ParamValidator::PARAM_REQUIRED => true,
			],
			// This is the wrong way around logically, but MediaWiki's Action API doesn't allow for
			// default-true boolean flags to ever be set false.
			'nofallback' => [
				ParamValidator::PARAM_TYPE => 'boolean',
				ApiBase::PARAM_DFLT => false,
			],
			'exact' => [
				ParamValidator::PARAM_TYPE => 'boolean',
				ApiBase::PARAM_DFLT => false,
			],
			'type' => [
				ParamValidator::PARAM_TYPE => 'string',
			],
			'return_type' => [
				ParamValidator::PARAM_TYPE => 'string',
			],
			'strict_return_type' => [
				ParamValidator::PARAM_TYPE => 'boolean',
				ApiBase::PARAM_DFLT => false,
			],
			'limit' => [
				ParamValidator::PARAM_TYPE => 'limit',
				ApiBase::PARAM_DFLT => 10,
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
			'action=query&list=wikilambdasearch_labels&wikilambdasearch_search=foo&wikilambdasearch_language=en'
				=> 'apihelp-query+wikilambda-example-simple',
			'action=query&list=wikilambdasearch_labels&wikilambdasearch_search=foo&wikilambdasearch_language=fr'
				. '&wikilambdasearch_nofallback=true'
				=> 'apihelp-query+wikilambda-example-nofallback',
			'action=query&list=wikilambdasearch_labels&wikilambdasearch_type=Z4&wikilambdasearch_language=en'
				=> 'apihelp-query+wikilambda-example-type',
			'action=query&list=wikilambdasearch_labels&wikilambdasearch_return_type=Z40&wikilambdasearch_language=en'
				=> 'apihelp-query+wikilambda-example-return-type',
			'action=query&list=wikilambdasearch_labels&wikilambdasearch_return_type=Z40'
				. '&wikilambdasearch_strict_return_type=true&wikilambdasearch_language=en'
				=> 'apihelp-query+wikilambda-example-strict-return-type',
		];
	}
}
