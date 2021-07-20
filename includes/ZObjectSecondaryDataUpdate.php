<?php
/**
 * WikiLambda ZObject secondary data updater for when ZObjects are edited
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Content;
use DataUpdate;
use Title;

class ZObjectSecondaryDataUpdate extends DataUpdate {

	/** @var Title */
	private $title;

	/** @var ZObjectContent */
	private $zObject;

	/**
	 * @param Title $title
	 * @param Content $zObject
	 */
	public function __construct( Title $title, $zObject ) {
		$this->title = $title;
		$this->zObject = $zObject;
	}

	public function doUpdate() {
		// Given this title, gets ZID
		// Given this zObject, gets ZType
		// 1. Delete labels from wikilambda_zobject_labels for this ZID
		// 2. Delete labels from wikilambda_zobject_label_conflicts for this ZID
		// 3. Gets labels from this zObject (Z2K3 of the ZObjectContent)
		// 4. Finds conflicting labels, e.g. existing labels from other ZIDs that have same language-value
		// 5. Saves conflicting labels in wikilambda_zobject_label_conflicts and
		// 6. Saves non-conflicting labels in wikilambda_zobject_labels

		// TODO: Only re-write the labels if they've changed.
		// TODO: Use a single fancy upsert to remove/update/insert instead?

		$zid = $this->title->getDBkey();

		$zObjectStore = WikiLambdaServices::getZObjectStore();

		$zObjectStore->deleteZObjectLabelsByZid( $zid );
		$zObjectStore->deleteZObjectLabelConflictsByZid( $zid );

		$labels = $this->zObject->getLabels()->getZValue();

		// TODO: This should write the shortform, encoded type (e.g. `Z4(Z6)`)
		$ztype = $this->zObject->getZType();

		$conflicts = $zObjectStore->findZObjectLabelConflicts( $zid, $ztype, $labels );
		$newLabels = array_filter( $labels, static function ( $value, $lang ) use ( $conflicts ) {
			return !isset( $conflicts[$lang] );
		}, ARRAY_FILTER_USE_BOTH );

		$zObjectStore->insertZObjectLabels( $zid, $ztype, $newLabels );
		$zObjectStore->insertZObjectLabelConflicts( $zid, $conflicts );

		if ( $ztype === 'Z14' || $ztype === 'Z20' ) {
			$zFunction = null;

			if ( $ztype === 'Z14' ) {
				$zFunction = $this->zObject->getInnerZObject()->getValueByKey( 'Z14K1' );
			} elseif ( $ztype === 'Z20' ) {
				$zFunction = $this->zObject->getInnerZObject()->getValueByKey( 'Z20K1' )->getValueByKey( 'Z7K1' );
			}

			if ( $zFunction && $zFunction->getZValue() ) {
				$zObjectStore->deleteZFunctionReference( $zid );
				$zObjectStore->insertZFunctionReference( $zid, $zFunction->getZValue(), $ztype );
			}
		}
	}
}
