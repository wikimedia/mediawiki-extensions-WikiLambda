<?php

/**
 * WikiLambda loadAbstractDump maintenance script
 *
 * Loads specified dump of abstract content from production.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020- Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

use MediaWiki\CommentStore\CommentStoreComment;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Maintenance\Maintenance;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Title\Title;
use MediaWiki\Title\TitleFactory;
use MediaWiki\User\User;

$IP = getenv( 'MW_INSTALL_PATH' );
if ( $IP === false ) {
	$IP = __DIR__ . '/../../..';
}
require_once "$IP/maintenance/Maintenance.php";

class LoadAbstractDump extends Maintenance {

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( 'Loads latest abstract pages from a dump directory' );

		$this->addOption(
			'dir',
			'Directory name of the abstract dump',
			false,
			true
		);

		$this->addOption(
			'title',
			'Particular title (e.g. Q123) to load',
			false,
			true
		);

		$this->addOption(
			'from',
			'Loads titles from a lower title range. Must be used with "--to". E.g. "--from Q100 --to Q200"',
			false,
			true
		);

		$this->addOption(
			'to',
			'Loads titles up to an upper title range. Must be used with "--from". E.g. "--from Q100 --to Q200"',
			false,
			true
		);

		$this->addOption(
			'refresh',
			'If present, inserts all files, even the ones that loaded during a previous run and were consequently'
			. ' renamed as "<title>.<revision>.done.json"',
		);
	}

	/**
	 * @inheritDoc
	 */
	public function execute() {
		$services = $this->getServiceContainer();
		$titleFactory = $services->getTitleFactory();

		$dumpDir = $this->getOption( 'dir' );
		if ( !$dumpDir ) {
			$this->fatalError( "Please specify the folder where the cached abstract pages are stored. E.g.:\n"
				. "docker compose exec mediawiki php extensions/WikiLambda/maintenance/loadAbstractDump.php "
				. "--dir abstractcache" );
		}
		$path = dirname( __DIR__ ) . '/' . $dumpDir;

		$indexFile = file_get_contents( "$path/Q0.json" );
		if ( $indexFile === false ) {
			$this->fatalError( "Could not load Q0.json guide file.\n"
				. "The directory must contain the pages downloaded with "
				. "https://gitlab.wikimedia.org/repos/abstract-wiki/abstract-wiki-content-download" );
		}
		$index = json_decode( $indexFile, true );
		$index = is_array( $index ) ? $index : [];

		$pushTitle = $this->getOption( 'title' );
		$pushFrom = $this->getOption( 'from' );
		$pushTo = $this->getOption( 'to' );
		$refresh = $this->hasOption( 'refresh' );

		if ( (bool)$pushFrom !== (bool)$pushTo ) {
			$this->fatalError( 'Both --from and --to must be provided together.' );
		}

		if ( $pushFrom && $pushTo ) {
			$lower = intval( substr( $pushFrom, 1 ) );
			$upper = intval( substr( $pushTo, 1 ) );
			$index = array_filter( $index, static function ( $value, $key ) use ( $lower, $upper ) {
				$titleNum = intval( substr( $key, 1 ) );
				return $titleNum >= $lower && $titleNum <= $upper;
			}, ARRAY_FILTER_USE_BOTH );
		}

		if ( $pushTitle ) {
			if ( array_key_exists( $pushTitle, $index ) ) {
				$revision = $index[$pushTitle];
				$index = [ $pushTitle => $revision ];
			} else {
				$this->fatalError( "The title provided doesn't exist in the directory index" );
			}
		}

		$abstractNamespace = $this->getPrimaryAbstractNamespace();
		$user = User::newSystemUser( User::MAINTENANCE_SCRIPT_USER, [ 'steal' => true ] );
		if ( !$user ) {
			$this->fatalError( 'Unable to create maintenance script user.' );
		}

		$success = 0;
		$errors = [];

		foreach ( $index as $titleText => $revision ) {
			$filename = "$titleText.$revision.json";
			$doneFilename = "$titleText.$revision.done.json";

			// If already processed, skip unless --refresh is requested
			if ( file_exists( "$path/$doneFilename" ) ) {
				if ( $refresh ) {
					$this->output( "$filename was already inserted. Reinserting.\n" );
					$filename = $doneFilename;
				} else {
					$this->output( "$filename was already inserted. Skipping.\n" );
					continue;
				}
			}

			$response = $this->makeEdit(
				$titleFactory,
				$titleText,
				$path,
				$filename,
				$abstractNamespace,
				$user
			);

			if ( $response->isOK ) {
				$success++;
				$this->output( $response->message );

				// Rename file after successful insertion (if needed)
				if ( $filename !== $doneFilename ) {
					rename( "$path/$filename", "$path/$doneFilename" );
				}
			} else {
				$this->error( $response->message );
				$errors[] = $response->message;
			}
		}

		$this->output( "\nDONE!\n" );
		if ( $success > 0 ) {
			$this->output( "$success pages were created or updated successfully.\n" );
		}
		if ( count( $errors ) > 0 ) {
			$this->error( count( $errors ) . " pages failed on creation or update.\n" );
			$this->error( "Failure details:\n" );
			foreach ( $errors as $error ) {
				$this->error( "$error\n" );
			}
		}
	}

	/**
	 * @return int
	 */
	private function getPrimaryAbstractNamespace(): int {
		$namespaces = $this->getConfig()->get( 'WikiLambdaAbstractNamespaces' );
		if ( is_array( $namespaces ) && count( $namespaces ) > 0 ) {
			$keys = array_keys( $namespaces );
			return intval( $keys[0] );
		}

		return NS_MAIN;
	}

	/**
	 * @param TitleFactory $titleFactory
	 * @param string $titleText
	 * @param string $path
	 * @param string $filename
	 * @param int $namespace
	 * @param User $user
	 * @return \stdClass with isOK and message properties
	 */
	private function makeEdit(
		TitleFactory $titleFactory,
		string $titleText,
		string $path,
		string $filename,
		int $namespace,
		User $user
	) {
		$return = (object)[
			'isOK' => true,
			'message' => ''
		];

		$data = file_get_contents( "$path/$filename" );
		if ( !$data ) {
			$return->isOK = false;
			$return->message = "The file $filename was not found in the path $path\n";
			return $return;
		}

		$payload = json_decode( $data, true );
		if ( !is_array( $payload ) || !array_key_exists( 'content', $payload ) || !is_string( $payload['content'] ) ) {
			$return->isOK = false;
			$return->message = "The file $filename does not contain valid abstract dump payload.\n";
			return $return;
		}

		$title = $titleFactory->newFromText( $titleText, $namespace );
		if ( !( $title instanceof Title ) ) {
			$return->isOK = false;
			$return->message = "The title $titleText cannot be loaded: invalid name\n";
			return $return;
		}

		$creating = !$title->exists();

		try {
			$content = new AbstractWikiContent( $payload['content'] );
			if ( !$content->isValidForTitle( $title ) ) {
				$status = $content->getStatus();
				$validationError = 'Unknown validation error';
				if ( $status && method_exists( $status, 'getErrors' ) && count( $status->getErrors() ) > 0 ) {
					$firstError = $status->getErrors()[0];
					$validationError = wfMessage( $firstError['message'], $firstError['params'] )->text();
				}
				$return->isOK = false;
				$return->message = "Problem validating $titleText:\n$validationError\n";
				return $return;
			}
		} catch ( Exception $e ) {
			$return->isOK = false;
			$return->message = "Problem creating AbstractWikiContent for $titleText:\n"
				. $e->getMessage() . "\n";
			return $return;
		}

		$page = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $title );
		$pageUpdater = $page->newPageUpdater( $user );
		$pageUpdater->setContent( SlotRecord::MAIN, $content );

		$summary = wfMessage(
			$creating
				? 'wikilambda-bootstrapcreationeditsummary'
				: 'wikilambda-bootstrapupdatingeditsummary'
		)->inLanguage( 'en' )->text();

		$pageUpdater->saveRevision(
			CommentStoreComment::newUnsavedComment( $summary ),
			EDIT_AUTOSUMMARY
		);

		$status = $pageUpdater->getStatus();
		if ( !$status->isOK() ) {
			$return->isOK = false;
			$firstError = $status->getErrors()[0] ?? null;
			$errorText = $firstError
				? wfMessage( $firstError['message'], $firstError['params'] )->text()
				: 'Unknown page update error';
			$return->message = "Problem " . ( $creating ? 'creating' : 'updating' ) . " $titleText:\n"
				. $errorText . "\n";
			return $return;
		}

		$return->message = ( $creating ? "Created" : "Updated" ) . " $titleText\n";
		return $return;
	}
}

$maintClass = LoadAbstractDump::class;
require_once RUN_MAINTENANCE_IF_MAIN;
