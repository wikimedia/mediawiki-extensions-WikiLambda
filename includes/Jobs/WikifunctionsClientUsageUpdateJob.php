<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Jobs;

use MediaWiki\Config\Config;
use MediaWiki\Extension\WikiLambda\WikifunctionsClientStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\JobQueue\GenericParameterJob;
use MediaWiki\JobQueue\Job;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use MediaWiki\Title\Title;
use Psr\Log\LoggerInterface;

/**
 * Asynchronous job to record that a page is using a function in the database,
 * which allows us to avoid a database write on an API GET.
 */
class WikifunctionsClientUsageUpdateJob extends Job implements GenericParameterJob {

	private LoggerInterface $logger;
	private WikifunctionsClientStore $wikifunctionsClientStore;
	private Config $config;

	private string $targetFunction;
	private string $targetPageText;
	private int $targetPageNamespace;

	public function __construct( array $params ) {
		parent::__construct( 'wikifunctionsClientUsageUpdate', $params );
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
		$this->wikifunctionsClientStore = WikiLambdaServices::getWikifunctionsClientStore();

		$this->config = MediaWikiServices::getInstance()->getMainConfig();

		$this->targetFunction = $params['targetFunction'];
		$this->targetPageText = $params['targetPageText'];
		$this->targetPageNamespace = $params['targetPageNamespace'];

		$this->logger->debug(
			__CLASS__ . ' created for {targetFunction} on {targetPageNS}:{targetPage}',
			[
				'targetFunction' => $this->targetFunction,
				'targetPage' => $this->targetPageText,
				'targetPageNS' => $this->targetPageNamespace,
			]
		);
	}

	/**
	 * @return bool
	 */
	public function run() {
		$this->logger->debug(
			__CLASS__ . ' initiated for {targetFunction} on {targetPageNS}:{targetPage}',
			[
				'targetFunction' => $this->targetFunction,
				'targetPage' => $this->targetPageText,
				'targetPageNS' => $this->targetPageNamespace,
			]
		);

		if ( !$this->config->get( 'WikiLambdaEnableClientMode' ) ) {
			$this->logger->warning(
				__CLASS__ . ' triggered for {targetFunction} on {targetPageNS}:{targetPage}; not in client mode.',
				[
					'targetFunction' => $this->targetFunction,
					'targetPage' => $this->targetPageText,
					'targetPageNS' => $this->targetPageNamespace,
				]
			);

			// Nothing for us to do.
			return true;
		}

		// FIXME: Don't proceed but evict from page if cache job finds that parser object doesn't have our flag? We
		// have set it (on the PC, not Title) via $extApi->getMetadata()->setExtensionData( 'wikilambda', 'present' );

		$success = $this->wikifunctionsClientStore->insertWikifunctionsUsage(
			$this->targetFunction,
			Title::newFromText( $this->targetPageText, $this->targetPageNamespace )
		);

		if ( $success ) {
			$this->logger->debug(
				__CLASS__ . ' Updated usage table for {targetFunction} on {targetPageNS}:{targetPage}',
				[
					'targetFunction' => $this->targetFunction,
					'targetPage' => $this->targetPageText,
					'targetPageNS' => $this->targetPageNamespace,
				]
			);
		} else {
			$this->logger->info(
				__CLASS__ . ' Didn\'t update usage for {targetFunction} on {targetPageNS}:{targetPage}; already there?',
				[
					'targetFunction' => $this->targetFunction,
					'targetPage' => $this->targetPageText,
					'targetPageNS' => $this->targetPageNamespace,
				]
			);

		}

		return true;
	}
}
