<?php

/**
 * WikiLambda maintenance script to fix issues with function tester and implementation lists.
 * Fixes three types of issues:
 * 1. Testers/implementations incorrectly referenced by multiple functions
 * 2. Duplicate testers/implementations within a function's Z8K3/Z8K4 lists
 * 3. References to non-existent (deleted) testers/implementations
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Maintenance;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;
use MediaWiki\Maintenance\Maintenance;
use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Rdbms\SelectQueryBuilder;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class FixFunctionTesterImplementationIssues extends Maintenance {

	private IConnectionProvider $dbProvider;
	private const TYPE_CONFIG = [
		'tester' => [
			'key' => ZTypeRegistry::Z_FUNCTION_TESTERS,
			'type' => ZTypeRegistry::Z_TESTER,
			'name' => 'tester'
		],
		'implementation' => [
			'key' => ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS,
			'type' => ZTypeRegistry::Z_IMPLEMENTATION,
			'name' => 'implementation'
		]
	];

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription(
			"Fix issues with function tester and implementation lists: " .
			"incorrect cross-function references, duplicates, and non-existent references."
		);

		$this->addOption(
			'type',
			'Filter by type: "tester" (Z20), "implementation" (Z14), or "all" (default)',
			false,
			true
		);

		$this->addOption(
			'dryRun',
			'Whether to just dry-run, without actually making changes (default: false)',
			false,
			false
		);
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		$services = \MediaWiki\MediaWikiServices::getInstance();
		$this->dbProvider = $services->getConnectionProvider();
		$zObjectStore = WikiLambdaServices::getZObjectStore();

		$typeFilter = $this->getOption( 'type', 'all' );
		$dryRun = $this->getOption( 'dryRun', false );

		$totalFunctions = $zObjectStore->getCountOfTypeInstances( ZTypeRegistry::Z_FUNCTION );
		if ( $totalFunctions === 0 ) {
			$this->output( "No functions found.\n" );
			return;
		}

		// Step 1: Fix testers/implementations incorrectly referenced by multiple functions
		$this->output( "\nStep 1: Checking for testers/implementations referenced by multiple functions...\n" );
		$multiFunctionResults = $this->fixIncorrectFunctionReferences( $zObjectStore, $typeFilter, $dryRun );
		$fixed = $multiFunctionResults['fixed'];
		$errors = $multiFunctionResults['errors'];

		// Step 2 & 3: Fix duplicates and non-existent references (batched)
		$this->output( "\nProcessing $totalFunctions function(s) in batches of 100...\n" );
		$this->output( "Step 2: Fixing duplicates within function lists...\n" );
		$this->output( "Step 3: Removing non-existent testers/implementations...\n" );

		$batchResults = $this->fixDuplicatesAndNonExistentInBatches(
			$zObjectStore,
			$totalFunctions,
			$typeFilter,
			$dryRun
		);
		$fixed += $batchResults['fixed'];
		$errors += $batchResults['errors'];

		$this->printSummary( $fixed, $errors, $dryRun );
	}

	/**
	 * Check if a function has duplicates in a given list (Z8K3 or Z8K4)
	 *
	 * @param \MediaWiki\Extension\WikiLambda\ZObjects\ZObject $innerZObject
	 * @param string $key Z8K3 for testers, Z8K4 for implementations
	 * @return bool
	 */
	private function hasDuplicates( $innerZObject, string $key ): bool {
		$list = $innerZObject->getValueByKey( $key );
		if ( !( $list instanceof ZTypedList ) ) {
			return false;
		}

		$zids = [];
		foreach ( $list->getAsArray() as $item ) {
			if ( $item instanceof ZReference && $item->isValid() ) {
				$zids[] = $item->getZValue();
			}
		}

		$counts = array_count_values( $zids );
		foreach ( $counts as $count ) {
			if ( $count > 1 ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Fix duplicates in a function's tester/implementation lists.
	 * Removes duplicate entries from Z8K3 (testers) and/or Z8K4 (implementations) lists.
	 *
	 * @param \MediaWiki\Extension\WikiLambda\ZObjectStore $zObjectStore
	 * @param \MediaWiki\Context\RequestContext $context
	 * @param string $functionZid
	 * @param array $duplicateInfo Map of type keys that have duplicates
	 * @param bool $dryRun
	 * @return array ['fixed' => int, 'errors' => int]
	 */
	private function fixFunctionWithDuplicates(
		$zObjectStore,
		$context,
		string $functionZid,
		array $duplicateInfo,
		bool $dryRun
	): array {
		try {
			$content = $zObjectStore->fetchZObject( $functionZid );
			if ( !$content || !$content->isValid() ) {
				$this->output( "ERROR: Could not fetch or validate function $functionZid\n" );
				return [ 'fixed' => 0, 'errors' => 1 ];
			}

			$zObject = $content->getZObject();
			$innerZObject = $zObject->getInnerZObject();
			$summaryParts = [];
			$removedZids = [];
			$needsUpdate = false;

			foreach ( array_keys( $duplicateInfo ) as $typeKey ) {
				$config = self::TYPE_CONFIG[$typeKey];
				$list = $innerZObject->getValueByKey( $config['key'] );
				if ( !( $list instanceof ZTypedList ) ) {
					continue;
				}

				$original = $list->getAsArray();
				$result = $this->removeDuplicates( $original );
				$unique = $result['unique'];
				$removed = $result['removed'];

				if ( count( $unique ) < count( $original ) ) {
					$removedCount = count( $original ) - count( $unique );
					$needsUpdate = true;
					$summaryParts[] = "removed $removedCount duplicate {$config['name']}(s)";
					$removedZids[$typeKey] = $removed;

					$innerZObject->setValueByKey(
						$config['key'],
						new ZTypedList(
							ZTypedList::buildType( new ZReference( $config['type'] ) ),
							$unique
						)
					);
				}
			}

			if ( !$needsUpdate ) {
				return [ 'fixed' => 0, 'errors' => 0 ];
			}

			$this->outputFunctionFix( $functionZid, $summaryParts, $removedZids );

			if ( $dryRun ) {
				return [ 'fixed' => 1, 'errors' => 0 ];
			}

			$updatedJson = $zObject->__toString();
			$summary = "Maintenance: " . implode( ", ", $summaryParts );
			$result = $zObjectStore->updateZObjectAsSystemUser( $context, $functionZid, $updatedJson, $summary );

			if ( $result->isOK() ) {
				return [ 'fixed' => 1, 'errors' => 0 ];
			}

			$errorMessage = $result->getErrors() ? $result->getErrors()->getMessage() : 'Unknown error';
			$this->output( "ERROR updating $functionZid: " . $errorMessage . "\n" );
			return [ 'fixed' => 0, 'errors' => 1 ];

		} catch ( \Exception $e ) {
			$this->output( "ERROR processing $functionZid: " . $e->getMessage() . "\n" );
			return [ 'fixed' => 0, 'errors' => 1 ];
		}
	}

	/**
	 * Remove duplicate references from a list, keeping only the first occurrence of each ZID
	 *
	 * @param array $list Array of ZReference objects
	 * @return array ['unique' => array, 'removed' => array]
	 */
	private function removeDuplicates( array $list ): array {
		$seen = [];
		$unique = [];
		$removed = [];

		foreach ( $list as $item ) {
			$zid = $this->extractZid( $item );
			if ( $zid === null ) {
				continue;
			}

			if ( !isset( $seen[$zid] ) ) {
				$seen[$zid] = true;
				$unique[] = $item;
			} elseif ( !in_array( $zid, $removed, true ) ) {
				$removed[] = $zid;
			}
		}

		return [ 'unique' => $unique, 'removed' => $removed ];
	}

	/**
	 * Extract ZID from a reference object
	 *
	 * @param mixed $item
	 * @return string|null
	 */
	private function extractZid( $item ): ?string {
		if ( $item instanceof ZReference && $item->isValid() ) {
			return $item->getZValue();
		}
		if ( is_string( $item ) ) {
			return $item;
		}
		return null;
	}

	/**
	 * Fix testers/implementations that are incorrectly referenced by multiple functions.
	 * Each tester/implementation should only be listed in one function's Z8K3/Z8K4 list.
	 *
	 * @param \MediaWiki\Extension\WikiLambda\ZObjectStore $zObjectStore
	 * @param string $typeFilter
	 * @param bool $dryRun
	 * @return array ['fixed' => int, 'errors' => int]
	 */
	private function fixIncorrectFunctionReferences( $zObjectStore, string $typeFilter, bool $dryRun ): array {
		$dbr = $this->dbProvider->getReplicaDatabase();
		$context = RequestContext::getMain();
		$fixed = 0;
		$errors = 0;

		$incorrectlyReferencedItems = $this->findIncorrectlyReferencedItems( $dbr, $typeFilter );
		if ( count( $incorrectlyReferencedItems ) === 0 ) {
			$this->output( "No testers/implementations found referenced by multiple functions.\n" );
			return [ 'fixed' => 0, 'errors' => 0 ];
		}

		$this->output(
			"Found " .
			count( $incorrectlyReferencedItems ) .
			" tester(s)/implementation(s) referenced by multiple functions.\n"
		);

		foreach ( $incorrectlyReferencedItems as $item ) {
			$result = $this->removeFromWrongFunctions(
				$zObjectStore,
				$context,
				$item,
				$dryRun
			);
			$fixed += $result['fixed'];
			$errors += $result['errors'];
		}

		return [ 'fixed' => $fixed, 'errors' => $errors ];
	}

	/**
	 * Find testers/implementations that are referenced by multiple functions.
	 * Returns items that appear in multiple functions' Z8K3/Z8K4 lists.
	 *
	 * @param \Wikimedia\Rdbms\IReadableDatabase $dbr
	 * @param string $typeFilter
	 * @return array Array of items with their correct and wrong functions
	 */
	private function findIncorrectlyReferencedItems( $dbr, string $typeFilter ): array {
		$queryBuilder = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_related_zobject', 'wlzo_related_type', 'wlzo_main_zid' ] )
			->from( 'wikilambda_zobject_join' )
			->orderBy( 'wlzo_related_zobject', SelectQueryBuilder::SORT_ASC )
			->orderBy( 'wlzo_main_zid', SelectQueryBuilder::SORT_ASC );

		$this->applyTypeFilter( $queryBuilder, $dbr, $typeFilter );

		$res = $queryBuilder->caller( __METHOD__ )->fetchResultSet();

		// Group by tester/implementation to find which functions they appear in
		$itemToFunctions = [];
		foreach ( $res as $row ) {
			$key = $row->wlzo_related_zobject . '|' . $row->wlzo_related_type;
			if ( !isset( $itemToFunctions[$key] ) ) {
				$itemToFunctions[$key] = [
					'zid' => $row->wlzo_related_zobject,
					'type' => $row->wlzo_related_type,
					'functions' => []
				];
			}
			$itemToFunctions[$key]['functions'][] = $row->wlzo_main_zid;
		}

		// Find items referenced by multiple functions and determine correct function
		$incorrectlyReferencedItems = [];
		foreach ( $itemToFunctions as $data ) {
			$uniqueFunctions = array_unique( $data['functions'] );
			if ( count( $uniqueFunctions ) <= 1 ) {
				continue;
			}

			$correctFunction = $this->getCorrectFunction( $dbr, $data['zid'], $data['type'] );
			if ( $correctFunction ) {
				$wrongFunctions = array_diff( $uniqueFunctions, [ $correctFunction ] );
				if ( count( $wrongFunctions ) > 0 ) {
					$incorrectlyReferencedItems[] = [
						'zid' => $data['zid'],
						'type' => $data['type'],
						'correct_function' => $correctFunction,
						'wrong_functions' => $wrongFunctions
					];
				}
			}
		}

		return $incorrectlyReferencedItems;
	}

	/**
	 * Get the correct function for a tester/implementation from wikilambda_zobject_function_join
	 *
	 * @param \Wikimedia\Rdbms\IReadableDatabase $dbr
	 * @param string $testerOrImplZid
	 * @param string $type
	 * @return string|null
	 */
	private function getCorrectFunction( $dbr, string $testerOrImplZid, string $type ): ?string {
		$functionZid = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzf_zfunction_zid' ] )
			->from( 'wikilambda_zobject_function_join' )
			->where( [
				'wlzf_ref_zid' => $testerOrImplZid,
				'wlzf_type' => $type
			] )
			->limit( 1 )
			->caller( __METHOD__ )
			->fetchField();

		return $functionZid ? (string)$functionZid : null;
	}

	/**
	 * Apply type filter to query builder
	 *
	 * @param \Wikimedia\Rdbms\SelectQueryBuilder $queryBuilder
	 * @param \Wikimedia\Rdbms\IReadableDatabase $dbr
	 * @param string $typeFilter
	 */
	private function applyTypeFilter( $queryBuilder, $dbr, string $typeFilter ): void {
		if ( $typeFilter === 'tester' ) {
			$queryBuilder->andWhere( [
				'wlzo_key' => ZTypeRegistry::Z_FUNCTION_TESTERS,
				'wlzo_related_type' => ZTypeRegistry::Z_TESTER
			] );
		} elseif ( $typeFilter === 'implementation' ) {
			$queryBuilder->andWhere( [
				'wlzo_key' => ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS,
				'wlzo_related_type' => ZTypeRegistry::Z_IMPLEMENTATION
			] );
		} else {
			$queryBuilder->andWhere( $dbr->orExpr( [
				$dbr->expr( 'wlzo_key', '=', ZTypeRegistry::Z_FUNCTION_TESTERS ),
				$dbr->expr( 'wlzo_key', '=', ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS )
			] ) );
		}
	}

	/**
	 * Remove a tester/implementation from wrong functions
	 *
	 * @param \MediaWiki\Extension\WikiLambda\ZObjectStore $zObjectStore
	 * @param \MediaWiki\Context\RequestContext $context
	 * @param array $item Item data with zid, type, correct_function, wrong_functions
	 * @param bool $dryRun
	 * @return array ['fixed' => int, 'errors' => int]
	 */
	private function removeFromWrongFunctions( $zObjectStore, $context, array $item, bool $dryRun ): array {
		$fixed = 0;
		$errors = 0;
		$typeName = ( $item['type'] === ZTypeRegistry::Z_TESTER ) ? 'tester' : 'implementation';
		$key = ( $item['type'] === ZTypeRegistry::Z_TESTER )
			? ZTypeRegistry::Z_FUNCTION_TESTERS
			: ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS;

		$this->output(
			"{$item['zid']} ($typeName): should be in {$item['correct_function']}, " .
			"removing from: " . implode( ", ", $item['wrong_functions'] ) . "\n"
		);

		foreach ( $item['wrong_functions'] as $functionZid ) {
			try {
				$result = $this->removeFromFunction(
					$zObjectStore,
					$context,
					$functionZid,
					$item['zid'],
					$key,
					$item['type'],
					$item['correct_function'],
					$typeName,
					$dryRun
				);
				$fixed += $result['fixed'];
				$errors += $result['errors'];
			} catch ( \Exception $e ) {
				$this->output( "  ERROR processing $functionZid: " . $e->getMessage() . "\n" );
				$errors++;
			}
		}

		return [ 'fixed' => $fixed, 'errors' => $errors ];
	}

	/**
	 * Remove a tester/implementation from a specific function
	 *
	 * @param \MediaWiki\Extension\WikiLambda\ZObjectStore $zObjectStore
	 * @param \MediaWiki\Context\RequestContext $context
	 * @param string $functionZid
	 * @param string $testerOrImplZid
	 * @param string $key
	 * @param string $type
	 * @param string $correctFunction
	 * @param string $typeName
	 * @param bool $dryRun
	 * @return array ['fixed' => int, 'errors' => int]
	 */
	private function removeFromFunction(
		$zObjectStore,
		$context,
		string $functionZid,
		string $testerOrImplZid,
		string $key,
		string $type,
		string $correctFunction,
		string $typeName,
		bool $dryRun
	): array {
		$content = $zObjectStore->fetchZObject( $functionZid );
		if ( !$content || !$content->isValid() ) {
			$this->output( "  ERROR: Could not fetch function $functionZid\n" );
			return [ 'fixed' => 0, 'errors' => 1 ];
		}

		$zObject = $content->getZObject();
		$innerZObject = $zObject->getInnerZObject();
		$list = $innerZObject->getValueByKey( $key );

		if ( !( $list instanceof ZTypedList ) ) {
			return [ 'fixed' => 0, 'errors' => 0 ];
		}

		$filtered = array_filter(
			$list->getAsArray(),
			static function ( $item ) use ( $testerOrImplZid ) {
				return !( $item instanceof ZReference && $item->isValid() && $item->getZValue() === $testerOrImplZid );
			}
		);

		if ( count( $filtered ) >= count( $list->getAsArray() ) ) {
			return [ 'fixed' => 0, 'errors' => 0 ];
		}

		$innerZObject->setValueByKey(
			$key,
			new ZTypedList(
				ZTypedList::buildType( new ZReference( $type ) ),
				array_values( $filtered )
			)
		);

		if ( $dryRun ) {
			return [ 'fixed' => 1, 'errors' => 0 ];
		}

		$summary = "Maintenance: removed $testerOrImplZid ($typeName) - belongs to $correctFunction";
		$updatedJson = $zObject->__toString();
		$result = $zObjectStore->updateZObjectAsSystemUser( $context, $functionZid, $updatedJson, $summary );

		if ( $result->isOK() ) {
			return [ 'fixed' => 1, 'errors' => 0 ];
		}

		$errorMessage = $result->getErrors() ? $result->getErrors()->getMessage() : 'Unknown error';
		$this->output( "  ERROR updating $functionZid: " . $errorMessage . "\n" );
		return [ 'fixed' => 0, 'errors' => 1 ];
	}

	/**
	 * Get types to check based on filter
	 *
	 * @param string $typeFilter
	 * @return array
	 */
	private function getTypesToCheck( string $typeFilter ): array {
		if ( $typeFilter === 'tester' ) {
			return [ 'tester' => self::TYPE_CONFIG['tester'] ];
		}
		if ( $typeFilter === 'implementation' ) {
			return [ 'implementation' => self::TYPE_CONFIG['implementation'] ];
		}
		return self::TYPE_CONFIG;
	}

	/**
	 * Output function fix information
	 *
	 * @param string $functionZid
	 * @param array $summaryParts
	 * @param array $removedZids
	 */
	private function outputFunctionFix( string $functionZid, array $summaryParts, array $removedZids ): void {
		$summary = implode( ", ", $summaryParts );
		$this->output( "$functionZid: Maintenance: $summary\n" );

		foreach ( $removedZids as $typeKey => $zids ) {
			if ( count( $zids ) > 0 ) {
				$typeName = self::TYPE_CONFIG[$typeKey]['name'];
				// Check if this is from non-existent removal (summary contains "non-existent")
				$isNonExistent = false;
				foreach ( $summaryParts as $part ) {
					if ( strpos( $part, 'non-existent' ) !== false ) {
						$isNonExistent = true;
						break;
					}
				}
				if ( $isNonExistent ) {
					$this->output( "  Removed non-existent $typeName ZIDs: " . implode( ", ", $zids ) . "\n" );
				} else {
					$this->output( "  Removed $typeName ZIDs: " . implode( ", ", $zids ) . "\n" );
				}
			}
		}
	}

	/**
	 * Fix duplicates and non-existent references in batches
	 *
	 * @param \MediaWiki\Extension\WikiLambda\ZObjectStore $zObjectStore
	 * @param int $totalFunctions Total number of functions to process
	 * @param string $typeFilter
	 * @param bool $dryRun
	 * @return array ['fixed' => int, 'errors' => int]
	 */
	private function fixDuplicatesAndNonExistentInBatches(
		$zObjectStore,
		int $totalFunctions,
		string $typeFilter,
		bool $dryRun
	): array {
		$context = RequestContext::getMain();
		$batchSize = 100;
		$offset = 0;
		$fixed = 0;
		$errors = 0;
		$foundIssues = false;

		while ( $offset < $totalFunctions ) {
			$functionBatch = $this->fetchFunctionBatch( $batchSize, $offset );
			if ( count( $functionBatch ) === 0 ) {
				break;
			}

			$this->output(
				"Processing batch: " . ( $offset + 1 ) . "-" .
				min( $offset + $batchSize, $totalFunctions ) . " of $totalFunctions...\n"
			);

			foreach ( $functionBatch as $functionZid ) {
				try {
					$content = $zObjectStore->fetchZObject( $functionZid );
					if ( !$content || !$content->isValid() ) {
						continue;
					}

					// Check for duplicates
					$duplicateInfo = $this->checkForDuplicates( $content, $typeFilter );
					if ( count( $duplicateInfo ) > 0 ) {
						$result = $this->fixFunctionWithDuplicates(
							$zObjectStore,
							$context,
							$functionZid,
							$duplicateInfo,
							$dryRun
						);
						if ( $result['fixed'] > 0 ) {
							$foundIssues = true;
							// Re-fetch after fixing duplicates to check for non-existent
							$content = $zObjectStore->fetchZObject( $functionZid );
							if ( !$content || !$content->isValid() ) {
								continue;
							}
						}
						$fixed += $result['fixed'];
						$errors += $result['errors'];
					}

					// Check for non-existent references
					$result = $this->fixFunctionNonExistentReferences(
						$zObjectStore,
						$context,
						$content,
						$functionZid,
						$typeFilter,
						$dryRun
					);
					if ( $result['fixed'] > 0 ) {
						$foundIssues = true;
					}
					$fixed += $result['fixed'];
					$errors += $result['errors'];
				} catch ( \Exception $e ) {
					$this->output( "ERROR processing $functionZid: " . $e->getMessage() . "\n" );
					$errors++;
				}
			}

			$offset += $batchSize;

			// Sleep briefly between batches to avoid overwhelming the database
			if ( $offset < $totalFunctions ) {
				sleep( 1 );
			}
		}

		if ( !$foundIssues ) {
			$this->output( "No duplicates or non-existent testers/implementations found.\n" );
		}

		return [ 'fixed' => $fixed, 'errors' => $errors ];
	}

	/**
	 * Check if a function has duplicates (used during batching)
	 *
	 * @param \MediaWiki\Extension\WikiLambda\ZObjectContent $content
	 * @param string $typeFilter
	 * @return array Map of type keys that have duplicates
	 */
	private function checkForDuplicates( $content, string $typeFilter ): array {
		$innerZObject = $content->getZObject()->getInnerZObject();
		$duplicateInfo = [];
		$typesToCheck = $this->getTypesToCheck( $typeFilter );

		foreach ( $typesToCheck as $typeKey => $config ) {
			if ( $this->hasDuplicates( $innerZObject, $config['key'] ) ) {
				$duplicateInfo[$typeKey] = true;
			}
		}

		return $duplicateInfo;
	}

	/**
	 * Fix non-existent references in a function's tester/implementation lists
	 *
	 * @param \MediaWiki\Extension\WikiLambda\ZObjectStore $zObjectStore
	 * @param \MediaWiki\Context\RequestContext $context
	 * @param \MediaWiki\Extension\WikiLambda\ZObjectContent $content Already-fetched function content
	 * @param string $functionZid Function ZID for logging/updates
	 * @param string $typeFilter
	 * @param bool $dryRun
	 * @return array ['fixed' => int, 'errors' => int]
	 */
	private function fixFunctionNonExistentReferences(
		$zObjectStore,
		$context,
		$content,
		string $functionZid,
		string $typeFilter,
		bool $dryRun
	): array {
		$zObject = $content->getZObject();
		$innerZObject = $zObject->getInnerZObject();
		$summaryParts = [];
		$removedZids = [];
		$needsUpdate = false;
		$typesToCheck = $this->getTypesToCheck( $typeFilter );

		foreach ( $typesToCheck as $typeKey => $config ) {
			$list = $innerZObject->getValueByKey( $config['key'] );
			if ( !( $list instanceof ZTypedList ) ) {
				continue;
			}

			$original = $list->getAsArray();
			$valid = [];
			$removed = [];

			foreach ( $original as $item ) {
				if ( !( $item instanceof ZReference && $item->isValid() ) ) {
					// Keep invalid references as-is (they'll be handled elsewhere)
					$valid[] = $item;
					continue;
				}

				$zid = $item->getZValue();
				if ( $this->zObjectExists( $zObjectStore, $zid ) ) {
					$valid[] = $item;
				} else {
					$removed[] = $zid;
				}
			}

			if ( count( $removed ) > 0 ) {
				$removedCount = count( $removed );
				$needsUpdate = true;
				$summaryParts[] = "removed $removedCount non-existent {$config['name']}(s)";
				$removedZids[$typeKey] = $removed;

				$innerZObject->setValueByKey(
					$config['key'],
					new ZTypedList(
						ZTypedList::buildType( new ZReference( $config['type'] ) ),
						$valid
					)
				);
			}
		}

		if ( !$needsUpdate ) {
			return [ 'fixed' => 0, 'errors' => 0 ];
		}

		$this->outputFunctionFix( $functionZid, $summaryParts, $removedZids );

		if ( $dryRun ) {
			return [ 'fixed' => 1, 'errors' => 0 ];
		}

		$updatedJson = $zObject->__toString();
		$summary = "Maintenance: " . implode( ", ", $summaryParts );
		$result = $zObjectStore->updateZObjectAsSystemUser( $context, $functionZid, $updatedJson, $summary );

		if ( $result->isOK() ) {
			return [ 'fixed' => 1, 'errors' => 0 ];
		}

		$errorMessage = $result->getErrors() ? $result->getErrors()->getMessage() : 'Unknown error';
		$this->output( "ERROR updating $functionZid: " . $errorMessage . "\n" );
		return [ 'fixed' => 0, 'errors' => 1 ];
	}

	/**
	 * Check if a ZObject exists in the database
	 *
	 * @param \MediaWiki\Extension\WikiLambda\ZObjectStore $zObjectStore
	 * @param string $zid
	 * @return bool
	 */
	private function zObjectExists( $zObjectStore, string $zid ): bool {
		$content = $zObjectStore->fetchZObject( $zid );
		return $content && $content->isValid();
	}

	/**
	 * Fetch a batch of function ZIDs from the database
	 *
	 * @param int $limit Number of functions to fetch
	 * @param int $offset Offset for pagination
	 * @return string[] Array of function ZIDs
	 */
	private function fetchFunctionBatch( int $limit, int $offset ): array {
		$dbr = $this->dbProvider->getReplicaDatabase();
		return $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid' ] )
			->distinct()
			->from( 'wikilambda_zobject_labels' )
			->where( [
				'wlzl_type' => ZTypeRegistry::Z_FUNCTION
			] )
			->orderBy( 'wlzl_zobject_zid', SelectQueryBuilder::SORT_ASC )
			->limit( $limit )
			->offset( $offset )
			->caller( __METHOD__ )
			->fetchFieldValues();
	}

	/**
	 * Print summary of fixes
	 *
	 * @param int $fixed
	 * @param int $errors
	 * @param bool $dryRun
	 */
	private function printSummary( int $fixed, int $errors, bool $dryRun ): void {
		$this->output( "\n" );
		if ( $dryRun ) {
			$this->output( "DRY RUN: Would have fixed $fixed function(s).\n" );
		} else {
			$this->output( "Fixed $fixed function(s).\n" );
		}
		if ( $errors > 0 ) {
			$this->output( "Encountered $errors error(s).\n" );
		}
	}
}

$maintClass = FixFunctionTesterImplementationIssues::class;
require_once RUN_MAINTENANCE_IF_MAIN;
