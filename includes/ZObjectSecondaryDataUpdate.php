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

use MediaWiki\Content\Content;
use MediaWiki\Deferred\DataUpdate;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Title\Title;

class ZObjectSecondaryDataUpdate extends DataUpdate {

	private Title $title;
	private ZObjectContent $zObject;

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
		// 7. If appropriate, clear wikilambda_ztester_results for this ZID
		// 8. If appropriate, add entry to wikilambda_zlanguages for this ZID
		// 9. Add related zobjects, if any, to wikilambda_zobject_join for this ZID

		// TODO (T300522): Only re-write the labels if they've changed.
		// TODO (T300522): Use a single fancy upsert to remove/update/insert instead?

		$zid = $this->title->getDBkey();

		$zObjectStore = WikiLambdaServices::getZObjectStore();

		// Delete all labels: primary ones and aliases
		$zObjectStore->deleteZObjectLabelsByZid( $zid );
		$zObjectStore->deleteZObjectLabelConflictsByZid( $zid );

		// Delete language entries, if appropriate
		$zObjectStore->deleteZLanguageFromLanguagesCache( $zid );

		$labels = $this->zObject->getLabels()->getValueAsList();

		// TODO (T357552): This should write the shortform, encoded type (e.g. `Z881(Z6)`)
		$ztype = $this->zObject->getZType();

		$innerZObject = $this->zObject->getInnerZObject();

		$returnType = null;
		// (T262089) Save output type in labels table for function and function call
		// Get Z_FUNCTION_RETURN_TYPE if the ZObject is a Z8 Function
		if ( $ztype === ZTypeRegistry::Z_FUNCTION ) {
			$returnRef = $innerZObject->getValueByKey( ZTypeRegistry::Z_FUNCTION_RETURN_TYPE );
			// Fallback, save output type as Object/Z1 to avoid NULL returning functions
			$returnType = ZTypeRegistry::Z_OBJECT;
			if ( ( $returnRef instanceof ZReference ) || ( $returnRef instanceof ZFunctionCall ) ) {
				// ZReference->getZValue returns the reference Zid
				// ZFunctionCall->getZValue returns the function call function Zid
				$returnType = $returnRef->getZValue();
			}
		}

		$conflicts = $zObjectStore->findZObjectLabelConflicts( $zid, $ztype, $labels );
		$newLabels = array_filter( $labels, static function ( $value, $lang ) use ( $conflicts ) {
			return !isset( $conflicts[$lang] );
		}, ARRAY_FILTER_USE_BOTH );

		$zObjectStore->insertZObjectLabels( $zid, $ztype, $newLabels, $returnType );
		$zObjectStore->insertZObjectLabelConflicts( $zid, $conflicts );

		// (T285368) Write aliases in the labels table
		$aliases = $this->zObject->getAliases()->getValueAsList();
		// (T358737) Add the zid as fake aliases under Z1360/MUL (multi-lingual value)
		$aliases[ ZLangRegistry::MULTILINGUAL_VALUE ] = [ $zid ];
		if ( count( $aliases ) > 0 ) {
			$zObjectStore->insertZObjectAliases( $zid, $ztype, $aliases, $returnType );
		}

		// Save function information in function table, if appropriate
		// TODO (T362248): Have insertZFunctionReference do an update, and only delete if changing the type/target?
		$zObjectStore->deleteZFunctionReference( $zid );
		switch ( $ztype ) {
			case ZTypeRegistry::Z_IMPLEMENTATION:
				$zFunction = $innerZObject->getValueByKey( ZTypeRegistry::Z_IMPLEMENTATION_FUNCTION );
				break;

			case ZTypeRegistry::Z_TESTER:
				$zFunction = $innerZObject->getValueByKey( ZTypeRegistry::Z_TESTER_FUNCTION );
				break;

			default:
				$zFunction = null;
				break;
		}

		if ( $zFunction && $zFunction->getZValue() ) {
			$zObjectStore->insertZFunctionReference( $zid, $zFunction->getZValue(), $ztype );
		}

