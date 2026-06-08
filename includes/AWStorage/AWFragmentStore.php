<?php
/**
 * WikiLambda Abstract Wikipedia - Service class to  AW Fragment storage.
 *
 * This store provides access to stored AW Article Fragmets, whether they
 * are stored in durable or ephemeral storage layer(s).
 *
 * The store provides the necessary getters to retrieve rendered AW Fragments.
 *
 * AWFragments are fetched:
 * * When composing an AW Article Section to store it in the durable AWArticleStore,
 *   which happens when running the updateAbstractWiiArticleStore maintenance script.
 * * When accessing the abstract.wikipedia.org view or edit page for a given topic
 *   and generating the AW Article preview for a given language.
 *
 * The AWFragment returned by the getter can be either fresh or stale, which
 * might determine the actions taken by the caller.
 *
 * NOTE:
 * This class isolates and decouples the AW Fragment storage layer. Currently, rendered
 * fragments are stored in an ephemeral cache (Memcached), but possibly in the future
 * we'd want to change this by adding other layers of fallback storage.
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
use MediaWiki\JobQueue\JobQueueGroup;

class AWFragmentStore {

	public const ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX = 'WikiLambdaAbstractFragment';

	public function __construct(
		private readonly JobQueueGroup $jobQueueGroup,
		private readonly MemcachedWrapper $objectCache
	) {
	}

	/**
	 * Returns the AWFragment rendered given:
	 * * the fragment composition, as stored in its AW Content object,
	 * * its topic Qid: the Wikidata Qid uniquely identifying the Abstract Wiki article,
	 * * the language to render it in: a WikifunctionsLanguage object containing the Language
	 *   and its Wikifunctions equivalent Zid, and
	 * * today's date: as a string in 'Y-m-d' date format.
	 *
	 * This getter ensures that:
	 * * An AWFragment object is always returned.
	 * * An AWFragment object can always be serialized as Html.
	 * * An AWFragment object might represent a missing (or non-ready, or pending) fragment.
	 * * A rendered (non-missing) AWFragment might contain a fresh or a stale value.
	 * * A rendered (non-missing) AWFragment might contain a successful or a failed render.
	 *
	 * As a side-effect, when a fresh rendered value is not available, this getter will
	 * queue an asynchronous re-rendering job to make sure that it eventually becomes updated.
	 *
	 * When a non-missing AWFragment is returned, the payload will contain an array with
	 * 'success' and 'value' keys that indicate the fragment render status:
	 *
	 * When the fragment was successfully built, 'value' contains a string with the final
	 * (rendered and sanitized) HTML:
	 *
	 * E.g.: [
	 *   'success' => true,
	 *   'value' => '<b>sanitized html</b>'
	 * ]
	 *
	 * When the fragment returned an error, 'value' contains structured error data
	 * which can be deserialized into a WikifunctioCallException with fromArray()
	 *
	 * E.g.: [
	 *   'success' => false,
	 *   'value' => [
	 *     'msg' => 'some-error-msg-code',
	 *     'httpStatusCode' => 500,
	 *     'zerror' => [],
	 *     'params' => []
	 *   ]
	 * ]
	 *
	 * @param array $fragment
	 * @param string $topicQid
	 * @param WikifunctionsLanguage $language
	 * @param string $date
	 * @return AWFragment
	 */
	public function getRenderedAWFragment(
		array $fragment,
		string $topicQid,
		WikifunctionsLanguage $language,
		string $date,
	): AWFragment {
		// Fragment key, used for both fresh and stale cache keys
		$fragmentKey = AbstractContentUtils::makeCacheKeyForAbstractFragment( $fragment );

		// Build AWFragment object with: key, qid, locale and date
		$awFragment = new AWFragment( $fragmentKey, $topicQid, $language->getCode(), $date );

		// Get fresh value and exit if there's a hit
		$cacheKeyFresh = $this->objectCache->makeKey(
			self::ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX,
			$topicQid,
			$language->getZid(),
			$date,
			$fragmentKey
		);

		$freshValue = json_decode( $this->objectCache->get( $cacheKeyFresh ) ?: '', true );

		if ( is_array( $freshValue ) ) {
			// Set stale value and return
			$awFragment->setValue( $freshValue, AWFragment::AVAILABILITY_FRESH );
			return $awFragment;
		}

		// Get stale value and exit if there's a hit
		$cacheKeyStale = $this->objectCache->makeKey(
			self::ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX,
			$topicQid,
			$language->getZid(),
			$fragmentKey
		);

		$staleValue = json_decode( $this->objectCache->get( $cacheKeyStale ) ?: '', true );

		// Create and queue the job CacheAbstractContentFragmentJob;
		// at this point we know that we want to generate the fragment in any case.
		$refreshJob = new CacheAbstractContentFragmentJob( [
			'fragment' => $fragment,
			'qid' => $topicQid,
			'language' => $language->getZid(),
			'date' => $date,
			'fragmentKey' => $fragmentKey,
		] );

		$this->jobQueueGroup->lazyPush( $refreshJob );

		if ( is_array( $staleValue ) ) {
			// Set stale value and return
			$awFragment->setValue( $staleValue, AWFragment::AVAILABILITY_STALE );
			return $awFragment;
		}

		// No value, return AWFragment with missing status
		return $awFragment;
	}

	/**
	 * Stores a given AWFragment data in the AWFragmentStore.
	 *
	 * Currently the AWFragmentStore consists on a MemcachedWrapper layer,
	 * and every AWFragment is stored under two keys:
	 * * fresh key, which contains qid, language, date and fragmentKey
	 * * stale key, with contains qid, language and fragmentKey
	 *
	 * @param string $topicQid
	 * @param string $languageZid
	 * @param string $date
	 * @param string $fragmentKey
	 * @param array $value
	 * @return bool
	 */
	public function setRenderedAWFragment(
		string $topicQid,
		string $languageZid,
		string $date,
		string $fragmentKey,
		array $value
	): bool {
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

		// If fragment failed due to a transient error (anything but a BAD_REQUEST), we set
		// the fresh value with a TTL_MINUTE, to force re-renders in the future, but we keep
		// the stale value as is so that we don't mark the fragment as infinitely pending
		if ( $value['success'] === false ) {
			$httpErrorCode = $value['value']['httpStatusCode'] ?? HttpStatus::INTERNAL_SERVER_ERROR;
			if ( (int)$httpErrorCode !== HttpStatus::BAD_REQUEST ) {
				$freshTTL = $this->objectCache::TTL_MINUTE;
			}
		}

		// For successful renders or non-transient errors (BAD_REQUEST)
		// * cache fresh value for WEEK (at least 48 hours to ensure availability through timezones)
		// * cache stale value for MONTH
		$this->objectCache->set( $cacheKeyFresh, $encodedValue, $freshTTL );
		$this->objectCache->set( $cacheKeyStale, $encodedValue, $staleTTL );

		return true;
	}

	/**
	 * @param array $value
	 * @param string $locale
	 * @return string
	 */
	public static function createFailingFragmentBlock( array $value, string $locale ): string {
		return '<span>Error: ' . $value[ 'msg' ] . '</span>';
	}

	/**
	 * @param string $locale
	 * @return string
	 */
	public static function createPendingFragmentBlock( $locale ): string {
		return '<span>Pending fragment... try again later</span>';
	}
}
