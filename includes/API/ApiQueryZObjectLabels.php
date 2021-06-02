<?php
/**
 * WikiLambda ZObject labels helper for the query API
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\API;

use ApiBase;
use ApiPageSet;
use ApiQueryGeneratorBase;
use MediaWiki\Extension\WikiLambda\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Languages\LanguageFallback;
use MediaWiki\MediaWikiServices;
use Wikimedia\ParamValidator\ParamValidator;

class ApiQueryZObjectLabels extends ApiQueryGeneratorBase {

	public function __construct( $query, $moduleName ) {
		parent::__construct( $query, $moduleName, 'wikilambdasearch_' );
	}

	public function execute() {
		$this->run();
	}

	public function executeGenerator( $resultPageSet ) {
		$this->run( $resultPageSet );
	}

	/**
	 * @param ApiPageSet|null $resultPageSet
	 */
	private function run( $resultPageSet = null ) {
		[
			'search' => $request,
			'language' => $language,
			'nofallback' => $nofallback,
			'exact' => $exact,
			'type' => $type,
			'limit' => $limit,
			'continue' => $continue,
		] = $this->extractRequestParams();

		$dbr = $this->getDB();

		$this->addTables( 'wikilambda_zobject_labels' );
		$this->addFields( [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_language', 'wlzl_label' ] );

		$languages = [ $language ];
		if ( !$nofallback ) {
			$languages = array_merge(
				$languages,
				MediaWikiServices::getInstance()->getLanguageFallback()->getAll(
					$language,
					LanguageFallback::MESSAGES /* Try for en, even if it's not an explicit fallback. */
				)
			);
		}

		// Get list of language Zids
		$langRegistry = ZLangRegistry::singleton();
		$languageZids = $langRegistry->getLanguageZids( $languages );

		$this->addWhere( [ 'wlzl_language' => $languageZids ] );

		if ( $exact ) {
			$searchedColumn = 'wlzl_label';
			$searchTerm = $request;
		} else {
			$searchedColumn = 'wlzl_label_normalised';
			$searchTerm = ZObjectUtils::comparableString( $request );
		}
		$this->addWhere( $searchedColumn . $dbr->buildLike( $dbr->anyString(), $searchTerm, $dbr->anyString() ) );

		if ( $continue !== null ) {
			$this->addWhere( "wlzl_id >= $continue" );
		}

		if ( $type != null ) {
			$this->addWhere( 'wlzl_type = ' . $dbr->addQuotes( $type ) );
		}

		$this->addOption( 'LIMIT', $limit + 1 );

		$res = $this->select( __METHOD__ );

		if ( $res->numRows() > $limit ) {
			$this->setContinueEnumParameter( 'continue', strval( $continue + $limit ) );
		}

		$suggestions = [];
		$i = 0;
		foreach ( $res as $row ) {
			if ( $i >= $limit ) {
				break;
			}
			$suggestions[] = [
				'page_namespace' => NS_ZOBJECT,
				'page_title' => $row->wlzl_zobject_zid,
				'page_type' => $row->wlzl_type,
				'label' => $row->wlzl_label,
				'page_id' => 0, // FIXME: Implement, otherwise the generator won't work.
				'page_is_redirect' => false, // TODO: When we support redirects, implement.
				'page_content_model' => CONTENT_MODEL_ZOBJECT,
				'page_lang' => $row->wlzl_language,
			];
			$i++;
		}
		unset( $i );

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
			'limit' => [
				ParamValidator::PARAM_TYPE => 'limit',
				ApiBase::PARAM_DFLT => 10,
				ApiBase::PARAM_MIN => 1,
				ApiBase::PARAM_MAX => ApiBase::LIMIT_BIG1,
				ApiBase::PARAM_MAX2 => ApiBase::LIMIT_BIG2,
			],
			'continue' => [
				ApiBase::PARAM_HELP_MSG => 'api-help-param-continue',
			],
		];
	}

	/**
	 * @see ApiBase::getExamplesMessages()
	 * @return array
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
		];
	}
}
