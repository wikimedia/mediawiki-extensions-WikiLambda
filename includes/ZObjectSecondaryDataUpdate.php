<?php
/**
 * WikiLambda ZObject secondary data updater for when ZObjects are edited
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use DataUpdate;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
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

		$labels = $this->zObject->getLabels()->getZValue();

		// TODO: This should write the shortform, encoded type (e.g. `Z4(Z6)`)
		$ztype = $this->zObject->getZType();

		$clashes = static::getConflictingLabels( $dbw, $labels, $zid, $ztype );

		$updates = [];
		$clashUpdates = [];
		foreach ( $labels as $language => $value ) {
			if ( isset( $clashes[$language] ) ) {
				$clashUpdates[] = [
					'wlzlc_existing_zid' => $clashes[ $language ],
					'wlzlc_conflicting_zid' => $zid,
					'wlzlc_language' => $language,
				];
			} else {
				$updates[] = [
					'wlzl_zobject_zid' => $zid,
					'wlzl_language' => $language,
					"wlzl_type" => $ztype,
					'wlzl_label' => $value,
					'wlzl_label_normalised' => ZObjectUtils::comparableString( $value )
				];
			}
		}

		$dbw->insert( 'wikilambda_zobject_label_conflicts', $clashUpdates );

		$dbw->insert( 'wikilambda_zobject_labels', $updates );
	}

	public static function getConflictingLabels( $dbr, $labels, $zid, $type ) : array {
		if ( $labels === [] ) {
			return [];
		}

		$labelClashConditions = [];
		foreach ( $labels as $language => $value ) {
			$labelClashConditions[] = $dbr->makeList( [
				'wlzl_language' => $language,
				'wlzl_label' => $value
			], $dbr::LIST_AND );
		}

		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_labels',
			/* SELECT */ [ 'wlzl_zobject_zid', 'wlzl_language' ],
			/* WHERE */ [
				'wlzl_zobject_zid != ' . $dbr->addQuotes( $zid ),
				// TODO: Check against type, once we properly implement that.
				// 'wlzl_type' => $dbr->addQuotes( $type ),
				$dbr->makeList( $labelClashConditions, $dbr::LIST_OR )
			]
		);

		$clashes = [];
		foreach ( $res as $row ) {
			// TODO: What if more than one conflicts with us on each language?
			$clashes[ $row->wlzl_language ] = $row->wlzl_zobject_zid;
		}

		return $clashes;
	}

}
