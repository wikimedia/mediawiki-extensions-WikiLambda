<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Api;

use ApiTestCase;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZTypeRegistry;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\API\ApiZObjectEditor
 * @group Database
 * @group API
 * @group WikiLambda
 * @group medium
 */
class ApiZObjectEditorTest extends ApiTestCase {

	private const EN = 'Z1002';
	private const ES = 'Z1003';

	/** @var ZObjectStore */
	protected $store;

	protected function setUp() : void {
		parent::setUp();

		$this->store = WikiLambdaServices::getZObjectStore();

		$this->tablesUsed[] = 'wikilambda_zobject_labels';
		$this->tablesUsed[] = 'wikilambda_zobject_label_conflicts';
		$this->tablesUsed[] = 'wikilambda_zobject_function_join';
		$this->tablesUsed[] = 'page';

		$langs = ZLangRegistry::singleton();
		$langs->register( self::EN, 'en' );
		$langs->register( self::ES, 'es' );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectEditor::execute
	 */
	public function testCreateFailed_invalidJson() {
		$data = '{ invalidJson ]';

		$this->setExpectedApiException( [ 'ZPersistentObject input is invalid JSON: Syntax error.', $data ] );

		$this->doApiRequestWithToken( [
			'action' => 'wikilambda_edit',
			'summary' => 'Summary message',
			'zobject' => $data
		] );
	}

	/**
	 * @dataProvider provideInvalidZObjects
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectEditor::execute
	 */
	public function testCreateFailed_invalidZObject( $input, $expected ) {
		// We don't need to test all validation errors here, we should do
		// that in a ZObjectFactory unit test suite, but we will just
		// test a couple of validation errors to make sure that the Api
		// returns the messages.
		$this->setExpectedApiException( $expected );

		$this->doApiRequestWithToken( [
			'uselang' => 'en',
			'action' => 'wikilambda_edit',
			'summary' => 'Summary message',
			'zobject' => $input
		] );
	}

	public function provideInvalidZObjects() {
		return [
			'missing key type' => [ '{}', 'ZPersistentObject input ZObject structure is invalid.' ],
			'invalid key type' => [ '{"Z1K1": "Z09"}', "ZObject record type 'Z09' is an invalid key." ]
		];
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectEditor::execute
	 */
	public function testUpdateFailed_unmatchingZid() {
		$data = '{ "Z1K1": "Z2", "Z2K1": "Z999",'
			. ' "Z2K2": { "Z1K1": "Z6", "Z6K1": "string" },'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [] } }';

		$this->setExpectedApiException( [ 'apierror-wikilambda_edit-unmatchingzid', 'Z888', 'Z999' ] );

		$this->doApiRequestWithToken( [
			'action' => 'wikilambda_edit',
			'summary' => 'Summary message',
			'zid' => 'Z888',
			'zobject' => $data
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectEditor::execute
	 */
	public function testCreateFailed_labelClash() {
		$sysopUser = $this->getTestSysop()->getUser();
		$firstZid = $this->store->getNextAvailableZid();

		// Create the first Zobject
		$data = '{ "Z1K1": "Z2", "Z2K1": "Z0",'
			. ' "Z2K2": { "Z1K1": "Z6", "Z6K1": "string" },'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "unique label" } ] } }';
		$this->store->createNewZObject( $data, 'First zobject', $sysopUser );

		// Try to create the second Zobject with the same label
		$this->setExpectedApiException( [ 'wikilambda-labelclash', $firstZid, self::EN ] );
		$result = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_edit',
			'summary' => 'Summary message',
			'zobject' => $data
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectEditor::execute
	 */
	public function testUpdateFailed_invalidTitle() {
		$invalidZid = 'ZID';
		$data = '{ "Z1K1": "Z2", "Z2K1": "' . $invalidZid . '",'
			. ' "Z2K2": { "Z1K1": "Z6", "Z6K1": "string" },'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ { "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "unique label" } ] } }';

		// Try to create the second Zobject with the same label
		$this->setExpectedApiException( [ "Value '$invalidZid' for 'Z2K1' of type 'NullableReference' is invalid." ] );
		$result = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_edit',
			'zid' => $invalidZid,
			'summary' => 'Summary message',
			'zobject' => $data
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectEditor::execute
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectStore::createNewZObject
	 */
	public function testCreateFailed_invalidType() {
		$data = '{ "Z1K1": "Z2", "Z2K1": "Z400",'
			. ' "Z2K2": { '
				. ' "Z1K1": "' . ZTypeRegistry::Z_PERSISTENTOBJECT . '",'
				. ' "Z2K1": "Z0",'
				. ' "Z2K2": { "Z1K1": "Z6", "Z6K1": "string" },'
				. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [] }'
			. '},'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "trouble" } ] } }';

		// Try to create a nested ZPO
		$this->setExpectedApiException( [ 'wikilambda-prohibitedcreationtype', ZTypeRegistry::Z_PERSISTENTOBJECT ] );
		$result = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_edit',
			'zid' => 'Z400',
			'summary' => 'Summary message',
			'zobject' => $data
		] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectEditor::execute
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectStore::createNewZObject
	 */
	public function testCreateSuccess() {
		$newZid = $this->store->getNextAvailableZid();

		$data = '{ "Z1K1": "Z2", "Z2K1": "Z0",'
			. ' "Z2K2": { "Z1K1": "Z6", "Z6K1": "string" },'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "new label" } ] } }';

		$result = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_edit',
			'summary' => 'Summary message',
			'zobject' => $data
		] );

		$this->assertTrue( $result[0]['wikilambda_edit']['success'] );
		$this->assertEquals( $result[0]['wikilambda_edit']['title'], $newZid );
		$this->assertEquals( $result[0]['wikilambda_edit']['page'], "ZObject:$newZid" );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiZObjectEditor::execute
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectStore::updateZObject
	 */
	public function testUpdateSuccess() {
		$sysopUser = $this->getTestSysop()->getUser();
		$newZid = $this->store->getNextAvailableZid();

		// Create the Zobject
		$data = '{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": "New ZObject", "Z2K3":'
			. ' { "Z1K1": "Z12", "Z12K1": [ { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "unique label" } ] } }';
		$this->store->createNewZObject( $data, 'New ZObject', $sysopUser );

		$data = '{ "Z1K1": "Z2", "Z2K1": "' . $newZid . '", "Z2K2": "New ZObject", "Z2K3":'
			. ' { "Z1K1": "Z12", "Z12K1": [ { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "new label" },'
			. ' { "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "nueva etiqueta" } ] } }';

		$result = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_edit',
			'summary' => 'Summary message',
			'zid' => $newZid,
			'zobject' => $data
		] );
		$this->assertTrue( $result[0]['wikilambda_edit']['success'] );
		$this->assertEquals( $result[0]['wikilambda_edit']['title'], $newZid );
		$this->assertEquals( $result[0]['wikilambda_edit']['page'], "ZObject:$newZid" );

		// Fetch ZObject and check it's been updated
		$title = Title::newFromText( $newZid, NS_ZOBJECT );
		$zobject = $this->store->fetchZObjectByTitle( $title );
		$this->assertTrue( $zobject instanceof ZObjectContent );
		// We compare the JSONs after decoding because it's saved prettified
		$this->assertEquals( json_decode( $zobject->getText() ), json_decode( $data ) );
	}
}
