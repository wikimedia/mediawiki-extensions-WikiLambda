<?php

/**
 * WikiLambda loadPreDefinedObject maintenance script
 *
 * Loads specified pre-defined Object, range of Objects, or all pre-defined Objects into the database.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

use MediaWiki\Extension\WikiLambda\Diff\ZObjectDiffer;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Json\FormatJson;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Maintenance\Maintenance;
use MediaWiki\Title\Title;
use MediaWiki\Title\TitleFactory;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class LoadPreDefinedObject extends Maintenance {

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( 'Loads a specified pre-defined Object into the database' );

		$this->addOption(
			'zid',
			'Loads the requested ZID. E.g. "--zid Z100"',
			false,
			true
		);

		$this->addOption(
			'from',
			'Loads the objects from a lower range. Must be used along with "--to". E.g. "--from Z100 --to Z200"',
			false,
			true
		);

		$this->addOption(
			'to',
			'Loads the objects till an upper range. Must be used along with "--from". E.g. "--from Z100 --to Z200"',
			false,
			true
		);

		$this->addOption(
			'all',
			'Loads all built-in objects, from Z1 to Z9999.',
			false,
			false
		);

		$this->addOption(
			'force',
			'Forces the load even if the Object already exists (clears the Object)',
			false,
			false
		);

		$this->addOption(
			'merge',
			'Updates the objects but keeps the multilingual data untouched',
			false,
			false
		);

		$this->addOption(
			'builtin',
			'On merge conflicts, automatically defaults to restoring builtin values',
			false,
			false
		);

		$this->addOption(
			'current',
			'On merge conflicts, automatically defaults to keeping the current values',
			false,
			false
		);

		$this->addOption(
			'wait',
			'Sleeps the given time (in ms) between inserts',
			false,
			true
		);
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		// Validate and collect arguments
		[
			$all,
			$from,
			$to,
			$force,
			$merge,
			$builtin,
			$current,
			$wait
		] = $this->getOptions();

		// Construct the ZObjectStore, because ServiceWiring hasn't run
		$services = $this->getServiceContainer();
		$titleFactory = $services->getTitleFactory();
		$zObjectStore = new ZObjectStore(
			$services->getDBLoadBalancerFactory(),
			$services->getTitleFactory(),
			$services->getWikiPageFactory(),
			$services->getRevisionStore(),
			$services->getUserGroupManager(),
			LoggerFactory::getInstance( 'WikiLambda' ),
			$services->getMainConfig(),
		);

		// Base path:
		$path = dirname( __DIR__ ) . '/function-schemata/data/definitions/';

		// Get dependencies file
		$dependencies = [];
		$dependenciesFile = file_get_contents( $path . 'dependencies.json' );
		if ( $dependenciesFile === false ) {
			$this->fatalError(
				'Could not load dependencies file from function-schemata sub-repository of the WikiLambda extension.'
				. ' Have you initiated & fetched it? Try `git submodule update --init --recursive`.'
			);
		}
		$dependenciesIndex = json_decode( $dependenciesFile, true );

		// Get data files
		$initialDataToLoadListing = array_filter(
			scandir( $path ),
			static function ( $key ) use ( $from, $to ) {
				if ( preg_match( '/^Z(\d+)\.json$/', $key, $match ) ) {
					if ( $match[1] >= $from && $match[1] <= $to ) {
						return true;
					}
				}
				return false;
			}
		);

		// Get zids to load
		$zidsToLoad = array_map(
			static function ( string $filename ): string {
				return substr( $filename, 0, -5 );
			},
			$initialDataToLoadListing
		);

		// Naturally sort, so Z2 gets created before Z12 etc.
		natsort( $zidsToLoad );

		$success = 0;
		$failure = 0;
		$skipped = 0;

		foreach ( $zidsToLoad as $zid ) {
			// Gather dependencies
			$dependencies = array_merge( $dependencies, $dependenciesIndex[ $zid ] ?? [] );

			// Make edit
			$response = $this->makeEdit(
				$zid,
				$path,
				$titleFactory,
				$zObjectStore,
				$force,
				$merge,
				$builtin,
				$current
			);

			// Wait requested ms
			usleep( $wait * 1000 );

			switch ( $response ) {
				case 1:
					$success++;
					break;

				case -1:
					$failure++;
					break;

				case 0:
					$skipped++;
					break;

				default:
					throw new RuntimeException( 'Unrecognised return value!' );
			}
		}

		$this->output( "\nDone!\n" );

		if ( $success > 0 ) {
			$this->output( "> $success objects were created or updated successfully.\n" );
		}

		if ( $skipped > 0 ) {
			$this->output( "> $skipped objects were skipped.\n" );
		}

		if ( $failure > 0 ) {
			$this->fatalError( "> $failure objects failed to create or update.\n" );
		}

		// Print dependency warning if one zid or a partial range were inserted
		if ( !$all ) {
			// Unique zids:
			$dependencies = array_unique( $dependencies );
			// Exclude inserted zids:
			$dependencies = array_filter( $dependencies, static function ( string $item ) use ( $zidsToLoad ) {
				return !in_array( $item, $zidsToLoad );
			} );
			// Sort naturally:
			natsort( $dependencies );
			// Output dependency notice:
			if ( count( $dependencies ) > 0 ) {
				$this->output( "\nMake sure the following dependencies are inserted and up to date:\n" );
				$this->output( implode( ', ', $dependencies ) . "\n" );
			}
		}
	}

	/**
	 * Pushes the given object with the version available in the
	 * zobject builtin data definitions directory. If the object is
	 * already available, forces a full override or merges with the
	 * current data depending on the --force or --merge flags
	 *
	 * @param string $zid
	 * @param string $path
	 * @param TitleFactory $titleFactory
	 * @param ZObjectStore $zObjectStore
	 * @param bool $force
	 * @param bool $merge
	 * @param bool $builtin
	 * @param bool $current
	 * @return int 1=success, -1=failure, 0=skipped
	 */
	private function makeEdit(
		string $zid,
		string $path,
		TitleFactory $titleFactory,
		ZObjectStore $zObjectStore,
		bool $force,
		bool $merge,
		bool $builtin,
		bool $current
	) {
		$data = file_get_contents( $path . $zid . '.json' );
		// If no data in builtins folder, return error
		if ( !$data ) {
			$this->error( 'The ZObject "' . $zid . '" was not found in the definitions folder.' );
			return -1;
		}

		$title = $titleFactory->newFromText( $zid, NS_MAIN );
		// If title is invalid, return error
		if ( !( $title instanceof Title ) ) {
			$this->error( 'The ZObject title "' . $zid . '" could not be loaded somehow; invalid name?' );
			return -1;
		}

		$mergeSummary = '';
		$creating = !$title->exists();
		// If the object already exists:
		if ( !$creating ) {
			// Get current ZObjectContent, returns false if not found
			$oldContent = $zObjectStore->fetchZObjectByTitle( $title );

			// If merge flag is passed, merge builtin and current versions
			if ( $merge && $oldContent ) {
				'@phan-var ZObjectContent $oldContent';
				// 1. Automatic merge; multilingual data, tests, implementations, etc.
				$data = $this->mergeData( $oldContent, $data );
				// 2. Supervised merge; check the diff and prompt user for confirmation
				[ $data, $conflicts ] = $this->resolveConflicts( $zid, $oldContent, $data, $builtin, $current );
				// Set summary with number of resolved conflicts (if any)
				if ( $conflicts > 0 ) {
					$mergeSummary = "($conflicts conflicts)";
				}
			}

			// If no merge and no force flags are passed, exit
			if ( !$force && !$merge ) {
				$this->error( 'The ZObject "' . $zid . '" already exists and --force or --merge were not set.' );
				return 0;
			}
		}

		$summary = wfMessage(
			$creating
				? 'wikilambda-bootstrapcreationeditsummary'
				: 'wikilambda-bootstrapupdatingeditsummary'
		)->inLanguage( 'en' )->text();

		// We create or update the ZObject
		try {
			$return = $zObjectStore->pushZObject( $zid, $data, $summary );
			$this->output( ( $creating ? 'Created' : 'Updated' ) . " $zid $mergeSummary\n" );
			return 1;
		} catch ( ZErrorException $e ) {
			$this->error( "Problem " . ( $creating ? 'creating' : 'updating' ) . " $zid:" );
			$this->error( $e->getMessage() );
			$this->error( $e->getZErrorMessage() );
			$this->error( "\n" );
			return -1;
		} catch ( Exception $e ) {
			$this->error( "Problem " . ( $creating ? 'creating' : 'updating' ) . " $zid:" );
			$this->error( $e->getMessage() );
			$this->error( $e->getTraceAsString() );
			$this->error( "\n" );
			return -1;
		}
	}

	/**
	 * Automatic merge of current object (old) and builtin version (new).
	 * This keeps all the data that we know we need to keep from the
	 * current stored object, which includes:
	 * - For every object: multilingual data
	 * - For functions: list of tests and implementations
	 * - For types: type functions (equality, validator, renderer, parser
	 *   and lists of converters from/to code)
	 *
	 * @param ZObjectContent $oldContent
	 * @param string $data
	 * @return string
	 */
	private function mergeData( $oldContent, $data ) {
		$parsedData = FormatJson::parse( $data );
		$newObject = $parsedData->getValue();
		$oldObject = $oldContent->getObject();

		// 1. Keep whole Z2K3/Name key
		$newObject->Z2K3 = $oldObject->Z2K3;

		// 2. Keep whole Z2K4/Aliases key (if any)
		if ( property_exists( $oldObject, 'Z2K4' ) ) {
			$newObject->Z2K4 = $oldObject->Z2K4;
		}

		// 3. Keep whole Z2K5/Description key (if any)
		if ( property_exists( $oldObject, 'Z2K5' ) ) {
			$newObject->Z2K5 = $oldObject->Z2K5;
		}

		// 4. Keep type-specific content
		$type = $oldObject->Z2K2->Z1K1;
		switch ( $type ) {
			// 4.a: For types:
			case 'Z4':
				// 4.a.1: For each key, keep whole content of Z3K3/Key label:
				foreach ( $oldObject->Z2K2->Z4K2 as $index => $oldKey ) {
					// Skip benjamin array type item
					if ( $index === 0 ) {
						continue;
					}
					$newObject->Z2K2->Z4K2[ $index ]->Z3K3 = $oldKey->Z3K3;
				}

				// 4.a.2: Keep current validator/Z4K3, equality/Z4K4, renderer/Z4K5 and parser/Z4K6
				if ( property_exists( $oldObject->Z2K2, 'Z4K3' ) ) {
					$newObject->Z2K2->Z4K3 = $oldObject->Z2K2->Z4K3;
				}
				if ( property_exists( $oldObject->Z2K2, 'Z4K4' ) ) {
					$newObject->Z2K2->Z4K4 = $oldObject->Z2K2->Z4K4;
				}
				if ( property_exists( $oldObject->Z2K2, 'Z4K5' ) ) {
					$newObject->Z2K2->Z4K5 = $oldObject->Z2K2->Z4K5;
				}
				if ( property_exists( $oldObject->Z2K2, 'Z4K6' ) ) {
					$newObject->Z2K2->Z4K6 = $oldObject->Z2K2->Z4K6;
				}

				// 4.a.3: Keep current converters (Z4K7 and Z4K8)
				if ( property_exists( $oldObject->Z2K2, 'Z4K7' ) ) {
					$newObject->Z2K2->Z4K7 = $oldObject->Z2K2->Z4K7;
				}
				if ( property_exists( $oldObject->Z2K2, 'Z4K8' ) ) {
					$newObject->Z2K2->Z4K8 = $oldObject->Z2K2->Z4K8;
				}

				break;

			// 4.b: For functions:
			case 'Z8':
				// 4.b.1: For each arg, keep whole content of Z17K3/Input label:
				foreach ( $oldObject->Z2K2->Z8K1 as $index => $oldArg ) {
					// Skip benjamin array type item
					if ( $index === 0 ) {
						continue;
					}
					$newObject->Z2K2->Z8K1[ $index ]->Z17K3 = $oldArg->Z17K3;
				}

				// 4.b.2: Keep current list of tests/Z8K3
				$newObject->Z2K2->Z8K3 = $oldObject->Z2K2->Z8K3;

				// 4.b.3: Keep current list of implementations/Z8K4
				$newObject->Z2K2->Z8K4 = $oldObject->Z2K2->Z8K4;

				break;

			// For error types: For each key, copy whole Z3K3 key
			case 'Z50':
				foreach ( $oldObject->Z2K2->Z50K1 as $index => $oldKey ) {
					// Skip benjamin array type item
					if ( $index === 0 ) {
						continue;
					}
					$newObject->Z2K2->Z50K1[ $index ]->Z3K3 = $oldKey->Z3K3;
				}
				break;

			default:
				break;
		}

		return FormatJson::encode( $newObject, true, FormatJson::UTF8_OK );
	}

	/**
	 * Supervised merge of current object (old) and builtin version (new).
	 * This tries to merge all other diffs that were not automatically merged
	 * during the mergeData step, and requests input from the user to keep
	 * the current version or restore the builtin value.
	 * The builtin and current flags will automatically run the script without
	 * requesting user input.
	 * Returns a list with the final object encoded as a string, and the count
	 * of resolved conflicts.
	 *
	 * @param string $zid
	 * @param ZObjectContent $oldContent
	 * @param string $data
	 * @param bool $builtin
	 * @param bool $current
	 * @return array list( string: $data, int: $conflicts )
	 */
	private function resolveConflicts( $zid, $oldContent, $data, $builtin, $current ) {
		$differ = new ZObjectDiffer();
		$diffOps = $differ->doDiff(
			/* oldValues: current content stored in the DB */
			json_decode( json_encode( $oldContent->getObject() ), true ),
			/* newValues: content from builtin data to restore */
			json_decode( $data, true )
		);

		$flats = ZObjectDiffer::flattenDiff( $diffOps );
		foreach ( $flats as $diff ) {
			$restoreBuiltin = $builtin;
			// If no --builtin or --current flags were passed, request interactive input
			if ( !$builtin && !$current ) {
				$this->printDiff( $zid, $diff );
				$prompt = $this->prompt( '> Restore to builtin value? (y/n)', 'n' );
				$restoreBuiltin = $prompt === 'y';
			}
			if ( !$restoreBuiltin ) {
				$data = $this->undoChange( $data, $diff );
			}
		}

		// Return new version and count of resolved conflicts
		return [ $data, count( $flats ) ];
	}

	/**
	 * Walk the tree in depth following the keys passed in the path
	 * array, and set the new value when arrive to the leaf. If the
	 * new value is null, unset the key.
	 *
	 * @param array &$object reference to the associative array to mutate
	 * @param array $path array of keys to follow down the object
	 * @param string|array|null $newValue new value to set
	 */
	private function findPropAndSet( &$object, $path, $newValue = null ) {
		$head = array_shift( $path );
		if ( count( $path ) === 0 ) {
			if ( $newValue ) {
				$object[ $head ] = $newValue;
			} else {
				unset( $object[ $head ] );
			}
		} else {
			if ( isset( $object[ $head ] ) ) {
				$this->findPropAndSet( $object[ $head ], $path, $newValue );
			}
		}
	}

	/**
	 * Print the details of the Diff to merge.
	 *
	 * @param string $zid
	 * @param array $diff
	 */
	private function printDiff( $zid, $diff ) {
		$type = $diff[ 'op' ]->getType();
		$oldValue = ( $type === 'change' || $type === 'remove' ) ? $diff[ 'op' ]->getOldValue() : null;
		$newValue = ( $type === 'change' || $type === 'add' ) ? $diff[ 'op' ]->getNewValue() : null;

		$this->output( "> Conflict:\n" );
		$this->output( "  | Zid: $zid\n" );
		$this->output( "  | Path: " . implode( '.', $diff[ 'path' ] ) . "\n" );
		$this->output( "  | Current value: " . json_encode( $oldValue ) . "\n" );
		$this->output( "  | Builtin value: " . json_encode( $newValue ) . "\n" );
	}

	/**
	 * Restores the old value of the Diff operation.
	 *
	 * @param string $data
	 * @param array $diff
	 * @return string
	 */
	private function undoChange( $data, $diff ) {
		$newObject = json_decode( $data, true );
		$path = $diff[ 'path' ];

		$type = $diff[ 'op' ]->getType();
		$oldValue = ( $type === 'change' || $type === 'remove' ) ? $diff[ 'op' ]->getOldValue() : null;

		$this->findPropAndSet( $newObject, $path, $oldValue );

		return FormatJson::encode( $newObject, true, FormatJson::UTF8_OK );
	}

	/**
	 * Validates the options
	 *
	 * @return array
	 */
	private function getOptions() {
		// Get and validate --wait
		$wait = $this->getOption( 'wait' );
		if ( $wait && !is_numeric( $wait ) ) {
			$this->fatalError( 'The flag "--wait" should be used with a numeric value. E.g. "--wait 100"' );
		}

		// Get and validate --force and --merge flags
		$force = $this->getOption( 'force' ) ?? false;
		$merge = $this->getOption( 'merge' ) ?? false;
		if ( $force && $merge ) {
			$this->fatalError( 'The flags "--force" and "--merge" should be mutually exclusive:' . "\n"
				. 'Use "--force" if you want to fully override the existing content with '
				. 'the initial builtin version.' . "\n"
				. 'Use "--merge if you want to re-insert the builtin versions but keep existing '
				. 'multilingual data of every object.' );
		}

		// Get --current and --builtin only if --merge is set to true
		$current = $this->getOption( 'current' ) ?? false;
		$builtin = $this->getOption( 'builtin' ) ?? false;
		if ( !$merge && ( $current || $builtin ) ) {
			$this->fatalError( 'The flags "--current" or "--builtin" should only be used along with "--merge".' );
		}
		if ( $current && $builtin ) {
			$this->fatalError( 'The flags "--current" and "--builtin" should be mutually exclusive:' . "\n"
				. 'Use "--merge --builtin" to automatically default to restoring builtin versions.' . "\n"
				. 'Use "--merge --current" to automatically default to keeping current stored versions.' );
		}

		// Get and validate Zid range to insert:
		$all = $this->getOption( 'all' ) ?? false;
		$from = $this->getOption( 'from' );
		$to = $this->getOption( 'to' );
		$zid = $this->getOption( 'zid' );

		if ( $all ) {
			// --all option overrides any --from and --to passed as arguments
			if ( (bool)$from || (bool)$to || (bool)$zid ) {
				$this->fatalError( 'The flag "--all" should not be used along with "--for", "--to" or "--zid".' );
			}

			$from = 1;
			$to = 9999;
		} elseif ( $zid ) {
			// Remove Z or z
			if ( strtoupper( substr( $zid, 0, 1 ) ) === 'Z' ) {
				$zid = substr( $zid, 1 );
			}

			if ( !is_numeric( $zid ) || $zid < 1 || $zid > 9999 ) {
				$this->fatalError( 'The flag "--zid" must be a number between 1 and 9999.' );
			}

			if ( (bool)$from || (bool)$to ) {
				$this->fatalError( 'The flag "--zid" should not be used along with "--for", "--to" or "--all".' );
			}

			$from = $zid;
			$to = $zid;
		} else {
			// If no --all and no --zid are entered, then --from and --to are mandatory
			if ( (bool)$from xor (bool)$to ) {
				$this->fatalError( 'The flag "--from" must be used with the flag "--to" to set a range.' );
			}

			// Remove Z or z
			if ( strtoupper( substr( $from, 0, 1 ) ) === 'Z' ) {
				$from = substr( $from, 1 );
			}

			// Remove Z or z
			if ( strtoupper( substr( $to, 0, 1 ) ) === 'Z' ) {
				$to = substr( $to, 1 );
			}

			if ( !is_numeric( $from ) || $from < 1 || $from > 9999 ) {
				$this->fatalError( 'The flag "--from" must be followed by a Zid between Z1 and Z9999.' );
			}

			if ( !is_numeric( $to ) || $to < 1 || $to > 9999 ) {
				$this->fatalError( 'The flag "--to" must be followed by a Zid between Z1 and Z9999.' );
			}

			if ( $from > $to ) {
				$this->fatalError( 'The flag "--from" must be lower than the flag "--to".' );
			}
		}

		return [
			$all,
			(int)$from,
			(int)$to,
			$force,
			$merge,
			$builtin,
			$current,
			(int)$wait
		];
	}
}

$maintClass = LoadPreDefinedObject::class;
require_once RUN_MAINTENANCE_IF_MAIN;
