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
use MediaWiki\Config\Config;
use MediaWiki\Extension\WikiLambda\WikifunctionsClientStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use Psr\Log\LoggerInterface;

/**
 * Asynchronous job to record that a page is using a function in the database,
 * which allows us to avoid a database write on an API GET.
 */
class WikifunctionsUsageUpdateJob extends Job implements GenericParameterJob {

	private LoggerInterface $logger;
	private WikifunctionsClientStore $wikifunctionsClientStore;
	private Config $config;

	private string $targetFunction;
	private Title $targetPage;

	public function __construct( array $params ) {
		parent::__construct( 'wikifunctionsUsageUpdate', $params );
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
		$this->wikifunctionsClientStore = WikiLambdaServices::getWikifunctionsClientStore();

		$this->config = MediaWikiServices::getInstance()->getMainConfig();

		$this->targetFunction = $params['targetFunction'];
		$this->targetPage = $params['targetPage'];

		$this->logger->debug(
			__CLASS__ . ' created for {targetFunction} on {targetPage}',
			[
				'targetFunction' => $this->targetFunction,
				'targetPage' => $this->targetPage->getPrefixedText()
			]
		);
	}

	// FIXME: Evict from page if cache job finds that parser object doesn't have our flag but

	/**
	 * @return bool
	 */
	public function run() {
		if ( !$this->config->get( 'WikiLambdaEnableClientMode' ) ) {
			$this->logger->warning(
				__CLASS__ . ' Triggered for {targetFunction} on {targetPage}, but skipped as not in client mode',
				[
					'targetFunction' => $this->targetFunction,
					'targetPage' => $this->targetPage->getPrefixedText()
				]
			);

			// Nothing for us to do.
			return true;
		}

		$success = $this->wikifunctionsClientStore->insertWikifunctionsUsage(
			$this->targetFunction,
			$this->targetPage
		);

		if ( $success ) {
			$this->logger->debug(
				__CLASS__ . ' Updated usage table for {targetFunction} on {targetPage}',
				[
					'targetFunction' => $this->targetFunction,
					'targetPage' => $this->targetPage->getPrefixedText()
				]
			);
		} else {
			$this->logger->info(
				__CLASS__ . ' Didn\'t update usage table for {targetFunction} on {targetPage}, maybe already there',
				[
					'targetFunction' => $this->targetFunction,
					'targetPage' => $this->targetPage->getPrefixedText()
				]
			);

		}

		return true;
	}
}
