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

use DatabaseUpdater;
use DeferredUpdates;
use FormatJson;
use MediaWiki\Extension\WikiLambda\Tests\HooksDataPathMock;
use MediaWiki\Extension\WikiLambda\Tests\HooksInsertMock;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\MediaWikiServices;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\Hooks
 * @group Database
 * @group Standalone
 */
class StandaloneHooksTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::createInitialContent
	 */
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

	/**
	 * @covers ::createInitialContent
	 * @covers ::insertContentObject
	 */
	public function testCreateInitialContent_inserted() {
		$updater = DatabaseUpdater::newForDB( $this->db );
		HooksDataPathMock::createInitialContent( $updater );

		// Assert that all ZIDs available in the data directory are loaded in the database
		$res = $this->db->select(
			/* FROM */ 'page',
			/* SELECT */ [ 'page_title' ],
			/* WHERE */ [ 'page_namespace' => NS_MAIN ],
			__METHOD__,
			[ 'ORDER BY' => 'page_id DESC' ]
		);

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

		$this->assertCount( count( $zidsToLoad ), $loadedZids );
		$this->assertSame( json_encode( $zidsToLoad ), json_encode( $loadedZids ) );
	}

	/**
	 * @covers ::onMultiContentSave
	 */
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

	/**
	 * @covers ::onMultiContentSave
	 */
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
		$this->assertFalse( $secondTitle->exists( Title::READ_LATEST ) );
	}

	/**
	 * @covers ::onMultiContentSave
	 */
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
		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_labels',
			/* SELECT */ [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_language', 'wlzl_label', 'wlzl_label_primary' ],
			/* WHERE */ [ 'wlzl_zobject_zid' => ZTestType::TEST_ZID ]
		);

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
		$updated['Z2K3']['Z12K1'][0]['Z11K2'] = "Edited demonstration type";
		$updated['Z2K4']['Z32K1'][0]['Z31K2'][1] = "Edited demonstration type alias";

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

		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_labels',
			/* SELECT */ [ 'wlzl_zobject_zid', 'wlzl_type', 'wlzl_language', 'wlzl_label', 'wlzl_label_primary' ],
			/* WHERE */ [ 'wlzl_zobject_zid' => ZTestType::TEST_ZID ]
		);

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

	// TODO: Test the uncaught behaviour of MultiContentSave when a clash happens too late for us to stop it.

}