		// If $zid is a function, record each of its input types and its return type
		$zObjectStore->deleteRelatedZObjects( $zid );
		if ( $ztype === ZTypeRegistry::Z_FUNCTION ) {
			$inputArgumentsObject = $innerZObject->getValueByKey( ZTypeRegistry::Z_FUNCTION_ARGUMENTS );
			'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $inputArgumentsObject';
			if ( $inputArgumentsObject !== null ) {
				$inputArguments = $inputArgumentsObject->getAsArray();
				foreach ( $inputArguments as $key => $inputArgument ) {
					$inputTypeObject = $inputArgument->getValueByKey( ZTypeRegistry::Z_ARGUMENTDECLARATION_TYPE );
					$inputTypeString = ZObjectUtils::makeTypeFingerprint( $inputTypeObject->getSerialized() );
					if ( $inputTypeString !== null ) {
						$zObjectStore->insertRelatedZObjects( $zid, $ztype,
							ZTypeRegistry::Z_FUNCTION_ARGUMENTS,
							$inputTypeString, ZTypeRegistry::Z_TYPE );
					}
				}
			}
			// Here we report more return type cases than above; use new vars to avoid confusion
			$returnTypeObject = $innerZObject->getValueByKey(
				ZTypeRegistry::Z_FUNCTION_RETURN_TYPE );
			$returnTypeString = ZObjectUtils::makeTypeFingerprint( $returnTypeObject->getSerialized() );
			if ( $returnTypeString !== null ) {
				$zObjectStore->insertRelatedZObjects( $zid, $ztype,
					ZTypeRegistry::Z_FUNCTION_RETURN_TYPE,
					$returnTypeString, ZTypeRegistry::Z_TYPE );
			}
		}

		// If appropriate, clear wikilambda_ztester_results for this ZID
		// TODO (T338247): Only do this for the old revision not the new one.
		switch ( $ztype ) {
			case ZTypeRegistry::Z_FUNCTION:
				$zObjectStore->deleteZFunctionFromZTesterResultsCache( $zid );
				break;

			case ZTypeRegistry::Z_IMPLEMENTATION:
				$zObjectStore->deleteZImplementationFromZTesterResultsCache( $zid );
				break;

			case ZTypeRegistry::Z_TESTER:
				$zObjectStore->deleteZTesterFromZTesterResultsCache( $zid );
				break;

			default:
				// No action.
		}

		// If appropriate, add entry to wikilambda_zlanguages for this ZID
		if ( $ztype === ZTypeRegistry::Z_LANGUAGE ) {
			// Clear old values, if any
			$zObjectStore->deleteZLanguageFromLanguagesCache( $zid );

			// Set primary language code
			$targetLanguage = $innerZObject->getValueByKey( ZTypeRegistry::Z_LANGUAGE_CODE )->getZValue();
			$languageCodes = [ $targetLanguage ];
			$zObjectStore->insertZLanguageToLanguagesCache( $zid, $targetLanguage );

			// Set secondary language codes, if any
			$secondaryLanguagesObject = $innerZObject->getValueByKey( ZTypeRegistry::Z_LANGUAGE_SECONDARYCODES );
			if ( $secondaryLanguagesObject !== null ) {
				'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $secondaryLanguagesObject';
				$secondaryLanguages = $secondaryLanguagesObject->getAsArray();

				foreach ( $secondaryLanguages as $key => $secondaryLanguage ) {
					// $secondaryLanguage is a ZString but we want the actual string
					$secondaryLanguageString = $secondaryLanguage->getZValue();
					$languageCodes[] = $secondaryLanguageString;
					$zObjectStore->insertZLanguageToLanguagesCache( $zid, $secondaryLanguageString );
				}
			}

			// (T343465) Add the language codes as fake aliases under Z1360/MUL (multi-lingual value)
			$zObjectStore->insertZObjectAliases(
				$zid,
				$ztype,
				[ ZLangRegistry::MULTILINGUAL_VALUE => $languageCodes ],
				$returnType
			);
		}
	}
}
