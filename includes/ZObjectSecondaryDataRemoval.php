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
use Title;

class ZObjectSecondaryDataRemoval extends DataUpdate {

	/** @var Title */
	private $title;

	public function __construct( Title $title ) {
		$this->title = $title;
	}

	public function doUpdate() {
		$dbw = wfGetDB( DB_MASTER );

		$zid = $this->title->getDBkey();

		$dbw->delete(
			'wikilambda_zobject_labels',
			[ 'wlzl_zobject_zid' => $zid ]
		);

		$dbw->delete(
			'wikilambda_zobject_label_conflicts',
			$dbw->makeList(
				[
					'wlzlc_existing_zid' => $zid,
					'wlzlc_conflicting_zid' => $zid
				],
				$dbw::LIST_OR
			)
		);
	}
}
