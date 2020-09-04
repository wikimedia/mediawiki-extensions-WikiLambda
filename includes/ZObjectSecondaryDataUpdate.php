<?php
/**
 * WikiLambda ZObject secondary data updater for when ZObjects are edited
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use DataUpdate;
use Title;

class ZObjectSecondaryDataUpdate extends DataUpdate {

	/** @var Title */
	private $title;

	/** @var ZPersistentObject */
	private $zObject;

	public function __construct( Title $title, $zObject ) {
		$this->title = $title;
		$this->zObject = $zObject;
	}

	public function doUpdate() {
		$dbw = wfGetDB( DB_MASTER );

		// TODO: Only re-write the labels if they've changed.

		// TODO: Use a single fancy upsert to remove/update/insert instead?
		$dbw->delete(
			'wikilambda_zobject_labels',
			[ 'wlzl_zobject_zid' => $this->title->getDBkey() ]
		);

		$updates = [];
		foreach ( $this->zObject->getLabels()->getZValue() as $language => $value ) {
			$updates[] = [
				'wlzl_zobject_zid' => $this->title->getDBkey(),
				'wlzl_language' => $language,
				// TODO: This should write the shortform, encoded type (e.g. `Z4(Z6)`)
				"wlzl_type" => $this->zObject->getZType(),
				'wlzl_label' => $value,
				'wlzl_label_normalised' => ZObjectUtils::comparableString( $value )
			];
		}

		$dbw->insert( 'wikilambda_zobject_labels', $updates );
	}
}
