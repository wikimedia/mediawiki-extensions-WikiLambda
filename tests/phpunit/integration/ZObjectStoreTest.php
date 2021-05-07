<?php

/**
 * WikiLambda unit test suite for the ZObjectStore file
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObjectContent;
use MediaWiki\MediaWikiServices;
use Status;
use Title;
use WikiPage;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjectStore
 */
class ZObjectStoreTest extends \MediaWikiIntegrationTestCase {

	/** @var ZObjectStore */
	protected $zobjectStore;

	/** @var string[] */
	protected $titlesTouched = [];

	public function setUp() : void {
		parent::setUp();

		$this->tablesUsed[] = 'wikilambda_zobject_labels';
		$this->tablesUsed[] = 'wikilambda_zobject_label_conflicts';

		$this->zobjectStore = WikiLambdaServices::getZObjectStore();
	}

	public function tearDown() : void {
		$sysopUser = $this->getTestSysop()->getUser();

		foreach ( $this->titlesTouched as $titleString ) {
			$title = Title::newFromText( $titleString, NS_ZOBJECT );
			$page = WikiPage::factory( $title );
			if ( $page->exists() ) {
				$page->doDeleteArticleReal( "clean slate for testing", $sysopUser );
			}
		}
		parent::tearDown();
	}

	/**
	 * @covers ::__construct
	 * @covers ::getNextAvailableZid
	 */
	public function testGetNextAvailableZid_first() {
		$zid = $this->zobjectStore->getNextAvailableZid();
		$this->assertEquals( 'Z10000', $zid );
	}

