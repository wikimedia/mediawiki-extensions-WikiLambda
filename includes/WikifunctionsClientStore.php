<?php
/**
 * WikiLambda Data Access Object service
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Title\Title;
use Psr\Log\LoggerInterface;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\Rdbms\IConnectionProvider;

class WikifunctionsClientStore {

	private IConnectionProvider $dbProvider;
	private BagOStuff $objectCache;

	private LoggerInterface $logger;

	public const CLIENT_FUNCTIONCALL_CACHE_KEY_PREFIX = 'WikiLambdaClientFunctionCall';

	/**
	 * @param IConnectionProvider $dbProvider
	 */
	public function __construct( IConnectionProvider $dbProvider ) {
		$this->dbProvider = $dbProvider;

		// This can't be injected, as the service container runs before the extension is loaded
		$this->objectCache = WikiLambdaServices::getZObjectStash();

		$this->logger = LoggerFactory::getInstance( 'WikiLambdaClient' );
	}

	/**
	 * Track in wikifunctionsclient_usage the usage of a function on a page.
	 *
	 * @param string $targetFunction
	 * @param Title $targetPage
	 * @return bool
	 */
	public function insertWikifunctionsUsage( string $targetFunction, Title $targetPage ): bool {
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newInsertQueryBuilder()
			->insertInto( 'wikifunctionsclient_usage' )
			->row( [
				'wfcu_targetPage' => $targetPage->getPrefixedText(),
				'wfcu_targetFunction' => $targetFunction,
			] )
			->set( [
				'wfcu_targetFunction' => $targetFunction,
			] )
			->onDuplicateKeyUpdate()
			->uniqueIndexFields( [
				'wfcu_targetPage',
				'wfcu_targetFunction',
			] )
			// We don't mind duplicates (i.e., the same Function is used twice on the same page)
			->ignore()
			->caller( __METHOD__ )->execute();

		return (bool)$dbw->affectedRows();
	}

	/**
	 * Check in wikifunctionsclient_usage the pages on which a function is used.
	 *
	 * @param string $targetFunction
	 * @return array
	 */
	public function fetchWikifunctionsUsage( string $targetFunction ): array {
		$dbr = $this->dbProvider->getReplicaDatabase();
		return $dbr->newSelectQueryBuilder()
			->select( 'wfcu_targetPage' )
			->from( 'wikifunctionsclient_usage' )
			->where( [ 'wfcu_targetFunction' => $targetFunction ] )
			->caller( __METHOD__ )
			->fetchFieldValues();
	}

	/**
	 * Drop tracking in wikifunctionsclient_usage of a page.
	 *
	 * @param Title $targetPage
	 * @return void
	 */
	public function deleteWikifunctionsUsage( Title $targetPage ): void {
		$dbw = $this->dbProvider->getPrimaryDatabase();

		$dbw->newDeleteQueryBuilder()
			->deleteFrom( 'wikifunctionsclient_usage' )
			->where( [ 'wfcu_targetPage' => $targetPage->getDBkey() ] )
			->caller( __METHOD__ )->execute();
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

	/**
	 * Requests the given Function call from the ZObject cache, given its cache key.
	 * Returns null if the Function call is not available in the cache.
	 *
	 * @param array $functionCall
	 * @return string
	 */
	public function makeFunctionCallCacheKey( array $functionCall ): string {
		// Note that we can't use ZObjectUtils::makeCacheKeyFromZObject here, as that's repo-mode only.
		// This means that this cache key doesn't have the revision IDs of the referenced ZObjects.
		return $this->objectCache->makeKey(
			self::CLIENT_FUNCTIONCALL_CACHE_KEY_PREFIX,
			json_encode( $functionCall )
		);
	}

	/**
	 * Store the given Function call in the cache, given its cache key.
	 *
	 * @param string $clientCacheKey
	 * @return ?array{success:bool, value:?string[], errorMessageKey:?string}
	 */
	public function fetchFromFunctionCallCache( string $clientCacheKey ): ?array {
		$cachedValue = $this->objectCache->get( $clientCacheKey );
		if ( !$cachedValue ) {
			$this->logger->info( __METHOD__ . ' cache miss while fetching {key}', [ 'key' => $clientCacheKey ] );
			return null;
		}

		// Check for corrupted/invalid cache entries and delete them rather than returning them
		if ( !is_array( $cachedValue ) ) {
			$this->logger->warning(
				'WikiLambda client cache entry for {key} is mal-formed, deleting it',
				[
					'key' => $clientCacheKey
				]
			);
			$this->objectCache->delete( $clientCacheKey );
			return null;
		}

		if ( !array_key_exists( 'success', $cachedValue ) || !is_bool( $cachedValue['success'] ) ) {
			// Corrupted/invalid cache entry; delete it
			$this->logger->warning(
				'WikiLambda client cache entry for {key} is missing success boolean, deleting it',
				[
					'key' => $clientCacheKey
				]
			);
			$this->objectCache->delete( $clientCacheKey );
			return null;
		}

		if ( $cachedValue['success'] ) {
			if (
				!array_key_exists( 'value', $cachedValue ) ||
				!is_array( $cachedValue['value'] ) ||
				!is_string( $cachedValue['value'][0] )
			) {
				// Corrupted/invalid cache entry; delete it
				$this->logger->warning(
					'WikiLambda client cache entry for {key} is missing value string[], deleting it',
					[
						'key' => $clientCacheKey
					]
				);
				$this->objectCache->delete( $clientCacheKey );
				return null;
			}
			return $cachedValue;
		}

		// We know the success key is false, so we need to check the error message key

		if ( !array_key_exists( 'errorMessageKey', $cachedValue ) || !is_string( $cachedValue['errorMessageKey'] ) ) {
			$this->logger->warning(
				'WikiLambda client cache entry for {key} is missing error message key string, deleting it',
				[
					'key' => $clientCacheKey
				]
			);
			$this->objectCache->delete( $clientCacheKey );
			return null;
		}

		return $cachedValue;
	}
}
