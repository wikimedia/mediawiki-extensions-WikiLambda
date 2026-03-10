<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Jobs;

use MediaWiki\Config\Config;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Http\HttpRequestFactory;
use MediaWiki\JobQueue\GenericParameterJob;
use MediaWiki\JobQueue\Job;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use Psr\Log\LoggerInterface;

/**
 * Asynchronous job run on Abstract Wiki to refresh an Abstract Content
 * fragment which is only available in the cache in an older version.
 * This job requests Wikifunctions to re-render the fragment via the
 * wikilambda_function_call Action API and updates the cache key with
 * and without today's date.
 */
class CacheAbstractContentFragmentJob extends Job implements GenericParameterJob {

	private Config $config;
	private HttpRequestFactory $httpRequestFactory;
	private AbstractWikiRequest $abstractWikiRequest;
	private LoggerInterface $logger;

	/**
	 * @inheritDoc
	 */
	public function __construct( array $params ) {
		parent::__construct( 'cacheAbstractContentFragment', $params );

		$this->config = MediaWikiServices::getInstance()->getConfigFactory()->makeConfig( 'WikiLambda' );
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstract' );

		$this->abstractWikiRequest = WikiLambdaServices::getAbstractWikiRequest();

		$this->logger->debug(
			__CLASS__ . ' created',
			[
				'qid' => $params['qid'],
				'language' => $params['language'],
				'date' => $params['date']
			]
		);
	}

	/**
	 * Asynchronous job to re-generate and rfresh the rendered fragment in the cache.
	 * * Makes a remote call to Wikifunctions wikilambda_function_call to evaluate a fragment fragment
	 * * Sanitizes the HTML response.
	 * * Caches resulting fragment under fresh and stale cache keys.
	 *
	 * @return bool
	 */
	public function run() {
		$functionCall = $this->params['functionCall'];
		$cacheKeyFresh = $this->params['cacheKeyFresh'];
		$cacheKeyStale = $this->params['cacheKeyStale'];

		$this->logger->debug(
			__CLASS__ . ' initiated for qid:{qid} language:{language} and date:{date} ',
			[
				'qid' => $this->params['qid'],
				'language' => $this->params['language'],
				'date' => $this->params['date']
			]
		);

		$cachedValue = $this->abstractWikiRequest->generateSafeFragment(
			$functionCall,
			$cacheKeyFresh,
			$cacheKeyStale
		);

		$this->logger->debug(
			__CLASS__ . ' refreshed {status} cached fragment for qid:{qid} language:{language} and date:{date} ',
			[
				'status' => $cachedValue[ 'success' ] ? 'successful' : 'failed',
				'qid' => $this->params['qid'],
				'language' => $this->params['language'],
				'date' => $this->params['date']
			]
		);

		// Return true even if cachedValue was failed; no job retries
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function ignoreDuplicates() {
		// We've carefully chosen the parameters so this Job is shared across multiple uses, so don't run it
		// in parallel and have MediaWiki de-duplicate requests.
		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function getDeduplicationInfo() {
		$info = parent::getDeduplicationInfo();
		// When deduplicating, only keep fragment-defining parameters
		$info[ 'params' ] = [
			'qid' => $this->params['qid'],
			'language' => $this->params['language'],
			'date' => $this->params['date'],
			'functionCall' => $this->params['functionCall'],
		];

		return $info;
	}

	/**
	 * @inheritDoc
	 */
	public function allowRetries() {
		return false;
	}
}
