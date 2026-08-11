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
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\JobQueue\GenericParameterJob;
use MediaWiki\JobQueue\Job;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use Psr\Log\LoggerInterface;
use Wikimedia\Timestamp\ConvertibleTimestamp;
use Wikimedia\Timestamp\TimestampFormat as TS;

/**
 * Asynchronous job run on Abstract Wiki to refresh an Abstract Content
 * fragment which is only available in the cache in an older version.
 * This job requests Wikifunctions to re-render the fragment via the
 * wikilambda_function_call Action API and updates the cached value
 *
 * Queued by:
 * * AWFragmentStore::getLatestRenderedAWFragment when fresh fragment
 *   is missing. This can be called from:
 *   * ActionApi/ApiAbstractWikiRunFragment
 *   * maintenance/updateAbstractWikiArticleStore
 */
class CacheAbstractContentFragmentJob extends Job implements GenericParameterJob {

	private Config $config;
	private LoggerInterface $logger;
	private AbstractWikiRequest $abstractWikiRequest;

	/**
	 * @inheritDoc
	 */
	public function __construct( array $params ) {
		parent::__construct( 'cacheAbstractContentFragment', $params );

		// Non-injected items
		$this->config = MediaWikiServices::getInstance()->getConfigFactory()->makeConfig( 'WikiLambda' );
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaAbstract' );

		$this->abstractWikiRequest = WikiLambdaServices::getAbstractWikiRequest();

		// TODO (T434284) Remove date from the log once the old jobs have been drained
		$this->logger->info(
			__CLASS__ . ' created',
			[
				'qid' => $params['qid'],
				'language' => $params['language'],
				'date' => $params['date'] ?? null,
				'datetime' => $params['datetime'] ?? null,
				'fragmentKey' => $params['fragmentKey']
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
		$fragment = $this->params['fragment'];
		$qid = $this->params['qid'];
		$language = $this->params['language'];
		$fragmentKey = $this->params['fragmentKey'];

		// TODO (T434284) Transitional code: we should remove this when the
		// old job queue drains, and we are ready to use datetime directly:
		if ( isset( $this->params['datetime'] ) ) {
			$datetime = $this->params['datetime'];
		} else {
			// Transform date 'Y-m-d' into compatible datetime if the
			// job queue has any lingering job with the old parameters
			$datetime = ( new ConvertibleTimestamp( $this->params['date'] . ' 00:00:00' ) )
				->getTimestamp( TS::MW );
		}

		$this->logger->info(
			__CLASS__ . ' initiated for qid:{qid} language:{language} and datetime:{datetime} ',
			[
				'qid' => $qid,
				'language' => $language,
				'datetime' => $datetime,
				'fragmentKey' => $fragmentKey
			]
		);

		$cachedValue = $this->abstractWikiRequest->fetchRenderedAWFragment(
			$fragment,
			$qid,
			$language,
			$datetime,
			$fragmentKey
		);

		$httpStatusCode = $cachedValue['success'] ? HttpStatus::OK : (int)$cachedValue['value']['httpStatusCode'];

		// Find out if the failure was due to rendering service unavailable, and retry only in that case
		if ( $cachedValue[ 'success' ] === false ) {
			if (
				$httpStatusCode === HttpStatus::TOO_MANY_REQUESTS ||
				$httpStatusCode === HttpStatus::SERVICE_UNAVAILABLE
			) {
				$this->logger->warning( __CLASS__
					. ' rate limited ({httpStatusCode}) for qid:{qid} language:{language} and datetime:{datetime} ',
					[
						'qid' => $qid,
						'language' => $language,
						'datetime' => $datetime,
						'fragmentKey' => $fragmentKey,
						'httpStatusCode' => $httpStatusCode
					]
				);
				// Return false to force retry job in this case
				return false;
			}
		}

		$this->logger->info( __CLASS__
			. ' refresh fragment status:{httpStatusCode} for qid:{qid} language:{language} and datetime:{datetime} ',
			[
				'qid' => $qid,
				'language' => $language,
				'datetime' => $datetime,
				'fragmentKey' => $fragmentKey,
				'httpStatusCode' => $httpStatusCode
			]
		);
		// Return true to avoid retries
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
		// When deduplicating, only keep fragment-defining parameters (qid, language and fragment)
		$info[ 'params' ] = [
			'qid' => $this->params['qid'],
			'language' => $this->params['language'],
			'fragment' => $this->params['fragment']
		];

		return $info;
	}

	/**
	 * @inheritDoc
	 */
	public function allowRetries() {
		return true;
	}
}
