<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Jobs;

use GenericParameterJob;
use Job;
use JobSpecification;
use MediaWiki\JobQueue\JobQueueGroupFactory;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use Psr\Log\LoggerInterface;

/**
 * Asynchronous job run on the repo wiki to schedule local updates to client wikis
 */
class WikifunctionsClientFanOutQueueJob extends Job implements GenericParameterJob {

	private LoggerInterface $logger;
	private JobQueueGroupFactory $jobQueueGroupFactory;

	public function __construct( array $params ) {
		// This job, triggered from RecentChanges activity, takes the edit and fans it out to each
		// relevant client wiki to process locally.

		parent::__construct( 'wikifunctionsClientFanOutQueueJob', $params );
		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );
		$this->jobQueueGroupFactory = MediaWikiServices::getInstance()->getJobQueueGroupFactory();

		$this->params = $params;

		$this->logger->debug(
			__CLASS__ . ' created for {targetZObject}',
			[
				'targetZObject' => $params['target']
			]
		);
	}

	/**
	 * @return bool
	 */
	public function run() {
		$config = MediaWikiServices::getInstance()->getConfigFactory()->makeConfig( 'WikiLambda' );

		// TODO (T385630): Instead of a single job for each client wiki to cover all pages, we could have yet another
		// layer of jobs which are specific to each page. This is what Wikibase does.

		// Note: We're using the JobSpecification static, serialisable class as we're handing off to
		// MW instances, potentially running different versions of the code (unlike locally).
		$jobSpec = new JobSpecification( 'wikifunctionsRecentChangesInsert', [
			// The Title in the form of a string, e.g. 'Z12345'
			'target' => $this->params['target'],
			// The timestamp of the edit, e.g. '20210101000000'
			'timestamp' => $this->params['timestamp'],
			// The edit summary of the edit on the repo wiki
			// TODO (T383156): This should also include the parameters for information about the change
			'summary' => $this->params['summary'],
			// The revision ID of the edit on the repo wiki
			'revision' => $this->params['revision'],
			// The user ID of the user that made the edit on the repo wiki
			'user' => $this->params['user'],
			// Whether the user that made the edit on the repo wiki did so as a bot
			'bot' => $this->params['bot'],
		] );

		// Get client wikis
		$clientWikis = $config->get( 'WikiLambdaClientWikis' );

		// TODO (T385621): Filter down to relevant client wikis that subscribe to this Function
		// This will need (a) a table on the repo wiki (or x3/etc.?) to store what client wikis are subscribed
		// to what Functions, and (b) update jobs to update that table when a Function is used or dropped

		// For each client wiki, create a job and push it to that wiki's job queue
		// NOTE: Like Wikibase, this requires all client wikis to be DB-writable in the same cluster as the repo wiki.
		foreach ( $clientWikis as $clientWiki ) {
			$this->logger->debug(
				__CLASS__ . ' despatching to {targetWiki} for {item} edit {revision}',
				[
					'targetWiki' => $clientWiki,
					'item' => $this->params['target'],
					'revision' => $this->params['revision']
				]
			);
			$jobQueueGroup = $this->jobQueueGroupFactory->makeJobQueueGroup( $clientWiki );
			$jobQueueGroup->lazyPush( $jobSpec );
		}

		return true;
	}
}
