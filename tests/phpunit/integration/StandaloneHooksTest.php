<?php

/**
 * WikiLambda integration test suite for hooks which runs "standalone" (i.e. this only runs on our
 * own patches, not others', and so should only be used for tests of our own code that can't be
 * altered by patches in MediaWiki itself or other extensions or skins).
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use FormatJson;
use IDBAccessObject;
use MediaWiki\Deferred\DeferredUpdates;
use MediaWiki\Extension\WikiLambda\Tests\HooksDataPathMock;
use MediaWiki\Extension\WikiLambda\Tests\HooksInsertMock;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataUpdate;
use MediaWiki\Installer\DatabaseUpdater;
use MediaWiki\MediaWikiServices;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Title\Title;
use Wikimedia\Rdbms\SelectQueryBuilder;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Hooks
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContentHandler
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataUpdate
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectStore
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZObject
 * @group Database
 * @group Standalone
 */
class StandaloneHooksTest extends WikiLambdaIntegrationTestCase {

	public function testCreateInitialContent_called() {
		$dataPath = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions/';
		$zidsToLoad = array_filter(
			scandir( $dataPath ),
			static function ( $key ) {
				return (bool)preg_match( '/^Z\d+\.json$/', $key );
			}
		);

		$updater = DatabaseUpdater::newForDB( $this->db );
		HooksInsertMock::createInitialContent( $updater );
		$loadedZids = HooksInsertMock::getFilenames();

		$this->assertSame( sort( $zidsToLoad ), sort( $loadedZids ) );
	}

	/**
	 * @coversNothing
	 */
	public function testAllMediaWikiLanguagesRepresented() {
		$languagesFromMediaWiki = \MediaWiki\Languages\Data\Names::$names;

		$dataPath = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions/naturalLanguages.json';
		$languagesFromWikiLambda = json_decode( file_get_contents( $dataPath ) );

		// This is slightly hacky, but it means that we get a nice print-out of what languages are missing.
		$missingLanguages = [];
		foreach ( $languagesFromMediaWiki as $code => $autonym ) {
			if ( !property_exists( $languagesFromWikiLambda, $code ) ) {
				$missingLanguages[ $code ] = $autonym;
			}
		}
		$this->assertSame( [], $missingLanguages, 'WikiLambda has a ZObject for each language MediaWiki supports' );
	}

	public function testCreateInitialContent_inserted() {
		$updater = DatabaseUpdater::newForDB( $this->db );
		HooksDataPathMock::createInitialContent( $updater );

		// Assert that all ZIDs available in the data directory are loaded in the database
		$res = $this->db->newSelectQueryBuilder()
			 ->select( [ 'page_title' ] )
			 ->from( 'page' )
			 ->where( [ 'page_namespace' => NS_MAIN ] )
			 ->orderBy( 'page_id', SelectQueryBuilder::SORT_DESC )
			 ->caller( __METHOD__ )
			 ->fetchResultSet();

		$loadedZids = [];
		foreach ( $res as $row ) {
			$loadedZids[] = $row->page_title;
		}

		$dataPath = dirname( __DIR__, 1 ) . '/test_data/test_definitions/';
		$zidsToLoad = array_filter(
			scandir( $dataPath ),
			static function ( $key ) {
				return (bool)preg_match( '/^Z\d+\.json$/', $key );
			}
		);

		$zidsToLoad = array_map(
			static function ( $value ) {
				return explode( '.', $value )[0];
			},
			$zidsToLoad
		);

		sort( $zidsToLoad );
		sort( $loadedZids );

		$this->assertSameSize( $zidsToLoad, $loadedZids );
		$this->assertSame( json_encode( $zidsToLoad ), json_encode( $loadedZids ) );
	}

