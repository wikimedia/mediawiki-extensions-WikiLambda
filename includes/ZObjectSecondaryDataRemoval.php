<?php
/**
 * WikiLambda ZObject secondary data remover for when ZObjects are deleted
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Deferred\DataUpdate;
use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Title\Title;
use Psr\Log\LoggerInterface;

class ZObjectSecondaryDataRemoval extends DataUpdate {

	private Title $title;
	private MemcachedWrapper $zObjectCache;
	private LoggerInterface $logger;

	/**
	 * @param Title $title
	 * @param ZObjectStore $zObjectStore
	 * @param MemcachedWrapper $zObjectCache
	 */
	public function __construct(
		Title $title,
		private readonly ZObjectStore $zObjectStore,
		MemcachedWrapper $zObjectCache
	) {
		$this->title = $title;
		$this->zObjectCache = $zObjectCache;
		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );
	}

	/**
	 * Main entry point for removing all secondary data related to a ZObject.
	 *
	 * @return void
	 */
	public function doUpdate() {
		$zid = $this->title->getDBkey();

		// Remove all secondary store data for the given ZID.
		$this->zObjectStore->deleteZObjectLabelsByZid( $zid );
		$this->zObjectStore->deleteZObjectLabelConflictsByZid( $zid );
		$this->zObjectStore->deleteZFunctionReference( $zid );
		$this->zObjectStore->deleteRelatedZObjects( $zid );
		$this->zObjectStore->deleteZLanguageFromLanguagesCache( $zid );

		// If the ZObject is an implementation or tester, remove its reference from the function.
		$this->zObjectStore->removeFunctionReferenceIfImplementationOrTester( $zid );

		// Remove all rows where the deleted ZObject is the related_zobject.
		$this->zObjectStore->deleteRelatedZObjects( null, null, null, $zid );

		// Clear tester result caches for this ZID.
		$this->zObjectStore->deleteZFunctionFromZTesterResultsCache( $zid );
		$this->zObjectStore->deleteZImplementationFromZTesterResultsCache( $zid );
		$this->zObjectStore->deleteZTesterFromZTesterResultsCache( $zid );

		// Unregister the ZID from caches and clear object cache.
		ZObjectRegistry::unregisterZid( $zid );
		$cacheKey = $this->zObjectCache->makeKey( ZObjectStore::ZOBJECT_CACHE_KEY_PREFIX, $zid );
		$this->zObjectCache->delete( $cacheKey );
	}
}
