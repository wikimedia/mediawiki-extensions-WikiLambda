<?php

/**
 * WikiLambda integration test suite for hooks which runs "standalone" (i.e. this only runs on our
 * own patches, not others', and so should only be used for tests of our own code that can't be
 * altered by patches in MediaWiki itself or other extensions or skins).
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Deferred\DeferredUpdates;
use MediaWiki\Extension\WikiLambda\OrchestratorRequest;
use MediaWiki\Extension\WikiLambda\Tests\HooksDataPathMock;
use MediaWiki\Extension\WikiLambda\Tests\HooksInsertMock;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataUpdate;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Installer\DatabaseUpdater;
use MediaWiki\Json\FormatJson;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\Title\Title;
use Wikimedia\Rdbms\IDBAccessObject;
use Wikimedia\Rdbms\SelectQueryBuilder;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContentHandler
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataUpdate
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataRemoval
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectStore
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZObject
 * @group Database
 * @group Standalone
 */
class StandaloneHooksTest extends WikiLambdaIntegrationTestCase {
	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testCreateInitialContent_called() {
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions/';
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

		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions/naturalLanguages.json';
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
		$res = $this->getDb()->newSelectQueryBuilder()
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

		$dataPath = dirname( __DIR__, 2 ) . '/test_data/test_definitions/';
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
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
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
		$this->assertSame( [], DeferredUpdates::getPendingUpdates() );

		// Check the alias have been inserted in the secondary table
		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_language', 'wlzl_label', 'wlzl_label_primary' ] )
			 ->from( 'wikilambda_zobject_labels' )
			 ->where( [ 'wlzl_zobject_zid' => ZTestType::TEST_ZID ] )
			 ->fetchResultSet();

		$this->assertEquals( 6, $res->numRows() );

		$labels = [];
		$expectedLabels = [
			[ "Z4", "Z1002", "Demonstration type" ],
			[ "Z4", "Z1004", "Type pour démonstration" ]
		];
		$aliases = [];
		$expectedAliases = [
			[ "Z4", "Z1002", "Demonstration type alias" ],
			[ "Z4", "Z1002", "Demonstration type second alias" ],
			[ "Z4", "Z1004", "Alias de type pour démonstration" ],
			[ "Z4", "Z1360", ZTestType::TEST_ZID ],
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
		$this->assertSame( [], DeferredUpdates::getPendingUpdates() );

		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_language', 'wlzl_label', 'wlzl_label_primary' ] )
			 ->from( 'wikilambda_zobject_labels' )
			 ->where( [ 'wlzl_zobject_zid' => ZTestType::TEST_ZID ] )
			 ->fetchResultSet();

		$this->assertEquals( 6, $res->numRows() );

		$labels = [];
		$expectedLabels = [
			[ "Z4", "Z1002", "Edited demonstration type" ],
			[ "Z4", "Z1004", "Type pour démonstration" ]
		];
		$aliases = [];
		$expectedAliases = [
			[ "Z4", "Z1002", "Demonstration type alias" ],
			[ "Z4", "Z1002", "Edited demonstration type alias" ],
			[ "Z4", "Z1004", "Alias de type pour démonstration" ],
			[ "Z4", "Z1360", ZTestType::TEST_ZID ],
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

		$services = $this->getServiceContainer();
		$revisionRenderer = $services->getRevisionRenderer();
		$wikiPageFactory = $services->getWikiPageFactory();

		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions';

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

		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();

		// Expect 11 labels – a label in English for all six, and an autonum in the five non-English languages
		$labels = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_language', 'wlzl_label', 'wlzl_label_primary' ] )
			->from( 'wikilambda_zobject_labels' )
			->where( [ 'wlzl_type' => 'Z60', 'wlzl_label_primary' => true ] )
			->fetchResultSet();
		$this->assertEquals( 11, $labels->numRows() );

		// Expect 12 aliases
		// – each language should have its code inserted as MUL alias
		// – each language should have its zid inserted as MUL alias
		$aliasCodes = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_language', 'wlzl_label', 'wlzl_label_primary' ] )
			->from( 'wikilambda_zobject_labels' )
			->where( [ 'wlzl_type' => 'Z60', 'wlzl_language' => 'Z1360', 'wlzl_label_primary' => false ] )
			->fetchResultSet();
		$this->assertEquals( 12, $aliasCodes->numRows() );

		// Expect that there are exactly two MUL alias for 'en'
		// – one with the language code
		// – one with the zid
		$aliasCodes = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_language', 'wlzl_label', 'wlzl_label_primary' ] )
			->from( 'wikilambda_zobject_labels' )
			->where( [ 'wlzl_zobject_zid' => 'Z1002', 'wlzl_language' => 'Z1360', 'wlzl_label_primary' => false ] )
			->fetchResultSet();
		$this->assertSame( 2, $aliasCodes->numRows() );
		$this->assertEquals( 'Z1002', $aliasCodes->current()->wlzl_label );
		$aliasCodes->next();
		$this->assertEquals( 'en', $aliasCodes->current()->wlzl_label );
	}

	public function testOnMultiContentSave_returnType() {
		$this->insertZids( [ 'Z17', 'Z1002' ] );

		$selectedFunctions = [ "Z801", "Z804", "Z810", "Z823", "Z883" ];

		$services = $this->getServiceContainer();
		$revisionRenderer = $services->getRevisionRenderer();
		$wikiPageFactory = $services->getWikiPageFactory();

		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions';

		foreach ( $selectedFunctions as $key => $functionZid ) {
			$contentString = file_get_contents( "$dataPath/$functionZid.json" );

			$status = $this->editPage(
				$functionZid,
				$contentString,
				'Test ZFunction creation and return type insertion',
				NS_MAIN
			);
			$this->assertTrue( $status->isOK(), "Edit to create $functionZid went through" );

			DeferredUpdates::doUpdates();

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

			// Add a mocked Orchestrator to the secondary update.
			$mockOrchestratorRequest = $this->createMock( OrchestratorRequest::class );
			$mockOrchestratorRequest->expects( $this->once() )
				->method( 'persistToCache' )
				->with( $this->callback( static function ( $queryZ2 ) use( $functionZid ) {
					return $queryZ2->Z2K1->Z6K1 == $functionZid;
				} ) );
			$secondaryUpdate = $zobjectUpdates[0];
			$ref = new \ReflectionProperty( $secondaryUpdate, 'orchestrator' );
			$ref->setAccessible( true );
			$ref->setValue( $secondaryUpdate, $mockOrchestratorRequest );

			// Execute the update.
			$secondaryUpdate->doUpdate();
		}

		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();

		// Expect a total of 5 distinct functions
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_return_type' ] )
			->where( [ 'wlzl_type' => 'Z8' ] )
			->from( 'wikilambda_zobject_labels' )
		  ->distinct()
			->orderBy( 'wlzl_zobject_zid', SelectQueryBuilder::SORT_ASC )
			->fetchResultSet();

		$this->assertSame( 5, $rows->numRows() );

		// Z801 -> outputs object: Z1
		$this->assertEquals( 'Z801', $rows->current()->wlzl_zobject_zid );
		$this->assertEquals( 'Z8', $rows->current()->wlzl_type );
		$this->assertEquals( 'Z1', $rows->current()->wlzl_return_type );

		// Z804 -> outputs typed map: Z883
		$rows->next();
		$this->assertEquals( 'Z804', $rows->current()->wlzl_zobject_zid );
		$this->assertEquals( 'Z8', $rows->current()->wlzl_type );
		$this->assertEquals( 'Z883', $rows->current()->wlzl_return_type );

		// Z810 -> outputs typed list: Z881
		$rows->next();
		$this->assertEquals( 'Z810', $rows->current()->wlzl_zobject_zid );
		$this->assertEquals( 'Z8', $rows->current()->wlzl_type );
		$this->assertEquals( 'Z881', $rows->current()->wlzl_return_type );

		// Z823 -> outputs typed pair: Z882
		$rows->next();
		$this->assertEquals( 'Z823', $rows->current()->wlzl_zobject_zid );
		$this->assertEquals( 'Z8', $rows->current()->wlzl_type );
		$this->assertEquals( 'Z882', $rows->current()->wlzl_return_type );

		// Z883 -> outputs type: Z4
		$rows->next();
		$this->assertEquals( 'Z883', $rows->current()->wlzl_zobject_zid );
		$this->assertEquals( 'Z8', $rows->current()->wlzl_type );
		$this->assertEquals( 'Z4', $rows->current()->wlzl_return_type );
	}

	public function testOnMultiContentSave_relatedObjects_forFunction() {
		$this->insertZids( [ 'Z17', 'Z1002' ] );

		$selectedFunctions = [ "Z801", "Z804", "Z820", "Z883", "Z885", "Z889" ];

		$services = $this->getServiceContainer();
		$revisionRenderer = $services->getRevisionRenderer();
		$wikiPageFactory = $services->getWikiPageFactory();

		$handler = new ZObjectContentHandler( CONTENT_MODEL_ZOBJECT );
		$dataPath = dirname( __DIR__, 4 ) . '/function-schemata/data/definitions';

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

			// Add a mocked Orchestrator to the secondary update.
			$mockOrchestratorRequest = $this->createMock( OrchestratorRequest::class );
			$mockOrchestratorRequest->expects( $this->once() )
				->method( 'persistToCache' )
				->with( $this->callback( static function ( $queryZ2 ) use( $functionZid ) {
					return $queryZ2->Z2K1->Z6K1 == $functionZid;
				} ) );
			$secondaryUpdate = $zobjectUpdates[0];
			$ref = new \ReflectionProperty( $secondaryUpdate, 'orchestrator' );
			$ref->setAccessible( true );
			$ref->setValue( $secondaryUpdate, $mockOrchestratorRequest );

			// Execute the update.
			$secondaryUpdate->doUpdate();
		}

		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();

		// Expect a total of 27 rows
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->fetchResultSet();
		$this->assertSame( 27, $rows->numRows() );
		// Expect 17 related types
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_main_type' => 'Z8', 'wlzo_related_type' => 'Z4' ] )
			->fetchResultSet();
		$this->assertSame( 17, $rows->numRows() );
		// Expect 4 related tests
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_main_type' => 'Z8', 'wlzo_related_type' => 'Z20' ] )
			->fetchResultSet();
		$this->assertSame( 4, $rows->numRows() );
		// Expect 6 related implementations
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_main_type' => 'Z8', 'wlzo_related_type' => 'Z14' ] )
			->fetchResultSet();
		$this->assertSame( 6, $rows->numRows() );
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

	public function testOnMultiContentSave_relatedObjects_forType() {
		$this->insertZids( [ 'Z4', 'Z1002' ] );
		$sysopUser = $this->getTestSysop()->getUser();
		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();

		// Insert new type
		$filePath = dirname( __DIR__, 2 ) . '/test_data/object-relations-type.json';
		$type = json_decode( file_get_contents( $filePath ) );

		// 1. We insert the type
		$this->editPage( $type->zid, json_encode( $type->data ), 'Test type', NS_MAIN, $sysopUser );

		// Expect renderer and parser function entries:
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_main_zid' => $type->zid ] )
			->fetchResultSet();
		$this->assertSame( 2, $rows->numRows() );
		// Expect renderer:
		$this->assertEquals( 'Z4', $rows->current()->wlzo_main_type );
		$this->assertEquals( 'Z20020', $rows->current()->wlzo_related_zobject );
		$this->assertEquals( 'Z4K5', $rows->current()->wlzo_key );
		$this->assertEquals( 'Z8', $rows->current()->wlzo_related_type );
		// Expect parser:
		$rows->next();
		$this->assertEquals( 'Z4', $rows->current()->wlzo_main_type );
		$this->assertEquals( 'Z20030', $rows->current()->wlzo_related_zobject );
		$this->assertEquals( 'Z4K6', $rows->current()->wlzo_key );
		$this->assertEquals( 'Z8', $rows->current()->wlzo_related_type );

		// 2. We edit the type (arbitrary edit to label)
		$type->data->Z2K3->Z12K1[1]->Z11K2 = 'Type with renderer and parser (edited)';
		$this->editPage( $type->zid, json_encode( $type->data ), 'Test type', NS_MAIN, $sysopUser );

		// Expect same renderer and parser entries:
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_main_zid' => $type->zid ] )
			->fetchResultSet();
		$this->assertSame( 2, $rows->numRows() );

		// 3. We edit the type (set new renderer):
		$type->data->Z2K2->Z4K5 = 'Z20040';
		$this->editPage( $type->zid, json_encode( $type->data ), 'Test type', NS_MAIN, $sysopUser );

		// Expect new renderer and same parser entries:
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_main_zid' => $type->zid ] )
			->fetchResultSet();
		$this->assertSame( 2, $rows->numRows() );
		// Expect new renderer:
		$this->assertEquals( 'Z4', $rows->current()->wlzo_main_type );
		$this->assertEquals( 'Z20040', $rows->current()->wlzo_related_zobject );
		$this->assertEquals( 'Z4K5', $rows->current()->wlzo_key );
		$this->assertEquals( 'Z8', $rows->current()->wlzo_related_type );
		// Expect same parser:
		$rows->next();
		$this->assertEquals( 'Z4', $rows->current()->wlzo_main_type );
		$this->assertEquals( 'Z20030', $rows->current()->wlzo_related_zobject );
		$this->assertEquals( 'Z4K6', $rows->current()->wlzo_key );
		$this->assertEquals( 'Z8', $rows->current()->wlzo_related_type );

		// 4. We edit the type (remove parser):
		unset( $type->data->Z2K2->Z4K6 );
		$this->editPage( $type->zid, json_encode( $type->data ), 'Test type', NS_MAIN, $sysopUser );

		// Expect only new renderer entry:
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_main_zid' => $type->zid ] )
			->fetchResultSet();
		$this->assertSame( 1, $rows->numRows() );
		// Expect new renderer:
		$this->assertEquals( 'Z20040', $rows->current()->wlzo_related_zobject );

		// 5. Delete type
		$wikiPageFactory = $this->getServiceContainer()->getWikiPageFactory();
		$typeTitle = Title::newFromText( $type->zid, NS_MAIN );
		$typePage = $wikiPageFactory->newFromTitle( $typeTitle );
		$this->deletePage( $typePage, 'Test delete', $sysopUser );

		// Expect no entries left
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_main_zid' => $type->zid ] )
			->fetchResultSet();
		$this->assertSame( 0, $rows->numRows() );
	}

	public function testOnMultiContentSave_relatedObjects_forEnumType() {
		$this->insertZids( [ 'Z4', 'Z1002' ] );
		$sysopUser = $this->getTestSysop()->getUser();
		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();

		// Insert new Enum type
		$filePath = dirname( __DIR__, 2 ) . '/test_data/object-relations-instanceofenum.json';
		$fileData = json_decode( file_get_contents( $filePath ) );

		// 1. We insert the enum type: no instances yet
		$type = $fileData->day;
		$this->editPage( $type->zid, json_encode( $type->data ), 'Test enum', NS_MAIN, $sysopUser );

		// Expect no instanceofenum entries:
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_type' => $type->zid,
				'wlzo_key' => ZObjectSecondaryDataUpdate::INSTANCEOFENUM_DB_KEY
			] )
			->fetchResultSet();
		$this->assertSame( 0, $rows->numRows() );

		// 2. We insert the first instance of the enum type
		$monday = $fileData->monday;
		$this->editPage( $monday->zid, json_encode( $monday->data ), 'Test enum', NS_MAIN, $sysopUser );

		// Expect one instanceofenum entry:
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_type' => $type->zid,
				'wlzo_key' => ZObjectSecondaryDataUpdate::INSTANCEOFENUM_DB_KEY
			] )
			->fetchResultSet();
		$this->assertSame( 1, $rows->numRows() );
		$this->assertEquals( 'Z20001', $rows->current()->wlzo_main_zid );
		$this->assertEquals( 'Z20000', $rows->current()->wlzo_related_zobject );
		$this->assertEquals( 'Z4', $rows->current()->wlzo_related_type );

		// 3. We insert the second instance of the enum type
		$tuesday = $fileData->tuesday;
		$this->editPage( $tuesday->zid, json_encode( $tuesday->data ), 'Test enum', NS_MAIN, $sysopUser );

		// Expect two instanceofenum entries:
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_type' => $type->zid,
				'wlzo_key' => ZObjectSecondaryDataUpdate::INSTANCEOFENUM_DB_KEY
			] )
			->fetchResultSet();
		$this->assertSame( 2, $rows->numRows() );
		$rows->seek( 1 );
		$this->assertEquals( 'Z20002', $rows->current()->wlzo_main_zid );
		$this->assertEquals( 'Z20000', $rows->current()->wlzo_related_zobject );
		$this->assertEquals( 'Z4', $rows->current()->wlzo_related_type );

		// 4. We edit an instance of enum type (arbitrary edit, label change)
		$tuesday->data->Z2K3->Z12K1[1]->Z11K2 = 'Tuesday (edited)';
		$this->editPage( $tuesday->zid, json_encode( $tuesday->data ), 'Test enum', NS_MAIN, $sysopUser );

		// Expect two instanceofenum entries:
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_type' => $type->zid,
				'wlzo_key' => ZObjectSecondaryDataUpdate::INSTANCEOFENUM_DB_KEY
			] )
			->fetchResultSet();
		$this->assertSame( 2, $rows->numRows() );
		$this->assertEquals( 'Z20001', $rows->current()->wlzo_main_zid );
		$rows->next();
		$this->assertEquals( 'Z20002', $rows->current()->wlzo_main_zid );

		// 5. We edit the day type (arbitrary edit, label change)
		$type->data->Z2K3->Z12K1[1]->Z11K2 = 'Day of the week (edited)';
		$this->editPage( $type->zid, json_encode( $type->data ), 'Test enum', NS_MAIN, $sysopUser );

		// Expect two instanceofenum entries:
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_type' => $type->zid,
				'wlzo_key' => ZObjectSecondaryDataUpdate::INSTANCEOFENUM_DB_KEY
			] )
			->fetchResultSet();
		$this->assertSame( 2, $rows->numRows() );
		$this->assertEquals( 'Z20001', $rows->current()->wlzo_main_zid );
		$rows->next();
		$this->assertEquals( 'Z20002', $rows->current()->wlzo_main_zid );

		// 6. We change day type to not be enum
		$type->data->Z2K2->Z4K2[1]->Z3K4->Z40K1 = 'Z42';
		$this->editPage( $type->zid, json_encode( $type->data ), 'Test enum', NS_MAIN, $sysopUser );

		// Expect no instanceofenum entries:
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_type' => $type->zid,
				'wlzo_key' => ZObjectSecondaryDataUpdate::INSTANCEOFENUM_DB_KEY
			] )
			->fetchResultSet();
		$this->assertSame( 0, $rows->numRows() );

		// 7. We change day type back to enum
		$type->data->Z2K2->Z4K2[1]->Z3K4->Z40K1 = 'Z41';
		$this->editPage( $type->zid, json_encode( $type->data ), 'Test enum', NS_MAIN, $sysopUser );

		// Expect no instanceofenum entries:
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_type' => $type->zid,
				'wlzo_key' => ZObjectSecondaryDataUpdate::INSTANCEOFENUM_DB_KEY
			] )
			->fetchResultSet();
		$this->assertSame( 2, $rows->numRows() );

		// 8. Delete instance of enum type
		$wikiPageFactory = $this->getServiceContainer()->getWikiPageFactory();
		$tuesdayTitle = Title::newFromText( $tuesday->zid, NS_MAIN );
		$tuesdayPage = $wikiPageFactory->newFromTitle( $tuesdayTitle );
		$this->deletePage( $tuesdayPage, 'Test delete', $sysopUser );

		// Expect no entries for this instance
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_type' => $type->zid,
				'wlzo_key' => ZObjectSecondaryDataUpdate::INSTANCEOFENUM_DB_KEY
			] )
			->fetchResultSet();
		$this->assertSame( 1, $rows->numRows() );
		$this->assertEquals( 'Z20001', $rows->current()->wlzo_main_zid );
	}

	public function testOnMultiContentSave_relatedObjects_forFunctionCall() {
		$this->insertZids( [ 'Z7', 'Z6884', 'Z6095' ] );
		$sysopUser = $this->getTestSysop()->getUser();
		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();

		// Insert new Enum type
		$filePath = dirname( __DIR__, 2 ) . '/test_data/object-relations-function-call.json';
		$data = json_decode( file_get_contents( $filePath ) );

		// 1. We insert the wikidata enum type:
		$this->editPage( $data->zid, json_encode( $data->data ), 'Test wikidata enum', NS_MAIN, $sysopUser );

		// Expect one Z7K1 entry:
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_zid' => $data->zid,
				'wlzo_key' => 'Z7K1'
			] )
			->fetchResultSet();
		$this->assertSame( 1, $rows->numRows() );
		$this->assertEquals( 'Z20000', $rows->current()->wlzo_main_zid );
		$this->assertEquals( 'Z6884', $rows->current()->wlzo_related_zobject );
		$this->assertEquals( 'Z8', $rows->current()->wlzo_related_type );

		// 2. Delete the wikidata enum type
		$wikiPageFactory = $this->getServiceContainer()->getWikiPageFactory();
		$title = Title::newFromText( $data->zid, NS_MAIN );
		$page = $wikiPageFactory->newFromTitle( $title );
		$this->deletePage( $page, 'Test delete', $sysopUser );

		// Expect zero Z7K1 entries:
		$rows = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid', 'wlzo_main_type', 'wlzo_key', 'wlzo_related_zobject', 'wlzo_related_type' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_zid' => $data->zid,
				'wlzo_key' => 'Z7K1'
			] )
			->fetchResultSet();
		$this->assertSame( 0, $rows->numRows() );
	}

	public function testUpdateSecondaryTables_inserted() {
		$updater = DatabaseUpdater::newForDB( $this->db );
		HooksDataPathMock::createInitialContent( $updater );

		// The secondary tables have now been populated for all the ZObjects in the mock data path.
		// Count how many distinct Z8s were loaded.
		$res = $this->getDb()->newSelectQueryBuilder()
			->select( [ 'wlzl_zobject_zid' ] )
			->from( 'wikilambda_zobject_labels' )
			->where( [
				'wlzl_type' => 'Z8'
			] )
			->orderBy( 'wlzl_zobject_zid', SelectQueryBuilder::SORT_ASC )
			->distinct()
			->caller( __METHOD__ )
			->fetchResultSet();
		$numFunctions = $res->numRows();
		$this->assertSame( 6, $numFunctions );

		// Clear the wikilambda_zobject_join table
		$this->getDb()->newDeleteQueryBuilder()
			->deleteFrom( 'wikilambda_zobject_join' )
			->where( [ true ] )
			->caller( __METHOD__ )->execute();

		// Call updateSecondaryTables to re-populate wikilambda_zobject_join.
		HooksDataPathMock::updateSecondaryTables( $updater, 'Z8' );

		// Confirm that updateSecondaryTables has populated wikilambda_zobject_join with
		// at least one input-type row for each of the functions
		$res = $this->getDb()->newSelectQueryBuilder()
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
		$res = $this->getDb()->newSelectQueryBuilder()
			->select( [ 'wlzo_main_zid' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [ 'wlzo_key' => 'Z8K2' ] )
			->caller( __METHOD__ )
			->fetchResultSet();
		$size = $res->numRows();
		$this->assertSame( $size, $numFunctions );
	}

	public function testSecondaryDataUpdate_cacheWrite() {
		// Insert ZTestType
		$this->registerLangs( ZTestType::TEST_LANGS );
		$this->editPage( ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'Insert test object', NS_MAIN );
		$testObjectTitle = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );

		// Force deferred updates from other edits so we can conflict with it.
		DeferredUpdates::doUpdates();
		$this->assertSame( [], DeferredUpdates::getPendingUpdates() );

		$store = WikiLambdaServices::getZObjectStore();
		$insertedObject = $store->fetchZObjectByTitle( $testObjectTitle );
		$this->assertNotFalse( $insertedObject, 'Object was inserted into the DB' );

		$cache = WikiLambdaServices::getZObjectStash();
		$cacheKey = $cache->makeKey( ZObjectStore::ZOBJECT_CACHE_KEY_PREFIX, ZTestType::TEST_ZID );
		$cachedObject = $cache->get( $cacheKey );
		$this->assertNotFalse( $cachedObject, 'Object was inserted into the cache' );

		$this->assertSame(
			$insertedObject->getText(),
			$cachedObject,
			'Inserted Object is correctly in the cache'
		);

		$this->deletePage(
			$this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $testObjectTitle ),
			'Test delete',
			$this->getTestSysop()->getUser()
		);

		$insertedObject = $store->fetchZObjectByTitle( $testObjectTitle );
		$this->assertFalse( $insertedObject, 'Object was deleted from the DB' );
		$cacheKey = $cache->makeKey( ZObjectStore::ZOBJECT_CACHE_KEY_PREFIX, ZTestType::TEST_ZID );
		$cachedObject = $cache->get( $cacheKey );
		$this->assertFalse( $cachedObject, 'Object was delete from the cache' );
	}

	// TODO (T367015): Test the uncaught behaviour of MultiContentSave when a clash happens too late
	//   for us to stop it.
	// TODO (T367621): Consider moving some tests from StandaloneHooksTest to HooksTest
}
