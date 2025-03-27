<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ActionAPI;

use MediaWiki\Api\ApiUsageException;
use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Tests\Api\ApiTestCase;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ActionAPI\ApiZObjectEditor
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectStore
 * @group Database
 * @group API
 */
class ApiZObjectEditorTest extends ApiTestCase {

	private const EN = 'Z1002';
	private const ES = 'Z1003';

	private ZObjectStore $store;

	protected function setUp(): void {
		parent::setUp();

		$this->store = WikiLambdaServices::getZObjectStore();

		$langs = ZLangRegistry::singleton();
		$langs->register( self::EN, 'en' );
		$langs->register( self::ES, 'es' );
	}

	public function testCreateFailed_invalidJson() {
		$data = '{ invalidJson ]';

		$this->expectException( ApiUsageException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_UNKNOWN );

		$this->doApiRequestWithToken( [
			'action' => 'wikilambda_edit',
			'summary' => 'Summary message',
			'zobject' => $data
		] );
	}

	/**
	 * @dataProvider provideInvalidZObjects
	 */
	public function testCreateFailed_invalidZObject( $input ) {
		// We don't need to test all validation errors here, we should do
		// that in a ZObjectFactory unit test suite, but we will just
		// test a couple of validation errors to make sure that the Api
		// returns the messages.
		$this->expectException( ApiUsageException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED );

		$this->doApiRequestWithToken( [
			'uselang' => 'en',
			'action' => 'wikilambda_edit',
			'summary' => 'Summary message',
			'zobject' => $input
		] );
	}

	public static function provideInvalidZObjects() {
		return [
			'missing key type' => [ '{}' ],
			'invalid key type' => [ '{"Z1K1": "Z09"}' ]
		];
	}

