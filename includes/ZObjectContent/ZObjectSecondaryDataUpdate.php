<?php
/**
 * WikiLambda ZObject secondary data updater for when ZObjects are edited
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjectContent;

use MediaWiki\Deferred\DataUpdate;
use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunction;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZType;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Title\Title;
use Psr\Log\LoggerInterface;

class ZObjectSecondaryDataUpdate extends DataUpdate {

	private LoggerInterface $logger;

	public const INSTANCEOFENUM_DB_KEY = 'instanceofenum';

	/**
	 * @param Title $title
	 * @param ZObjectContent $zObject
	 * @param ZObjectStore $zObjectStore
	 * @param MemcachedWrapper $zObjectCache
	 * @param OrchestratorRequest|null $orchestrator
	 */
	public function __construct(
		private readonly Title $title,
		private readonly ZObjectContent $zObject,
		private readonly ZObjectStore $zObjectStore,
		private readonly MemcachedWrapper $zObjectCache,
		private ?OrchestratorRequest $orchestrator = null
	) {
		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambda' );
	}

	public function doUpdate() {
		// Given this title, gets ZID
		// Given this zObject, gets ZType
		// 1. Update as needed labels and aliases in wikilambda_zobject_labels for this ZID
		// 2. Update as needed conflicting labels in wikilambda_zobject_label_conflicts for this ZID
		// 3. If appropriate, clear wikilambda_ztester_results for this ZID
		// 4. If appropriate, add entry to wikilambda_zlanguages for this ZID
		// 5. Add related zobjects, if any, to wikilambda_zobject_join for this ZID

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

		// Delete language entries, if appropriate; the Z_LANGUAGE switch branch below repopulates.
		$this->zObjectStore->deleteZLanguageFromLanguagesCache( $zid );

		$labels = $this->zObject->getLabels()->getValueAsList();

		// TODO (T357552): This should write the shortform, encoded type (e.g. `Z881(Z6)`)
		$ztype = $this->zObject->getZType();

		// Store the ZObject in the object cache, for faster retrieval here and (in future) in the orchestrator
		$cacheKey = $this->zObjectCache->makeKey( ZObjectStore::ZOBJECT_CACHE_KEY_PREFIX, $zid );
		$this->logger->debug(
			__METHOD__ . ' writing new ZObject value to cache "' . $zid . '": type "' . $ztype . '".',
			[ 'instance' => $zid, 'type' => $ztype ]
		);
		$cacheResult = $this->zObjectCache->set(
			$cacheKey,
			$this->zObject->getText(),
			$this->zObjectCache::TTL_MONTH
		);
		if ( !$cacheResult ) {
			$this->logger->warning( __METHOD__ . ' failed to cache new ZObject "' . $zid . '".', [ 'zid' => $zid ] );
		}
		if ( $this->orchestrator ) {
			$queryZ2 = $this->zObject->getObject();
			$this->orchestrator->persistToCache( $queryZ2 );
		}

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

		// Compute language codes once for Z_LANGUAGE so they can be folded into the
		// MUL alias set up-front, and re-used by the Z_LANGUAGE switch branch below.
		$languageCodes = [];
		if ( $ztype === ZTypeRegistry::Z_LANGUAGE ) {
			$languageCodes[] = $innerZObject
				->getValueByKey( ZTypeRegistry::Z_LANGUAGE_CODE )->getZValue();
			$secondaryLanguagesObject = $innerZObject
				->getValueByKey( ZTypeRegistry::Z_LANGUAGE_SECONDARYCODES );
			if ( $secondaryLanguagesObject !== null ) {
				'@phan-var ZTypedList $secondaryLanguagesObject';
				foreach ( $secondaryLanguagesObject->getAsArray() as $secondaryLanguage ) {
					// $secondaryLanguage is a ZString but we want the actual string
					$languageCodes[] = $secondaryLanguage->getZValue();
				}
			}
		}

		// Compute the desired wikilambda_zobject_function_join row, if any.
		// Implementations and testers each point to their parent function; other
		// types have no row in this table.
		$expectedFunctionZid = null;
		$expectedFunctionRefType = null;
		if ( $ztype === ZTypeRegistry::Z_IMPLEMENTATION ) {
			$expectedFunctionZid = $innerZObject
				->getValueByKey( ZTypeRegistry::Z_IMPLEMENTATION_FUNCTION )->getZValue();
			$expectedFunctionRefType = $ztype;
		} elseif ( $ztype === ZTypeRegistry::Z_TESTER ) {
			$expectedFunctionZid = $innerZObject
				->getValueByKey( ZTypeRegistry::Z_TESTER_FUNCTION )->getZValue();
			$expectedFunctionRefType = $ztype;
		}

		$conflicts = $this->zObjectStore->findZObjectLabelConflicts( $zid, $ztype, $labels );
		$newLabels = array_filter( $labels, static function ( $value, $lang ) use ( $conflicts ) {
			return !isset( $conflicts[$lang] );
		}, ARRAY_FILTER_USE_BOTH );

		// (T285368) Write aliases in the labels table.
		// (T358737) Add the zid as a fake alias under Z1360/MUL (multi-lingual value).
		// (T343465) For Z_LANGUAGE, also add the language codes as MUL aliases.
		$aliases = $this->zObject->getAliases()->getValueAsList();
		$aliases[ ZLangRegistry::MULTILINGUAL_VALUE ] = array_merge( [ $zid ], $languageCodes );

		// (T300522) Update as needed labels, aliases, and conflicts in place: preserve
		// wlzl_id / wlzlc_id across saves and write only the actual delta. The dominant
		// "no labels changed" case issues zero writes to these tables.
		$this->zObjectStore->synchroniseZObjectLabels( $zid, $ztype, $newLabels, $aliases, $returnType );
		$this->zObjectStore->synchroniseZObjectLabelConflicts( $zid, $conflicts );

		// ========================================================
		// General delete / reconcile actions:
		// ========================================================
		// * (T362248) Reconcile function reference in wikilambda_zobject_function_join in place
		// * Delete related ZObjects from wikilambda_zobject_join table
		$this->zObjectStore->synchroniseZFunctionReference(
			$zid, $expectedFunctionZid, $expectedFunctionRefType
		);
		$this->zObjectStore->deleteRelatedZObjects( $zid );

		// ========================================================
		// Type specific actions:
		// ========================================================
		// * Function:
		//   - clear test results cache
		// * Implementation:
		//   - clear test results cache
		// * Tester:
		//   - clear test results cache
		// * Type:
		//   - remove all instanceofenum from wikilambda_zobject_join table
		// * Language:
		//   - add new language codes to wikilambda_zlanguages
		//     (the MUL aliases for these codes are handled by the up-front labels sync)
		switch ( $ztype ) {
			case ZTypeRegistry::Z_FUNCTION:
				// TODO (T338247): Only clear test results cache for the old revision, not the new one
				$this->zObjectStore->deleteZFunctionFromZTesterResultsCache( $zid );
				break;

			case ZTypeRegistry::Z_IMPLEMENTATION:
				// TODO (T338247): Only clear test results cache for the old revision, not the new one
				$this->zObjectStore->deleteZImplementationFromZTesterResultsCache( $zid );
				break;

			case ZTypeRegistry::Z_TESTER:
				// TODO (T338247): Only clear test results cache for the old revision, not the new one
				$this->zObjectStore->deleteZTesterFromZTesterResultsCache( $zid );
				break;

			case ZTypeRegistry::Z_TYPE:
				// Remove all instanceofenum from wikilambda_zobject_join table
				$this->zObjectStore->deleteRelatedZObjects( null, $zid, self::INSTANCEOFENUM_DB_KEY );
				break;

			case ZTypeRegistry::Z_LANGUAGE:
				// Repopulate wikilambda_zlanguages from the codes computed up front.
				// (The MUL aliases for these codes were folded into the labels sync above.)
				foreach ( $languageCodes as $code ) {
					$this->zObjectStore->insertZLanguageToLanguagesCache( $zid, $code );
				}
				break;

			default:
				// No action.
		}

		// ========================================================
		// General insert actions:
		// ========================================================
		// * Add related ZObjects to wikilambda_zobject_join table
		$relatedZObjects = $this->getRelatedZObjects( $zid, $ztype, $innerZObject );
		if ( count( $relatedZObjects ) > 0 ) {
			$this->zObjectStore->insertRelatedZObjects( $relatedZObjects );
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

		if ( $innerZObject instanceof ZFunctionCall ) {
			return $this->getRelatedZObjectsOfFunctionCall( $zid, $innerZObject );
		}

		return $this->getRelatedZObjectsOfInstance( $zid, $ztype );
	}

	/**
	 * Return all important relations between the given function and others.
	 * Currently returns:
	 * * key:Z7K1: Function
	 *
	 * @param string $zid
	 * @param ZFunctionCall $innerZObject
	 * @return array Array of rows to insert in the join table
	 */
	private function getRelatedZObjectsOfFunctionCall( $zid, $innerZObject ) {
		$relatedZObjects = [];

		// Key:Z7K1: Get function zid
		$functionZid = $innerZObject->getZValue();
		if ( $functionZid ) {
			$relatedZObjects[] = (object)[
				'zid' => $zid,
				'type' => ZTypeRegistry::Z_FUNCTIONCALL,
				'key' => ZTypeRegistry::Z_FUNCTIONCALL_FUNCTION,
				'related_zid' => $functionZid,
				'related_type' => ZTypeRegistry::Z_FUNCTION
			];
		}

		return $relatedZObjects;
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
					'key' => self::INSTANCEOFENUM_DB_KEY,
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
				'key' => self::INSTANCEOFENUM_DB_KEY,
				'related_zid' => $type,
				'related_type' => ZTypeRegistry::Z_TYPE
			];
		}

		return $relatedZObjects;
	}
}
