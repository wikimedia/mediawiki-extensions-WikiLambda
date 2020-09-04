<?php
/**
 * WikiLambda ZObject secondary data remover for when ZObjects are deleted
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use DataUpdate;
use Title;

class ZObjectSecondaryDataRemoval extends DataUpdate {

	/** @var Title */
	private $title;

	public function __construct( Title $title ) {
		$this->title = $title;
	}

	public function doUpdate() {
		$dbw = wfGetDB( DB_MASTER );

		$dbw->delete(
			'wikilambda_zobject_labels',
			[ 'wlzl_zobject_zid' => $this->title->getDBkey() ]
		);
	}
}
