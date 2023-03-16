<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Api;

use ApiTestCase;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use MediaWiki\Title\Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\API\ApiQueryZobjects
 * @group Database
 * @group API
 */
class ApiQueryZObjectsTest extends ApiTestCase {

	/**
	 * @var string
	 */
	private $unavailableZid = 'Z0123456789';

	/**
	 * @var string
	 */
	private $notValidZid = 'NotValidZid';

	private const EN = 'Z1002';
	private const FR = 'Z1004';

	public function addDBDataOnce() {
		// Register necessary languages
		$langs = ZLangRegistry::singleton();
		$langs->register( self::EN, 'en' );
		$langs->register( self::FR, 'fr' );

		// Add ZTypeTest multilingual object (Z111)
		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );
		$baseObject = ZTestType::TEST_ENCODING;
		$page = $this->getServiceContainer()->getWikiPageFactory()->newFromTitle( $title );
		$content = ZObjectContentHandler::makeContent( $baseObject, $title );

		$status = $page->doUserEditContent(
			$content,
			$this->getTestSysop()->getUser(),
			"Test creation object"
		);
		$page->clear();
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::run
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::execute
	 */
	public function testNotFound() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => $this->unavailableZid
		] );

		$zObjects = $result[0]['query']['wikilambdaload_zobjects'];

		$this->assertCount( 1, $zObjects );
		$this->assertFalse( $zObjects[$this->unavailableZid]['success'] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::run
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::execute
	 */
	public function testNotValidZid() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => $this->notValidZid
		] );

		$zObjects = $result[0]['query']['wikilambdaload_zobjects'];

		$this->assertCount( 1, $zObjects );
		$this->assertFalse( $zObjects[$this->notValidZid]['success'] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::run
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::execute
	 */
	public function testMultipleZidsOneNotFound() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => "$this->unavailableZid|Z111",
		] );

		$zObjects = $result[0]['query']['wikilambdaload_zobjects'];

		$this->assertCount( 2, $zObjects );
		$this->assertFalse( $zObjects[$this->unavailableZid]['success'] );
		$this->assertTrue( $zObjects['Z111']['success'] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::run
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::execute
	 */
	public function testMultipleZidsOneNotValid() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => "Z111|$this->notValidZid",
		] );

		$zObjects = $result[0]['query']['wikilambdaload_zobjects'];

		$this->assertCount( 2, $zObjects );
		$this->assertFalse( $zObjects[$this->notValidZid]['success'] );
		$this->assertTrue( $zObjects['Z111']['success'] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::run
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::execute
	 */
	public function testMultipleZidsErrors() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => "Z111|$this->notValidZid|$this->unavailableZid",
		] );

		$zObjects = $result[0]['query']['wikilambdaload_zobjects'];

		$this->assertCount( 3, $zObjects );
		$this->assertFalse( $zObjects[$this->notValidZid]['success'] );
		$this->assertFalse( $zObjects[$this->unavailableZid]['success'] );
		$this->assertTrue( $zObjects['Z111']['success'] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::run
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::execute
	 */
	public function testNoLanguageFilter() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z111',
			'wikilambdaload_canonical' => true,
		] );

		$z111 = $result[0]['query']['wikilambdaload_zobjects']['Z111']['data'];
		$keys = $z111['Z2K2']['Z4K2'];
		$labels = $z111['Z2K3']['Z12K1'];

		// Remove type element
		array_shift( $keys );
		array_shift( $labels );

		$this->assertCount( 2, $labels );

		foreach ( $keys as $key ) {
			$this->assertCount( 3, $key['Z3K3']['Z12K1'] );
		}
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::run
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::execute
	 */
	public function testAvailableLanguage() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z111',
			'wikilambdaload_language' => 'fr',
			'wikilambdaload_canonical' => true,
		] );

		$z111 = $result[0]['query']['wikilambdaload_zobjects']['Z111']['data'];
		$keys = $z111['Z2K2']['Z4K2'];
		$labels = $z111['Z2K3']['Z12K1'];

		// Remove type element
		array_shift( $keys );
		array_shift( $labels );

		$this->assertCount( 1, $labels );
		$this->assertEquals( self::FR, $labels[0]['Z11K1'] );

		foreach ( $keys as $key ) {
			$this->assertCount( 2, $key['Z3K3']['Z12K1'] );
			$this->assertEquals( self::FR, $key['Z3K3']['Z12K1'][1]['Z11K1'] );
		}
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::run
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::execute
	 */
	public function testUnavailableLanguage() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z111',
			'wikilambdaload_language' => 'es',
			'wikilambdaload_canonical' => true,
		] );

		$z111 = $result[0]['query']['wikilambdaload_zobjects']['Z111']['data'];
		$keys = $z111['Z2K2']['Z4K2'];
		$labels = $z111['Z2K3']['Z12K1'];

		// Remove type element
		array_shift( $keys );
		array_shift( $labels );

		$this->assertCount( 1, $labels );
		$this->assertEquals( self::EN, $labels[0]['Z11K1'] );

		foreach ( $keys as $key ) {
			$this->assertCount( 2, $key['Z3K3']['Z12K1'] );
			$this->assertEquals( self::EN, $key['Z3K3']['Z12K1'][1]['Z11K1'] );
		}
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::run
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::execute
	 */
	public function testNormalForm() {
		$result_normal = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z111'
		] );
		$result_canonical = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z111',
			'wikilambdaload_canonical' => true,
		] );

		$z111_normal = $result_normal[0]['query']['wikilambdaload_zobjects']['Z111']['data'];
		$z111_canonical = $result_canonical[0]['query']['wikilambdaload_zobjects']['Z111']['data'];

		$nullReference = [
			'Z1K1' => 'Z9',
			'Z9K1' => 'Z111'
		];
		$stringZ111K1 = [
			'Z1K1' => 'Z6',
			'Z6K1' => 'Z111K1'
		];
		$referenceZ6 = [
			'Z1K1' => 'Z9',
			'Z9K1' => 'Z6'
		];

		$this->assertEquals( 'Z111', $z111_canonical['Z2K2']['Z4K3'] );
		$this->assertEquals( $nullReference, $z111_normal['Z2K2']['Z4K3'] );

		$this->assertEquals( 'Z6', $z111_canonical['Z2K2']['Z4K2'][1]['Z3K1'] );
		$this->assertEquals( $referenceZ6, $z111_normal['Z2K2']['Z4K2']['K1']['Z3K1'] );

		$this->assertEquals( 'Z111K1', $z111_canonical['Z2K2']['Z4K2'][1]['Z3K2'] );
		$this->assertEquals( $stringZ111K1, $z111_normal['Z2K2']['Z4K2']['K1']['Z3K2'] );
	}
}