	public function testUpdateFailed_unmatchingZid() {
		$data = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z999" },'
			. ' "Z2K2": "string",'
			. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] } }';

		$this->expectException( ApiUsageException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_UNMATCHING_ZID );

		$this->doApiRequestWithToken(
			[
				'action' => 'wikilambda_edit',
				'summary' => 'Summary message',
				'zid' => 'Z888',
				'zobject' => $data
			],
			null,
			$this->getTestUser( [ 'functioneer', 'functionmaintainer' ] )->getAuthority() );
	}

	public function testCreateFailed_labelClash() {
		$sysopUser = $this->getTestSysop()->getUser();
		$firstZid = $this->store->getNextAvailableZid();

		// Create the first Zobject
		$data = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. ' "Z2K2": "string",'
			. ' "Z2K3":{ "Z1K1":"Z12", "Z12K1":[ "Z11", { "Z1K1":"Z11", "Z11K1":"Z1002", "Z11K2":"unique label" }]}}';
		$this->store->createNewZObject( RequestContext::getMain(), $data, 'First zobject', $sysopUser );

		$this->expectException( ApiUsageException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_LABEL_CLASH );

		// Try to create the second Zobject with the same label
		$result = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_edit',
			'summary' => 'Summary message',
			'zobject' => $data
		] );
	}

	/**
	 * @group Broken
	 *
	 * TODO (T309386): Opis doesn't detect failures that Ajv does with
	 * current schemata implementation of typed lists. When fixed, uncomment
	 * this test.
	 */
	public function testCreateFailed_invalidLabel() {
		$sysopUser = $this->getTestSysop()->getUser();
		$firstZid = $this->store->getNextAvailableZid();

		// Create the first Zobject
		$data = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
		   . ' "Z2K2": "string",'
		   . ' "Z2K3":{ "Z1K1":"Z12", "Z12K1":[ "Z11", { "Z1K1":"Z11", "Z11K1":"en", "Z11K2":"wrong language" }]}}';

		$this->expectException( ApiUsageException::class );
		// TODO (T302598): detailed errors for Z2 related validations
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_NOT_WELLFORMED );

		$result = $this->doApiRequestWithToken( [
		   'action' => 'wikilambda_edit',
		   'summary' => 'Summary message',
		   'zobject' => $data
		] );
	}

	public function testUpdateFailed_invalidTitle() {
		$invalidZid = 'ZID';
		$data = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "' . $invalidZid . '" },'
			. ' "Z2K2": "string",'
			. ' "Z2K3":{ "Z1K1":"Z12", "Z12K1":[ "Z11", { "Z1K1":"Z11", "Z11K1":"Z1002", "Z11K2":"unique label" }]}}';

		$this->expectException( ApiUsageException::class );
		// TODO (T302598): detailed errors for Z2 related validations
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_UNKNOWN );

		$result = $this->doApiRequestWithToken(
			[
				'action' => 'wikilambda_edit',
				'zid' => $invalidZid,
				'summary' => 'Summary message',
				'zobject' => $data
			],
			null,
			$this->getTestUser( [ 'functioneer', 'functionmaintainer' ] )->getAuthority() );
	}

	public function testUpdateFailed_invalidIdentityType() {
		// Create the first Zobject
		$sysopUser = $this->getTestSysop()->getUser();
		$newZid = $this->store->getNextAvailableZid();
		$newData = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. ' "Z2K2": "string initial",'
			. ' "Z2K3":{ "Z1K1":"Z12", "Z12K1":[ "Z11", { "Z1K1":"Z11", "Z11K1":"Z1002", "Z11K2":"worse identity" }]}}';
		$this->store->createNewZObject( RequestContext::getMain(), $newData, 'New ZObject', $sysopUser );

		// Prepare for update
		$data = '{ "Z1K1": "Z2", "Z2K1": "' . $newZid . '",'
			. ' "Z2K2": "string edited",'
		  . ' "Z2K3":{ "Z1K1":"Z12", "Z12K1":[ "Z11", { "Z1K1":"Z11", "Z11K1":"Z1002", "Z11K2":"worse identity" }]}}';

		$this->expectException( ApiUsageException::class );
		// TODO (T302598): detailed errors for Z2 related validations
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_UNKNOWN );

		$result = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_edit',
			'zid' => $newZid,
			'summary' => 'Summary message',
			'zobject' => $data
		] );
	}

	public function testCreateFailed_invalidIdentityType() {
		$data = '{ "Z1K1": "Z2", "Z2K1": "Z0",'
			. ' "Z2K2": "string",'
			. ' "Z2K3":{ "Z1K1":"Z12", "Z12K1":[ "Z11", { "Z1K1":"Z11", "Z11K1":"Z1002", "Z11K2":"worse identity" }]}}';

		$this->expectException( ApiUsageException::class );
		// TODO (T302598): detailed errors for Z2 related validations
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_UNKNOWN );

		$result = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_edit',
			'summary' => 'Summary message',
			'zobject' => $data
		] );
	}

	public function testCreateFailed_invalidType() {
		$data = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z400" },'
			. ' "Z2K2": { '
				. ' "Z1K1": "' . ZTypeRegistry::Z_PERSISTENTOBJECT . '",'
				. ' "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
				. ' "Z2K2": { "Z1K1": "Z6", "Z6K1": "string" },'
				. ' "Z2K3": { "Z1K1": "Z12", "Z12K1": [ "Z11" ] }'
			. '},'
			. ' "Z2K3": { "Z1K1":"Z12", "Z12K1":[ "Z11", { "Z1K1":"Z11", "Z11K1":"Z1002", "Z11K2":"trouble" }]}}';

		// Try to create a nested ZPO
		$this->expectException( ApiUsageException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_DISALLOWED_ROOT_ZOBJECT );

		$result = $this->doApiRequestWithToken(
			[
				'action' => 'wikilambda_edit',
				'zid' => 'Z400',
				'summary' => 'Summary message',
				'zobject' => $data
			],
			null,
			$this->getTestUser( [ 'functioneer', 'functionmaintainer' ] )->getAuthority()
		);
	}

	public function testCreateSuccess() {
		$newZid = $this->store->getNextAvailableZid();

		$data = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. ' "Z2K2": "string",'
			. ' "Z2K3":{ "Z1K1":"Z12", "Z12K1":[ "Z11", { "Z1K1":"Z11", "Z11K1":"Z1002", "Z11K2":"new label" }]}}';

		$result = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_edit',
			'summary' => 'Summary message',
			'zobject' => $data
		] );

		$this->assertTrue( $result[0]['wikilambda_edit']['success'] );
		$this->assertEquals( $result[0]['wikilambda_edit']['title'], $newZid );
		$this->assertEquals( $result[0]['wikilambda_edit']['page'], $newZid );
	}

	public function testCreateSuccess_missingSummary() {
		$data = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
			. ' "Z2K2": "string",'
			. ' "Z2K3":{ "Z1K1":"Z12", "Z12K1":[ "Z11", { "Z1K1":"Z11", "Z11K1":"Z1002", "Z11K2":"new label" }]}}';

		$result = $this->doApiRequestWithToken( [
			'uselang' => 'en',
			'action' => 'wikilambda_edit',
			'summary' => null,
			'zobject' => $data
		] );
		$this->assertTrue( $result[0]['wikilambda_edit']['success'], 'should create a ZObject with no summary passed' );
	}

	public function testUpdateSuccess() {
		$sysopUser = $this->getTestSysop()->getUser();
		$newZid = $this->store->getNextAvailableZid();

		// Create the Zobject
		$data = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },'
		  . ' "Z2K2": "New ZObject", "Z2K3":'
			. ' { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "unique label" } ] } }';
		$this->store->createNewZObject( RequestContext::getMain(), $data, 'New ZObject', $sysopUser );

		$data = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "' . $newZid . '" },'
		  . ' "Z2K2": "New ZObject", "Z2K3":'
			. ' { "Z1K1": "Z12", "Z12K1": [ "Z11", { "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "new label" },'
			. ' { "Z1K1": "Z11", "Z11K1": "Z1003", "Z11K2": "nueva etiqueta" } ] } }';

		$result = $this->doApiRequestWithToken( [
			'action' => 'wikilambda_edit',
			'summary' => 'Summary message',
			'zid' => $newZid,
			'zobject' => $data
		] );
		$this->assertTrue( $result[0]['wikilambda_edit']['success'] );
		$this->assertEquals( $result[0]['wikilambda_edit']['title'], $newZid );
		$this->assertEquals( $result[0]['wikilambda_edit']['page'], $newZid );

		// Fetch ZObject and check it's been updated
		$title = Title::newFromText( $newZid, NS_MAIN );
		$zobject = $this->store->fetchZObjectByTitle( $title );
		$this->assertTrue( $zobject instanceof ZObjectContent );
		// We compare the JSONs after decoding because it's saved prettified
		$this->assertEquals( json_decode( $zobject->getText() ), json_decode( $data ) );
	}

	public function testCreateFailed_specifiedZIDWithoutAuth() {
		$data = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z12345" },'
			. ' "Z2K2": "string",'
			. ' "Z2K3": { "Z1K1":"Z12", "Z12K1":[ "Z11", { "Z1K1":"Z11", "Z11K1":"Z1002", "Z11K2":"new label" }]}}';

		$functioneerButNotMaintainerUser = $this->getTestUser( [ 'functioneer' ] )->getAuthority();

		$this->expectException( ApiUsageException::class );
		$this->expectExceptionMessage( ZErrorTypeRegistry::Z_ERROR_USER_CANNOT_EDIT );

		$result = $this->doApiRequestWithToken(
			[
				'action' => 'wikilambda_edit',
				'zid' => 'Z12345',
				'summary' => 'Summary message',
				'zobject' => $data
			],
			null,
			$functioneerButNotMaintainerUser
		);
	}

	public function testCreateSuccess_specifiedZIDWithAuth() {
		$data = '{ "Z1K1": "Z2", "Z2K1": { "Z1K1": "Z6", "Z6K1": "Z12345" },'
			. ' "Z2K2": "string",'
			. ' "Z2K3": { "Z1K1":"Z12", "Z12K1":[ "Z11", { "Z1K1":"Z11", "Z11K1":"Z1002", "Z11K2":"new label" }]}}';

		$superUser = $this->getTestUser( [ 'functioneer', 'functionmaintainer' ] )->getAuthority();

		// throw new \RuntimeException($superUser->isAllowed('wikilambda-create-arbitrary-zid'));

		$result = $this->doApiRequestWithToken(
			[
				'action' => 'wikilambda_edit',
				'zid' => 'Z12345',
				'summary' => 'Summary message',
				'zobject' => $data
			],
			null,
			$superUser
		);

		$this->assertTrue( $result[0]['wikilambda_edit']['success'] );
		$this->assertEquals( 'Z12345', $result[0]['wikilambda_edit']['title'] );
		$this->assertEquals( 'Z12345', $result[0]['wikilambda_edit']['page'] );
	}

}
