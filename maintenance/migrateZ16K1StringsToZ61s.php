<?php

/**
 * WikiLambda maintenance script to migrate Z16K1s from strings to Z61 references
 *
 * Updates all
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extensions\WikiLambda\Maintenance;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\Maintenance\Maintenance;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class MigrateZ16K1StringsToZ61s extends Maintenance {
	// TODO (T287153): Once the data is fully migrated, we should remove this
	// script and the fetchAllImplementations method from ZObjectStore

	/**
	 * @var ZObjectStore
	 */
	private $zObjectStore = null;

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( 'Migrates saved ZImplementations to reference a Z61 rather than hard-code a string' );

		$this->addOption(
			'implement',
			'Whether to actually make the changes or (default) just dry-run',
			false,
			false
		);
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		// Construct the ZObjectStore, because ServiceWiring hasn't run
		$services = $this->getServiceContainer();
		$this->zObjectStore = new ZObjectStore(
			$services->getDBLoadBalancerFactory(),
			$services->getTitleFactory(),
			$services->getWikiPageFactory(),
			$services->getRevisionStore(),
			$services->getUserGroupManager(),
			LoggerFactory::getInstance( 'WikiLambda' ),
		);

		$implement = $this->getOption( 'implement' );

		$queryLimit = 10;

		$targets = $this->zObjectStore->fetchAllImplementations();

		$this->output( "Found " . count( $targets ) . " Z14s\n" );

		$offset = 0;

		$updateComment = wfMessage( 'wikilambda-migration-edit-comment' )->inLanguage( 'en' )->text();

		do {
			$contents = $this->zObjectStore->fetchBatchZObjects( array_slice( $targets, $offset, $queryLimit ) );
			$offset += $queryLimit;

			foreach ( $contents as $zid => $persistentObject ) {
				$newValue = null;

				$this->output( "Reviewing $zid: " );

				$zCode = $persistentObject->getInnerZObject()->getValueByKey( 'Z14K3' );

				if ( $zCode === null ) {
					$this->output( "… not using a ZCode!\n" );
					continue;
				}

				$reference = $zCode->getValueByKey( 'Z16K1' );

				if ( $reference instanceof ZReference ) {
					$this->output( "… already a ZReference, success!\n" );
					continue;
				}

				$programmingLanguage = $reference->getValueByKey( 'Z61K1' );

				if ( $programmingLanguage instanceof ZString ) {
					$this->output( "… a hard-coded string " );
					switch ( $programmingLanguage->getSerialized() ) {
						case 'javascript':
							$this->output( "for JS" );
							$newValue = 'Z600';
							break;

						case 'python':
						case 'python-3':
							$this->output( "for Py" );
							$newValue = 'Z610';
							break;

						case 'lua':
							$this->output( "for Lua(!)" );
							$newValue = 'Z620';
							break;

						default:
							$this->output( "but not understood: " . $programmingLanguage );
							continue 2;
					}
				} else {
					$this->output(
						'… but  \'' . var_export( $programmingLanguage, true )
						. "', not a reference or a simple string? Skipping.\n"
					);
					continue;
				}

				if ( !$newValue ) {
					$this->output( "… nothing to do?\n" );
					continue;
				}

				if ( !$implement ) {
					$this->output( ".\n\tWould have updated $zid, changing '$programmingLanguage' to '$newValue'.\n" );
					continue;

				}

				$persistentObject->getInnerZObject()->getValueByKey( 'Z14K3' )
					->setValueByKey( 'Z16K1', new ZReference( $newValue ) );
				$data = json_encode( $persistentObject->getSerialized() );

				$response = $this->zObjectStore->updateZObjectAsSystemUser(
					RequestContext::getMain(),
					/* String ZID */ $zid,
					/* String content */ $data,
					/* Edit summary */ $updateComment,
					/* Update flags */ EDIT_UPDATE
				);

				if ( $response->isOK() ) {
					$this->output( ", now updated!\n" );
				} else {
					$this->output( ", but there was a problem updating:\n" );
					$this->output( "\t" . $response->getErrors() . "\n" );
				}
			}

		} while ( count( $targets ) - $offset > 0 );
	}
}

$maintClass = MigrateZ16K1StringsToZ61s::class;
require_once RUN_MAINTENANCE_IF_MAIN;
