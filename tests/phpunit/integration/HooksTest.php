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
use MediaWiki\Extension\WikiLambda\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\MediaWikiServices;
use Title;
use WikiPage;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\Hooks
 * @group Database
 */
class HooksTest extends \MediaWikiIntegrationTestCase {

	private const EN = 'Z1002';
	private const FR = 'Z1004';

	/** @var string[] */
	private $titlesTouched = [];

	protected function setUp() : void {
		parent::setUp();

		$langs = ZLangRegistry::singleton();
		$langs->register( self::EN, 'en' );
		$langs->register( self::FR, 'fr' );

		$this->tablesUsed[] = 'wikilambda_zobject_labels';
		$this->tablesUsed[] = 'wikilambda_zobject_label_conflicts';

		// Insert Z111
		$firstTitleText = ZTestType::TEST_ZID;
		$firstTitle = Title::newFromText( $firstTitleText, NS_ZOBJECT );
		$this->hideDeprecated( '::create' );
		$initialStatus = $this->editPage( $firstTitleText, ZTestType::TEST_ENCODING, 'Test creation', NS_ZOBJECT );
		$this->titlesTouched[] = $firstTitleText;
	}

	protected function tearDown() : void {
		// Cleanup the pages we touched.
		$sysopUser = $this->getTestSysop()->getUser();

		foreach ( $this->titlesTouched as $titleString ) {
			$title = Title::newFromText( $titleString, NS_ZOBJECT );
			$page = WikiPage::factory( $title );
			$page->doDeleteArticleReal( $title, $sysopUser );
		}

		parent::tearDown();
	}

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
		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->select(
			/* FROM */ 'page',
			/* SELECT */ [ 'page_title' ],
			/* WHERE */ [ 'page_namespace' => NS_ZOBJECT ],
			__METHOD__,
			[ 'ORDER BY' => 'page_id DESC' ]
		);

		$loadedZids = [];
		foreach ( $res as $row ) {
			$loadedZids[] = $row->page_title;
			$this->titlesTouched[] = $row->page_title;
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
		$nullEditStatus = $this->editPage( ZTestType::TEST_ZID, ZTestType::TEST_ENCODING, 'No-op edit', NS_ZOBJECT );
		$this->assertTrue( $nullEditStatus->isOK() );
		$this->assertTrue( $nullEditStatus->hasMessage( 'edit-no-change' ) );
	}

	/**
	 * @covers ::onMultiContentSave
	 */
	public function testOnMultiContentSave_clashingLabels_caught() {
		$secondTitleText = ZTestType::TEST_ZID . '000';
		$secondTitle = Title::newFromText( $secondTitleText, NS_ZOBJECT );

		// Force deferred updates from other edits (in this case, the one in setUp()) so we can
		// conflict with it.
		DeferredUpdates::doUpdates();
		MediaWikiServices::getInstance()->getDBLoadBalancerFactory()->waitForReplication();
		$this->assertSame( [], DeferredUpdates::getPendingUpdates() );

		$this->assertFalse( $secondTitle->exists() );

		$this->titlesTouched[] = $secondTitleText;
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
