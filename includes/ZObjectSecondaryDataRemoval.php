<?php
/**
 * WikiLambda ZObject secondary data remover for when ZObjects are deleted
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use DataUpdate;
use MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry;
use Title;

class ZObjectSecondaryDataRemoval extends DataUpdate {

	/** @var Title */
	private $title;

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

		// Unregister the zid from any of the type-specific caches
		ZObjectRegistry::unregisterZid( $zid );
	}
}
