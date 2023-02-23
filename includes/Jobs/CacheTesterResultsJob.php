<?php

namespace MediaWiki\Extension\WikiLambda\Jobs;

use GenericParameterJob;
use Job;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;

/**
 * Asynchronous job to write out the results of a function tester run to the database,
 * which allows us to avoid a database write on an API GET.
 */
class CacheTesterResultsJob extends Job implements GenericParameterJob {

	/**
	 * @param array $params
	 */
	public function __construct( array $params ) {
		parent::__construct( 'cacheTesterResults', $params );
	}

	/**
	 * @return bool
	 */
	public function run() {
		// TODO (T330030): Consider accessing the ZObjectStore as an injected service
		$zObjectStore = WikiLambdaServices::getZObjectStore();

		$zObjectStore->insertZTesterResult(
			$this->params['functionZid'],
			$this->params['functionRevision'],
			$this->params['implementationZid'],
			$this->params['implementationRevision'],
			$this->params['testerZid'],
			$this->params['testerRevision'],
			$this->params['passed'],
			$this->params['stashedResult']
		);

		return true;
	}
}
