<?php

namespace MediaWiki\Extension\WikiLambda\Maintenance;

use ForeignResourceManager;
use Maintenance;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class ManageForeignResources extends Maintenance {

	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
	}

	public function execute() {
		$frm = new ForeignResourceManager(
			__DIR__ . '/../resources/lib/foreign-resources.yaml',
			__DIR__ . '/../resources/lib'
		);
		return $frm->run( 'update', 'all' );
	}
}

$maintClass = ManageForeignResources::class;
require_once RUN_MAINTENANCE_IF_MAIN;
