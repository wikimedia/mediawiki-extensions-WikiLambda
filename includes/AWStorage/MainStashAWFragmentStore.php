<?php
/**
 * WikiLambda Abstract Wikipedia - MainStash implementation for the AW Fragment storage.
 *
 * Stores AW Fragments in MediaWiki's MainStash (`getMainObjectStash()`), an x2
 * replicated key/value substrate with TTL cleanup. This is an alternative to the
 * Memcached MemcachedAWFragmentStore, to provide a more durable alternative
 * for fragment storage. See T431428 for background.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AWStorage;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentUtils;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\Jobs\CacheAbstractContentFragmentJob;
use MediaWiki\Extension\WikiLambda\Language\WikifunctionsLanguage;
use MediaWiki\Extension\WikiLambda\Metrics\StoreOpsMetrics;
use MediaWiki\JobQueue\JobQueueGroup;
use OverflowException;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\Stats\StatsFactory;
use Wikimedia\Timestamp\ConvertibleTimestamp;

class MainStashAWFragmentStore extends AWFragmentStore {

	/**
	 * Maximum allowed payload size (in bytes) for a single section or for a
	 * JSON-encoded metadata payload. Sized to sit comfortably below the
	 * per-value limit of Wikimedia's production MainStash backend
	 * (SqlBagOStuff on x2), leaving headroom for PHP serialize() framing
	 * around our wrapper array. Writes above this threshold raise
	 * OverflowException so the caller is told loudly rather than discovering
	 * later via a silent BagOStuff::set() => false.
	 */
	public const MAX_PAYLOAD_BYTES = 1 * 1024 * 1024;

	/**
	 * Fragment to be considered stale and hence be re-rendered after
	 * MAX_AGE_HOURS hours.
	 */
	public const MAX_AGE_HOURS = 24;

	/**
	 * Adds a variable delay on top of MAX_AGE_HOURS, in minutes, to avoid
	 * all fragments becoming stale and being re-rendered at the same time.
	 */
	public const MAX_AGE_VARIANCE_MINUTES = 360;

	private readonly StoreOpsMetrics $metrics;

	public function __construct(
		private readonly JobQueueGroup $jobQueueGroup,
		private readonly BagOStuff $stash,
		?StatsFactory $statsFactory = null
	) {
		$this->metrics = new StoreOpsMetrics( 'mainstash', $statsFactory );
	}

	/**
	 * Make the fragment global cache key with topic, language zid and
	 * the serialized fragment call.
	 *
	 * @param string $topicQid
	 * @param string $languageZid
	 * @param string $fragmentKey
	 * @return string
	 */
	private function makeGlobalKey(
		string $topicQid,
		string $languageZid,
		string $fragmentKey
	): string {
		return $this->stash->makeGlobalKey(
			self::ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX,
			$topicQid,
			$languageZid,
			$fragmentKey
		);
	}

	/**
	 * @param array $fragment
	 * @param string $topicQid
	 * @param WikifunctionsLanguage $language
	 * @param string $datetime
	 * @param string $fragmentKey
	 */
	private function queueRevalidateJob(
		array $fragment,
		string $topicQid,
		WikifunctionsLanguage $language,
		string $datetime,
		string $fragmentKey
	): void {
		$revalidateJob = new CacheAbstractContentFragmentJob( [
			'fragment' => $fragment,
			'qid' => $topicQid,
			'language' => $language->getZid(),
			'datetime' => $datetime,
			'fragmentKey' => $fragmentKey,
		] );

		$this->jobQueueGroup->lazyPush( $revalidateJob );
	}

	/**
	 * Returns the flag that determines the fragment recency according to the
	 * stashed value, which for the MainStash implementation, contains the
	 * stash date apart from the success flag and rendered value.
	 *
	 * Input value is an array with the keys 'success', 'value' and 'renderDate'.
	 *
	 * Returned values can be:
	 * * AWFragment::AVAILABILITY_FRESH
	 * * AWFragment::AVAILABILITY_STALE
	 *
	 * @param string $datetime
	 * @param array $value
	 * @return int
	 */
	private function getFragmentRecencyFlag( string $datetime, array $value ): int {
		$renderDate = new ConvertibleTimestamp( $value['renderDate'] );
		$now = new ConvertibleTimestamp( $datetime );

		// Calculate elapsed time in minutes since the fragment was rendered
		$diff = $now->diff( $renderDate );
		$elapsedMins = ( $diff->days * 24 * 60 ) + ( $diff->h * 60 ) + $diff->i;

		// Add a random variance to the base max age to avoid all fragments
		// becoming stale and being re-rendered at the same time
		$varianceMins = random_int( 0, self::MAX_AGE_VARIANCE_MINUTES );
		$thresholdMins = self::MAX_AGE_HOURS * 60 + $varianceMins;

		// If elapsed time is over the randomized threshold, mark it as stale
		if ( $elapsedMins > $thresholdMins ) {
			return AWFragment::AVAILABILITY_STALE;
		}

		return AWFragment::AVAILABILITY_FRESH;
	}

	/**
	 * Given a fragment render value, determine the TTL for storing it in MainStash.
	 *
	 * This TTL policy considers both the newly rendered value and the value
	 * currently stored in MainStash.
	 *
	 * If we get a successful response, it is stored with a long TTL. Normally, if
	 * the fragmet belongs to a commonly visited AW article, the value will be
	 * updated once the fragment is considered "stale", before the TTL expires.
	 * For other non usually visited or requested articles, the entry will expire
	 * and will be requested again with a new read.
	 *
	 * If we get an error due to a bad request, either the fragment should change,
	 * which would mean the fragment key will become orphaned, or the function
	 * (or other wikifunctions/wikidata value) should be fixed. This case will not
	 * be detected until there's a brand new call due to "staleness" or manual
	 * "cache busting."
	 *
	 * If we get a transient error:
	 * * if there's already a successful fragment stored, we should not overwrite
	 *   it with a transient error.
	 * * if there's no fragment stored, we can store it but with a minimal TTL,
	 *   so that gets don't trigger re-renders too soon.
	 *
	 * @param string $stashKey
	 * @param array $value
	 * @return int
	 */
	private function getFragmentStashTTL( string $stashKey, array $value ): int {
		if ( $value['success'] === false ) {
			$httpErrorCode = $value['value']['httpStatusCode'] ?? HttpStatus::INTERNAL_SERVER_ERROR;

			// If fragment failed due to a transient error we store the value for a minimal TTL
			// or we don't cache it at all depending on the current value stashed in the store.
			if ( !in_array( (int)$httpErrorCode, HttpStatus::CONTENT_ERROR_CODES, true ) ) {
				// Get currently stashed value, to decide whether we store this one or not.
				// This is only needed in case of a transient error:
				$stashedValue = $this->stash->get( $stashKey );

				// Miss: we store the result with a minimal TTL so that the function is
				// not retried before the load has been alleviated.
				if ( !is_array( $stashedValue ) ) {
					return BagOStuff::TTL_MINUTE;
				}

				// Hit: we don't store at all, so that we don't overwrite an already
				// existing value with a temporary error.
				return BagOStuff::TTL_UNCACHEABLE;
			}
		}

		// Otherwise, if fragment failed with success or failure due to
		// a content error we store the value for the same TTL_MONTH
		return BagOStuff::TTL_MONTH;
	}

	/**
	 * @inheritDoc
	 *
	 * Additionally to the 'success' and 'value' keys, this implementation stores its rendered
	 * date as part of the value, under the key 'renderDate', in TimestampFormat::MW format.
	 *
	 * This way, both the status and the recency of the fragment will be determined by
	 * inspecting the stashed value.
	 *
	 * E.g.: [
	 *   'success' => true,
	 *   'value' => '<b>sanitized html</b>',
	 *   'renderDate' => 20260812202900
	 * ]
	 */
	public function getRenderedAWFragment(
		array $fragment,
		string $topicQid,
		WikifunctionsLanguage $language,
		string $datetime,
		bool $revalidate = true
	): AWFragment {
		$fragmentKey = AbstractContentUtils::makeCacheKeyForAbstractFragment( $fragment );

		// Build AWFragment object with: key, qid, locale and date
		$awFragment = new AWFragment( $fragmentKey, $topicQid, $language->getCode() );

		// Get fresh value and exit if there's a hit
		$stashKey = $this->makeGlobalKey( $topicQid, $language->getZid(), $fragmentKey );
		$startTime = hrtime( true );
		$stashedValue = $this->stash->get( $stashKey );

		// If fragment isn't stashed; queue job if revalidate=true and return empty fragment
		if ( !is_array( $stashedValue ) ) {
			$this->metrics->recordOp( self::METRIC_STORE, 'get', 'miss', $startTime );
			if ( $revalidate ) {
				$this->queueRevalidateJob( $fragment, $topicQid, $language, $datetime, $fragmentKey );
			}
			$this->metrics->recordFragmentStatus( self::METRIC_STORE, $awFragment->getStatus() );
			return $awFragment;
		}
		$this->metrics->recordOp( self::METRIC_STORE, 'get', 'hit', $startTime );

		// If fragment is stashed:
		// * look at the stash date in the value
		// * if fragment is stale and revalidate=true: queue job
		// * return non-empty fragment
		$awFragment->setValue( $stashedValue, $this->getFragmentRecencyFlag( $datetime, $stashedValue ) );

		if ( $awFragment->isStale() && $revalidate ) {
			$this->queueRevalidateJob( $fragment, $topicQid, $language, $datetime, $fragmentKey );
		}

		$this->metrics->recordFragmentStatus( self::METRIC_STORE, $awFragment->getStatus() );
		return $awFragment;
	}

	/**
	 * @inheritDoc
	 *
	 * The MainStash implementation stores only one value using a stash key to
	 * identify the fragment irrespective to its regeneration date. The date and
	 * time are instead used to enrich the stored value, which contains the
	 * keys 'success', 'value', and 'renderDate' (in TimestampFormat::MW format)
	 *
	 * E.g.: [
	 *   'success' => true,
	 *   'value' => '<b>sanitized html</b>',
	 *   'renderDate' => 20260812202900
	 * ]
	 *
	 * @throws OverflowException if the section's payload exceeds
	 *   self::MAX_PAYLOAD_BYTES bytes (and so would not fit in the underlying
	 *   MainStash backend).
	 */
	public function setRenderedAWFragment(
		string $topicQid,
		string $languageZid,
		string $datetime,
		string $fragmentKey,
		array $value
	): bool {
		// Check payload size and throw OverflowException when
		// an excessive value size has been detected.
		$payloadSize = strlen( json_encode( $value ) );
		if ( $payloadSize > self::MAX_PAYLOAD_BYTES ) {
			throw new OverflowException( sprintf(
				'AWFragment payload for topic %s and language %s is'
				. '%d bytes, exceeding the MainStash limit of %d bytes.',
				$topicQid,
				$languageZid,
				$payloadSize,
				self::MAX_PAYLOAD_BYTES
			) );
		}

		// Enrich value with renderDate
		$value['renderDate'] = $datetime;

		// Make global MainStash key
		$stashKey = $this->makeGlobalKey( $topicQid, $languageZid, $fragmentKey );

		// Get fragment stash TTL
		$stashTTL = $this->getFragmentStashTTL( $stashKey, $value );

		// If fragment contains a transient error and is uncacheable, exit
		if ( $stashTTL === BagOStuff::TTL_UNCACHEABLE ) {
			$this->metrics->recordOp( self::METRIC_STORE, 'set', 'skipped', hrtime( true ) );
			return false;
		}

		$startTime = hrtime( true );
		$success = $this->stash->set( $stashKey, $value, $stashTTL );
		$this->metrics->recordOp( self::METRIC_STORE, 'set', $success ? 'success' : 'failure', $startTime );

		return $success;
	}
}
