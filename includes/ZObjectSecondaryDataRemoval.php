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
use MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry;
use MediaWiki\Title\Title;

class ZObjectSecondaryDataRemoval extends DataUpdate {

	private Title $title;

	/**
	 * @inheritDoc
	 */
	public function __construct( Title $title ) {
		$this->title = $title;
	}

	public function doUpdate() {
		$zid = $this->title->getDBkey();

		$zObjectStore = WikiLambdaServices::getZObjectStore();

		$zObjectStore->deleteZObjectLabelsByZid( $zid );
		$zObjectStore->deleteZObjectLabelConflictsByZid( $zid );
		$zObjectStore->deleteZFunctionReference( $zid );
		$zObjectStore->deleteRelatedZObjects( $zid );
		$zObjectStore->deleteZLanguageFromLanguagesCache( $zid );

		// Unregister the zid from any of the type-specific caches
		ZObjectRegistry::unregisterZid( $zid );

		// Drop the ZObject from the object cache, if set
		WikiLambdaServices::getZObjectStash()->delete( ZObjectStore::SERVICE_CACHE_KEY_PREFIX . $zid );
	}
}
