<?php
/**
 * WikiLambda Abstract Wikipedia - Memcached implementation for the AW Fragment storage.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AWStorage;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentUtils;
use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Jobs\CacheAbstractContentFragmentJob;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguage;
use MediaWiki\Extension\WikiLambda\Metrics\StoreOpsMetrics;
use MediaWiki\JobQueue\JobQueueGroup;
use Wikimedia\Stats\StatsFactory;
use Wikimedia\Timestamp\ConvertibleTimestamp;

class MemcachedAWFragmentStore extends AWFragmentStore {

	private readonly StoreOpsMetrics $metrics;

	public function __construct(
		private readonly JobQueueGroup $jobQueueGroup,
		private readonly MemcachedWrapper $objectCache,
		?StatsFactory $statsFactory = null
	) {
		$this->metrics = new StoreOpsMetrics( 'memcached', $statsFactory );
	}

	/**
	 * @inheritDoc
	 */
	public function getRenderedAWFragment(
		array $fragment,
		string $topicQid,
		WikifunctionsLanguage $language,
		string $datetime,
		bool $revalidate = true
	): AWFragment {
		// Transform datetime ('YmdHis') into the date format needed by the cache key
		$date = ( new ConvertibleTimestamp( $datetime ) )->format( 'Y-m-d' );

		// Fragment key, used for both fresh and stale cache keys
		$fragmentKey = AbstractContentUtils::makeCacheKeyForAbstractFragment( $fragment );

		// Build AWFragment object with: key, qid and locale
		$awFragment = new AWFragment( $fragmentKey, $topicQid, $language->getCode() );

		// Get fresh value and exit if there's a hit
		$cacheKeyFresh = $this->objectCache->makeKey(
			self::ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX,
			$topicQid,
			$language->getZid(),
			$date,
			$fragmentKey
		);

		$freshValue = json_decode( $this->objectCache->get( $cacheKeyFresh, self::METRIC_STORE ) ?: '', true );

		if ( is_array( $freshValue ) ) {
			// Set stale value and return
			$awFragment->setValue( $freshValue, AWFragment::AVAILABILITY_FRESH );
			$this->metrics->recordFragmentStatus( self::METRIC_STORE, $awFragment->getStatus() );
			return $awFragment;
		}

		// Get stale value and exit if there's a hit
		$cacheKeyStale = $this->objectCache->makeKey(
			self::ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX,
			$topicQid,
			$language->getZid(),
			$fragmentKey
		);

		$staleValue = json_decode( $this->objectCache->get( $cacheKeyStale, self::METRIC_STORE ) ?: '', true );

		// Create and queue the job CacheAbstractContentFragmentJob;
		// at this point we know that we want to generate the fragment
		// unless the revalidate flag is false
		if ( $revalidate ) {
			$refreshJob = new CacheAbstractContentFragmentJob( [
				'fragment' => $fragment,
				'qid' => $topicQid,
				'language' => $language->getZid(),
				'datetime' => $datetime,
				'fragmentKey' => $fragmentKey,
			] );

			$this->jobQueueGroup->lazyPush( $refreshJob );
		}

		if ( is_array( $staleValue ) ) {
			// Set stale value and return
			$awFragment->setValue( $staleValue, AWFragment::AVAILABILITY_STALE );
			$this->metrics->recordFragmentStatus( self::METRIC_STORE, $awFragment->getStatus() );
			return $awFragment;
		}

		// No value, return AWFragment with missing status
		$this->metrics->recordFragmentStatus( self::METRIC_STORE, $awFragment->getStatus() );
		return $awFragment;
	}

	/**
	 * @inheritDoc
	 *
	 * This implementation of the AWFragmentStore consists on a MemcachedWrapper layer,
	 * and every AWFragment is stored under two keys:
	 * * fresh key, which contains qid, language, date and fragmentKey
	 * * stale key, with contains qid, language and fragmentKey
	 */
	public function setRenderedAWFragment(
		string $topicQid,
		string $languageZid,
		string $datetime,
		string $fragmentKey,
		array $value
	): bool {
		// Transform datetime ('YmdHis') into the date format needed by the cache key
		$date = ( new ConvertibleTimestamp( $datetime ) )->format( 'Y-m-d' );

		// Build fresh cache key (with today's date)
		$cacheKeyFresh = $this->objectCache->makeKey(
			self::ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX,
			$topicQid,
			$languageZid,
			$date,
			$fragmentKey
		);

		// Build stale cache key (with no date)
		$cacheKeyStale = $this->objectCache->makeKey(
			self::ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX,
			$topicQid,
			$languageZid,
			$fragmentKey
		);

		// 4. Cache the response with both the fresh and the stale keys

		// Prepare the value
		$encodedValue = json_encode( $value );
		$freshTTL = $this->objectCache::TTL_WEEK;
		$staleTTL = $this->objectCache::TTL_MONTH;

		// If the fragment failed for a reason that a re-render can clear, we set the fresh value
		// with a TTL_MINUTE, to force re-renders in the future, but we keep the stale value as is
		// so that we don't mark the fragment as infinitely pending. A failure that the content
		// caused is different: a re-render gives the same error until an editor changes the
		// content, so we cache it for the usual time and do not ask the orchestrator each minute.
		if ( $value['success'] === false ) {
			$httpErrorCode = $value['value']['httpStatusCode'] ?? HttpStatus::INTERNAL_SERVER_ERROR;
			if ( !in_array( (int)$httpErrorCode, HttpStatus::CONTENT_ERROR_CODES, true ) ) {
				$freshTTL = $this->objectCache::TTL_MINUTE;
			}
		}

		// For successful renders, or for errors that the content caused
		// * cache fresh value for WEEK (at least 48 hours to ensure availability through timezones)
		// * cache stale value for MONTH
		$this->objectCache->set( $cacheKeyFresh, $encodedValue, $freshTTL, self::METRIC_STORE );
		$this->objectCache->set( $cacheKeyStale, $encodedValue, $staleTTL, self::METRIC_STORE );

		return true;
	}
}
