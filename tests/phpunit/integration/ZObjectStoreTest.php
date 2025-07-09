<?php

/**
 * WikiLambda unit test suite for the ZObjectStore file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectPage;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Title\Title;
use stdClass;
use Wikimedia\Rdbms\IResultWrapper;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectStore
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectPage
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataUpdate
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectSecondaryDataRemoval
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject
 * @group Database
 */
class ZObjectStoreTest extends WikiLambdaIntegrationTestCase {

	private static string $testResponse = '{ "Z1K1": "Z22", "Z22K1": "Z24", "Z22K2": "Z24" }';
	private ZObjectStore $zobjectStore;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
		$this->zobjectStore = WikiLambdaServices::getZObjectStore();
	}

	public function testGetNextAvailableZid_first() {
		$zid = $this->zobjectStore->getNextAvailableZid();
		$this->assertEquals( 'Z10000', $zid );
	}

	public function testfetchZObject_valid() {
		$zid = $this->zobjectStore->getNextAvailableZid();
		$sysopUser = $this->getTestSysop()->getUser();

		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$page = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			$input,
			'Create summary',
			$sysopUser
		);
		$this->assertTrue( $page instanceof ZObjectPage );
		$this->assertTrue( $page->isOK() );

		$zObject = $this->zobjectStore->fetchZObject( $zid );
		$this->assertTrue( $zObject instanceof ZObjectContent );
	}

	public function testfetchZObject_missing() {
		$zObject = $this->zobjectStore->fetchZObject( 'Z400' );
		$this->assertFalse( $zObject );
	}

	public function testfetchZObject_invalid() {
		$zObject = $this->zobjectStore->fetchZObject( 'Z0' );
		$this->assertFalse( $zObject );
	}

	public function testFetchZObjectByTitle_valid() {
		$zid = $this->zobjectStore->getNextAvailableZid();
		$sysopUser = $this->getTestSysop()->getUser();

		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$page = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(), $input, 'Create summary', $sysopUser
		);
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

	public function testFetchZObjectByTitle_revision() {
		$revisionStore = $this->getServiceContainer()->getRevisionStore();
		$sysopUser = $this->getTestSysop()->getUser();

		$zid = $this->zobjectStore->getNextAvailableZid();
		$title = Title::newFromText( $zid, NS_MAIN );

		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		// First revision:
		$this->zobjectStore->createNewZObject(
			RequestContext::getMain(), $input, 'Create summary', $sysopUser
		);
		$zobject = $this->zobjectStore->fetchZObjectByTitle( $title );

		// We change the text representation of the ZObject to update it in the DB
		$firstObjectText = $zobject->getText();
		$secondObjectText = str_replace( "hello", "bye", $zobject->getText() );

		// Second revision:
		$page = $this->zobjectStore->updateZObject(
			RequestContext::getMain(), $zid, $secondObjectText, 'Update summary', $sysopUser
		);

		// Get revision numbers:
		$revisions = $revisionStore->getRevisionIdsBetween( $page->getWikiPage()->getId() );

		// We fetch by title and revision number
		$firstRevision = $this->zobjectStore->fetchZObjectByTitle( $title, $revisions[0] );
		$secondRevision = $this->zobjectStore->fetchZObjectByTitle( $title, $revisions[1] );

		$this->assertEquals( $firstRevision->getText(), $firstObjectText );
		$this->assertEquals( $secondRevision->getText(), $secondObjectText );
	}

	public function testFetchZObjectByTitle_invalid() {
		$invalidZid = 'Z0999';
		$title = Title::newFromText( $invalidZid, NS_MAIN );
		$zobject = $this->zobjectStore->fetchZObjectByTitle( $title );

		$this->assertFalse( $zobject instanceof ZObjectContent );
		$this->assertFalse( $zobject );

		$zids = $this->zobjectStore->fetchAllZids();
		$this->assertNotContains( $invalidZid, $zids );
	}

	public function testFetchBatchZObjects() {
		$sysopUser = $this->getTestSysop()->getUser();
		$this->insertZids( [ 'Z6' ] );

		$firstZid = $this->zobjectStore->getNextAvailableZid();
		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$page = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(), $input, 'Create summary', $sysopUser
		);
		$this->assertTrue( $page instanceof ZObjectPage );
		$this->assertTrue( $page->isOK() );

		$secondZid = $this->zobjectStore->getNextAvailableZid();
		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": "world",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$page = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(), $input, 'Create summary', $sysopUser
		);
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
		$this->assertSame( [ $firstZid, $secondZid, 'Z6' ], $zids );
	}

	/**
	 * @dataProvider provideCreateNewZObject
	 */
	public function testCreateNewZObject( $input, $expected ) {
		$this->insertZids( [ 'Z6' ] );

		$sysopUser = $this->getTestSysop()->getUser();
		$status = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(), $input, 'Create summary', $sysopUser
		);

		$this->assertTrue( $status instanceof ZObjectPage );
		if ( $expected === true ) {
			$this->assertTrue( $status->isOK() );
		} else {
			$this->assertFalse( $status->isOK() );
			$this->assertStringContainsString( $expected, $status->getErrors() );
		}
	}

	public static function provideCreateNewZObject() {
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
				'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
					. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'incorrect ZObject, no label' => [
				'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" }, "Z2K2": "hello" }',
				ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED
			],
			'correct ZObject' => [
				'{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
					. ' "Z2K2": "hello",'
					. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }',
				true
			],
		];
	}

	public function testCreateNewZObject_canonicalized() {
		$sysopUser = $this->getTestSysop()->getUser();
		$this->insertZids( [ 'Z6' ] );

		$zid = $this->zobjectStore->getNextAvailableZid();
		$title = Title::newFromText( $zid, NS_MAIN );
		$zObject = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. ' "Z2K2": "hello",'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$savedZObject = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "' . $zid . '" },'
			. ' "Z2K2": "hello",'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		$page = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(), $zObject, 'Create ZObject', $sysopUser
		);
		$this->assertTrue( $page instanceof ZObjectPage );
		$this->assertTrue( $page->isOK() );

		$zobject = $this->zobjectStore->fetchZObjectByTitle( $title );
		$this->assertTrue( $zobject instanceof ZObjectContent );
		// We compare the JSONs after decoding because it's saved prettified
		$this->assertEquals( json_decode( $zobject->getText() ), json_decode( $savedZObject ) );
	}

	public function testUpdateZObjectAsSystemUser() {
		$basicUser = $this->getTestUser()->getUser();
		$this->insertZids( [ 'Z6' ] );

		$zid = 'Z401';
		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z401" },'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		// We try to create a new ZObject of a banned ZID (Z401), per DISALLOWED_ROOT_ZOBJECTS
		$status = $this->zobjectStore->updateZObject(
			RequestContext::getMain(),
			$zid,
			$input,
			'Creation summary',
			$basicUser,
			EDIT_NEW
		);
		$this->assertFalse( $status->isOK() );

		// We try to create a new but invalid ZObject, this time as the system
		$status = $this->zobjectStore->updateZObjectAsSystemUser(
			RequestContext::getMain(),
			$zid,
			$input,
			'Creation summary',
			EDIT_NEW
		);
		$this->assertTrue( $status->isOK() );
	}

	public function testUpdateZObject() {
		$sysopUser = $this->getTestSysop()->getUser();
		$this->insertZids( [ 'Z6' ] );

		$zid = $this->zobjectStore->getNextAvailableZid();
		$title = Title::newFromText( $zid, NS_MAIN );
		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		// We create a new ZObject
		$this->zobjectStore->createNewZObject( RequestContext::getMain(), $input, 'Create summary', $sysopUser );
		$zobject = $this->zobjectStore->fetchZObjectByTitle( $title );

		$revisionStore = $this->getServiceContainer()->getRevisionStore();
		$initialRevision = $revisionStore->getKnownCurrentRevision( $title )->getId();

		// We change the text representation of the ZObject to update it in the DB
		$zobjectNewText = str_replace( "hello", "bye", $zobject->getText() );

		// Update the ZObject
		$this->zobjectStore->updateZObject(
			RequestContext::getMain(), $zid, $zobjectNewText, 'Update summary', $sysopUser
		);

		// HACK (T343717): Re-get the Title so it's not cached on what the latest revision is
		$title = Title::newFromText( $zid, NS_MAIN );

		// Fetch it again and check whether the changes were saved
		$updatedZObject = $this->zobjectStore->fetchZObjectByTitle( $title );
		$updatedRevision = $revisionStore->getKnownCurrentRevision( $title )->getId();
		$this->assertTrue( $updatedZObject instanceof ZObjectContent );
		$this->assertEquals( $updatedZObject->getText(), $zobjectNewText );
		$this->assertNotEquals( $updatedRevision, $initialRevision );

		$refetchedZObject = $this->zobjectStore->fetchZObjectByTitle( $title, $initialRevision );
		$this->assertEquals( $zobject->getText(), $refetchedZObject->getText() );
	}

	public function testUpdateZObject_nonTitle() {
		$status = $this->zobjectStore->updateZObject(
			RequestContext::getMain(),
			'',
			'',
			'Update summary',
			$this->getTestSysop()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_INVALID_TITLE, $status->getErrors() );
	}

	public function testUpdateZObject_nonContent() {
		$zid = $this->zobjectStore->getNextAvailableZid();
		$status = $this->zobjectStore->updateZObject(
			RequestContext::getMain(),
			$zid,
			'',
			'Update summary',
			$this->getTestSysop()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_INVALID_JSON, $status->getErrors() );
	}

	public function testUpdateZObject_badContent() {
		// TODO (T375065): This issue is only detectable with structural validatioon
		$this->markTestSkipped( 'Only detectable with structural validation' );
		$zid = $this->zobjectStore->getNextAvailableZid();
		$status = $this->zobjectStore->updateZObject(
			RequestContext::getMain(),
			$zid,
			'{"Z1K1":"Z6"}',
			'Update summary',
			$this->getTestSysop()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_SCHEMA_TYPE_MISMATCH, $status->getErrors() );
	}

	public function testUpdateZObject_badZ2K2() {
		// TODO (T375065): This issue is only detectable with structural validatioon
		$this->markTestSkipped( 'Only detectable with structural validation' );
		$zid = $this->zobjectStore->getNextAvailableZid();
		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "' . $zid . '" },'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$status = $this->zobjectStore->updateZObject(
			RequestContext::getMain(),
			$zid,
			$input,
			'Update summary',
			$this->getTestSysop()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_UNMATCHING_ZID, $status->getErrors() );
	}

	public function testUpdateZObject_badLabelLength() {
		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1":"Z11","Z11K1":"Z1002","Z11K2":"The quick brown fox'
			. ' jumps over the lazy dog while the sun sets behind the mountains and the sky turns shades of orange,'
			. ' and pink painting a picturesque scene that makes everyone pause and appreciate the beauty of nature,'
			. ' feeling a sense of calm and serenity in the midst of a hectic day. Meanwhile, an inspired writer'
			. ' practices his craft by exploring a library of functions and give them the longest titles that nobody'
			. ' has ever dared to imagine. His intentions are pure; he believes functions are poetry, the most'
			. ' valuable jewels of language." } ] },'
			. '"Z2K4": {"Z1K1": "Z32", "Z32K1": [ "Z31" ] },'
			. '"Z2K5": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		$status = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			$input,
			'Create summary',
			$this->getTestSysop()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, $status->getErrors() );
		$this->assertStringContainsString( "Name in English", $status->getErrors() );
	}

	public function testUpdateZObject_badDescriptionLength() {
		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] },'
			. '"Z2K4": {"Z1K1": "Z32", "Z32K1": [ "Z31" ] },'
			. '"Z2K5": {"Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1":"Z11","Z11K1":"Z1002","Z11K2":"The quick brown fox'
			. ' jumps over the lazy dog while the sun sets behind the mountains and the sky turns shades of orange,'
			. ' and pink painting a picturesque scene that makes everyone pause and appreciate the beauty of nature,'
			. ' feeling a sense of calm and serenity in the midst of a hectic day. Meanwhile, an inspired writer'
			. ' practices his craft by exploring a library of functions and give them the longest titles that nobody'
			. ' has ever dared to imagine. His intentions are pure; he believes functions are poetry, the most'
			. ' valuable jewels of language." } ] } }';

		$status = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			$input,
			'Create summary',
			$this->getTestSysop()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_UNKNOWN, $status->getErrors() );
		$this->assertStringContainsString( "Description in English", $status->getErrors() );
	}

	public function testUpdateZObject_editProhibited_loggedOut() {
		$loggedOutUser = $this->getServiceContainer()->getUserFactory()->newAnonymous( '127.0.0.1' );

		$zid = $this->zobjectStore->getNextAvailableZid();
		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "' . $zid . '" },'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		$status = $this->zobjectStore->updateZObject(
			RequestContext::getMain(),
			$zid,
			$input,
			'Update summary',
			$loggedOutUser,
			EDIT_NEW
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT, $status->getErrors() );
	}

	public function testUpdateZObject_editProhibited_basicUserMakingPreDefined() {
		$zid = 'Z400';
		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "' . $zid . '" },'
			. '"Z2K2": "hello",'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		$status = $this->zobjectStore->updateZObject(
			RequestContext::getMain(),
			$zid,
			$input,
			'Update summary',
			$this->getTestUser()->getUser(),
			EDIT_NEW
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT, $status->getErrors() );
	}

	public function testUpdateZObject_editProhibited_unauthedUserMakingType() {
		// For the purpose of this test, deny logged-in users the ability to create a Z4/Type
		$this->setGroupPermissions( 'user', 'wikilambda-create-type', false );

		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": {'
				. ' "Z1K1": "Z4",'
				. ' "Z4K1": "Z0",'
				. ' "Z4K2": [ "Z3", {'
					. ' "Z1K1": "Z3",'
					. ' "Z3K1": "Z6",'
					. ' "Z3K2": "Z0K1",'
					. ' "Z3K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } '
				. '} ],'
				. ' "Z4K3": "Z101" },'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		$status = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			$input,
			'Creation summary',
			$this->getTestUser()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT, $status->getErrors() );
	}

	public function testUpdateZObject_editProhibited_unauthedUserMakingFunction() {
		// For the purpose of this test, deny logged-in users the ability to create a Z8/Function
		$this->setGroupPermissions( 'user', 'wikilambda-create-function', false );

		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": {'
				. ' "Z1K1": "Z8",'
				. ' "Z8K1": ["Z17"],'
				. ' "Z8K2": "Z1",'
				. ' "Z8K3": ["Z20"],'
				. ' "Z8K4": ["Z14"],'
				. ' "Z8K5": "Z101"'
				. '},'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		$status = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			$input,
			'Creation summary',
			$this->getTestUser()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT, $status->getErrors() );
	}

	public function testUpdateZObject_editProhibited_unauthedUserMakingImplementation() {
		// For the purpose of this test, deny logged-in users the ability to create a Z14/Implementation
		$this->setGroupPermissions( 'user', 'wikilambda-create-implementation', false );

		// Implementation isn't a guaranteed type by our testing system, so inject it just for this test.
		$this->insertZids( [ 'Z14' ] );

		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": {'
				. ' "Z1K1": "Z14",'
				. ' "Z14K1": "Z1",'
				. ' "Z14K4": "Z0"'
				. '},'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		$status = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			$input,
			'Creation summary',
			$this->getTestUser()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT, $status->getErrors() );
	}

	public function testUpdateZObject_editProhibited_unauthedUserMakingTester() {
		// For the purpose of this test, deny logged-in users the ability to create a Z20/Tester
		$this->setGroupPermissions( 'user', 'wikilambda-create-tester', false );

		// Tester isn't a guaranteed type by our testing system, so inject it just for this test.
		$this->insertZids( [ 'Z20' ] );

		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": {'
				. ' "Z1K1": "Z20",'
				. ' "Z20K1": "Z1",'
				. ' "Z20K2": "Z0",'
				. ' "Z20K3": "Z0"'
				. '},'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		$status = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			$input,
			'Creation summary',
			$this->getTestUser()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT, $status->getErrors() );
	}

	public function testUpdateZObject_editProhibited_unauthedUserMakingLanguage() {
		// Language isn't a guaranteed type by our testing system, so inject it just for this test.
		$this->insertZids( [ 'Z60' ] );

		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": {'
				. ' "Z1K1": "Z60",'
				. ' "Z60K1": "qqq",'
				. ' "Z60K2": [ "Z6" ]'
				. '},'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		$status = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			$input,
			'Creation summary',
			$this->getTestUser()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT, $status->getErrors() );
	}

	public function testUpdateZObject_editProhibited_unauthedUserMakingProgramming() {
		// Programming language isn't a guaranteed type by our testing system, so inject it just for this test.
		$this->insertZids( [ 'Z61' ] );

		$input = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. '"Z2K2": {'
				. ' "Z1K1": "Z61",'
				. ' "Z61K1": "test-programming-language"'
				. '},'
			. '"Z2K3": {"Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		$status = $this->zobjectStore->createNewZObject(
			RequestContext::getMain(),
			$input,
			'Creation summary',
			$this->getTestUser()->getUser()
		);
		$this->assertFalse( $status->isOK() );
		$this->assertStringContainsString( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT, $status->getErrors() );
	}

	public function testInsertZObjectLabels() {
		$labels = [
			self::ZLANG['en'] => 'label',
			self::ZLANG['es'] => 'etiqueta',
			self::ZLANG['fr'] => 'marque'
		];

		$this->zobjectStore->insertZObjectLabels( 'Z222', 'Z4', $labels );

		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();
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
		$this->assertCount( 3, $conflicts );
	}

	public function testFindZObjectLabelConflicts() {
		$labels = [
			self::ZLANG['en'] => 'label',
			self::ZLANG['es'] => 'etiqueta',
			self::ZLANG['fr'] => 'marque'
		];

		$this->zobjectStore->insertZObjectLabels( 'Z222', 'Z4', $labels );

		$conflicts = $this->zobjectStore->findZObjectLabelConflicts( 'Z333', 'Z4', $labels );
		$this->assertCount( 3, $conflicts );

		$conflicts = $this->zobjectStore->findZObjectLabelConflicts( 'Z333', 'Z4', [ self::ZLANG['de'] => 'label' ] );
		$this->assertCount( 0, $conflicts );
	}

	public function testInsertZObjectLabelConflicts() {
		$conflicts = [
			self::ZLANG['en'] => 'Z222',
			self::ZLANG['es'] => 'Z222',
			self::ZLANG['fr'] => 'Z222'
		];

		$this->zobjectStore->insertZObjectLabelConflicts( 'Z333', $conflicts );

		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();
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

	public function testDeleteZObjectLabelsByZid() {
		$labels = [
			self::ZLANG['en'] => 'label',
			self::ZLANG['es'] => 'etiqueta',
			self::ZLANG['fr'] => 'marque'
		];

		$this->zobjectStore->insertZObjectLabels( 'Z222', 'Z4', $labels );

		$this->zobjectStore->deleteZObjectLabelsByZid( 'Z222' );

		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();
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

	public function testDeleteZObjectLabelConflictsByZid() {
		$this->zobjectStore->insertZObjectLabelConflicts( 'Z222', [ self::ZLANG['en'] => 'Z333' ] );
		$this->zobjectStore->insertZObjectLabelConflicts( 'Z333', [ self::ZLANG['es'] => 'Z444' ] );

		$this->zobjectStore->deleteZObjectLabelConflictsByZid( 'Z333' );

		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();
		$res = $dbr->newSelectQueryBuilder()
			 ->select( [ 'wlzlc_language' ] )
			 ->from( 'wikilambda_zobject_label_conflicts' )
			 ->where( $dbr->orExpr( [
				 'wlzlc_existing_zid' => 'Z333',
				 'wlzlc_conflicting_zid' => 'Z333',
			 ] ) )
			 ->fetchResultSet();
		$this->assertSame( 0, $res->numRows() );
	}

	public function testFetchZidsOfType() {
		$this->zobjectStore->insertZObjectLabels(
			'Z444', 'Z7', [ self::ZLANG['en'] => 'label for Z7' ]
		);
		$this->zobjectStore->insertZObjectLabels(
			'Z445', 'Z7', [ self::ZLANG['en'] => 'other label for Z7' ]
		);
		$this->zobjectStore->insertZObjectLabels(
			'Z446', 'Z7', [ self::ZLANG['en'] => 'one more label for Z7' ]
		);
		$this->zobjectStore->insertZObjectLabels(
			'Z447', 'Z8', [ self::ZLANG['en'] => 'label for Z8' ]
		);
		$this->zobjectStore->insertZObjectLabels(
			'Z449', 'Z9', [ self::ZLANG['en'] => 'label for Z9' ]
		);

		$zids = $this->zobjectStore->fetchZidsOfType( 'Z7' );
		sort( $zids );

		$this->assertSame( [ 'Z444', 'Z445', 'Z446' ], $zids );
		$this->assertSame( [ 'Z447' ], $this->zobjectStore->fetchZidsOfType( 'Z8' ) );
		$this->assertSame( [], $this->zobjectStore->fetchZidsOfType( 'Z888' ) );
	}

	public function testSearchZObjectLabels_exactMatch() {
		$this->zobjectStore->insertZObjectLabels(
			'Z450', 'Z7', [ self::ZLANG['en'] => 'example' ]
		);
		$this->zobjectStore->insertZObjectLabels(
			'Z451', 'Z7', [ self::ZLANG['en'] => 'Example label' ]
		);
		$this->zobjectStore->insertZObjectLabels(
			'Z452', 'Z7', [ self::ZLANG['en'] => 'Some more examples' ]
		);

		$res = $this->zobjectStore->searchZObjectLabels(
			'Example', true, [ self::ZLANG['en'] ], [], [], null, 5000
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 1, $res->numRows() );

		$res = $this->zobjectStore->searchZObjectLabels(
			'Example', false, [ self::ZLANG['en'] ], [], [], null, 5000
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 3, $res->numRows() );
	}

	public function testSearchZObjectLabels_type() {
		$this->zobjectStore->insertZObjectLabels(
			'Z453', 'Z7', [ self::ZLANG['en'] => 'example' ]
		);
		$this->zobjectStore->insertZObjectLabels(
			'Z454', 'Z7', [ self::ZLANG['en'] => 'Example label' ]
		);
		$this->zobjectStore->insertZObjectLabels(
			'Z455', 'Z6', [ self::ZLANG['en'] => 'Some more examples' ]
		);
		$this->zobjectStore->insertZObjectLabels(
			'Z455', 'Z8', [ self::ZLANG['en'] => 'Some more examples 2' ], 'Z6'
		);
		$this->zobjectStore->insertZObjectLabels(
			'Z455', 'Z8', [ self::ZLANG['en'] => 'Some more examples 3' ], 'Z4'
		);

		$res = $this->zobjectStore->searchZObjectLabels(
			'example', false, [ self::ZLANG['en'] ], [ 'Z7' ], [], null, 5000
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 2, $res->numRows() );

		$res = $this->zobjectStore->searchZObjectLabels(
			'example', false, [ self::ZLANG['en'] ], [ 'Z6' ], [], null, 5000
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 1, $res->numRows() );

		$res = $this->zobjectStore->searchZObjectLabels(
			'example', false, [ self::ZLANG['en'] ], [], [ 'Z6' ], null, 5000
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 1, $res->numRows() );
	}

	public function testSearchZObjectLabels_compoundReturnType() {
		// Insert functions with return type Z881(Z1)
		$this->insertZids( [ 'Z8', 'Z14', 'Z17', 'Z873', 'Z812' ] );
		// Insert a function/Z8 with a return type Z881
		$this->zobjectStore->insertZObjectLabels(
			'Z873', 'Z8', [ self::ZLANG['en'] => 'map function' ], 'Z881'
		);
		// Insert a function/Z8 with a return type Z881
		$this->zobjectStore->insertZObjectLabels(
			'Z812', 'Z8', [ self::ZLANG['en'] => 'list without first element' ], 'Z881'
		);

		// Search for return_type=Z881 (should match Z881(Z1))
		$res = $this->zobjectStore->searchZObjectLabels(
			'',
			false,
			[ self::ZLANG['en'] ],
			[ 'Z8' ],
			[ 'Z881' ],
			null,
			10
		);
		$this->assertInstanceOf( IResultWrapper::class, $res );
		$foundZids = [];
		foreach ( $res as $row ) {
			$foundZids[] = $row->wlzl_zobject_zid;
		}
		$this->assertContains( 'Z873', $foundZids );
		$this->assertContains( 'Z812', $foundZids );
	}

	public function testSearchZObjectLabels_languages() {
		$this->zobjectStore->insertZObjectLabels( 'Z456', 'Z6', [ self::ZLANG['en'] => 'txt' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z457', 'Z6', [ self::ZLANG['es'] => 'txt' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z458', 'Z6', [ self::ZLANG['fr'] => 'txt' ] );

		$res = $this->zobjectStore->searchZObjectLabels(
			'txt', false, [ self::ZLANG['en'], self::ZLANG['fr'] ], [], [], null, 5000
		);

		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 2, $res->numRows() );
		$this->assertSame( self::ZLANG['en'], $res->fetchRow()[ 'wlzl_language' ] );
		$this->assertSame( self::ZLANG['fr'], $res->fetchRow()[ 'wlzl_language' ] );
	}

	public function testSearchZObjectLabels_pagination() {
		$this->zobjectStore->insertZObjectLabels( 'Z459', 'Z6', [ self::ZLANG['en'] => 'label one' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z460', 'Z6', [ self::ZLANG['en'] => 'label two' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z461', 'Z6', [ self::ZLANG['en'] => 'label three' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z462', 'Z6', [ self::ZLANG['en'] => 'label four' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z463', 'Z6', [ self::ZLANG['en'] => 'label five' ] );

		// First page
		$res = $this->zobjectStore->searchZObjectLabels(
			'label',
			false,
			[ self::ZLANG['en'] ],
			[],
			[],
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
			[],
			[],
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
			[],
			[],
			$continue,
			2
		);

		$this->assertInstanceOf( IResultWrapper::class, $res );
		$this->assertSame( 1, $res->numRows() );
		$this->assertSame( 'label five', $res->fetchRow()[ 'wlzl_label' ] );
	}

	public function testFetchZObjectLabel() {
		$this->zobjectStore->insertZObjectLabels(
			'Z464',
			'Z6',
			[
				self::ZLANG['en'] => 'txt-en',
				self::ZLANG['es'] => 'txt-es',
				self::ZLANG['fr'] => 'txt-fr'
			]
		);

		// Register the languages we'll use
		$this->registerLangs( [ 'en', 'es', 'fr', 'de' ] );

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

	public function testInsertZFunctionReference() {
		$this->zobjectStore->insertZFunctionReference( 'Z10030', 'Z10029', 'Z14' );

		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();
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

	public function testFindFirstZImplementationFunction() {
		$this->zobjectStore->insertZFunctionReference( 'Z10030', 'Z10029', 'Z14' );

		$zid = $this->zobjectStore->findFirstZImplementationFunction();

		$this->assertEquals( 'Z10029', $zid );
	}

	public function testFindReferencedZObjectsByZFunctionId() {
		$this->zobjectStore->insertZFunctionReference( 'Z10030', 'Z10029', 'Z14' );
		$this->zobjectStore->insertZFunctionReference( 'Z10031', 'Z10029', 'Z14' );

		$res = $this->zobjectStore->findReferencedZObjectsByZFunctionIdAsList( 'Z10029', 'Z14' );
		$this->assertCount( 2, $res );

		// On postgres the result may not in order
		sort( $res );

		$this->assertEquals( [ 'Z10030', 'Z10031' ], $res );
	}

	public function testDeleteZFunctionReference() {
		$this->zobjectStore->insertZFunctionReference( 'Z10030', 'Z10029', 'Z14' );

		$res = $this->zobjectStore->findReferencedZObjectsByZFunctionIdAsList( 'Z10029', 'Z14' );
		$this->assertCount( 1, $res );

		$this->zobjectStore->deleteZFunctionReference( 'Z10030' );

		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();
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

	private function injectZ401RelatedZObjects(): void {
		// Function Z401:
		// * has 3 arguments of types Z6, Z40, Z6
		// * returns typed list of Z6
		// * has 2 connected tests
		// * has 1 connected implementation
		$relatedZObjects = [
			// Input types
			(object)[
				'zid' => 'Z401',
				'type' => 'Z8',
				'key' => 'Z8K1',
				'related_zid' => 'Z6',
				'related_type' => 'Z4'
			],
			(object)[
				'zid' => 'Z401',
				'type' => 'Z8',
				'key' => 'Z8K1',
				'related_zid' => 'Z40',
				'related_type' => 'Z4'
			],
			(object)[
				'zid' => 'Z401',
				'type' => 'Z8',
				'key' => 'Z8K1',
				'related_zid' => 'Z6',
				'related_type' => 'Z4'
			],
			// Output type
			(object)[
				'zid' => 'Z401',
				'type' => 'Z8',
				'key' => 'Z8K2',
				'related_zid' => 'Z881(Z6)',
				'related_type' => 'Z4'
			],
			// Connected tests
			(object)[
				'zid' => 'Z401',
				'type' => 'Z8',
				'key' => 'Z8K3',
				'related_zid' => 'Z10001',
				'related_type' => 'Z20'
			],
			(object)[
				'zid' => 'Z401',
				'type' => 'Z8',
				'key' => 'Z8K3',
				'related_zid' => 'Z10002',
				'related_type' => 'Z20'
			],
			// Connected implementation
			(object)[
				'zid' => 'Z401',
				'type' => 'Z8',
				'key' => 'Z8K4',
				'related_zid' => 'Z10003',
				'related_type' => 'Z14'
			]
		];
		$this->zobjectStore->insertRelatedZObjects( $relatedZObjects );
	}

	private function injectZ402RelatedZObjects(): void {
		// Function Z402 has 3 arguments of types Z6, Z6, Z6, and returns typed list of Z6.
		$relatedZObjects = [
			// Input types
			(object)[
				'zid' => 'Z402',
				'type' => 'Z8',
				'key' => 'Z8K1',
				'related_zid' => 'Z6',
				'related_type' => 'Z4'
			],
			(object)[
				'zid' => 'Z402',
				'type' => 'Z8',
				'key' => 'Z8K1',
				'related_zid' => 'Z6',
				'related_type' => 'Z4'
			],
			(object)[
				'zid' => 'Z402',
				'type' => 'Z8',
				'key' => 'Z8K1',
				'related_zid' => 'Z6',
				'related_type' => 'Z4'
			],
			// Output type
			(object)[
				'zid' => 'Z402',
				'type' => 'Z8',
				'key' => 'Z8K2',
				'related_zid' => 'Z881(Z6)',
				'related_type' => 'Z4'
			]
		];
		$this->zobjectStore->insertRelatedZObjects( $relatedZObjects );
	}

	private function injectZ403RelatedZObjects(): void {
		// Function Z403 has 1 argument of type Z6, and returns typed list of Z5.
		$relatedZObjects = [
			// Input types
			(object)[
				'zid' => 'Z403',
				'type' => 'Z8',
				'key' => 'Z8K1',
				'related_zid' => 'Z6',
				'related_type' => 'Z4'
			],
			// Output type
			(object)[
				'zid' => 'Z403',
				'type' => 'Z8',
				'key' => 'Z8K2',
				'related_zid' => 'Z881(Z5)',
				'related_type' => 'Z4'
			]
		];
		$this->zobjectStore->insertRelatedZObjects( $relatedZObjects );
	}

	private function injectZ404RelatedZObjects(): void {
		// Function Z404:
		// * has 1 argument of types Z6
		// * returns Z6
		// * has 1 connected implementation
		$relatedZObjects = [
			// Input types
			(object)[
				'zid' => 'Z404',
				'type' => 'Z8',
				'key' => 'Z8K1',
				'related_zid' => 'Z6',
				'related_type' => 'Z4'
			],
			// Output type
			(object)[
				'zid' => 'Z404',
				'type' => 'Z8',
				'key' => 'Z8K2',
				'related_zid' => 'Z6',
				'related_type' => 'Z4'
			],
			// Connected implementation
			(object)[
				'zid' => 'Z404',
				'type' => 'Z8',
				'key' => 'Z8K4',
				'related_zid' => 'Z10003',
				'related_type' => 'Z14'
			]
		];
		$this->zobjectStore->insertRelatedZObjects( $relatedZObjects );
	}

	private function injectZ405RelatedZObjects(): void {
		// Function Z405:
		// * has 1 argument of types Z6
		// * returns HTML Fragment/Z89
		// * has 1 connected implementation
		$relatedZObjects = [
			// Input types
			(object)[
				'zid' => 'Z405',
				'type' => 'Z8',
				'key' => 'Z8K1',
				'related_zid' => 'Z6',
				'related_type' => 'Z4'
			],
			// Output type
			(object)[
				'zid' => 'Z405',
				'type' => 'Z8',
				'key' => 'Z8K2',
				'related_zid' => 'Z89',
				'related_type' => 'Z4'
			],
			// Connected implementation
			(object)[
				'zid' => 'Z405',
				'type' => 'Z8',
				'key' => 'Z8K4',
				'related_zid' => 'Z10003',
				'related_type' => 'Z14'
			]
		];
		$this->zobjectStore->insertRelatedZObjects( $relatedZObjects );
	}

	private function injectZ406RelatedZObjects(): void {
		// Function Z406:
		// * has 1 argument of type Z6001 (Wikidata Item)
		// * returns Z6 (String)
		// * has 1 connected implementation
		$relatedZObjects = [
			// Input types
			(object)[
				'zid' => 'Z406',
				'type' => 'Z8',
				'key' => 'Z8K1',
				'related_zid' => 'Z6001',
				'related_type' => 'Z4'
			],
			// Output type
			(object)[
				'zid' => 'Z406',
				'type' => 'Z8',
				'key' => 'Z8K2',
				'related_zid' => 'Z6',
				'related_type' => 'Z4'
			],
			// Connected implementation
			(object)[
				'zid' => 'Z406',
				'type' => 'Z8',
				'key' => 'Z8K4',
				'related_zid' => 'Z10003',
				'related_type' => 'Z14'
			]
		];
		$this->zobjectStore->insertRelatedZObjects( $relatedZObjects );
	}

	private function injectZ407RelatedZObjects(): void {
		// Function Z407:
		// * has 1 argument of type Z6005 (Wikidata Lexeme)
		// * returns Z6 (String)
		// * has 1 connected implementation
		$relatedZObjects = [
			// Input types
			(object)[
				'zid' => 'Z407',
				'type' => 'Z8',
				'key' => 'Z8K1',
				'related_zid' => 'Z6005',
				'related_type' => 'Z4'
			],
			// Output type
			(object)[
				'zid' => 'Z407',
				'type' => 'Z8',
				'key' => 'Z8K2',
				'related_zid' => 'Z6',
				'related_type' => 'Z4'
			],
			// Connected implementation
			(object)[
				'zid' => 'Z407',
				'type' => 'Z8',
				'key' => 'Z8K4',
				'related_zid' => 'Z10003',
				'related_type' => 'Z14'
			]
		];
		$this->zobjectStore->insertRelatedZObjects( $relatedZObjects );
	}

	public function testInsertRelatedZObjects() {
		$this->injectZ401RelatedZObjects();
		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_related_zobject' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_zid' => 'Z401',
				'wlzo_key' => 'Z8K1'
			] )
			->caller( __METHOD__ )
			->fetchResultSet();
		$this->assertSame( 3, $res->numRows() );
		$this->assertEquals( 'Z6', $res->current()->wlzo_related_zobject );
		$res->next();
		$this->assertEquals( 'Z40', $res->current()->wlzo_related_zobject );
		$res->next();
		$this->assertEquals( 'Z6', $res->current()->wlzo_related_zobject );

		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_related_zobject' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_zid' => 'Z401',
				'wlzo_key' => 'Z8K2'
			] )
			->caller( __METHOD__ )
			->fetchResultSet();
		$this->assertSame( 1, $res->numRows() );
		$this->assertEquals( 'Z881(Z6)', $res->current()->wlzo_related_zobject );

		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_related_zobject' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_zid' => 'Z401',
				'wlzo_key' => 'Z8K3'
			] )
			->caller( __METHOD__ )
			->fetchResultSet();
		$this->assertSame( 2, $res->numRows() );
		$this->assertEquals( 'Z10001', $res->current()->wlzo_related_zobject );
		$res->next();
		$this->assertEquals( 'Z10002', $res->current()->wlzo_related_zobject );

		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_related_zobject' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_zid' => 'Z401',
				'wlzo_key' => 'Z8K4'
			] )
			->caller( __METHOD__ )
			->fetchResultSet();
		$this->assertSame( 1, $res->numRows() );
		$this->assertEquals( 'Z10003', $res->current()->wlzo_related_zobject );
	}

	public function testDeleteRelatedZObjects() {
		$this->injectZ401RelatedZObjects();

		$this->zobjectStore->deleteRelatedZObjects( 'Z401', 'Z8', 'Z8K1' );
		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getPrimaryDatabase();
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_related_zobject' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_zid' => 'Z401',
				'wlzo_key' => 'Z8K1'
			] )
			->caller( __METHOD__ )
			->fetchResultSet();
		$this->assertSame( 0, $res->numRows() );

		$this->zobjectStore->deleteRelatedZObjects( 'Z401', 'Z8', 'Z8K2' );
		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlzo_related_zobject' ] )
			->from( 'wikilambda_zobject_join' )
			->where( [
				'wlzo_main_zid' => 'Z401',
				'wlzo_key' => 'Z8K2'
			] )
			->caller( __METHOD__ )
			->fetchResultSet();
		$this->assertSame( 0, $res->numRows() );
	}

	public function testFindRelatedZObjectsByKey() {
		$this->injectZ401RelatedZObjects();

		$res = $this->zobjectStore->findRelatedZObjectsByKeyAsList( 'Z401', 'Z8K1' );
		$this->assertCount( 3, $res );
		// On postgres the result may not in order
		sort( $res );
		$this->assertEquals( [ 'Z40', 'Z6', 'Z6' ], $res );

		$res = $this->zobjectStore->findRelatedZObjectsByKeyAsList( 'Z401', 'Z8K2' );
		$this->assertCount( 1, $res );
		sort( $res );
		$this->assertEquals( [ 'Z881(Z6)' ], $res );
	}

	public function testFindFunctionsReferencingZObjectByKey() {
		$this->injectZ401RelatedZObjects();

		// Test for implementation Z10003 (should be referenced by Z401)
		$functionsForImplementation = $this->zobjectStore->findFunctionsReferencingZObjectByKey(
			'Z10003',
			'Z8K4'
		);
		$this->assertEquals( [ 'Z401' ], $functionsForImplementation );

		// Test for tester Z10002 (should be referenced by Z401)
		$functionsForTester = $this->zobjectStore->findFunctionsReferencingZObjectByKey(
			'Z10002',
			'Z8K3'
		);
		$this->assertEquals( [ 'Z401' ], $functionsForTester );

		// Test for a ZID not referenced
		$functionsForNonexistent = $this->zobjectStore->findFunctionsReferencingZObjectByKey(
			'Z999',
			'Z8K4'
		);
		$this->assertEquals( [], $functionsForNonexistent );
	}

	public function testFindFunctionsByIOTypes() {
		$this->injectZ401RelatedZObjects();
		$this->injectZ402RelatedZObjects();
		$this->injectZ403RelatedZObjects();
		// Find functions having at least one input of type Z6
		$res = $this->zobjectStore->findFunctionsByIOTypes( [ 'Z6' => 1 ] );
		$this->assertCount( 3, $res );
		// On postgres the result may not in order
		sort( $res );
		$this->assertEquals( [ 'Z401', 'Z402', 'Z403' ], $res );

		// Find functions having at least 2 inputs of type Z6, and output of type Z881(Z6)
		$res = $this->zobjectStore->findFunctionsByIOTypes( [ 'Z6' => 2 ], 'Z881(Z6)' );
		$this->assertCount( 2, $res );
		// On postgres the result may not in order
		sort( $res );
		$this->assertEquals( [ 'Z401', 'Z402' ], $res );

		// Find functions having at least 2 inputs of type Z6, at least 1 input of type Z40,
		// and output of type Z881(Z6)
		$res = $this->zobjectStore->findFunctionsByIOTypes( [ 'Z6' => 2, 'Z40' => 1 ], 'Z881(Z6)' );
		$this->assertCount( 1, $res );
		// On postgres the result may not in order
		sort( $res );
		$this->assertEquals( [ 'Z401' ], $res );

		// Find functions having at least 3 inputs of type Z6, and output of type Z881(Z6)
		$res = $this->zobjectStore->findFunctionsByIOTypes( [ 'Z6' => 3 ], 'Z881(Z6)' );
		$this->assertCount( 1, $res );
		$this->assertEquals( [ 'Z402' ], $res );

		// Find functions having at least 1 input of type Z6, and output of type Z881(Z5)
		$res = $this->zobjectStore->findFunctionsByIOTypes( [ 'Z6' => 1 ], 'Z881(Z5)' );
		$this->assertCount( 1, $res );
		$this->assertEquals( [ 'Z403' ], $res );

		// Find functions having output of type Z881(Z5)
		$res = $this->zobjectStore->findFunctionsByIOTypes( [], 'Z881(Z5)' );
		$this->assertCount( 1, $res );
		$this->assertEquals( [ 'Z403' ], $res );

		// Find functions having at least 2 inputs of type Z6, and output of type Z881(Z5)
		$res = $this->zobjectStore->findFunctionsByIOTypes( [ 'Z6' => 2 ], 'Z881(Z5)' );
		$this->assertCount( 0, $res );
		$this->assertEquals( [], $res );
	}

	public function testFindFunctionsByRenderableIO() {
		// Force-enable HTML output:
		$this->overrideConfigValue( 'WikifunctionsEnableHTMLOutput', true );
		$this->overrideConfigValue( 'WikifunctionsEnableWikidataInputTypes', true );

		// Insert functions with various renderable input/output types
		// Z6 (String) input, Z6 (String) output
		$this->injectZ404RelatedZObjects();
		// Z6 (String) input, Z89 (HTML Fragment) output
		$this->injectZ405RelatedZObjects();
		// Z6001 (Wikidata Item) input, Z6 (String) output
		$this->injectZ406RelatedZObjects();
		// Z6005 (Wikidata Lexeme) input, Z6 (String) output
		$this->injectZ407RelatedZObjects();

		$res = $this->zobjectStore->findFunctionsByRenderableIO();
		// On postgres the result may not in order
		sort( $res );
		$this->assertCount( 4, $res, 'Should find Z404, Z405, Z406, and Z407 as renderable' );
		$this->assertEquals( [ 'Z404', 'Z405', 'Z406', 'Z407' ], $res );
	}

	public function testFindFunctionsByRenderableIOWithoutFeatureFlags() {
		$this->overrideConfigValue( 'WikifunctionsEnableHTMLOutput', false );
		$this->overrideConfigValue( 'WikifunctionsEnableWikidataInputTypes', false );

		// Insert functions with various renderable input/output types
		// Z6 (String) input, Z6 (String) output
		$this->injectZ404RelatedZObjects();
		// Z6 (String) input, Z89 (HTML Fragment) output
		$this->injectZ405RelatedZObjects();
		// Z6001 (Wikidata Item) input, Z6 (String) output
		$this->injectZ406RelatedZObjects();
		// Z6005 (Wikidata Lexeme) input, Z6 (String) output
		$this->injectZ407RelatedZObjects();

		$res = $this->zobjectStore->findFunctionsByRenderableIO();
		// On postgres the result may not in order
		sort( $res );
		$this->assertCount( 1, $res, 'Should find Z404 as renderable' );
		$this->assertEquals( [ 'Z404' ], $res );
	}

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

	private function injectZTesterResults(): void {
		$this->zobjectStore->insertZTesterResult(
			'Z410', 1, 'Z401', 2, 'Z402', 3, true, self::$testResponse
		);
		$this->zobjectStore->insertZTesterResult(
			'Z410', 1, 'Z401', 2, 'Z403', 4, false, self::$testResponse
		);
		$this->zobjectStore->insertZTesterResult(
			'Z410', 1, 'Z401', 2, 'Z404', 5, true, self::$testResponse
		);
	}

	private function getZTesterResultsFromDB( string $functionZid ): IResultWrapper {
		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getReplicaDatabase();
		return $dbr->newSelectQueryBuilder()
			->select( [ 'wlztr_pass', 'wlztr_returnobject' ] )
			->from( 'wikilambda_ztester_results' )
			->where( [
				'wlztr_zfunction_zid' => $functionZid,
			] )
			->caller( __METHOD__ )
			->fetchResultSet();
	}

	public function testInsertZTesterResult() {
		$this->injectZTesterResults();

		$dbr = $this->getServiceContainer()->getDBLoadBalancerFactory()->getReplicaDatabase();
		$res = $this->getZTesterResultsFromDB( 'Z410' );

		$this->assertSame( 3, $res->numRows() );

		$res = $dbr->newSelectQueryBuilder()
			->select( [ 'wlztr_pass', 'wlztr_returnobject' ] )
			->from( 'wikilambda_ztester_results' )
			->where( [
				'wlztr_zfunction_zid' => 'Z410',
				'wlztr_zimplementation_zid' => 'Z401',
				'wlztr_ztester_zid' => 'Z402',
			] )
			->caller( __METHOD__ )
			->fetchResultSet();

		$this->assertSame( 1, $res->numRows() );

		$result = $res->fetchRow();

		$this->assertTrue( (bool)$result['wlztr_pass'] );

		$resultEnvelopeString = $result['wlztr_returnobject'];
		$this->assertStringContainsString( 'Z22', $resultEnvelopeString );

		$resultEnvelopeObject = json_decode( $resultEnvelopeString );
		$this->assertTrue( $resultEnvelopeObject instanceof stdClass );

		$findRes = $this->zobjectStore->findZTesterResult( 'Z410', null, 'Z401', null, 'Z402', null );
		$this->assertTrue( $findRes instanceof ZResponseEnvelope );
	}

	public function testInsertZTesterResult_invalidContent() {
		$this->zobjectStore->insertZTesterResult(
			'Z410', 1, 'Z401', 2, 'Z402', 3, true, 'Hello I am an erroneous input'
		);

		$findRes = $this->zobjectStore->findZTesterResult( 'Z410', null, 'Z401', null, 'Z402', null );
		$this->assertNull( $findRes );
	}

	public function testInsertZLanguage() {
		// We start with empty
		$languages = $this->zobjectStore->fetchAllZLanguageObjects();
		$this->assertCount( 0, $languages );
		$foundCodes = $this->zobjectStore->findCodesFromZLanguage( 'Z1001' );
		$this->assertCount( 0, $foundCodes );
		$foundLanguage = $this->zobjectStore->findZLanguageFromCode( 'bar' );
		$this->assertNull( $foundLanguage );

		// Adding a single language is findable
		$this->zobjectStore->insertZLanguageToLanguagesCache( 'Z1001', 'bar' );

		$languages = $this->zobjectStore->fetchAllZLanguageObjects();
		$this->assertIsArray( $languages );
		$this->assertCount( 1, $languages );
		$this->assertArrayHasKey( 'bar', $languages );
		$this->assertSame( 'Z1001', $languages['bar'] );
		$foundCodes = $this->zobjectStore->findCodesFromZLanguage( 'Z1001' );
		$this->assertCount( 1, $foundCodes );
		$this->assertSame( 'bar', $foundCodes[0] );
		$foundLanguage = $this->zobjectStore->findZLanguageFromCode( 'bar' );
		$this->assertNotNull( $foundLanguage );
		$this->assertSame( 'Z1001', $foundLanguage );

		// Adding a secondary code for a same zlanguage (Z60K2)
		$this->zobjectStore->insertZLanguageToLanguagesCache( 'Z1001', 'bar-old' );

		$languages = $this->zobjectStore->fetchAllZLanguageObjects();
		$this->assertIsArray( $languages );
		$this->assertCount( 2, $languages );
		$this->assertArrayHasKey( 'bar', $languages );
		$this->assertArrayHasKey( 'bar-old', $languages );
		$this->assertSame( 'Z1001', $languages['bar'] );
		$this->assertSame( 'Z1001', $languages['bar-old'] );
		$foundCodes = $this->zobjectStore->findCodesFromZLanguage( 'Z1001' );
		$this->assertCount( 2, $foundCodes );
		$this->assertSame( 'bar', $foundCodes[0] );
		$this->assertSame( 'bar-old', $foundCodes[1] );
		$foundLanguage = $this->zobjectStore->findZLanguageFromCode( 'bar-old' );
		$this->assertNotNull( $foundLanguage );
		$this->assertSame( 'Z1001', $foundLanguage );

		// Adding a second language adds its value
		$this->zobjectStore->insertZLanguageToLanguagesCache( 'Z1002', 'foo' );

		$languages = $this->zobjectStore->fetchAllZLanguageObjects();
		$this->assertIsArray( $languages );
		$this->assertCount( 3, $languages );
		$this->assertArrayHasKey( 'foo', $languages );
		$this->assertSame( 'Z1002', $languages['foo'] );
		$foundCodes = $this->zobjectStore->findCodesFromZLanguage( 'Z1002' );
		$this->assertCount( 1, $foundCodes );
		$this->assertSame( 'foo', $foundCodes[0] );
		$foundLanguage = $this->zobjectStore->findZLanguageFromCode( 'foo' );
		$this->assertNotNull( $foundLanguage );
		$this->assertSame( 'Z1002', $foundLanguage );

		// Deleting the first language removes its value
		$this->zobjectStore->deleteZLanguageFromLanguagesCache( 'Z1001' );

		$languages = $this->zobjectStore->fetchAllZLanguageObjects();
		$this->assertArrayNotHasKey( 'bar', $languages );
		$this->assertArrayNotHasKey( 'bar-old', $languages );
		$this->assertCount( 1, $languages );
		$foundCodes = $this->zobjectStore->findCodesFromZLanguage( 'Z1001' );
		$this->assertCount( 0, $foundCodes );
		$foundLanguage = $this->zobjectStore->findZLanguageFromCode( 'bar' );
		$this->assertNull( $foundLanguage );

		// Deleting the second language returns us to empty
		$this->zobjectStore->deleteZLanguageFromLanguagesCache( 'Z1002' );

		$languages = $this->zobjectStore->fetchAllZLanguageObjects();
		$this->assertArrayNotHasKey( 'foo', $languages );
		$this->assertCount( 0, $languages );
		$foundCodes = $this->zobjectStore->findCodesFromZLanguage( 'Z1002' );
		$this->assertCount( 0, $foundCodes );
		$foundLanguage = $this->zobjectStore->findZLanguageFromCode( 'foo' );
		$this->assertNull( $foundLanguage );
	}

	public function testDeleteZFunctionFromZTesterResultsCache() {
		$this->injectZTesterResults();

		$res = $this->getZTesterResultsFromDB( 'Z410' );

		$this->assertSame( 3, $res->numRows() );

		$this->zobjectStore->deleteZFunctionFromZTesterResultsCache( 'Z410' );

		$res = $this->getZTesterResultsFromDB( 'Z410' );

		$this->assertSame( 0, $res->numRows() );
	}

	public function testDeleteZImplementationFromZTesterResultsCache() {
		$this->injectZTesterResults();

		$res = $this->getZTesterResultsFromDB( 'Z410' );

		$this->assertSame( 3, $res->numRows() );

		$this->zobjectStore->deleteZImplementationFromZTesterResultsCache( 'Z401' );

		$res = $this->getZTesterResultsFromDB( 'Z410' );

		$this->assertSame( 0, $res->numRows() );
	}

	public function testDeleteZTesterFromZTesterResultsCache() {
		$this->injectZTesterResults();

		$this->zobjectStore->deleteZTesterFromZTesterResultsCache( 'Z402' );

		$res = $this->getZTesterResultsFromDB( 'Z410' );

		$this->assertSame( 2, $res->numRows() );

		$this->zobjectStore->deleteZTesterFromZTesterResultsCache( 'Z403' );

		$res = $this->getZTesterResultsFromDB( 'Z410' );

		$this->assertSame( 1, $res->numRows() );

		$this->zobjectStore->deleteZTesterFromZTesterResultsCache( 'Z404' );

		$res = $this->getZTesterResultsFromDB( 'Z410' );

		$this->assertSame( 0, $res->numRows() );
	}

	public function testFetchLanguageWithLabels() {
		// Insert one language and some labels
		$labels = [
			'Z1002' => 'spanish',
			'Z1003' => 'español',
			'Z1004' => 'spagnol'
		];
		$this->zobjectStore->insertZObjectLabels( 'Z1003', 'Z60', $labels );
		$this->zobjectStore->insertZLanguageToLanguagesCache( 'Z1003', 'es' );

		// Insert one language and some labels
		$labels = [
			'Z1732' => 'asturianu',
			'Z1002' => 'asturian',
			'Z1003' => 'asturiano'
		];
		$this->zobjectStore->insertZObjectLabels( 'Z1732', 'Z60', $labels );
		$this->zobjectStore->insertZLanguageToLanguagesCache( 'Z1732', 'ast' );

		// Insert one language and some labels
		$labels = [
			'Z1004' => 'anglais',
			'Z1002' => 'english'
		];
		$this->zobjectStore->insertZObjectLabels( 'Z1002', 'Z60', $labels );
		$this->zobjectStore->insertZLanguageToLanguagesCache( 'Z1002', 'en' );

		// User language BCP47 code for returned labels
		$userLang = 'ast';
		$res = $this->zobjectStore->fetchAllZLanguagesWithLabels( $userLang );
		$this->assertSame( 3, $res->numRows() );

		// Ordered by label
		$this->assertEquals( 'Z1732', $res->current()->wlzl_zobject_zid );
		$this->assertEquals( 'asturianu', $res->current()->wlzl_label );
		$this->assertEquals( 'ast', $res->current()->wlzlangs_language );

		$res->next();
		$this->assertEquals( 'Z1002', $res->current()->wlzl_zobject_zid );
		$this->assertEquals( 'english', $res->current()->wlzl_label );
		$this->assertEquals( 'en', $res->current()->wlzlangs_language );

		$res->next();
		$this->assertEquals( 'Z1003', $res->current()->wlzl_zobject_zid );
		$this->assertEquals( 'español', $res->current()->wlzl_label );
		$this->assertEquals( 'es', $res->current()->wlzlangs_language );
	}

	public function testFetchAllInstancedTypes() {
		// Insert types
		$this->zobjectStore->insertZObjectLabels( 'Z10001', 'Z4', [ 'Z1002' => 'Type 1' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z10002', 'Z4', [ 'Z1002' => 'Type 2' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z4', 'Z4', [ 'Z1002' => 'Type', 'Z1003' => 'Tipo' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z60', 'Z4', [ 'Z1002' => 'Language', 'Z1732' => 'Llingua' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z8', 'Z4', [ 'Z1002' => 'Function', 'Z1004' => 'Fonction' ] );
		// Insert instances
		$this->zobjectStore->insertZObjectLabels( 'Z1001', 'Z60', [ 'Z1002' => 'Language 1' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z1002', 'Z60', [ 'Z1002' => 'Language 2' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z801', 'Z8', [ 'Z1002' => 'Function 1' ] );

		$instancedTypes = $this->zobjectStore->fetchAllInstancedTypes();
		$this->assertEquals( [ 'Z4', 'Z60', 'Z8' ], $instancedTypes );
	}

	public function testFetchAllInstancedTypesWithLabels() {
		$this->zobjectStore->insertZLanguageToLanguagesCache( 'Z1002', 'en' );
		$this->zobjectStore->insertZLanguageToLanguagesCache( 'Z1003', 'es' );
		$this->zobjectStore->insertZLanguageToLanguagesCache( 'Z1004', 'fr' );
		$this->zobjectStore->insertZLanguageToLanguagesCache( 'Z1732', 'ast' );
		// Insert types
		$this->zobjectStore->insertZObjectLabels( 'Z10001', 'Z4', [ 'Z1002' => 'Type 1' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z10002', 'Z4', [ 'Z1002' => 'Type 2' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z4', 'Z4', [ 'Z1002' => 'Type', 'Z1003' => 'Tipo' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z60', 'Z4', [ 'Z1002' => 'Language', 'Z1732' => 'Llingua' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z8', 'Z4', [ 'Z1002' => 'Function', 'Z1004' => 'Fonction' ] );
		// Insert instances
		$this->zobjectStore->insertZObjectLabels( 'Z1001', 'Z60', [ 'Z1002' => 'Language 1' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z1002', 'Z60', [ 'Z1002' => 'Language 2' ] );
		$this->zobjectStore->insertZObjectLabels( 'Z801', 'Z8', [ 'Z1002' => 'Function 1' ] );

		$userLang = 'ast';
		$res = $this->zobjectStore->fetchAllInstancedTypesWithLabels( $userLang );
		$this->assertSame( 3, $res->numRows() );

		// Ordered by label
		$this->assertEquals( 'Z8', $res->current()->wlzl_zobject_zid );
		$this->assertEquals( 'Function', $res->current()->wlzl_label );

		$res->next();
		$this->assertEquals( 'Z60', $res->current()->wlzl_zobject_zid );
		$this->assertEquals( 'Llingua', $res->current()->wlzl_label );

		$res->next();
		$this->assertEquals( 'Z4', $res->current()->wlzl_zobject_zid );
		$this->assertEquals( 'Tipo', $res->current()->wlzl_label );
	}

	public function testRemoveFunctionReferenceIfImplementationOrTester_removesImplementationReference() {
		$this->insertZids( [ 'Z8', 'Z14', 'Z6' ] );
		$sysopUser = $this->getTestSysop()->getUser();

		// Create an implementation ZObject (Z14)
		$implZid = $this->zobjectStore->getNextAvailableZid();
		$implInput = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "' . $implZid . '" },'
			. '"Z2K2": { "Z1K1": "Z14", "Z14K1": "Z1", "Z14K4": "Z0" },'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$this->zobjectStore->createNewZObject(
			RequestContext::getMain(), $implInput, 'Create implementation', $sysopUser
		);

		// Create a function ZObject (Z8) that references the implementation
		$funcZid = $this->zobjectStore->getNextAvailableZid();
		$funcInput = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "' . $funcZid . '" },'
			. '"Z2K2": { "Z1K1": "Z8",'
			. '"Z8K1": [ "Z17" ],'
			. '"Z8K2": "Z6",'
			. '"Z8K3": [ "Z20" ],'
			. '"Z8K4": [ "Z14",  "' . $implZid . '" ],'
			. '"Z8K5": "Z0" },'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$this->zobjectStore->createNewZObject(
			RequestContext::getMain(), $funcInput, 'Create function', $sysopUser
		);

		// Confirm the function references the implementation
		$funcTitle = Title::newFromText( $funcZid, NS_MAIN );
		$funcContent = $this->zobjectStore->fetchZObjectByTitle( $funcTitle );
		$this->assertInstanceOf( ZObjectContent::class, $funcContent );
		$this->assertTrue( $funcContent->isValid() );
		$funcObj = $funcContent->getZObject()->getInnerZObject();
		$implList = $funcObj->getValueByKey( ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS );
		$this->assertContains( $implZid, array_map(
			static function ( $ref ) { return $ref->getZValue();
			},
			$implList->getAsArray()
		) );

		// Now remove the implementation reference
		$this->zobjectStore->removeFunctionReferenceIfImplementationOrTester( $implZid );

		// Refetch the function content after the update
		$funcContent = $this->zobjectStore->fetchZObjectByTitle( $funcTitle );
		$this->assertInstanceOf( ZObjectContent::class, $funcContent );
		$this->assertTrue( $funcContent->isValid() );
		$funcObj = $funcContent->getZObject() ? $funcContent->getZObject()->getInnerZObject() : null;
		$this->assertNotNull( $funcObj, 'Function ZObject should not be null after deletion' );
		$implList = $funcObj->getValueByKey( ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS );
		$implZids = array_map(
			static function ( $ref ) { return $ref->getZValue();
			},
			$implList->getAsArray()
		);
		$this->assertNotContains( $implZid, $implZids );
	}

	public function testRemoveFunctionReferenceIfImplementationOrTester_removesTesterReference() {
		$this->insertZids( [ 'Z8', 'Z20', 'Z6' ] );
		$store = $this->zobjectStore;
		$sysopUser = $this->getTestSysop()->getUser();

		// Create a tester ZObject (Z20)
		$testerZid = $this->zobjectStore->getNextAvailableZid();
		$testerInput = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "' . $testerZid . '" },'
			. '"Z2K2": { "Z1K1": "Z20", "Z20K1": "Z1", "Z20K2": "Z0", "Z20K3": "Z0" },'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$this->zobjectStore->createNewZObject(
			RequestContext::getMain(), $testerInput, 'Create tester', $sysopUser
		);

		// Create a function ZObject (Z8) that references the tester
		$funcZid = $this->zobjectStore->getNextAvailableZid();
		$funcInput = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "' . $funcZid . '" },'
			. '"Z2K2": { "Z1K1": "Z8",'
			. '"Z8K1": [ "Z17" ],'
			. '"Z8K2": "Z1",'
			. '"Z8K3": [ "Z20", "' . $testerZid . '" ],'
			. '"Z8K4": [ "Z14" ],'
			. '"Z8K5": "Z101" },'
			. '"Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';
		$this->zobjectStore->createNewZObject(
			RequestContext::getMain(), $funcInput, 'Create function', $sysopUser
		);

		// Confirm the function references the tester
		$funcTitle = Title::newFromText( $funcZid, NS_MAIN );
		$funcContent = $this->zobjectStore->fetchZObjectByTitle( $funcTitle );
		$this->assertInstanceOf( ZObjectContent::class, $funcContent );
		$this->assertTrue( $funcContent->isValid() );
		$funcObj = $funcContent->getZObject()->getInnerZObject();
		$testerList = $funcObj->getValueByKey( ZTypeRegistry::Z_FUNCTION_TESTERS );
		$this->assertContains( $testerZid, array_map(
			static function ( $ref ) { return $ref->getZValue();
			},
			$testerList->getAsArray()
		) );

		// Now remove the tester reference
		$this->zobjectStore->removeFunctionReferenceIfImplementationOrTester( $testerZid );

		// Refetch the function content after the update
		$funcContent = $store->fetchZObjectByTitle( $funcTitle );
		$this->assertInstanceOf( ZObjectContent::class, $funcContent );
		$this->assertTrue( $funcContent->isValid() );
		$funcObj = $funcContent->getZObject()->getInnerZObject();
		$testerList = $funcObj->getValueByKey( ZTypeRegistry::Z_FUNCTION_TESTERS );
		$testerZids = array_map(
			static function ( $ref ) { return $ref->getZValue();
			},
			$testerList->getAsArray()
		);
		$this->assertNotContains( $testerZid, $testerZids );
	}
}