	/**
	 * @covers ::createNewZObject
	 * @covers ::fetchZObjectByTitle
	 */
	public function testFetchZObjectByTitle_valid() {
		$zid = $this->zobjectStore->getNextAvailableZid();
		$sysopUser = $this->getTestSysop()->getUser();

		$input = '{ "Z1K1": "Z2", "Z2K1": "Z0",'
			. '"Z2K2": { "Z1K1": "Z6", "Z6K1": "hello" },'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [] } }';
		$page = $this->zobjectStore->createNewZObject( $input, 'Create summary', $sysopUser );
		$this->titlesTouched[] = $page->getTitle()->getBaseText();
		$this->assertTrue( $page instanceof WikiPage );

		$title = Title::newFromText( $zid, NS_ZOBJECT );
		$zobject = $this->zobjectStore->fetchZObjectByTitle( $title );
		$this->assertTrue( $zobject instanceof ZObjectContent );

		// TODO: When we change ZObjectContent to keep information of the ZPersistentObject,
		// we shall assert that the $zid is equal to $zobject->getId() this way:
		// $this->assertEquals( $zobject->getId(), $zid );
		// TODO: Also test that Z2K1 has the title's ZID instead of Z0
	}

	/**
	 * @covers ::fetchZObjectByTitle
	 */
	public function testFetchZObjectByTitle_invalid() {
		$invalidZid = 'Z0999';
		$title = Title::newFromText( $invalidZid, NS_ZOBJECT );
		$zobject = $this->zobjectStore->fetchZObjectByTitle( $title );

		$this->assertFalse( $zobject instanceof ZObjectContent );
		$this->assertFalse( $zobject );
	}

	/**
	 * @dataProvider provideCreateNewZObject
	 * @covers ::createNewZObject
	 */
	public function testCreateNewZObject( $input, $expected ) {
		$sysopUser = $this->getTestSysop()->getUser();
		$status = $this->zobjectStore->createNewZObject( $input, 'Create summary', $sysopUser );

		if ( $expected === true ) {
			$this->assertTrue( $status instanceof WikiPage );
			$this->titlesTouched[] = $status->getTitle()->getBaseText();
		} else {
			$this->assertTrue( $status instanceof Status );
			$this->assertFalse( $status->isOK() );
			$this->assertTrue( $status->hasMessage( $expected ) );
		}
	}

	public function provideCreateNewZObject() {
		return [
			'incorrect JSON' => [ '{ "Z1K1"; Z2 ]', 'apierror-wikilambda_edit-invalidjson' ],
			'incorrect ZObject, no id' => [
				'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z6", "Z6K1": "hello" }, "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }',
				'ZObjectContent missing the id key.'
			],
			'incorrect ZObject, no value' => [
				'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }',
				'ZObjectContent missing the value key.'
			],
			'incorrect ZObject, no label' => [
				'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z6", "Z6K1": "hello" } }',
				'ZObjectContent missing the label key.'
			],
			'correct ZObject' => [
				'{ "Z1K1": "Z2", "Z2K1": "Z0",'
					. ' "Z2K2": { "Z1K1": "Z6", "Z6K1": "hello" },'
					. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }',
				true
			],
		];
	}

	/**
	 * @covers ::createNewZObject
	 */
	public function testCreateNewZObject_canonicalized() {
		$sysopUser = $this->getTestSysop()->getUser();

		$zid = $this->zobjectStore->getNextAvailableZid();
		$title = Title::newFromText( $zid, NS_ZOBJECT );
		$normalZObject = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z9", "Z9K1": "Z0" },'
			. ' "Z2K2": { "Z1K1": "Z6", "Z6K1": "hello" },'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }';
		$canonicalZObject = '{ "Z1K1": "Z2", "Z2K1": "' . $zid . '",'
			. ' "Z2K2": "hello",'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }';

		$page = $this->zobjectStore->createNewZObject( $normalZObject, 'Create ZObject', $sysopUser );
		$this->assertTrue( $page instanceof WikiPage );
		$this->titlesTouched[] = $zid;

		$zobject = $this->zobjectStore->fetchZObjectByTitle( $title );
		$this->assertTrue( $zobject instanceof ZObjectContent );
		// We compare the JSONs after decoding because it's saved prettified
		$this->assertEquals( json_decode( $zobject->getText() ), json_decode( $canonicalZObject ) );
	}

	/**
	 * @covers ::updateZObject
	 */
	public function testUpdateZObject() {
		$sysopUser = $this->getTestSysop()->getUser();

		$zid = $this->zobjectStore->getNextAvailableZid();
		$title = Title::newFromText( $zid, NS_ZOBJECT );
		$input = '{ "Z1K1": "Z2", "Z2K1": "Z0",'
			. '"Z2K2": { "Z1K1": "Z6", "Z6K1": "hello" },'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [] } }';

		// We create a new ZObject
		$this->zobjectStore->createNewZObject( $input, 'Create summary', $sysopUser );
		$zobject = $this->zobjectStore->fetchZObjectByTitle( $title );
		$this->titlesTouched[] = $zid;

		// We change the text representation of the ZObject to update it in the DB
		$zobjectNewText = str_replace( "hello", "bye", $zobject->getText() );

		// Update the ZObject
		$this->zobjectStore->updateZObject( $zid, $zobjectNewText, 'Update summary', $sysopUser );

		// Fetch it again and check whether the changes were saved
		$updatedZObject = $this->zobjectStore->fetchZObjectByTitle( $title );
		$this->assertTrue( $updatedZObject instanceof ZObjectContent );
		$this->assertEquals( $updatedZObject->getText(), $zobjectNewText );
	}

	/**
	 * @covers ::insertZObjectLabels
	 */
	public function testInsertZObjectLabels() {
		$labels = [
			'en' => 'label',
			'es' => 'etiqueta',
			'fr' => 'marque'
		];

		$response = $this->zobjectStore->insertZObjectLabels( 'Z222', 'Z4', $labels );
		$this->assertTrue( $response );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_labels',
			/* SELECT */ [ 'wlzl_language', 'wlzl_label' ],
			/* WHERE */ [
				'wlzl_zobject_zid' => 'Z222',
				'wlzl_type' => 'Z4'
			]
		);
		$this->assertEquals( $res->numRows(), 3 );

		$conflicts = $this->zobjectStore->findZObjectLabelConflicts( 'Z333', 'Z4', $labels );
		$this->assertEquals( count( $conflicts ), 3 );
	}

	/**
	 * @covers ::insertZObjectLabels
	 * @covers ::findZObjectLabelConflicts
	 */
	public function testFindZObjectLabelConflicts() {
		$labels = [
			'en' => 'label',
			'es' => 'etiqueta',
			'fr' => 'marque'
		];

		$response = $this->zobjectStore->insertZObjectLabels( 'Z222', 'Z4', $labels );
		$this->assertTrue( $response );

		$conflicts = $this->zobjectStore->findZObjectLabelConflicts( 'Z333', 'Z4', $labels );
		$this->assertEquals( count( $conflicts ), 3 );
	}

	/**
	 * @covers ::insertZObjectLabelConflicts
	 */
	public function testInsertZObjectLabelConflicts() {
		$conflicts = [
			'en' => 'Z222',
			'es' => 'Z222',
			'fr' => 'Z222'
		];

		$response = $this->zobjectStore->insertZObjectLabelConflicts( 'Z333', $conflicts );
		$this->assertTrue( $response );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_label_conflicts',
			/* SELECT */ [ 'wlzlc_language' ],
			/* WHERE */ [
				'wlzlc_existing_zid' => 'Z222',
				'wlzlc_conflicting_zid' => 'Z333',
			]
		);
		$this->assertEquals( $res->numRows(), 3 );
	}

	/**
	 * @covers ::insertZObjectLabels
	 * @covers ::deleteZObjectLabelsByZid
	 */
	public function testDeleteZObjectLabelsByZid() {
		$labels = [
			'en' => 'label',
			'es' => 'etiqueta',
			'fr' => 'marque'
		];

		$response = $this->zobjectStore->insertZObjectLabels( 'Z222', 'Z4', $labels );
		$this->assertTrue( $response );

		$this->zobjectStore->deleteZObjectLabelsByZid( 'Z222' );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_labels',
			/* SELECT */ [ 'wlzl_language', 'wlzl_label' ],
			/* WHERE */ [
				'wlzl_zobject_zid' => 'Z222',
				'wlzl_type' => 'Z4'
			]
		);
		$this->assertEquals( $res->numRows(), 0 );
	}

	/**
	 * @covers ::insertZObjectLabelConflicts
	 * @covers ::deleteZObjectLabelConflictsByZid
	 */
	public function testDeleteZObjectLabelConflictsByZid() {
		$this->zobjectStore->insertZObjectLabelConflicts( 'Z222', [ 'en' => 'Z333' ] );
		$this->zobjectStore->insertZObjectLabelConflicts( 'Z333', [ 'es' => 'Z444' ] );

		$this->zobjectStore->deleteZObjectLabelConflictsByZid( 'Z333' );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_label_conflicts',
			/* SELECT */ [ 'wlzlc_language' ],
			/* WHERE */ $dbr->makeList(
				[
					'wlzlc_existing_zid' => 'Z333',
					'wlzlc_conflicting_zid' => 'Z333',
				],
				$dbr::LIST_OR
			)
		);
		$this->assertEquals( $res->numRows(), 0 );
	}

}
