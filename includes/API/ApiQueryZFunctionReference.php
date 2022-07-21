<?php
/**
 * WikiLambda ZFunction reference helper for the query API
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
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use Wikimedia\ParamValidator\ParamValidator;
use Wikimedia\ParamValidator\TypeDef\IntegerDef;

class ApiQueryZFunctionReference extends ApiQueryGeneratorBase {

	/** @var ZObjectStore */
	protected $zObjectStore;

	/**
	 * @inheritDoc
	 * @codeCoverageIgnore
	 */
	public function __construct(
		$query,
		$moduleName,
		ZObjectStore $zObjectStore
	) {
		parent::__construct( $query, $moduleName, 'wikilambdafn_' );

		$this->zObjectStore = $zObjectStore;
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
			'zfunction_id' => $zFunctionId,
			'type' => $type,
			'limit' => $limit,
			'continue' => $continue,
		] = $this->extractRequestParams();
		$result = $this->getResult();
		$res = $this->zObjectStore->findReferencedZObjectsByZFunctionId( $zFunctionId, $type, $continue, $limit + 1 );

		// If $res has no rows, then return false to indicate that no results were found.
		// This is handled in the UI as an empty list.
		if ( $res->numRows() === 0 ) {
			$result->addValue( [ 'query', $this->getModuleName() ], null, false );
		}

		$zids = [];
		$i = 0;
		$lastId = 0;
		foreach ( $res as $row ) {
			if ( $i >= $limit ) {
				break;
			}
			$zids[] = [
				'page_namespace' => NS_MAIN,
				'zid' => $row->wlzf_ref_zid
			];
			$lastId = $row->wlzf_id;
			$i++;
		}
		unset( $i );

		if ( $res->numRows() > $limit ) {
			$this->setContinueEnumParameter( 'continue', strval( $lastId + 1 ) );
		}

		if ( $resultPageSet ) {
			foreach ( $zids as $index => $entry ) {
				$resultPageSet->setGeneratorData(
					\Title::makeTitle( $entry['page_namespace'], $entry['zid'] ),
					[ 'index' => $index + $continue + 1 ]
				);
			}
		} else {
			$result = $this->getResult();
			foreach ( $zids as $entry ) {
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
			'zfunction_id' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => ''
			],
			'type' => [
				ParamValidator::PARAM_TYPE => 'string',
				ParamValidator::PARAM_DEFAULT => ''
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
		$exampleZid = $this->zObjectStore->findFirstZImplementationFunction();

		return [
			"action=query&list=wikilambdafn_search&wikilambdafn_zfunction_id=$exampleZid&wikilambdafn_type=Z14"
				=> 'apihelp-query+wikilambdafn_search-example-simple'
		];
	}
}
