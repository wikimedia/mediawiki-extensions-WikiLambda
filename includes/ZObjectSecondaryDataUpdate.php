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
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunction;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZType;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Title\Title;
use Psr\Log\LoggerInterface;
use Wikimedia\ObjectCache\BagOStuff;

class ZObjectSecondaryDataUpdate extends DataUpdate {

	private Title $title;
	private LoggerInterface $logger;
	private ZObjectContent $zObject;
	private ZObjectStore $zObjectStore;
	private BagOStuff $zObjectCache;

	/**
	 * @param Title $title
	 * @param Content $zObject
	 */
	public function __construct( Title $title, $zObject ) {
		$this->title = $title;
		$this->zObject = $zObject;
		$this->zObjectStore = WikiLambdaServices::getZObjectStore();
		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );
		$this->zObjectCache = WikiLambdaServices::getZObjectStash();
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

		// (T380446) If the object is not valid there's nothing useful to do, except log an error and exit.
		if ( !$this->zObject->isValid() ) {
			$zerror = $this->zObject->getErrors();
			$this->logger->error(
				'ZObjectSecondaryDataUpdate unable to process, error thrown',
				[
					'zid' => $zid,
					'message' => $zerror->getMessage()
				]
			);
			return;
		}

		// Object is valid, we go on!

		// Delete all labels: primary ones and aliases
		$this->zObjectStore->deleteZObjectLabelsByZid( $zid );
		$this->zObjectStore->deleteZObjectLabelConflictsByZid( $zid );

		// Delete language entries, if appropriate
		$this->zObjectStore->deleteZLanguageFromLanguagesCache( $zid );

		$labels = $this->zObject->getLabels()->getValueAsList();

		// TODO (T357552): This should write the shortform, encoded type (e.g. `Z881(Z6)`)
		$ztype = $this->zObject->getZType();

		// Store the ZObject in the object cache, for faster retrieval here and (in future) in the orchestrator
		$this->zObjectCache->set(
			ZObjectStore::SERVICE_CACHE_KEY_PREFIX . $zid,
			$this->zObject->getText(),
			$this->zObjectCache::TTL_MONTH
		);

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

		$conflicts = $this->zObjectStore->findZObjectLabelConflicts( $zid, $ztype, $labels );
		$newLabels = array_filter( $labels, static function ( $value, $lang ) use ( $conflicts ) {
			return !isset( $conflicts[$lang] );
		}, ARRAY_FILTER_USE_BOTH );

		$this->zObjectStore->insertZObjectLabels( $zid, $ztype, $newLabels, $returnType );
		$this->zObjectStore->insertZObjectLabelConflicts( $zid, $conflicts );

		// (T285368) Write aliases in the labels table
		$aliases = $this->zObject->getAliases()->getValueAsList();
		// (T358737) Add the zid as fake aliases under Z1360/MUL (multi-lingual value)
		$aliases[ ZLangRegistry::MULTILINGUAL_VALUE ] = [ $zid ];
		if ( count( $aliases ) > 0 ) {
			$this->zObjectStore->insertZObjectAliases( $zid, $ztype, $aliases, $returnType );
		}

