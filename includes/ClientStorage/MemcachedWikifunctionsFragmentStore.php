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
	 */
	public function makeFragmentKey( array $functionCall ): string {
		return $this->objectCache->makeKey(
			self::CLIENT_FUNCTIONCALL_CACHE_KEY_PREFIX,
			json_encode( $functionCall )
		);
	}

	/**
	 * @inheritDoc
	 */
	protected function get( string $key ): mixed {
		return $this->objectCache->get( $key );
	}

	/**
	 * @inheritDoc
	 */
	protected function set( string $key, array $value, int $ttl ): bool {
		return $this->objectCache->set( $key, $value, $ttl );
	}

	/**
	 * @inheritDoc
	 */
	protected function delete( string $key ): bool {
		return $this->objectCache->delete( $key );
	}

	/**
	 * @inheritDoc
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
	 */
	protected function getFragmentTTL( array $value, int $httpStatusCode ): int {
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
