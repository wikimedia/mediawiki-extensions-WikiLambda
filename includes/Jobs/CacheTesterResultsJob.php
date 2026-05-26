<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Jobs;

use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\JobQueue\GenericParameterJob;
use MediaWiki\JobQueue\Job;
use MediaWiki\Logger\LoggerFactory;
use Psr\Log\LoggerInterface;

/**
 * Asynchronous job to write out the results of a function tester run to the database,
 * which allows us to avoid a database write on an API GET.
 */
class CacheTesterResultsJob extends Job implements GenericParameterJob {
	use StoreTestResultTrait;

	private LoggerInterface $logger;
	private ZObjectStore $zObjectStore;

	public function __construct( array $params ) {
		parent::__construct( 'cacheTesterResults', $params );

		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );
		$this->zObjectStore = WikiLambdaServices::getZObjectStore();

		$this->logger->debug(
			__CLASS__ . ' created',
			[
				'functionZid' => $this->params['functionZid'],
				'functionRevision' => $this->params['functionRevision']
			]
		);
	}

	/**
	 * @inheritDoc
	 */
	public function run() {
		$this->storeTestResult(
			$this->logger,
			$this->zObjectStore,
			$this->params['functionZid'],
			$this->params['functionRevision'],
			$this->params['implementationZid'],
			$this->params['implementationRevision'],
			$this->params['testZid'],
			$this->params['testRevision'],
			$this->params['passed'],
			$this->params['stashedResult']
		);

		return true;
	}
}