		// Save function information in function table, if appropriate
		// TODO (T362248): Have insertZFunctionReference do an update, and only delete if changing the type/target?
		$this->zObjectStore->deleteZFunctionReference( $zid );
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
			$this->zObjectStore->insertZFunctionReference( $zid, $zFunction->getZValue(), $ztype );
		}

		// Delete and restore related ZObjects from wikilambda_zobject_join table:
		$this->zObjectStore->deleteRelatedZObjects( $zid );
		if ( $ztype === ZTypeRegistry::Z_TYPE ) {
			// If object is a type, remove all instanceofenum from wikilambda_zobject_join table:
			$this->zObjectStore->deleteRelatedZObjects( null, $zid, ZObjectStore::INSTANCEOFENUM );
		}
		$relatedZObjects = $this->getRelatedZObjects( $zid, $ztype, $innerZObject );
		if ( count( $relatedZObjects ) > 0 ) {
			$this->zObjectStore->insertRelatedZObjects( $relatedZObjects );
		}

		// If appropriate, clear wikilambda_ztester_results for this ZID
		// TODO (T338247): Only do this for the old revision not the new one.
		switch ( $ztype ) {
			case ZTypeRegistry::Z_FUNCTION:
				$this->zObjectStore->deleteZFunctionFromZTesterResultsCache( $zid );
				break;

			case ZTypeRegistry::Z_IMPLEMENTATION:
				$this->zObjectStore->deleteZImplementationFromZTesterResultsCache( $zid );
				break;

			case ZTypeRegistry::Z_TESTER:
				$this->zObjectStore->deleteZTesterFromZTesterResultsCache( $zid );
				break;

			default:
				// No action.
		}

		// If appropriate, add entry to wikilambda_zlanguages for this ZID
		if ( $ztype === ZTypeRegistry::Z_LANGUAGE ) {
			// Clear old values, if any
			$this->zObjectStore->deleteZLanguageFromLanguagesCache( $zid );

			// Set primary language code
			$targetLanguage = $innerZObject->getValueByKey( ZTypeRegistry::Z_LANGUAGE_CODE )->getZValue();
			$languageCodes = [ $targetLanguage ];
			$this->zObjectStore->insertZLanguageToLanguagesCache( $zid, $targetLanguage );

			// Set secondary language codes, if any
			$secondaryLanguagesObject = $innerZObject->getValueByKey( ZTypeRegistry::Z_LANGUAGE_SECONDARYCODES );
			if ( $secondaryLanguagesObject !== null ) {
				'@phan-var ZTypedList $secondaryLanguagesObject';
				$secondaryLanguages = $secondaryLanguagesObject->getAsArray();

				foreach ( $secondaryLanguages as $key => $secondaryLanguage ) {
					// $secondaryLanguage is a ZString but we want the actual string
					$secondaryLanguageString = $secondaryLanguage->getZValue();
					$languageCodes[] = $secondaryLanguageString;
					$this->zObjectStore->insertZLanguageToLanguagesCache( $zid, $secondaryLanguageString );
				}
			}

			// (T343465) Add the language codes as fake aliases under Z1360/MUL (multi-lingual value)
			$this->zObjectStore->insertZObjectAliases(
				$zid,
				$ztype,
				[ ZLangRegistry::MULTILINGUAL_VALUE => $languageCodes ],
				$returnType
			);
		}
	}

	/**
	 * Return all important relations between the given object and others
	 * to insert in the wikilambda_zobject_join table. The relations are
	 * given by the key. Currently finds relations for:
	 * * Functions/Z8
	 * * Types/Z4
	 * * Instances of enum types
	 *
	 * @param string $zid
	 * @param string $ztype
	 * @param ZObject $innerZObject
	 * @return array Array of rows to insert in the join table
	 */
	private function getRelatedZObjects( $zid, $ztype, $innerZObject ) {
		if ( $innerZObject instanceof ZFunction ) {
			return $this->getRelatedZObjectsOfFunction( $zid, $innerZObject );
		}

		if ( $innerZObject instanceof ZType ) {
			return $this->getRelatedZObjectsOfType( $zid, $innerZObject );
		}

		return $this->getRelatedZObjectsOfInstance( $zid, $ztype );
	}

	/**
	 * Return all important relations between the given function and others.
	 * Currently returns:
	 * * key:Z8K1: Type of every function input
	 * * key:Z8K2: Type of the function output
	 * * key:Z8K3: Test connected to the function
	 * * key:Z8K4: Implementation connected to the function
	 *
	 * @param string $zid
	 * @param ZFunction $innerZObject
	 * @return array Array of rows to insert in the join table
	 */
	private function getRelatedZObjectsOfFunction( $zid, $innerZObject ) {
		$relatedZObjects = [];

		// Key:Z8K1: Get input types
		$inputs = $innerZObject->getValueByKey( ZTypeRegistry::Z_FUNCTION_ARGUMENTS );
		if ( $inputs instanceof ZTypedList ) {
			$inputList = $inputs->getAsArray();
			foreach ( $inputList as $key => $input ) {
				$inputTypeObject = $input->getValueByKey( ZTypeRegistry::Z_ARGUMENTDECLARATION_TYPE );
				$inputTypeString = ZObjectUtils::makeTypeFingerprint( $inputTypeObject->getSerialized() );
				if ( $inputTypeString !== null ) {
					$relatedZObjects[] = (object)[
						'zid' => $zid,
						'type' => ZTypeRegistry::Z_FUNCTION,
						'key' => ZTypeRegistry::Z_FUNCTION_ARGUMENTS,
						'related_zid' => $inputTypeString,
						'related_type' => ZTypeRegistry::Z_TYPE
					];
				}
			}
		}

		// Key:Z8K2: Get output type
		$outputType = $innerZObject->getValueByKey( ZTypeRegistry::Z_FUNCTION_RETURN_TYPE );
		$outputTypeString = ZObjectUtils::makeTypeFingerprint( $outputType->getSerialized() );
		if ( $outputTypeString !== null ) {
			$relatedZObjects[] = (object)[
				'zid' => $zid,
				'type' => ZTypeRegistry::Z_FUNCTION,
				'key' => ZTypeRegistry::Z_FUNCTION_RETURN_TYPE,
				'related_zid' => $outputTypeString,
				'related_type' => ZTypeRegistry::Z_TYPE
			];
		}

		// Key:Z8K3: Get tests
		$tests = $innerZObject->getValueByKey( ZTypeRegistry::Z_FUNCTION_TESTERS );
		if ( $tests instanceof ZTypedList ) {
			$testList = $tests->getAsArray();
			foreach ( $testList as $key => $test ) {
				if ( $test instanceof ZReference && $test->isValid() ) {
					$relatedZObjects[] = (object)[
						'zid' => $zid,
						'type' => ZTypeRegistry::Z_FUNCTION,
						'key' => ZTypeRegistry::Z_FUNCTION_TESTERS,
						'related_zid' => $test->getZValue(),
						'related_type' => ZTypeRegistry::Z_TESTER
					];
				}
			}
		}

		// Key:Z8K4: Get implementations
		$implementations = $innerZObject->getValueByKey( ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS );
		if ( $implementations instanceof ZTypedList ) {
			$implementationList = $implementations->getAsArray();
			foreach ( $implementationList as $key => $implementation ) {
				if ( $implementation instanceof ZReference && $implementation->isValid() ) {
					$relatedZObjects[] = (object)[
						'zid' => $zid,
						'type' => ZTypeRegistry::Z_FUNCTION,
						'key' => ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS,
						'related_zid' => $implementation->getZValue(),
						'related_type' => ZTypeRegistry::Z_IMPLEMENTATION
					];
				}
			}
		}

		return $relatedZObjects;
	}

	/**
	 * Return all important relations between the given type and others.
	 * Currently returns:
	 * * key:Z4K5: Renderer function for the type
	 * * key:Z4K6: Parser function for the type
	 *
	 * @param string $zid
	 * @param ZType $innerZObject
	 * @return array Array of rows to insert in the join table
	 */
	private function getRelatedZObjectsOfType( $zid, $innerZObject ) {
		$relatedZObjects = [];

		// Key:Z4K5: Get renderer function
		$rendererFunction = $innerZObject->getRendererFunction();
		if ( $rendererFunction ) {
			$relatedZObjects[] = (object)[
				'zid' => $zid,
				'type' => ZTypeRegistry::Z_TYPE,
				'key' => ZTypeRegistry::Z_TYPE_RENDERER,
				'related_zid' => $rendererFunction,
				'related_type' => ZTypeRegistry::Z_FUNCTION
			];
		}

		// Key:Z4K6: Get parser function
		$parserFunction = $innerZObject->getParserFunction();
		if ( $parserFunction ) {
			$relatedZObjects[] = (object)[
				'zid' => $zid,
				'type' => ZTypeRegistry::Z_TYPE,
				'key' => ZTypeRegistry::Z_TYPE_PARSER,
				'related_zid' => $parserFunction,
				'related_type' => ZTypeRegistry::Z_FUNCTION
			];
		}

		// Key:instanceofenum: Get all instances of enum type
		if ( $innerZObject->isEnumType() ) {
			// Gather all instances of this type,
			// add them into the table
			$instances = $this->zObjectStore->fetchZidsOfType( $zid );
			foreach ( $instances as $instance ) {
				$relatedZObjects[] = (object)[
					'zid' => $instance,
					'type' => $zid,
					'key' => ZObjectStore::INSTANCEOFENUM,
					'related_zid' => $zid,
					'related_type' => ZTypeRegistry::Z_TYPE
				];
			}
		}

		return $relatedZObjects;
	}

	/**
	 * Return all important relations between arbitrary objects.
	 * Currently returns:
	 * * key:instanceofenum: if the given object is an instance of an enum type.
	 *
	 * @param string $zid
	 * @param string $type
	 * @return array Array of rows to insert in the join table
	 */
	private function getRelatedZObjectsOfInstance( $zid, $type ) {
		$relatedZObjects = [];

		$typeTitle = Title::newFromText( $type, NS_MAIN );
		$typeContent = $this->zObjectStore->fetchZObjectByTitle( $typeTitle );
		if ( !$typeContent ) {
			// Error: type is not found, nothing we can do except log
			$this->logger->warning(
				__METHOD__ . ' failed to update relations for "' . $zid . '": type "' . $type . '" not found',
				[ 'instance' => $zid, 'type' => $type ]
			);
			return [];
		}

		try {
			$typeObject = $typeContent->getInnerZObject();
		} catch ( ZErrorException $e ) {
			// Error: type is not valid, nothing we can do except log
			$this->logger->warning(
				__METHOD__ . ' failed to update relations for "' . $zid . '": type "' . $type . '" not valid',
				[ 'instance' => $zid, 'type' => $type, 'responseError' => $e ]
			);
			return [];
		}

		// Key:instanceofenum: If object is an instance of an Enum type
		if ( $typeObject instanceof ZType && $typeObject->isEnumType() ) {
			$relatedZObjects[] = (object)[
				'zid' => $zid,
				'type' => $type,
				'key' => ZObjectStore::INSTANCEOFENUM,
				'related_zid' => $type,
				'related_type' => ZTypeRegistry::Z_TYPE
			];
		}

		return $relatedZObjects;
	}
}
