<?php

/**
 * WikiLambda unit test suite for the ZObjectStore file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectPage;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\MediaWikiServices;
use Title;
use Wikimedia\Rdbms\IResultWrapper;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjectStore
 * @group Database
 */
class ZObjectStoreTest extends WikiLambdaIntegrationTestCase {

	/** @var ZObjectStore */
	protected $zobjectStore;

	protected function setUp(): void {
		parent::setUp();
		$this->zobjectStore = WikiLambdaServices::getZObjectStore();
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
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$page = $this->zobjectStore->createNewZObject( $input, 'Create summary', $sysopUser );
		$this->assertTrue( $page instanceof ZObjectPage );
		$this->assertTrue( $page->isOK() );

		$title = Title::newFromText( $zid, NS_MAIN );
		$zObjectContent = $this->zobjectStore->fetchZObjectByTitle( $title );
		$this->assertTrue( $zObjectContent instanceof ZObjectContent );

		$this->assertEquals( $zid, $zObjectContent->getZid() );

		$zObject = $zObjectContent->getZObject();
		$this->assertTrue( $zObject instanceof ZPersistentObject );

		$zObjectInnerValue = $zObject->getZValue();
		$this->assertTrue( is_string( $zObjectInnerValue ) );
		$this->assertEquals( 'hello', $zObjectInnerValue );

		$zids = $this->zobjectStore->fetchAllZids();
		$this->assertSame( [ $zid ], $zids );
	}

	/**
	 * @covers ::fetchZObjectByTitle
	 */
	public function testFetchZObjectByTitle_invalid() {
		$invalidZid = 'Z0999';
		$title = Title::newFromText( $invalidZid, NS_MAIN );
		$zobject = $this->zobjectStore->fetchZObjectByTitle( $title );

		$this->assertFalse( $zobject instanceof ZObjectContent );
		$this->assertFalse( $zobject );

		$zids = $this->zobjectStore->fetchAllZids();
		$this->assertNotContains( $invalidZid, $zids );
	}

	/**
	 * @covers ::fetchBatchZObjects
	 * @covers ::getNextAvailableZid
	 * @covers ::fetchAllZids
	 */
	public function testFetchBatchZObjects() {
		$sysopUser = $this->getTestSysop()->getUser();

		$firstZid = $this->zobjectStore->getNextAvailableZid();
		$input = '{ "Z1K1": "Z2", "Z2K1": "Z0",'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$page = $this->zobjectStore->createNewZObject( $input, 'Create summary', $sysopUser );
		$this->assertTrue( $page instanceof ZObjectPage );
		$this->assertTrue( $page->isOK() );

		$secondZid = $this->zobjectStore->getNextAvailableZid();
		$input = '{ "Z1K1": "Z2", "Z2K1": "Z0",'
			. '"Z2K2": "world",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$page = $this->zobjectStore->createNewZObject( $input, 'Create summary', $sysopUser );
		$this->assertTrue( $page instanceof ZObjectPage );
		$this->assertTrue( $page->isOK() );

		$response = $this->zobjectStore->fetchBatchZObjects( [ $firstZid, $secondZid ] );

		$this->assertIsArray( $response );
		$this->assertCount( 2, $response );
		$this->assertArrayHasKey( $firstZid, $response );
		$this->assertArrayHasKey( $secondZid, $response );

		$firstZObject = $response[ $firstZid ];
		$this->assertTrue( $firstZObject instanceof ZPersistentObject );
		$this->assertEquals( $firstZid, $firstZObject->getZid() );
		$firstZObjectInnerValue = $firstZObject->getZValue();
		$this->assertTrue( is_string( $firstZObjectInnerValue ) );
		$this->assertEquals( 'hello', $firstZObjectInnerValue );

		$secondZObject = $response[ $secondZid ];
		$this->assertTrue( $secondZObject instanceof ZPersistentObject );
		$this->assertEquals( $secondZid, $secondZObject->getZid() );
		$secondZObjectInnerValue = $secondZObject->getZValue();
		$this->assertTrue( is_string( $secondZObjectInnerValue ) );
		$this->assertEquals( 'world', $secondZObjectInnerValue );

		$zids = $this->zobjectStore->fetchAllZids();
		$this->assertSame( [ $firstZid, $secondZid ], $zids );
	}

