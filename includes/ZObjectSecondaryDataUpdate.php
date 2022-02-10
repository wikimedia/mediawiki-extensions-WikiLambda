<?php
/**
 * WikiLambda ZObject secondary data updater for when ZObjects are edited
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Content;
use DataUpdate;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
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

		// TODO (T300522): Only re-write the labels if they've changed.
		// TODO (T300522): Use a single fancy upsert to remove/update/insert instead?

		$zid = $this->title->getDBkey();

		$zObjectStore = WikiLambdaServices::getZObjectStore();

		// Deletes all labels: primary ones and aliases
		$zObjectStore->deleteZObjectLabelsByZid( $zid );
		$zObjectStore->deleteZObjectLabelConflictsByZid( $zid );

		$labels = $this->zObject->getLabels()->getValueAsList();

		// TODO: This should write the shortform, encoded type (e.g. `Z4(Z6)`)
		$ztype = $this->zObject->getZType();

		// (T262089) Save output type in labels table for function and function call
		$returnType = null;
		// Get Z_FUNCTION_RETURN_TYPE if the ZObject is a Z8 Function
		if ( $ztype === ZTypeRegistry::Z_FUNCTION ) {
			$returnRef = $this->zObject->getInnerZObject()->getValueByKey( ZTypeRegistry::Z_FUNCTION_RETURN_TYPE );
			if ( $returnRef instanceof ZReference ) {
				$returnType = $returnRef->getZValue();
			}
		}
		// Get saved Z_FUNCTION_RETURN_TYPE of the Z_FUNCTIONCALL_FUNCTION if it's a Z7
		if ( $ztype === ZTypeRegistry::Z_FUNCTIONCALL ) {
			$functionRef = $this->zObject->getInnerZObject()->getValueByKey( ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION );
			if ( $functionRef instanceof ZReference ) {
				$returnType = $zObjectStore->fetchZFunctionReturnType( $functionRef->getZValue() );
			}
		}

		$conflicts = $zObjectStore->findZObjectLabelConflicts( $zid, $ztype, $labels );
		$newLabels = array_filter( $labels, static function ( $value, $lang ) use ( $conflicts ) {
			return !isset( $conflicts[$lang] );
		}, ARRAY_FILTER_USE_BOTH );

		// @phan-suppress-next-line SecurityCheck-SQLInjection
		$zObjectStore->insertZObjectLabels( $zid, $ztype, $newLabels, $returnType );
		// @phan-suppress-next-line SecurityCheck-SQLInjection T290563
		$zObjectStore->insertZObjectLabelConflicts( $zid, $conflicts );

		// (T285368) Write aliases in the labels table
		$aliases = $this->zObject->getAliases()->getValueAsList();
		if ( count( $aliases ) > 0 ) {
			// @phan-suppress-next-line SecurityCheck-SQLInjection
			$zObjectStore->insertZObjectAliases( $zid, $ztype, $aliases, $returnType );
		}

		// Save function information in function table
		if ( $ztype === ZTypeRegistry::Z_IMPLEMENTATION || $ztype === ZTypeRegistry::Z_TESTER ) {
			$zFunction = null;

			if ( $ztype === ZTypeRegistry::Z_IMPLEMENTATION ) {
				$zFunction = $this->zObject->getInnerZObject()->getValueByKey(
					ZTypeRegistry::Z_IMPLEMENTATION_FUNCTION
				);
			} elseif ( $ztype === ZTypeRegistry::Z_TESTER ) {
				$zFunction = $this->zObject->getInnerZObject()->getValueByKey(
					ZTypeRegistry::Z_TESTER_FUNCTION
				);
			}

			if ( $zFunction && $zFunction->getZValue() ) {
				$zObjectStore->deleteZFunctionReference( $zid );
				$zObjectStore->insertZFunctionReference( $zid, $zFunction->getZValue(), $ztype );
			}
		}
	}
}
