<?php

/**
 * WikiLambda maintenance script to update WikiLambda secondary tables,
 * for ZObjects of a given type.  For each such ZObject, a new instance of
 * ZObjectSecondaryDataUpdate is created and added to DeferredUpdates.
 *
 * The --report option prints secondary table sizes before and after the update.
 *
 * By default, sleeps 5 seconds between the creation of each ZObjectSecondaryDataUpdate.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extensions\WikiLambda\Maintenance;

use GuzzleHttp\Client;
use MediaWiki\Deferred\DeferredUpdates;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataUpdate;
use MediaWiki\Maintenance\Maintenance;
use MediaWiki\Title\Title;
use Wikimedia\Rdbms\IConnectionProvider;
use Wikimedia\Rdbms\SelectQueryBuilder;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class UpdateSecondaryTables extends Maintenance {

	private IConnectionProvider $dbProvider;

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( "Updates WikiLambda secondary tables for each ZObject" .
			" of the given zType. By default, sleeps 5 seconds after the creation of each update." );

		$this->addOption(
			'all',
			'Updates all stored ZObjects',
			false,
			false
		);
		$this->addOption(
			'zType',
			'Updates will be triggered for each ZObject of this type (a ZID)',
			false,
			true
		);
		$this->addOption(
			'verbose',
			"Whether to print the ZID of each ZObject for which updating is done (default: false)",
			false,
			false
		);
		$this->addOption(
			'report',
			"Whether to report table info (number of rows, highest autoincrement column value)" .
			"\n\tbefore and after the updates (default: false)",
			false,
			false
		);
		$this->addOption(
			'dryRun',
			'Whether to just dry-run, without actually making changes (default: false)',
			false,
			false
		);
		$this->addOption(
			'cache',
			'Whether to try to stash the ZObject in the function-orchestrator\'s cache (default: false)',
			false,
			false
		);
		$this->addOption(
			'quick',
			'Do not sleep 5 seconds after the creation of each update (default: false)',
			false,
			false
		);
	}

	/**
	 * @inheritDoc
	 *
	 * Note there is a function updateSecondaryTables in RepoHooks.php that provides similar
	 * functionality (and with code that duplicates part of this, which could not
	 * easily be avoided).
	 */
	public function execute() {
		$services = $this->getServiceContainer();
		$this->dbProvider = $services->getDBLoadBalancerFactory();
		// Build ZObjectStore and ZObject BagOStuff, because ServiceWiring hasn't run
		$zObjectStore = WikiLambdaServices::buildZObjectStore( $services );
		$zObjectCache = WikiLambdaServices::buildZObjectStash( $services );
		$config = $services->getMainConfig();
		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT, $config, $zObjectStore, $zObjectCache );

		$all = $this->getOption( 'all' );
		$zType = $this->getOption( 'zType' );
		$verbose = $this->getOption( 'verbose' );
		$report = $this->getOption( 'report' );
		$dryRun = $this->getOption( 'dryRun' );
		$cache = $this->getOption( 'cache' );
		$quick = $this->getOption( 'quick' );

		if ( $all && $zType ) {
			$this->fatalError( 'The flags "--all" and "--zType <ZID>" should be mutually exclusive:' . "\n"
				. 'Use "--all" to update all existing ZObjects.' . "\n"
				. 'Use "--zType <ZID>" to update all ZObjects of the given type.' );
		}

		if ( !$all && !$zType ) {
			$this->fatalError( 'The script must be called with at least one option, "--all" or "--zType <ZID>:' . "\n"
				. 'Use "--all" to update all existing ZObjects.' . "\n"
				. 'Use "--zType <ZID>" to update all ZObjects of the given type.' );
		}

		if ( $report ) {
			$this->output( "[Number of rows, highest autoincrement column value] before updates:\n" );
			$this->reportTableInfo();
			$this->output( "\n" );
		}

		if ( $all ) {
			$targets = $zObjectStore->fetchAllZids();
		} else {
			$targets = $zObjectStore->fetchZidsOfType( $zType );
		}

		if ( count( $targets ) === 0 ) {
			$this->output( "No ZObjects for which secondary tables need updating\n" );
			return;
		}

		if ( $dryRun ) {
			$this->output( "Would have updated" );
		} else {
			$this->output( "Updating" );
		}
		$this->output( " secondary tables for " . count( $targets ) . " ZObjects\n" );

		// By default, we do not update the orchestrator cache, as we're in a maintenance script and might over-whelm
		$orchestrator = null;
		if ( $cache ) {
			if ( $config->get( 'WikiLambdaPersistBackendCache' ) ) {
				$this->output( "Sending cache updates to the function-orchestrator.\n" );

				$orchestratorHost = $config->get( 'WikiLambdaOrchestratorLocation' );
				$client = new Client( [ "base_uri" => $orchestratorHost ] );
				$orchestrator = new OrchestratorRequest( $client );
			} else {
				$this->output( "ERROR: Cannot send cache updates to the function-orchestrator as it is disabled.\n" );
				$cache = false;
			}
		}

		$offset = 0;
		$queryLimit = 10;
		do {
			$contents = $zObjectStore->fetchBatchZObjects( array_slice( $targets, $offset,
				$queryLimit ) );
			$offset += $queryLimit;

			foreach ( $contents as $zid => $persistentObject ) {
				if ( $verbose ) {
					$this->output( "  $zid\n" );
				}
				if ( $dryRun ) {
					continue;
				}
				$title = Title::newFromText( $zid, NS_MAIN );
				$data = json_encode( $persistentObject->getSerialized() );
				$content = $handler::makeContent( $data, $title );
				$update = new ZObjectSecondaryDataUpdate(
					$title,
					$content,
					$zObjectStore,
					$zObjectCache,
					$orchestrator
				);
				DeferredUpdates::addUpdate( $update );
				if ( !$quick ) {
					sleep( 5 );
				}
			}
			if ( $verbose ) {
				$this->output( "\n" );
			}

		} while ( count( $targets ) - $offset > 0 );

		if ( $report ) {
			// Make sure the updates have happened before reporting table info
			DeferredUpdates::doUpdates();
			$this->output( "\n[Number of rows, highest autoincrement column value] after updates:\n" );
			$this->reportTableInfo();
		}
	}

	/**
	 * Print [Number of rows, highest autoincrement column value] for each secondary table
	 */
	private function reportTableInfo() {
		$this->printTableInfo( 'wikilambda_zobject_join', 'wlzo_id' );
		$this->printTableInfo( 'wikilambda_zlanguages', 'wlzlangs_id' );
		$this->printTableInfo( 'wikilambda_zobject_function_join', 'wlzf_id' );
		$this->printTableInfo( 'wikilambda_zobject_label_conflicts', 'wlzlc_id' );
		$this->printTableInfo( 'wikilambda_zobject_labels', 'wlzl_id' );
		$this->printTableInfo( 'wikilambda_ztester_results', 'wlztr_id' );
	}

	private function printTableInfo( string $tableName, string $columnName ) {
		$tableInfo = $this->getTableInfo( $tableName, $columnName );
		$this->output( "  $tableName: [$tableInfo[0], $tableInfo[1]]\n" );
	}

	private function getTableInfo( string $tableName, string $columnName ): array {
		$dbr = $this->dbProvider->getReplicaDatabase();

		$res = $dbr->newSelectQueryBuilder()
			->select( [ $columnName ] )
			->from( $tableName )
			->orderBy( $columnName, SelectQueryBuilder::SORT_DESC )
			->caller( __METHOD__ )
			->fetchResultSet();

		$size = $res->numRows();
		$highest = 'none';
		if ( $size > 0 ) {
			$highest = $res->fetchRow()[$columnName];
		}

		return [ $size, $highest ];
	}
}

$maintClass = UpdateSecondaryTables::class;
require_once RUN_MAINTENANCE_IF_MAIN;