	/**
	 * @dataProvider provideCreateNewZObject
	 * @covers ::createNewZObject
	 */
	public function testCreateNewZObject( $input, $expected ) {
		$sysopUser = $this->getTestSysop()->getUser();
		$status = $this->zobjectStore->createNewZObject( $input, 'Create summary', $sysopUser );

		$this->assertTrue( $status instanceof ZObjectPage );
		if ( $expected === true ) {
			$this->assertTrue( $status->isOK() );
		} else {
			$this->assertFalse( $status->isOK() );
			$this->assertStringContainsString( $expected, $status->getErrors() );
		}
	}

	public function provideCreateNewZObject() {
		return [
			'incorrect JSON' => [
				'{ "Z1K1"; Z2 ]',
				ZErrorTypeRegistry::Z_ERROR_INVALID_JSON
			],
			'incorrect ZObject, no id' => [
				'{ "Z1K1": "Z2", "Z2K2": "hello", "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'incorrect ZObject, no value' => [
				'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'incorrect ZObject, no label' => [
				'{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": "hello" }',
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'correct ZObject' => [
				'{ "Z1K1": "Z2", "Z2K1": "Z0",'
					. ' "Z2K2": "hello",'
					. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
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
		$title = Title::newFromText( $zid, NS_MAIN );
		$zObject = '{ "Z1K1": "Z2", "Z2K1": "Z0",'
			. ' "Z2K2": "hello",'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$savedZObject = '{ "Z1K1": "Z2", "Z2K1": "' . $zid . '",'
			. ' "Z2K2": "hello",'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		$page = $this->zobjectStore->createNewZObject( $zObject, 'Create ZObject', $sysopUser );
		$this->assertTrue( $page instanceof ZObjectPage );
		$this->assertTrue( $page->isOK() );

		$zobject = $this->zobjectStore->fetchZObjectByTitle( $title );
		$this->assertTrue( $zobject instanceof ZObjectContent );
		// We compare the JSONs after decoding because it's saved prettified
		$this->assertEquals( json_decode( $zobject->getText() ), json_decode( $savedZObject ) );
	}

	/**
	 * @covers ::updateZObject
	 * @covers ::fetchZObjectByTitle
	 */
	public function testUpdateZObject() {
		$sysopUser = $this->getTestSysop()->getUser();

		$zid = $this->zobjectStore->getNextAvailableZid();
		$title = Title::newFromText( $zid, NS_MAIN );
		$input = '{ "Z1K1": "Z2", "Z2K1": "Z0",'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		// We create a new ZObject
		$this->zobjectStore->createNewZObject( $input, 'Create summary', $sysopUser );
		$zobject = $this->zobjectStore->fetchZObjectByTitle( $title );

		$revisionStore = $this->getServiceContainer()->getRevisionStore();
		$initialRevision = $revisionStore->getKnownCurrentRevision( $title )->getId();

		// We change the text representation of the ZObject to update it in the DB
		$zobjectNewText = str_replace( "hello", "bye", $zobject->getText() );

		// Update the ZObject
		$this->zobjectStore->updateZObject( $zid, $zobjectNewText, 'Update summary', $sysopUser );

		// Fetch it again and check whether the changes were saved
		$updatedZObject = $this->zobjectStore->fetchZObjectByTitle( $title );
		$updatedRevision = $revisionStore->getKnownCurrentRevision( $title )->getId();
		$this->assertTrue( $updatedZObject instanceof ZObjectContent );
		$this->assertEquals( $updatedZObject->getText(), $zobjectNewText );
		$this->assertNotEquals( $updatedRevision, $initialRevision );

		$refetchedZObject = $this->zobjectStore->fetchZObjectByTitle( $title, $initialRevision );
		$this->assertEquals( $zobject->getText(), $refetchedZObject->getText() );
	}

	/**
	 * @covers ::updateZObject
	 */
	public function testUpdateZObject_nonTitle() {
		$status = $this->zobjectStore->updateZObject(
			'',
			'',
			'Update summary',
			$this->getTestSysop()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_INVALID_TITLE, $status->getErrors() );
	}

	/**
	 * @covers ::updateZObject
	 */
	public function testUpdateZObject_nonContent() {
		$zid = $this->zobjectStore->getNextAvailableZid();
		$status = $this->zobjectStore->updateZObject(
			$zid,
			'',
			'Update summary',
			$this->getTestSysop()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_INVALID_JSON, $status->getErrors() );
	}

	/**
	 * @covers ::updateZObject
	 */
	public function testUpdateZObject_badContent() {
		$zid = $this->zobjectStore->getNextAvailableZid();
		$status = $this->zobjectStore->updateZObject(
			$zid,
			'{"Z1K1":"Z6"}',
			'Update summary',
			$this->getTestSysop()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_SCHEMA_TYPE_MISMATCH, $status->getErrors() );
	}

	/**
	 * @covers ::updateZObject
	 */
	public function testUpdateZObject_badZ2K2() {
		$zid = $this->zobjectStore->getNextAvailableZid();
		$input = '{ "Z1K1": "Z2", "Z2K1": "Z0",'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		$status = $this->zobjectStore->updateZObject(
			$zid,
			$input,
			'Update summary',
			$this->getTestSysop()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_UNMATCHING_ZID, $status->getErrors() );
	}

	/**
	 * @covers ::insertZObjectLabels
	 */
	public function testInsertZObjectLabels() {
		$labels = [
			self::ZLANG['en'] => 'label',
			self::ZLANG['es'] => 'etiqueta',
			self::ZLANG['fr'] => 'marque'
		];

		$response = $this->zobjectStore->insertZObjectLabels( 'Z222', 'Z4', $labels );
		$this->assertTrue( $response );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzl_language', 'wlzl_label' ] )
			 ->from( 'wikilambda_zobject_labels' )
			 ->where( [
				 'wlzl_zobject_zid' => 'Z222',
				 'wlzl_type' => 'Z4'
			 ] )
			 ->fetchResultSet();
		$this->assertEquals( 3, $res->numRows() );

		$conflicts = $this->zobjectStore->findZObjectLabelConflicts( 'Z333', 'Z4', $labels );
		$this->assertEquals( count( $conflicts ), 3 );
	}

	/**
	 * @covers ::insertZObjectLabels
	 * @covers ::findZObjectLabelConflicts
	 */
	public function testFindZObjectLabelConflicts() {
		$labels = [
			self::ZLANG['en'] => 'label',
			self::ZLANG['es'] => 'etiqueta',
			self::ZLANG['fr'] => 'marque'
		];

		$response = $this->zobjectStore->insertZObjectLabels( 'Z222', 'Z4', $labels );
		$this->assertTrue( $response );

		$conflicts = $this->zobjectStore->findZObjectLabelConflicts( 'Z333', 'Z4', $labels );
		$this->assertEquals( count( $conflicts ), 3 );

		$conflicts = $this->zobjectStore->findZObjectLabelConflicts( 'Z333', 'Z4', [ self::ZLANG['de'] => 'label' ] );
		$this->assertEquals( count( $conflicts ), 0 );
	}

	/**
	 * @covers ::insertZObjectLabelConflicts
	 */
	public function testInsertZObjectLabelConflicts() {
		$conflicts = [
			self::ZLANG['en'] => 'Z222',
			self::ZLANG['es'] => 'Z222',
			self::ZLANG['fr'] => 'Z222'
		];

		$response = $this->zobjectStore->insertZObjectLabelConflicts( 'Z333', $conflicts );
		$this->assertTrue( $response );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzlc_language' ] )
			 ->from( 'wikilambda_zobject_label_conflicts' )
			 ->where( [
				 'wlzlc_existing_zid' => 'Z222',
				 'wlzlc_conflicting_zid' => 'Z333',
			 ] )
			 ->fetchResultSet();
		$this->assertEquals( 3, $res->numRows() );
	}

	/**
	 * @covers ::insertZObjectLabels
	 * @covers ::deleteZObjectLabelsByZid
	 */
	public function testDeleteZObjectLabelsByZid() {
		$labels = [
			self::ZLANG['en'] => 'label',
			self::ZLANG['es'] => 'etiqueta',
			self::ZLANG['fr'] => 'marque'
		];

		$response = $this->zobjectStore->insertZObjectLabels( 'Z222', 'Z4', $labels );
		$this->assertTrue( $response );

		$this->zobjectStore->deleteZObjectLabelsByZid( 'Z222' );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzl_language', 'wlzl_label' ] )
			 ->from( 'wikilambda_zobject_labels' )
			 ->where( [
				 'wlzl_zobject_zid' => 'Z222',
				 'wlzl_type' => 'Z4'
			 ] )
			 ->fetchResultSet();
		$this->assertSame( 0, $res->numRows() );
	}

	/**
	 * @covers ::insertZObjectLabelConflicts
	 * @covers ::deleteZObjectLabelConflictsByZid
	 */
	public function testDeleteZObjectLabelConflictsByZid() {
		$this->zobjectStore->insertZObjectLabelConflicts( 'Z222', [ self::ZLANG['en'] => 'Z333' ] );
		$this->zobjectStore->insertZObjectLabelConflicts( 'Z333', [ self::ZLANG['es'] => 'Z444' ] );

		$this->zobjectStore->deleteZObjectLabelConflictsByZid( 'Z333' );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzlc_language' ] )
			 ->from( 'wikilambda_zobject_label_conflicts' )
			 ->where( $dbr->makeList( [
				 'wlzlc_existing_zid' => 'Z333',
				 'wlzlc_conflicting_zid' => 'Z333',
			 ], $dbr::LIST_OR ) )
			 ->fetchResultSet();
		$this->assertSame( 0, $res->numRows() );
	}

	/**
	 * @covers ::fetchZidsOfType
	 */
	public function testFetchZidsOfType() {
		$response = $this->zobjectStore->insertZObjectLabels(
			'Z444', 'Z7', [ self::ZLANG['en'] => 'label for Z7' ]
		);
		$response = $this->zobjectStore->insertZObjectLabels(
			'Z445', 'Z7', [ self::ZLANG['en'] => 'other label for Z7' ]
		);
		$response = $this->zobjectStore->insertZObjectLabels(
			'Z446', 'Z7', [ self::ZLANG['en'] => 'one more label for Z7' ]
		);
		$response = $this->zobjectStore->insertZObjectLabels(
			'Z447', 'Z8', [ self::ZLANG['en'] => 'label for Z8' ]
		);
		$response = $this->zobjectStore->insertZObjectLabels(
			'Z449', 'Z9', [ self::ZLANG['en'] => 'label for Z9' ]
		);

		$zids = $this->zobjectStore->fetchZidsOfType( 'Z7' );
		sort( $zids );

		$this->assertSame( $zids, [ 'Z444', 'Z445', 'Z446' ] );
		$this->assertSame( $this->zobjectStore->fetchZidsOfType( 'Z8' ), [ 'Z447' ] );
		$this->assertSame( $this->zobjectStore->fetchZidsOfType( 'Z888' ), [] );
	}

	/**
	 * @covers ::searchZObjectLabels
	 */
	public function testSearchZObjectLabels_exactMatch() {
		$response = $this->zobjectStore->insertZObjectLabels(
			'Z450', 'Z7', [ self::ZLANG['en'] => 'example' ]
		);
		$response = $this->zobjectStore->insertZObjectLabels(
			'Z451', 'Z7', [ self::ZLANG['en'] => 'Example label' ]
		);
		$response = $this->zobjectStore->insertZObjectLabels(
			'Z452', 'Z7', [ self::ZLANG['en'] => 'Some more examples' ]
		);

		$res = $this->zobjectStore->searchZObjectLabels(
			'Example', true, [ self::ZLANG['en'] ], null, null, false, null, 5000
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 1, $res->numRows() );

		$res = $this->zobjectStore->searchZObjectLabels(
			'Example', false, [ self::ZLANG['en'] ], null, null, false, null, 5000
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 3, $res->numRows() );
	}

	/**
	 * @covers ::searchZObjectLabels
	 */
	public function testSearchZObjectLabels_type() {
		$response = $this->zobjectStore->insertZObjectLabels(
			'Z453', 'Z7', [ self::ZLANG['en'] => 'example' ]
		);
		$response = $this->zobjectStore->insertZObjectLabels(
			'Z454', 'Z7', [ self::ZLANG['en'] => 'Example label' ]
		);
		$response = $this->zobjectStore->insertZObjectLabels(
			'Z455', 'Z6', [ self::ZLANG['en'] => 'Some more examples' ]
		);

		$res = $this->zobjectStore->searchZObjectLabels(
			'example', false, [ self::ZLANG['en'] ], 'Z7', null, false, null, 5000
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 2, $res->numRows() );

		$res = $this->zobjectStore->searchZObjectLabels(
			'example', false, [ self::ZLANG['en'] ], 'Z6', null, false, null, 5000
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 1, $res->numRows() );
	}

	/**
	 * @covers ::searchZObjectLabels
	 */
	public function testSearchZObjectLabels_languages() {
		$response = $this->zobjectStore->insertZObjectLabels( 'Z456', 'Z6', [ self::ZLANG['en'] => 'txt' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z457', 'Z6', [ self::ZLANG['es'] => 'txt' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z458', 'Z6', [ self::ZLANG['fr'] => 'txt' ] );

		$res = $this->zobjectStore->searchZObjectLabels(
			'txt', false, [ self::ZLANG['en'], self::ZLANG['fr'] ], null, null, false, null, 5000
		);

		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 2, $res->numRows() );
		$this->assertSame( self::ZLANG['en'], $res->fetchRow()[ 'wlzl_language' ] );
		$this->assertSame( self::ZLANG['fr'], $res->fetchRow()[ 'wlzl_language' ] );
	}

	/**
	 * @covers ::searchZObjectLabels
	 */
	public function testSearchZObjectLabels_pagination() {
		$response = $this->zobjectStore->insertZObjectLabels( 'Z459', 'Z6', [ self::ZLANG['en'] => 'label one' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z460', 'Z6', [ self::ZLANG['en'] => 'label two' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z461', 'Z6', [ self::ZLANG['en'] => 'label three' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z462', 'Z6', [ self::ZLANG['en'] => 'label four' ] );
		$response = $this->zobjectStore->insertZObjectLabels( 'Z463', 'Z6', [ self::ZLANG['en'] => 'label five' ] );

		// First page
		$res = $this->zobjectStore->searchZObjectLabels(
			'label',
			false,
			[ self::ZLANG['en'] ],
			null,
			null,
			false,
			null,
			2
		);

		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 2, $res->numRows() );
		$first = $res->fetchRow();
		$second = $res->fetchRow();
		$this->assertSame( 'label one', $first[ 'wlzl_label' ] );
		$this->assertSame( 'label two', $second[ 'wlzl_label' ] );

		$continue = strval( $second[ 'wlzl_id' ] + 1 );

		// Second page
		$res = $this->zobjectStore->searchZObjectLabels(
			'label',
			false,
			[ self::ZLANG['en'] ],
			null,
			null,
			false,
			$continue,
			2
		);

		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 2, $res->numRows() );
		$first = $res->fetchRow();
		$second = $res->fetchRow();
		$this->assertSame( 'label three', $first[ 'wlzl_label' ] );
		$this->assertSame( 'label four', $second[ 'wlzl_label' ] );

		$continue = strval( $second[ 'wlzl_id' ] + 1 );

		// Third page
		$res = $this->zobjectStore->searchZObjectLabels(
			'label',
			false,
			[ self::ZLANG['en'] ],
			null,
			null,
			false,
			$continue,
			2
		);

		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 1, $res->numRows() );
		$this->assertSame( 'label five', $res->fetchRow()[ 'wlzl_label' ] );
	}

	/**
	 * @covers ::fetchZObjectLabel
	 */
	public function testFetchZObjectLabel() {
		$response = $this->zobjectStore->insertZObjectLabels(
			'Z464',
			'Z6',
			[
				self::ZLANG['en'] => 'txt-en',
				self::ZLANG['es'] => 'txt-es',
				self::ZLANG['fr'] => 'txt-fr'
			]
		);

		// Register the languages we'll use
		$this->registerLangs( [ 'en','es','fr','de' ] );

		$this->assertSame(
			'txt-en',
			$this->zobjectStore->fetchZObjectLabel( 'Z464', 'en' ),
			'Basic fetch works'
		);

		$this->assertSame(
			'txt-fr',
			$this->zobjectStore->fetchZObjectLabel( 'Z464', 'fr' ),
			'Fetch from language with defined label works'
		);

		$this->assertSame(
			'txt-es',
			$this->zobjectStore->fetchZObjectLabel( 'Z464', 'es' ),
			'Fetch from another language with defined label works'
		);

		$this->assertSame(
			'txt-en',
			$this->zobjectStore->fetchZObjectLabel( 'Z464', 'de' ),
			'Fallback from language with no defined label works'
		);

		$this->assertSame(
			null,
			$this->zobjectStore->fetchZObjectLabel( 'Z464', 'de', false ),
			'Fallback from language with no defined label works when rejecting fallbacks'
		);
	}

	/**
	 * @covers ::insertZFunctionReference
	 */
	public function testInsertZFunctionReference() {
		$response = $this->zobjectStore->insertZFunctionReference( 'Z10030', 'Z10029', 'Z14' );
		$this->assertTrue( $response );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzf_ref_zid' ] )
			 ->from( 'wikilambda_zobject_function_join' )
			 ->where( [
				 'wlzf_zfunction_zid' => 'Z10029',
				 'wlzf_type' => 'Z14'
			 ] )
			 ->caller( __METHOD__ )
			 ->fetchResultSet();

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
	 * @covers ::findReferencedZObjectsByZFunctionIdAsList
	 */
	public function testFindReferencedZObjectsByZFunctionId() {
		$response = $this->zobjectStore->insertZFunctionReference( 'Z10030', 'Z10029', 'Z14' );
		$this->assertTrue( $response );

		$response = $this->zobjectStore->insertZFunctionReference( 'Z10031', 'Z10029', 'Z14' );
		$this->assertTrue( $response );

		$res = $this->zobjectStore->findReferencedZObjectsByZFunctionIdAsList( 'Z10029', 'Z14' );
		$this->assertCount( 2, $res );

		// On postgres the result may not in order
		sort( $res );

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
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzf_ref_zid' ] )
			 ->from( 'wikilambda_zobject_function_join' )
			 ->where( [
				 'wlzf_zfunction_zid' => 'Z10029',
				 'wlzf_type' => 'Z14'
			 ] )
			 ->caller( __METHOD__ )
			 ->fetchResultSet();

		$this->assertSame( 0, $res->numRows() );
	}

	/**
	 * @covers ::fetchZFunctionReturnType
	 */
	public function testFetchZFunctionReturnType() {
		$this->insertZids( [ 'Z17', 'Z801', 'Z844' ] );

		$this->assertEquals(
			'Z1',
			$this->zobjectStore->fetchZFunctionReturnType( 'Z801' ),
			'Return type of function Echo is Z1 (Object)'
		);

		$this->assertEquals(
			'Z40',
			$this->zobjectStore->fetchZFunctionReturnType( 'Z844' ),
			'Return type of function Boolean equality is Z40 (Boolean)'
		);

		$this->assertNull(
			$this->zobjectStore->fetchZFunctionReturnType( 'Z8' ),
			'Return type of a non-function is null'
		);
	}

	/**
	 * @covers ::clearFunctionsSecondaryTables
	 */
	public function testClearFunctionsSecondaryTables() {
		$response = $this->zobjectStore->insertZFunctionReference( 'Z10030', 'Z10029', 'Z14' );
		$response = $this->zobjectStore->insertZFunctionReference( 'Z10031', 'Z10029', 'Z14' );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzf_ref_zid' ] )
			->from( 'wikilambda_zobject_function_join' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$this->assertSame( 2, $res->numRows() );

		// Now clear the table:
		$this->zobjectStore->clearFunctionsSecondaryTables();

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzf_ref_zid' ] )
			->from( 'wikilambda_zobject_function_join' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$this->assertSame( 0, $res->numRows(), 'The secondary function join table has been wiped clean' );
	}

	/**
	 * @covers ::clearLabelsSecondaryTables
	 */
	public function testClearLabelsSecondaryTables() {
		$labels = [
			self::ZLANG['en'] => 'label',
			self::ZLANG['es'] => 'etiqueta',
			self::ZLANG['fr'] => 'marque'
		];

		$this->zobjectStore->insertZObjectLabels( 'Z222', 'Z4', $labels );

		$conflicts = [
			self::ZLANG['en'] => 'Z222',
			self::ZLANG['es'] => 'Z222',
			self::ZLANG['fr'] => 'Z222'
		];

		$this->zobjectStore->insertZObjectLabelConflicts( 'Z333', $conflicts );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );

		$resLabels = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_id' ] )
			->from( 'wikilambda_zobject_labels' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$resConflicts = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzlc_id' ] )
			->from( 'wikilambda_zobject_label_conflicts' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$this->assertEquals( 3, $resLabels->numRows() );
		$this->assertEquals( 3, $resConflicts->numRows() );

		// Now clear the tables:
		$this->zobjectStore->clearLabelsSecondaryTables();

		$resLabels = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_id' ] )
			->from( 'wikilambda_zobject_labels' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$resConflicts = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzlc_id' ] )
			->from( 'wikilambda_zobject_label_conflicts' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$this->assertSame( 0, $resLabels->numRows(), 'The secondary labels table has been wiped clean' );
		$this->assertSame( 0, $resConflicts->numRows(), 'The secondary label conflicts table has been wiped clean' );
	}

	/**
	 * @covers ::deleteFromFunctionsSecondaryTables
	 */
	public function testDeleteFromFunctionsSecondaryTables() {
		$response = $this->zobjectStore->insertZFunctionReference( 'Z10030', 'Z10029', 'Z14' );
		$response = $this->zobjectStore->insertZFunctionReference( 'Z10031', 'Z10028', 'Z14' );
		$response = $this->zobjectStore->insertZFunctionReference( 'Z10032', 'Z10027', 'Z20' );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );

		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzf_ref_zid' ] )
			->from( 'wikilambda_zobject_function_join' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$this->assertSame( 3, $res->numRows() );

		// Now clear the table:
		$this->zobjectStore->deleteFromFunctionsSecondaryTables( [ 'Z10029', 'Z10032' ] );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );

		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzf_ref_zid' ] )
			->from( 'wikilambda_zobject_function_join' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$this->assertSame( 1, $res->numRows(), 'The secondary function join table has been cleared of the given zids' );
	}

	/**
	 * @covers ::deleteFromLabelsSecondaryTables
	 */
	public function testDeleteFromLabelsSecondaryTables() {
		$labels1 = [ self::ZLANG['en'] => 'label1', ];
		$labels2 = [ self::ZLANG['en'] => 'label2', ];
		$labels3 = [ self::ZLANG['en'] => 'label3', ];

		$this->zobjectStore->insertZObjectLabels( 'Z222', 'Z4', $labels1 );
		$this->zobjectStore->insertZObjectLabels( 'Z223', 'Z4', $labels2 );
		$this->zobjectStore->insertZObjectLabels( 'Z224', 'Z4', $labels3 );

		$conflicts1 = [ self::ZLANG['en'] => 'Z222' ];
		$conflicts2 = [ self::ZLANG['en'] => 'Z223' ];
		$conflicts3 = [ self::ZLANG['en'] => 'Z224' ];

		$this->zobjectStore->insertZObjectLabelConflicts( 'Z333', $conflicts1 );
		$this->zobjectStore->insertZObjectLabelConflicts( 'Z334', $conflicts2 );
		$this->zobjectStore->insertZObjectLabelConflicts( 'Z335', $conflicts3 );

		$dbr = MediaWikiServices::getInstance()->getDBLoadBalancer()->getConnectionRef( DB_PRIMARY );

		$resLabels = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_id' ] )
			->from( 'wikilambda_zobject_labels' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$resConflicts = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzlc_id' ] )
			->from( 'wikilambda_zobject_label_conflicts' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$this->assertEquals( 3, $resLabels->numRows() );
		$this->assertEquals( 3, $resConflicts->numRows() );

		// Now clear the tables:
		$this->zobjectStore->deleteFromLabelsSecondaryTables( [ 'Z222', 'Z223' ] );

		$resLabels = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzl_id' ] )
			->from( 'wikilambda_zobject_labels' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$resConflicts = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzlc_id' ] )
			->from( 'wikilambda_zobject_label_conflicts' )
			->caller( __METHOD__ )
			->fetchResultSet();

		$this->assertSame( 1, $resLabels->numRows(),
			'The secondary labels table has been cleared of the given zids' );
		$this->assertSame( 1, $resConflicts->numRows(),
			'The secondary label conflicts table has been cleared of the given zids' );
	}
}
