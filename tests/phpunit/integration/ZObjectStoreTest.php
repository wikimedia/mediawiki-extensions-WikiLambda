<?php

/**
 * WikiLambda unit test suite for the ZObjectStore file
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\MediaWikiServices;
use Status;
use Title;
use Wikimedia\Rdbms\IResultWrapper;
use WikiPage;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjectStore
 * @group Database
 */
class ZObjectStoreTest extends \MediaWikiIntegrationTestCase {

	private const EN = 'Z1002';
	private const ES = 'Z1003';
	private const FR = 'Z1004';

	/** @var ZObjectStore */
	protected $zobjectStore;

	/** @var string[] */
	protected $titlesTouched = [];

	protected function setUp() : void {
		parent::setUp();

		$this->tablesUsed[] = 'wikilambda_zobject_labels';
		$this->tablesUsed[] = 'wikilambda_zobject_label_conflicts';
		$this->tablesUsed[] = 'wikilambda_zobject_function_join';

		$this->zobjectStore = WikiLambdaServices::getZObjectStore();
	}

	protected function tearDown() : void {
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
	 * @covers ::fetchAllZids
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

		$zids = $this->zobjectStore->fetchAllZids();
		$this->assertSame( [ $zid ], $zids );
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

		$zids = $this->zobjectStore->fetchAllZids();
		$this->assertNotContains( $invalidZid, $zids );
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
			'incorrect JSON' => [
				'{ "Z1K1"; Z2 ]',
				'ZPersistentObject input is invalid JSON: Syntax error.'
			],
			'incorrect ZObject, no id' => [
				'{ "Z1K1": "Z2", "Z2K2": { "Z1K1": "Z6", "Z6K1": "hello" }, "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }',
				'ZPersistentObject missing required \'Z2K1\' key.'
			],
			'incorrect ZObject, no value' => [
				'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }',
				'ZPersistentObject missing required \'Z2K2\' key.'
			],
			'incorrect ZObject, no label' => [
				'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z6", "Z6K1": "hello" } }',
				'ZPersistentObject missing required \'Z2K3\' key.'
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
			self::EN => 'label',
			self::ES => 'etiqueta',
			self::FR => 'marque'
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
			self::EN => 'label',
			self::ES => 'etiqueta',
			self::FR => 'marque'
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
			self::EN => 'Z222',
			self::ES => 'Z222',
			self::FR => 'Z222'
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
			self::EN => 'label',
			self::ES => 'etiqueta',
			self::FR => 'marque'
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
		$this->zobjectStore->insertZObjectLabelConflicts( 'Z222', [ self::EN => 'Z333' ] );
		$this->zobjectStore->insertZObjectLabelConflicts( 'Z333', [ self::ES => 'Z444' ] );

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

	/**
	 * @covers ::fetchZidsOfType
	 */
	public function testFetchZidsOfType() {
		$response = $this->zobjectStore->insertZObjectLabels( 'Z444', 'Z7', [ self::EN => 'label for Z7' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z445', 'Z7', [ self::EN => 'other label for Z7' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z446', 'Z7', [ self::EN => 'one more label for Z7' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z447', 'Z8', [ self::EN => 'label for Z8' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z449', 'Z9', [ self::EN => 'label for Z9' ] );

		$zids = $this->zobjectStore->fetchZidsOfType( 'Z7' );
		sort( $zids );

		$this->assertSame( $zids, [ 'Z444', 'Z445', 'Z446' ] );
		$this->assertSame( $this->zobjectStore->fetchZidsOfType( 'Z8' ), [ 'Z447' ] );
		$this->assertSame( $this->zobjectStore->fetchZidsOfType( 'Z888' ), [] );
	}

	/**
	 * @covers ::fetchZObjectLabels
	 */
	public function testFetchZObjectLabels_exactMatch() {
		$response = $this->zobjectStore->insertZObjectLabels( 'Z450', 'Z7', [ self::EN => 'example' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z451', 'Z7', [ self::EN => 'Example label' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z452', 'Z7', [ self::EN => 'Some more examples' ] );

		$res = $this->zobjectStore->fetchZObjectLabels(
			'Example',
			true,
			[ self::EN ],
			null,
			null,
			5000
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 1, $res->numRows() );

		$res = $this->zobjectStore->fetchZObjectLabels(
			'Example',
			false,
			[ self::EN ],
			null,
			null,
			5000
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 3, $res->numRows() );
	}

	/**
	 * @covers ::fetchZObjectLabels
	 */
	public function testFetchZObjectLabels_type() {
		$response = $this->zobjectStore->insertZObjectLabels( 'Z453', 'Z7', [ self::EN => 'example' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z454', 'Z7', [ self::EN => 'Example label' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z455', 'Z6', [ self::EN => 'Some more examples' ] );

		$res = $this->zobjectStore->fetchZObjectLabels(
			'example',
			false,
			[ self::EN ],
			'Z7',
			null,
			5000
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 2, $res->numRows() );

		$res = $this->zobjectStore->fetchZObjectLabels(
			'example',
			false,
			[ self::EN ],
			'Z6',
			null,
			5000
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 1, $res->numRows() );
	}

	/**
	 * @covers ::fetchZObjectLabels
	 */
	public function testFetchZObjectLabels_languages() {
		$response = $this->zobjectStore->insertZObjectLabels( 'Z456', 'Z6', [ self::EN => 'txt' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z457', 'Z6', [ self::ES => 'txt' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z458', 'Z6', [ self::FR => 'txt' ] );

		$res = $this->zobjectStore->fetchZObjectLabels(
			'txt',
			false,
			[ self::EN, self::FR ],
			null,
			null,
			5000
		);

		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 2, $res->numRows() );
		$this->assertSame( self::EN, $res->fetchRow()[ 'wlzl_language' ] );
		$this->assertSame( self::FR, $res->fetchRow()[ 'wlzl_language' ] );
	}

	/**
	 * @covers ::fetchZObjectLabels
	 */
	public function testFetchZObjectLabels_pagination() {
		$response = $this->zobjectStore->insertZObjectLabels( 'Z459', 'Z6', [ self::EN => 'label one' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z460', 'Z6', [ self::EN => 'label two' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z461', 'Z6', [ self::EN => 'label three' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z462', 'Z6', [ self::EN => 'label four' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z463', 'Z6', [ self::EN => 'label five' ] );

		// First page
		$res = $this->zobjectStore->fetchZObjectLabels( 'label', false, [ self::EN ], null, null, 2 );

		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 2, $res->numRows() );
		$first = $res->fetchRow();
		$second = $res->fetchRow();
		$this->assertSame( 'label one', $first[ 'wlzl_label' ] );
		$this->assertSame( 'label two', $second[ 'wlzl_label' ] );

		$continue = strval( $second[ 'wlzl_id' ] + 1 );

		// Second page
		$res = $this->zobjectStore->fetchZObjectLabels( 'label', false, [ self::EN ], null, $continue, 2 );

		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 2, $res->numRows() );
		$first = $res->fetchRow();
		$second = $res->fetchRow();
		$this->assertSame( 'label three', $first[ 'wlzl_label' ] );
		$this->assertSame( 'label four', $second[ 'wlzl_label' ] );

		$continue = strval( $second[ 'wlzl_id' ] + 1 );

		// Third page
		$res = $this->zobjectStore->fetchZObjectLabels( 'label', false, [ self::EN ], null, $continue, 2 );
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 1, $res->numRows() );
		$this->assertSame( 'label five', $res->fetchRow()[ 'wlzl_label' ] );
	}

	/**
	 * @covers ::insertZFunctionReference
	 */
	public function testInsertZFunctionReference() {
		$response = $this->zobjectStore->insertZFunctionReference( 'Z10030', 'Z10029', 'Z14' );
		$this->assertTrue( $response );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_function_join',
			/* SELECT */ [ 'wlzf_ref_zid' ],
			/* WHERE */ [
				'wlzf_zfunction_zid' => 'Z10029',
				'wlzf_type' => 'Z14'
			],
			__METHOD__
		);

		$this->assertSame( 1, $res->numRows() );
	}

	/**
	 * @covers ::insertZFunctionReference
	 * @covers ::findFirstZImplementationFunction
	 */
	public function testFindFirstZImplementationFunction() {
		$response = $this->zobjectStore->insertZFunctionReference( 'Z10030', 'Z10029', 'Z14' );
		$this->assertTrue( $response );

		$zid = $this->zobjectStore->findFirstZImplementationFunction();

		$this->assertEquals( 'Z10029', $zid );
	}

	/**
	 * @covers ::insertZFunctionReference
	 * @covers ::findReferencedZObjectsByZFunctionId
	 */
	public function testFindReferencedZObjectsByZFunctionId() {
		$response = $this->zobjectStore->insertZFunctionReference( 'Z10030', 'Z10029', 'Z14' );
		$this->assertTrue( $response );

		$response = $this->zobjectStore->insertZFunctionReference( 'Z10031', 'Z10029', 'Z14' );
		$this->assertTrue( $response );

		$res = $this->zobjectStore->findReferencedZObjectsByZFunctionId( 'Z10029', 'Z14' );

		$this->assertCount( 2, $res );
		$this->assertEquals( [ 'Z10030', 'Z10031' ], $res );
	}

	/**
	 * @covers ::insertZFunctionReference
	 * @covers ::deleteZFunctionReference
	 */
	public function testDeleteZFunctionReference() {
		$response = $this->zobjectStore->insertZFunctionReference( 'Z10030', 'Z10029', 'Z14' );
		$this->assertTrue( $response );

		$this->zobjectStore->deleteZFunctionReference( 'Z10030' );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->select(
			/* FROM */ 'wikilambda_zobject_function_join',
			/* SELECT */ [ 'wlzf_ref_zid' ],
			/* WHERE */ [
				'wlzf_zfunction_zid' => 'Z10029',
				'wlzf_type' => 'Z14'
			],
			__METHOD__
		);

		$this->assertSame( 0, $res->numRows() );
	}
}
