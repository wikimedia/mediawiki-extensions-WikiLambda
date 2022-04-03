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
			'type' => $type
		] = $this->extractRequestParams();
		$result = $this->getResult();
		$res = $this->zObjectStore->findReferencedZObjectsByZFunctionId( $zFunctionId, $type );

		// If $res is falsey, then return false to indicate that no results were found.
		// This is handled in the UI as an empty list.
		if ( !$res ) {
			$result->addValue( [ 'query', $this->getModuleName() ], null, false );
		}

		foreach ( $res as $row ) {
			$result->addValue( [ 'query', $this->getModuleName() ], null, $row );
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
			]
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
