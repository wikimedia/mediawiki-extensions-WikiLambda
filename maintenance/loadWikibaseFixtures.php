<?php

/**
 * WikiLambda loadWikibaseFixtures maintenance script
 *
 * Loads specified pre-defined Object, range of Objects, or all pre-defined Objects into the database.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Maintenance;

use MediaWiki\Context\IContextSource;
use MediaWiki\Context\RequestContext;
use MediaWiki\Maintenance\Maintenance;
use Wikibase\DataModel\Entity\EntityDocument;
use Wikibase\Repo\EditEntity\MediaWikiEditEntityFactory;
use Wikibase\Repo\WikibaseRepo;

$IP = getenv( 'MW_INSTALL_PATH' ) ?: __DIR__ . '/../../..';
require_once "$IP/maintenance/Maintenance.php";

class LoadWikibaseFixtures extends Maintenance {

	/**
	 * @inheritDoc
	 */
	public function __construct() {
		parent::__construct();
		$this->requireExtension( 'WikiLambda' );
		$this->addDescription( 'Load Wikidata JSON files from fixture directory into local Wikibase repo' );

		$this->addOption(
			'path',
			'Directory with the Wikidata fixtures to load',
			false,
			true
		);

		$this->addOption(
			'file',
			'Name of the fixture file to load',
			false,
			true
		);
	}

	/**
	 * To locally test WikibaseClient based features from Abstract Wikipedia, this
	 * maintenance script helps load a collection of wikidata fixtures as Wikibase repo
	 * so that the Wikibase Client configuration can replicate the behavior as if it
	 * were requesting items from the wikidata.org Repo.
	 *
	 * The default fixture directory is in the WikiLambda base repo directory, under
	 * the fixtures/wikidata subdiretory. The script can be called passing as an option
	 * another directory with the option --path.
	 *
	 * E.g.:
	 *
	 * To load from WikiLambda/fixtures/wikidata/*.json
	 * $ php maintenance/run.php ./extensions/WikiLambda/maintenance/loadWikibaseFixtures.php
	 *
	 * To load from another path:
	 * $ php maintenance/run.php \
	 *   ./extensions/WikiLambda/maintenance/loadWikibaseFixtures.php
	 *   --path /path/to/fixtures
	 *
	 * Or with docker environment:
	 * $ docker compose exec mediawiki php maintenance/run.php \
	 *    ./extensions/WikiLambda/maintenance/loadWikibaseFixtures.php
	 *    --path ./relative/path/to/fixtures
	 *
	 *
	 * The fixtures directory must contain:
	 * * One JSON file per Wikidata Item object to insert (or update)
	 * * As a convention, JSON files can be named as qid.json
	 * * Each file must have an Item object like this:
	 *   {
	 *     "type": "item",
	 *     "id": "Q319",
	 *     "labels": {
	 *       "en": { "language": "en", "value": "Jupiter" }
	 *     },
	 *     "descriptions": {
	 *       "en": { "language": "en", "value": "fifth planet in the Solar System and largest among all" }
	 *     }
	 *   }
	 *
	 * By default, all files in the fixtures directory will be inserted in alphabetical
	 * order. To load only one, pass the name with the option --file.
	 *
	 * E.g.:
	 * $ php maintenance/run.php \
	 *   ./extensions/WikiLambda/maintenance/loadWikibaseFixtures.php
	 *   --path /path/to/fixtures
	 *   --file Q319_with_descriptions.json
	 *
	 * @inheritDoc
	 */
	public function execute() {
		$path = $this->getOption( 'path', dirname( __DIR__ ) . '/fixtures/wikidata' );
		$file = $this->getOption( 'file' );

		if ( !is_dir( $path ) ) {
			$this->fatalError( "Path not found: $path" );
		}

		if ( !class_exists( \Wikibase\Repo\WikibaseRepo::class ) ) {
			$this->output( "You need to have Wikibase enabled in order to use this maintenance script!\n" );
			exit;
		}

		$editEntityFactory = WikibaseRepo::getEditEntityFactory();
		$context = RequestContext::getMain();

		// If file was specified in input parameters, only insert that,
		// else get all the JSON files in the directory
		$files = $file ? [ "$path/$file" ] : glob( $path . '/*.json' );
		sort( $files, SORT_STRING );

		if ( !$files ) {
			$this->output( "No fixture files found.\n" );
			return;
		}

		$this->output( "Loading " . count( $files ) . " fixture files...\n" );

		foreach ( $files as $file ) {
			if ( !file_exists( $file ) ) {
				$this->error( "File does not exist: $file" );
				continue;
			}

			// Read and decode file
			$json = json_decode( file_get_contents( $file ), true );

			if ( !$json ) {
				$this->error( "Invalid file format: $file" );
				continue;
			}

			// Deserialize Wikidata JSON file content into EntityDocument
			$entity = $this->deserializeEntity( $json );

			if ( !$entity instanceof EntityDocument ) {
				$this->error( "Invalid entity in $file" );
				continue;
			}

			// Make sure the fixture has an entity Id
			$entityId = $entity->getId();

			if ( !$entityId ) {
				$this->error( "Missing entity ID in $file" );
				continue;
			}

			// Check whether it exists or not
			$entityExists = WikibaseRepo::getEntityLookup()->getEntity( $entityId ) !== null;

			// And save or update
			$saved = $this->saveEntity(
				$entity,
				$context,
				$editEntityFactory,
				$entityExists
			);

			$saveMsg = $entityExists ? 'Updating' : 'Importing';
			$resultMsg = $saved ? '✅ Done!' : '❌ Failed! ';
			$this->output( "> $saveMsg $entityId: $resultMsg\n" );
		}

		$this->output( "Done.\n" );
	}

	/**
	 * Uses WikibaseRepo deserialization pipeline to convert the JSON object
	 * from the fixture file into an EntityDocument that can be stored using
	 * the MediaWikiEditEntityFactory
	 *
	 * @param array $data
	 * @return ?EntityDocument
	 */
	private function deserializeEntity( array $data ): ?EntityDocument {
		$deserializerFactory = WikibaseRepo::getBaseDataModelDeserializerFactory();
		$deserializer = $deserializerFactory->newEntityDeserializer();
		return $deserializer->deserialize( $data );
	}

	/**
	 * Given an already deserialized entity, save it (or update it) using
	 * the Wikibase Repo MediaWikiEditEntityFactory. Returns a boolean flag
	 * that indicates whether the edit was done successfully or not
	 *
	 * @param EntityDocument $entity
	 * @param IContextSource $context
	 * @param MediaWikiEditEntityFactory $editEntityFactory
	 * @param bool $entityExists
	 * @return bool
	 */
	private function saveEntity(
		EntityDocument $entity,
		IContextSource $context,
		MediaWikiEditEntityFactory $editEntityFactory,
		bool $entityExists
	): bool {
		$editEntity = $editEntityFactory->newEditEntity( $context );

		$status = $editEntity->attemptSave(
			$entity,
			'Import Wikidata fixture',
			$entityExists ? EDIT_UPDATE : EDIT_NEW,
			false
		);

		if ( !$status->isOK() ) {
			$this->error( $status );
			return false;
		}

		return true;
	}
}

$maintClass = LoadWikibaseFixtures::class;
require_once RUN_MAINTENANCE_IF_MAIN;
