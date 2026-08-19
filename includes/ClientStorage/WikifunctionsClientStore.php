<?php
/**
 * WikiLambda Data Access Object service
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ClientStorage;

use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Logger\LoggerFactory;
use Psr\Log\LoggerInterface;

class WikifunctionsClientStore {

	private MemcachedWrapper $objectCache;
	private LoggerInterface $logger;

	public function __construct() {
		// Non-injected items
		// This can't be injected, as the service container runs before the extension is loaded
		$this->objectCache = WikiLambdaServices::getMemcachedWrapper();

		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
	}

	/**
	 * Requests the given ZObject from the ZObject cache, given its ZID.
	 * Returns null if the ZID is not available in the cache.
	 *
	 * This is the same as the first part of the ZObjectStore::fetchZObject() method, but without the
	 * repo-mode follow-up for reading from the wiki, as it's for client wikis.
	 *
	 * @param string $zid
	 * @return ?array
	 */
	public function fetchFromZObjectCache( string $zid ): ?array {
		$cacheKey = $this->objectCache->makeKey( ZObjectStore::ZOBJECT_CACHE_KEY_PREFIX, $zid );

		$cachedObject = $this->objectCache->get( $cacheKey );
		if ( !$cachedObject ) {
			$this->logger->info( __METHOD__ . ' cache miss while fetching {zid}', [ 'zid' => $zid ] );
			return null;
		}

		$json = json_decode( $cachedObject, true );
		if ( !$json ) {
			$this->logger->warning( __METHOD__ . ' failed parse of cached JSON for {zid}', [ 'zid' => $zid ] );
		}

		// Return successfully parsed JSON, or null
		return $json;
	}
}
