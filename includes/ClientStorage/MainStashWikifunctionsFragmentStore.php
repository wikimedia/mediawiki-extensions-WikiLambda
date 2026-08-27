<?php
/**
 * WikiLambda Wikifunctions Client - MainStash implementation for Wikifunctions fragment storage.
 *
 * Stores Wikifunctions embedded fragments in MediaWiki's MainStash (`getMainObjectStash()`),
 * an x2 replicated key/value substrate with TTL cleanup. This is an alternative to the
 * Memcached MemcachedWikifunctionsFragmentStore, to provide a more durable alternative
 * for fragment storage. See T431428 for background.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ClientStorage;

use DateTime;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsCallDefaultValues;
use MediaWiki\Logger\LoggerFactory;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\Timestamp\ConvertibleTimestamp;

class MainStashWikifunctionsFragmentStore extends WikifunctionsFragmentStore {

	/**
	 * Fragment to be considered stale and hence be re-rendered after
	 * MAX_AGE_HOURS hours.
	 */
	public const MAX_AGE_HOURS = 48;

	public function __construct(
		private readonly BagOStuff $stash
	) {
		$logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
		parent::__construct( $logger );
	}

	/**
	 * @inheritDoc
	 *
	 * The cache key for the MainStash implementation does not contain
	 * dynamic date arguments, but the original argument set to an empty
	 * string. This way, a key remains valid through the days and the
	 * re-rendering of the fragment depends on the handler logic instead
	 * of being triggered by a cache miss.
	 */
	protected function makeFragmentKey( array $functionCall ): string {
		// Remove temporal mutable arguments from the key
		if ( !empty( $functionCall['temporalArgs'] ) ) {
			foreach ( $functionCall['temporalArgs'] as $arg ) {
				if ( isset( $functionCall['arguments'][$arg] ) ) {
					$functionCall['arguments'][$arg] = '';
				}
			}
		}
		// Remove temporalArgs record from the key
		unset( $functionCall['temporalArgs'] );

		return $this->stash->makeGlobalKey(
			self::CLIENT_FUNCTIONCALL_CACHE_KEY_PREFIX,
			json_encode( $functionCall )
		);
	}

	/**
	 * @inheritDoc
	 */
	public function getRenderedFragment( array $functionCall ): ?array {
		$key = $this->makeFragmentKey( $functionCall );

		return $this->validateStoredFragment(
			$key,
			$this->stash->get( $key )
		);
	}

	/**
	 * @inheritDoc
	 */
	public function setRenderedFragment( array $functionCall, array $value, int $httpStatusCode ): bool {
		$key = $this->makeFragmentKey( $functionCall );

		return $this->stash->set(
			$key,
			$value,
			$this->getFragmentTTL( $httpStatusCode )
		);
	}

	/**
	 * @inheritDoc
	 */
	protected function delete( string $key ): bool {
		return $this->stash->delete( $key );
	}

	/**
	 * @inheritDoc
	 *
	 * The MainStash backed store does not use temporal/mutable values in the key,
	 * so fragments that are stale might be returned from the cache. This method
	 * determines if the fragment stored value is stale and should be enqueued
	 * for re-render, which is the case when:
	 *
	 * 1. The fragment has an argument that requires daily/timely re-render. This
	 *    happens, for example, when the fragment has an argument of type "Gregorian
	 *    calendar date" which is set to an empty string and hence will be replace
	 *    with today's date.
	 *
	 * 2. The renderDate property in the stored value for this fragment exceeds
	 *    a certain limit. For example, shows that the fragment is more than a day
	 *    old.
	 *
	 * @param array $fragment
	 * @param array $value
	 * @return bool
	 */
	public function isStaleFragment( array $fragment, array $value ): bool {
		// If the fragment call has no temporal/dynamic arguments, it's never stale
		if ( empty( $fragment['temporalArgs'] ) ) {
			return false;
		}

		$renderDate = $value['renderDate'] ?? null;

		// If the fragment has temporal/dynamic arguments, but there's no renderDate key,
		// look at the default date used as an argument, which was "today" at render time.
		if ( $renderDate === null ) {
			$temporalArg = $fragment['temporalArgs'][0];
			$argDate = $fragment['arguments'][$temporalArg] ?? null;
			// If there's no date available at all, treat as stale and trigger a re-render
			if ( $argDate === null ) {
				return true;
			}
			// Build the DateTime using the format the default argument was generated in
			$renderDate = DateTime::createFromFormat(
				WikifunctionsCallDefaultValues::GREGORIAN_CALENDAR_DATE_FORMAT,
				$argDate
			);
		}

		// If the fragment call has temporal/dynamic arguments, and renderDate
		// exceeds the acceptable age limit, then the stored value is stale
		$renderTimestamp = new ConvertibleTimestamp( $renderDate );
		$now = new ConvertibleTimestamp();
		$diff = $now->diff( $renderTimestamp );
		$elapsedHours = ( $diff->days * 24 ) + $diff->h;

		return $elapsedHours > self::MAX_AGE_HOURS;
	}

	/**
	 * Returns the appropriate TTL depending on the rendered value and http
	 * response code from Wikifunctions orchestrator service.
	 *
	 * Different TTLs might be more or less appropriate depending on the backend
	 * storage layer, so this method should be implemented by the inheriting class.
	 *
	 * (T338243) Set TTL conditionally, so that:
	 * * success (http 200)           TTL_MONTH
	 * * bad request (http 400-422)   TTL_WEEK
	 * * too many requests (http 429) TTL_MINUTE
	 * * server error (http >= 500)   TTL_MINUTE
	 *
	 * So if the request fails due to 400, we can still cache for
	 * a week, but if it failes due to system outages or timeouts,
	 * we would benefit from reducing the TTL to something very short.
	 *
	 * @param int $httpStatusCode
	 * @return int
	 */
	private function getFragmentTTL( int $httpStatusCode ): int {
		if ( $httpStatusCode === HttpStatus::OK ) {
			return BagOStuff::TTL_MONTH;
		}

		if (
			( $httpStatusCode >= HttpStatus::INTERNAL_SERVER_ERROR ) ||
			( $httpStatusCode === HttpStatus::TOO_MANY_REQUESTS )
		) {
			return BagOStuff::TTL_MINUTE;
		}

		return BagOStuff::TTL_WEEK;
	}
}
