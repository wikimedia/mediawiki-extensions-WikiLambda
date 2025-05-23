<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Jobs;

use MediaWiki\JobQueue\GenericParameterJob;
use MediaWiki\JobQueue\Job;
use MediaWiki\JobQueue\JobQueueGroupFactory;
use MediaWiki\JobQueue\JobSpecification;
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
		// This job, triggered from RecentChanges activity on the repo wiki, takes the edit and fans it out to each
		// relevant client wiki to process locally.

		parent::__construct( 'wikifunctionsClientFanOutQueue', $params );

		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );
		$this->jobQueueGroupFactory = MediaWikiServices::getInstance()->getJobQueueGroupFactory();

		$this->params = $params;

		$this->logger->debug(
			__CLASS__ . ' created for {targetZObject} — {params}',
			[
				'targetZObject' => $params['target'],
				'params' => var_export( $params, true ),
			]
		);
	}

	/**
	 * @return bool
	 */
	public function run() {
		$config = MediaWikiServices::getInstance()->getConfigFactory()->makeConfig( 'WikiLambda' );

		$this->logger->debug(
			__CLASS__ . ' initiated for {targetZObject}',
			[
				'targetZObject' => $this->params['target']
			]
		);

		// TODO (T385630): Instead of a single job for each client wiki to cover all pages, we could have yet another
		// layer of jobs which are specific to each page. This is what Wikibase does. (But then the repo wiki needs to
		// know which remote pages use each Function, which is currently only held locally on client wikis.)

		// Note: We're using the JobSpecification static, serialisable class as we're handing off to
		// MW instances, potentially running different versions of the code (unlike locally).
		$jobSpec = new JobSpecification( 'wikifunctionsRecentChangesInsert', [
			// The name of the Object that changed in the form of a string, e.g. 'Z12345'
			'target' => $this->params['target'],
			// The timestamp of the edit, e.g. '20210101000000'
			'timestamp' => $this->params['timestamp'],
			// The edit summary of the edit on the repo wiki
			'summary' => $this->params['summary'],
			// Structured data about the edit
			'data' => $this->params['data'],
			// The user ID of the user that made the edit on the repo wiki
			'user' => $this->params['user'],
			// Whether the user that made the edit on the repo wiki did so as a bot
			'bot' => $this->params['bot'],
		] );

		// Get client wikis
		$clientWikis = $config->get( 'WikiLambdaClientWikis' );

		$this->logger->debug(
			__CLASS__ . ' has a list of wikis: {clientWikis}',
			[
				'clientWikis' => var_export( $clientWikis, true )
			]
		);

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
