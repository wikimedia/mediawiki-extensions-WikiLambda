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

	private LoggerInterface $logger;
	private ZObjectStore $zObjectStore;

	/**
	 * @param array $params
	 */
	public function __construct( array $params ) {
		parent::__construct( 'cacheTesterResults', $params );
		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );

		// TODO (T330030): Consider accessing the ZObjectStore as an injected service
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
	 * @return bool
	 */
	public function run() {
		$success = $this->zObjectStore->insertZTesterResult(
			$this->params['functionZid'],
			$this->params['functionRevision'],
			$this->params['implementationZid'],
			$this->params['implementationRevision'],
			$this->params['testerZid'],
			$this->params['testerRevision'],
			$this->params['passed'],
			$this->params['stashedResult']
		);

		if ( $success ) {
			$this->logger->debug(
				__CLASS__ . ' Updated cache for tester result',
				[
					'functionZid' => $this->params['functionZid'],
					'functionRevision' => $this->params['functionRevision']
				]
			);
		} else {
			$this->logger->info(
				__CLASS__ . ' Failed to update cache for tester result',
				[
					'functionZid' => $this->params['functionZid'],
					'functionRevision' => $this->params['functionRevision'],
					'implementationZid' => $this->params['implementationZid'],
					'implementationRevision' => $this->params['implementationRevision'],
					'testerZid' => $this->params['testerZid'],
					'testerRevision' => $this->params['testerRevision'],
					'passed' => $this->params['passed'],
					'stashedResult' => $this->params['stashedResult']
				]
			);

		}

		return true;
	}
}