	public function testOnMultiContentSave_nullEdit() {
		// Insert ZTestType
		$this->registerLangs( ZTestType::TEST_LANGS );
		$this->editPage(
			ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'First test insertion', NS_MAIN
		);

		$nullEditStatus = $this->editPage(
			ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'No-op edit', NS_MAIN
		);
		$this->assertTrue( $nullEditStatus->isOK() );
		$this->assertTrue( $nullEditStatus->hasMessage( 'edit-no-change' ) );
	}

	public function testOnMultiContentSave_unlabelled() {
		// Insert ZTestType

		$unlabelledObject = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z4",
		"Z4K1": "Z111",
		"Z4K2": [
			"Z3",
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z111K1",
				"Z3K3": {
					"Z1K1": "Z12",
					"Z12K1": [
						"Z11"
					]
				}
			},
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z111K2",
				"Z3K3": {
					"Z1K1": "Z12",
					"Z12K1": [
						"Z11"
					]
				}
			}
		],
		"Z4K3": "Z111"
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11"
		]
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": [
			"Z31"
		]
	}
}
EOT;

		$status = $this->editPage(
			ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'First test insertion', NS_MAIN
		);

		$this->assertTrue( $status->isOK() );
	}

	public function testOnMultiContentSave_clashingLabels_caught() {
		// Insert ZTestType
		$this->registerLangs( ZTestType::TEST_LANGS );
		$this->editPage(
			ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'First test insertion', NS_MAIN
		);

		// Force deferred updates from other edits so we can conflict with it.
		DeferredUpdates::doUpdates();
		MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->waitForReplication();
		$this->assertSame( [], DeferredUpdates::getPendingUpdates() );

		$secondTitleText = ZTestType::TEST_ZID . '000';
		$secondTitle = Title::newFromText( $secondTitleText, NS_MAIN );
		$this->assertFalse( $secondTitle->exists() );

		$dupeEditStatus = $this->editPage(
			$secondTitleText, ZTestType::TEST_ENCODING, 'Duplicate creation (blocked)', NS_MAIN
		);
		$this->assertFalse( $dupeEditStatus->isOK() );
		$this->assertTrue( $dupeEditStatus->hasMessage( 'wikilambda-labelclash' ) );

		$only_our_errors = static function ( $item ) {
			return $item[0] === 'wikilambda-labelclash';
		};
		$filteredErrors = array_filter( $dupeEditStatus->getErrorsArray(), $only_our_errors );

		$this->assertCount( 2, $filteredErrors );

		// Force re-check so it re-fetches from the DB.
		$this->assertFalse( $secondTitle->exists( IDBAccessObject::READ_LATEST ) );
	}

	public function testOnMultiContentSave_alias() {
		// Insert ZTestType
		$this->registerLangs( ZTestType::TEST_LANGS );
		$this->editPage(
			ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'Insert test object', NS_MAIN
		);

		// Force deferred updates from other edits so we can conflict with it.
		DeferredUpdates::doUpdates();
		MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->waitForReplication();
		$this->assertSame( [], DeferredUpdates::getPendingUpdates() );

		// Check the alias have been inserted in the secondary table
		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->getPrimaryDatabase();
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_language', 'wlzl_label', 'wlzl_label_primary' ] )
			 ->from( 'wikilambda_zobject_labels' )
			 ->where( [ 'wlzl_zobject_zid' => ZTestType::TEST_ZID ] )
			 ->fetchResultSet();

		$this->assertEquals( 5, $res->numRows() );

		$labels = [];
		$expectedLabels = [
			[ "Z4", "Z1002", "Demonstration type" ],
			[ "Z4", "Z1004", "Type pour démonstration" ]
		];
		$aliases = [];
		$expectedAliases = [
			[ "Z4", "Z1002", "Demonstration type alias" ],
			[ "Z4", "Z1002", "Demonstration type second alias" ],
			[ "Z4", "Z1004", "Alias de type pour démonstration" ]
		];

		foreach ( $res as $row ) {
			if ( $row->wlzl_label_primary ) {
				$labels[] = [ $row->wlzl_type, $row->wlzl_language, $row->wlzl_label ];
			} else {
				$aliases[] = [ $row->wlzl_type, $row->wlzl_language, $row->wlzl_label ];
			}
		}

		$this->assertSame( $expectedLabels, $labels );
		$this->assertSame( $expectedAliases, $aliases );

		// Update the page with different aliases and check that
		// they have been updated instead of adding them again
		$updated = json_decode( ZTestType::TEST_ENCODING, true );

		// Change the label
		$updated['Z2K3']['Z12K1'][1]['Z11K2'] = "Edited demonstration type";
		$updated['Z2K4']['Z32K1'][1]['Z31K2'][2] = "Edited demonstration type alias";

		$this->editPage(
			ZTestType::TEST_ZID,
			FormatJson::encode( $updated, true, FormatJson::UTF8_OK ),
			'Insert test object',
			NS_MAIN
		);

		// Force deferred updates from other edits so we can conflict with it.
		DeferredUpdates::doUpdates();
		MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->waitForReplication();
		$this->assertSame( [], DeferredUpdates::getPendingUpdates() );

		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_language', 'wlzl_label', 'wlzl_label_primary' ] )
			 ->from( 'wikilambda_zobject_labels' )
			 ->where( [ 'wlzl_zobject_zid' => ZTestType::TEST_ZID ] )
			 ->fetchResultSet();

		$this->assertEquals( 5, $res->numRows() );

		$labels = [];
		$expectedLabels = [
			[ "Z4", "Z1002", "Edited demonstration type" ],
			[ "Z4", "Z1004", "Type pour démonstration" ]
		];
		$aliases = [];
		$expectedAliases = [
			[ "Z4", "Z1002", "Demonstration type alias" ],
			[ "Z4", "Z1002", "Edited demonstration type alias" ],
			[ "Z4", "Z1004", "Alias de type pour démonstration" ]
		];

		foreach ( $res as $row ) {
			if ( $row->wlzl_label_primary ) {
				$labels[] = [ $row->wlzl_type, $row->wlzl_language, $row->wlzl_label ];
			} else {
				$aliases[] = [ $row->wlzl_type, $row->wlzl_language, $row->wlzl_label ];
			}
		}

		$this->assertSame( $expectedLabels, $labels );
		$this->assertSame( $expectedAliases, $aliases );
	}

	public function testOnMultiContentSave_languageLabels() {
		$this->insertZids( [ 'Z12', 'Z60' ] );

		$selectedLanguages = [ "Z1001", "Z1002", "Z1003", "Z1004", "Z1005", "Z1006" ];

		$services = MediaWikiServices::getInstance();
		$dbLoadFactory = $services->getDBLoadBalancerFactory();
		$revisionRenderer = $services->getRevisionRenderer();
		$wikiPageFactory = $services->getWikiPageFactory();

		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$dataPath = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions';

		foreach ( $selectedLanguages as $key => $languageZid ) {
			// Duplicated logic from insertZids() because to trigger the SecondaryDataUpdate we need the content.

			$contentString = file_get_contents( "$dataPath/$languageZid.json" );

			$status = $this->editPage(
				$languageZid,
				$contentString,
				'Test ZNaturalLanguage creation and label insertion',
				NS_MAIN
			);
			$this->assertTrue( $status->isOK(), "Edit to create $languageZid went through" );

			DeferredUpdates::doUpdates();
			$dbLoadFactory->waitForReplication();

			$title = Title::newFromText( $languageZid, NS_MAIN );
			$content = $handler::makeContent( $contentString, $title );

			$this->assertTrue( $title->exists( IDBAccessObject::READ_LATEST ), "$languageZid should now exist" );

			$slotOutput = $revisionRenderer->getRenderedRevision(
				$wikiPageFactory->newFromTitle( $title )->getRevisionRecord()
			);

			$updates = $handler->getSecondaryDataUpdates( $title, $content, SlotRecord::MAIN, $slotOutput );

			$zobjectUpdates = array_filter( $updates, static function ( $u ) {
				return $u instanceof ZObjectSecondaryDataUpdate;
			} );
			$zobjectUpdates[0]->doUpdate();
		}

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->getPrimaryDatabase();

		// Expect 11 labels – a label in English for all six, and an autonum in the five non-English languages
		$labels = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_language', 'wlzl_label', 'wlzl_label_primary' ] )
			->from( 'wikilambda_zobject_labels' )
			->where( [ 'wlzl_type' => 'Z60', 'wlzl_label_primary' => true ] )
			->fetchResultSet();
		$this->assertEquals( 11, $labels->numRows() );

		// Expect 6 aliases – each language should have its code inserted
		$aliasCodes = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_language', 'wlzl_label', 'wlzl_label_primary' ] )
			->from( 'wikilambda_zobject_labels' )
			->where( [ 'wlzl_type' => 'Z60', 'wlzl_language' => 'Z1360', 'wlzl_label_primary' => false ] )
			->fetchResultSet();
		$this->assertEquals( 6, $aliasCodes->numRows() );

		// Expect that there's exactly one MUL alias for 'en', and it points to Z1002
		$aliasCodes = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_language', 'wlzl_label', 'wlzl_label_primary' ] )
			->from( 'wikilambda_zobject_labels' )
			->where( [ 'wlzl_zobject_zid' => 'Z1002', 'wlzl_language' => 'Z1360', 'wlzl_label_primary' => false ] )
			->fetchResultSet();
		$this->assertSame( 1, $aliasCodes->numRows() );
		$this->assertEquals( 'en', $aliasCodes->current()->wlzl_label );
	}

	public function testOnMultiContentSave_relatedObjects() {
		$this->insertZids( [ 'Z17', 'Z1002' ] );

		$selectedFunctions = [ "Z801", "Z804", "Z820", "Z883", "Z885", "Z889" ];

		$services = MediaWikiServices::getInstance();
		$dbLoadFactory = $services->getDBLoadBalancerFactory();
		$revisionRenderer = $services->getRevisionRenderer();
		$wikiPageFactory = $services->getWikiPageFactory();

		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$dataPath = dirname( __DIR__, 3 ) . '/function-schemata/data/definitions';

		foreach ( $selectedFunctions as $key => $functionZid ) {
			// Duplicated logic from insertZids() because to trigger the SecondaryDataUpdate we need the content.

			$contentString = file_get_contents( "$dataPath/$functionZid.json" );

			$status = $this->editPage(
				$functionZid,
				$contentString,
				'Test ZFunction creation and related object insertion',
				NS_MAIN
			);
			$this->assertTrue( $status->isOK(), "Edit to create $functionZid went through" );

			DeferredUpdates::doUpdates();
			$dbLoadFactory->waitForReplication();

			$title = Title::newFromText( $functionZid, NS_MAIN );
			$content = $handler::makeContent( $contentString, $title );

			$this->assertTrue( $title->exists( IDBAccessObject::READ_LATEST ), "$functionZid should now exist" );

			$slotOutput = $revisionRenderer->getRenderedRevision(
				$wikiPageFactory->newFromTitle( $title )->getRevisionRecord()
			);

			$updates = $handler->getSecondaryDataUpdates( $title, $content, SlotRecord::MAIN, $slotOutput );

			$zobjectUpdates = array_filter( $updates, static function ( $u ) {
				return $u instanceof ZObjectSecondaryDataUpdate;
			} );
			$zobjectUpdates[0]->doUpdate();
		}

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->getPrimaryDatabase();

		// Expect a total of 17 rows
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->fetchResultSet();
		$this->assertSame( 17, $rows->numRows() );
		// And the same when specifying wlzo_main_type and wlzo_related_type in the where clause
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_main_type' => 'Z8', 'wlzo_related_type' => 'Z4' ] )
			->fetchResultSet();
		$this->assertSame( 17, $rows->numRows() );
		// Expect a total of 11 rows for function input argument types
		// Z801: 1; Z804: 2; Z820: 2; Z883: 2; Z885: 1; Z889: 3
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_key' => 'Z8K1' ] )
			->fetchResultSet();
		$this->assertSame( 11, $rows->numRows() );
		// Expect a total of 6 rows for function output types
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_key' => 'Z8K2' ] )
			->fetchResultSet();
		$this->assertSame( 6, $rows->numRows() );
		// Expect the first input type of Z804 to be 'Z881(Z39)'
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_related_zobject' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_main_zid' => 'Z804', 'wlzo_key' => 'Z8K1' ] )
			->fetchResultSet();
		$this->assertSame( 2, $rows->numRows() );
		$this->assertEquals( 'Z881(Z39)', $rows->current()->wlzo_related_zobject );
		// Expect the 2nd input type of Z804 to be 'Z1'
		$rows->next();
		$this->assertEquals( 'Z1', $rows->current()->wlzo_related_zobject );
		// Expect there to be 2 input types of Z883 that are 'Z4'
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_related_zobject' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_main_zid' => 'Z883', 'wlzo_key' => 'Z8K1', 'wlzo_related_zobject' => 'Z4' ] )
			->fetchResultSet();
		$this->assertSame( 2, $rows->numRows() );
		$this->assertEquals( 'Z4', $rows->current()->wlzo_related_zobject );
		$rows->next();
		$this->assertEquals( 'Z4', $rows->current()->wlzo_related_zobject );
		// Expect the output type of Z804 to be 'Z883(Z39,Z1)'
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_related_zobject' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_main_zid' => 'Z804', 'wlzo_key' => 'Z8K2' ] )
			->fetchResultSet();
		$this->assertSame( 1, $rows->numRows() );
		$this->assertEquals( 'Z883(Z39,Z1)', $rows->current()->wlzo_related_zobject );
	}

	public function testUpdateSecondaryTables_inserted() {
		$updater = DatabaseUpdater::newForDB( $this->db );
		HooksDataPathMock::createInitialContent( $updater );

		// The secondary tables have now been populated for all the ZObjects in the mock data path.
		// Count how many Z8s were loaded.
		$res = $this->db->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid' ] )
			->from( 'wikilambda_zobject_labels' )
			->where( [
				'wlzl_type' => 'Z8'
			] )
			->orderBy( 'wlzl_zobject_zid', SelectQueryBuilder::SORT_ASC )
			->caller( __METHOD__ )
			->fetchResultSet();
		$numFunctions = $res->numRows();
		$this->assertSame( 6, $numFunctions );

		// Clear the wikilambda_zobject_join table
		$this->db->newDeleteQueryBuilder()
			->deleteFrom( 'wikilambda_zobject_join' )
			->where( [ true ] )
			->caller( __METHOD__ )->execute();

		// Call updateSecondaryTables to re-populate wikilambda_zobject_join.
		HooksDataPathMock::updateSecondaryTables( $updater, 'Z8' );

		// Confirm that updateSecondaryTables has populated wikilambda_zobject_join with
		// at least one input-type row for each of the functions
		$res = $this->db->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid' ] )
			->distinct()
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_key' => 'Z8K1' ] )
			->caller( __METHOD__ )
			->fetchResultSet();
		$size = $res->numRows();
		$this->assertSame( $size, $numFunctions );

		// Confirm that updateSecondaryTables has populated wikilambda_zobject_join with
		// one output-type row for each of the functions
		$res = $this->db->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_key' => 'Z8K2' ] )
			->caller( __METHOD__ )
			->fetchResultSet();
		$size = $res->numRows();
		$this->assertSame( $size, $numFunctions );
	}

	// TODO (T367015): Test the uncaught behaviour of MultiContentSave when a clash happens too late
	//   for us to stop it.
	// TODO (T367621): Consider moving some tests from StandaloneHooksTest to HooksTest
}
