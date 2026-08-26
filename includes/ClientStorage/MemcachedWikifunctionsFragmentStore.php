<?php
/**
 * WikiLambda Wikifunctions Client - Memcached implementation for Wikifunctions fragment storage.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ClientStorage;

use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\HttpStatus;
use MediaWiki\Logger\LoggerFactory;

class MemcachedWikifunctionsFragmentStore extends WikifunctionsFragmentStore {

	public function __construct(
		private readonly MemcachedWrapper $objectCache
	) {
		$logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
		parent::__construct( $logger );
	}

	/**
	 * @inheritDoc
	 *
	 * The cache key for the Memcached implementation contains today's
	 * date whenever a date argument is set to a blank string and hence
	 * replaced with its default value. For that reason, the key becomes
	 * orphaned every new day and the getter returns a cache miss.
	 */
	protected function makeFragmentKey( array $functionCall ): string {
		// Remove temporalArgs record for making the Memcached key
		unset( $functionCall['temporalArgs'] );

		return $this->objectCache->makeKey(
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
			$this->objectCache->get( $key )
		);
	}

	/**
	 * @inheritDoc
	 */
	public function setRenderedFragment( array $functionCall, array $value, int $httpStatusCode ): bool {
		$key = $this->makeFragmentKey( $functionCall );

		return $this->objectCache->set(
			$key,
			$value,
			$this->getFragmentTTL( $httpStatusCode )
		);
	}

	/**
	 * @inheritDoc
	 */
	protected function delete( string $key ): bool {
		return $this->objectCache->delete( $key );
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
			return $this->objectCache::TTL_MONTH;
		}

		if (
			( $httpStatusCode >= HttpStatus::INTERNAL_SERVER_ERROR ) ||
			( $httpStatusCode === HttpStatus::TOO_MANY_REQUESTS )
		) {
			return $this->objectCache::TTL_MINUTE;
		}

		return $this->objectCache::TTL_WEEK;
	}
}
