<?php

/**
 * WikiLambda maintenance script: migrate the recommended-Wikifunctions list
 * from the legacy interface message MediaWiki:Wikilambda-suggested-functions.json
 * into the CommunityConfiguration provider introduced by T394410.
 *
 * Run once per client-mode wiki after deploying the provider registration.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Maintenance;

use MediaWiki\Maintenance\Maintenance;
use MediaWiki\User\User;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class MigrateSuggestedFunctionsToCommunityConfig extends Maintenance {

	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->requireExtension( 'CommunityConfiguration' );
		$this->addDescription(
			'Migrate MediaWiki:Wikilambda-suggested-functions.json into the '
			. 'WikifunctionsSuggestions CommunityConfiguration provider (T394410).'
		);
		$this->addOption(
			'implement',
			'Actually save the migrated config; omit for a dry run.',
			false,
			false
		);
	}

	/**
	 * @return bool
	 */
	public function execute() {
		$implement = (bool)$this->getOption( 'implement' );

		$legacy = $this->readLegacyList();
		if ( $legacy === null ) {
			$this->output( "No legacy MediaWiki:Wikilambda-suggested-functions.json to import.\n" );
			return true;
		}

		[ $cleaned, $dropped ] = $this->validateAndCap( $legacy );
		if ( $dropped ) {
			$this->output( "Dropped " . count( $dropped ) . " invalid or excess entries: "
				. implode( ', ', $dropped ) . "\n" );
		}
		$this->output( "Importing " . count( $cleaned ) . " ZIDs: "
			. implode( ', ', $cleaned ) . "\n" );

		$services = $this->getServiceContainer();
		$provider = $services
			->getService( 'CommunityConfiguration.ProviderFactory' )
			->newProvider( 'WikifunctionsSuggestions' );

		$currentStatus = $provider->loadValidConfiguration();
		$current = $currentStatus->isOK()
			? array_values( (array)( $currentStatus->getValue()->SuggestedFunctions ?? [] ) )
			: [];
		if ( $current === $cleaned ) {
			$this->output( "CommunityConfiguration value already matches; nothing to do.\n" );
			return true;
		}

		if ( !$implement ) {
			$this->output( "Dry run: would update CommunityConfiguration from ["
				. implode( ', ', $current ) . "] to [" . implode( ', ', $cleaned ) . "].\n"
				. "Re-run with --implement to apply.\n" );
			return true;
		}

		$authority = User::newSystemUser( 'Maintenance script', [ 'steal' => true ] );
		$writeStatus = $provider->alwaysStoreValidConfiguration(
			(object)[ 'SuggestedFunctions' => $cleaned ],
			$authority,
			'Import from MediaWiki:Wikilambda-suggested-functions.json (T394410)'
		);

		if ( !$writeStatus->isOK() ) {
			$this->fatalError( "Failed to save: " . (string)$writeStatus );
		}

		$this->output( "Saved MediaWiki:WikifunctionsSuggestions.json successfully.\n" );
		return true;
	}

	/**
	 * @return string[]|null Raw decoded list, or null if the legacy message is absent/empty.
	 */
	private function readLegacyList(): ?array {
		$msg = wfMessage( 'wikilambda-suggested-functions.json' )->inContentLanguage();
		if ( !$msg->exists() ) {
			return null;
		}
		$raw = trim( $msg->plain() );
		if ( $raw === '' || $raw === 'null' ) {
			return null;
		}
		$decoded = json_decode( $raw, true );
		if ( !is_array( $decoded ) ) {
			$this->fatalError(
				"MediaWiki:Wikilambda-suggested-functions.json is not valid JSON (got: "
				. substr( $raw, 0, 80 ) . ")"
			);
		}
		return $decoded;
	}

	/**
	 * @param array $input
	 * @return array{0: string[], 1: string[]} [ cleaned list, dropped entries ]
	 */
	private function validateAndCap( array $input ): array {
		$cleaned = [];
		$dropped = [];
		foreach ( $input as $entry ) {
			if ( !is_string( $entry ) || !preg_match( '/^Z[1-9]\d*$/', $entry ) ) {
				$dropped[] = is_string( $entry ) ? $entry : '(non-string)';
				continue;
			}
			if ( count( $cleaned ) >= 5 ) {
				$dropped[] = $entry;
				continue;
			}
			$cleaned[] = $entry;
		}
		return [ $cleaned, $dropped ];
	}
}

$maintClass = MigrateSuggestedFunctionsToCommunityConfig::class;
require_once RUN_MAINTENANCE_IF_MAIN;
