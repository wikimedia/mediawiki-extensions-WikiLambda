<?php

/**
 * WikiLambda integration test suite for hooks
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use DatabaseUpdater;
use DeferredUpdates;
use MediaWiki\Extension\WikiLambda\Hooks;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\MediaWikiServices;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\Hooks
 * @group Database
 */
class HooksTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::createInitialContent
	 */
	public function testCreateInitialContent() {
		$updater = DatabaseUpdater::newForDB( $this->db );
		Hooks::createInitialContent( $updater );

		// Fetch one arbitrary ZObject from the database
		$store = WikiLambdaServices::getZObjectStore();
		$title = Title::newFromText( "Z4", NS_ZOBJECT );
		$zobject = $store->fetchZObjectByTitle( $title );
		$this->assertTrue( $zobject instanceof ZObjectContent );

		// Assert that all ZIDs available in the data directory are loaded in the database
		$res = $this->db->select(
			/* FROM */ 'page',
			/* SELECT */ [ 'page_title' ],
			/* WHERE */ [ 'page_namespace' => NS_ZOBJECT ],
			__METHOD__,
			[ 'ORDER BY' => 'page_id DESC' ]
		);

		$loadedZids = [];
		foreach ( $res as $row ) {
			$loadedZids[] = $row->page_title;
		}

		$dataPath = dirname( __DIR__, 3 ) . '/data/';
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

		$this->assertEquals(
			natsort( $zidsToLoad ), natsort( $loadedZids ),
			'All ZObjects from the data directory are loaded'
		);
	}

	/**
	 * @covers ::onMultiContentSave
	 */
	public function testOnMultiContentSave_badTitle() {
		$invalidTitleText = 'Bad page title';

		$invalidZIDStatus = $this->editPage(
			$invalidTitleText, ZTestType::TEST_ENCODING, 'Test bad title', NS_ZOBJECT
		);

		$this->assertFalse( $invalidZIDStatus->isOK() );
		$this->assertTrue( $invalidZIDStatus->hasMessage( 'wikilambda-invalidzobjecttitle' ) );

		$invalidTitle = Title::newFromText( $invalidTitleText, NS_ZOBJECT );
		$this->assertFalse( $invalidTitle->exists() );
	}

	/**
	 * @covers ::onMultiContentSave
	 */
	public function testOnMultiContentSave_badContent() {
		$invalidContent = '{"Z1K1": "Z3"}';

		$invalidZIDStatus = $this->editPage(
			ZTestType::TEST_ZID, $invalidContent, 'Test bad content', NS_ZOBJECT
		);

		$this->assertFalse( $invalidZIDStatus->isOK() );
		$this->assertTrue( $invalidZIDStatus->hasMessage( 'wikilambda-invalidzobject' ) );
	}

	/**
	 * @covers ::onMultiContentSave
	 */
	public function testOnMultiContentSave_nullEdit() {
		// Insert ZTestType
		$this->registerLangs( ZTestType::TEST_LANGS );
		$this->editPage(
			ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'First test insertion', NS_ZOBJECT
		);

		$nullEditStatus = $this->editPage(
			ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'No-op edit', NS_ZOBJECT
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
			ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'First test insertion', NS_ZOBJECT
		);

		// Force deferred updates from other edits so we can conflict with it.
		DeferredUpdates::doUpdates();
		MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->waitForReplication();
		$this->assertSame( [], DeferredUpdates::getPendingUpdates() );

		$secondTitleText = ZTestType::TEST_ZID . '000';
		$secondTitle = Title::newFromText( $secondTitleText, NS_ZOBJECT );
		$this->assertFalse( $secondTitle->exists() );

		$dupeEditStatus = $this->editPage(
			$secondTitleText, ZTestType::TEST_ENCODING, 'Duplicate creation (blocked)', NS_ZOBJECT
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

	// TODO: Test the uncaught behaviour of MultiContentSave when a a clash happens too late for us to stop it.

}
