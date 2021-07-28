<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Api;

use ApiTestCase;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectContentHandler;
use Title;
use WikiPage;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\API\ApiQueryZobjects
 * @group Database
 * @group API
 * @group WikiLambda
 * @group medium
 */
class ApiQueryZObjectsTest extends ApiTestCase {

	private $unavailableZid = 'Z0123456789';
	private $notValidZid = 'NotValidZid';

	private const EN = 'Z1002';
	private const FR = 'Z1004';

	public function addDBDataOnce() {
		// Register necessary languages
		$langs = ZLangRegistry::singleton();
		$langs->register( self::EN, 'en' );
		$langs->register( self::FR, 'fr' );

		// Add ZTypeTest multilingual object (Z111)
		$title = Title::newFromText( ZTestType::TEST_ZID, NS_ZOBJECT );
		$baseObject = ZTestType::TEST_ENCODING;
		$page = WikiPage::factory( $title );
		$content = ZObjectContentHandler::makeContent( $baseObject, $title );
		$page->doUserEditContent(
			$content,
			$this->getTestSysop()->getUser(),
			"Test creation object"
		);
		$page->clear();
	}

	/**
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
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::execute
	 */
	public function testNoLanguageFilter() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z111'
		] );

		$z111 = $result[0]['query']['wikilambdaload_zobjects']['Z111']['data'];
		$keys = $z111['Z2K2']['Z4K2'];
		$labels = $z111['Z2K3']['Z12K1'];

		$this->assertCount( 2, $labels );

		foreach ( $keys as $key ) {
			$this->assertCount( 2, $key['Z3K3']['Z12K1'] );
		}
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::execute
	 */
	public function testAvailableLanguage() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z111',
			'wikilambdaload_language' => 'fr',
		] );

		$z111 = $result[0]['query']['wikilambdaload_zobjects']['Z111']['data'];
		$keys = $z111['Z2K2']['Z4K2'];
		$labels = $z111['Z2K3']['Z12K1'];

		$this->assertCount( 1, $labels );
		$this->assertEquals( self::FR, $labels[0]['Z11K1'] );

		foreach ( $keys as $key ) {
			$this->assertCount( 1, $key['Z3K3']['Z12K1'] );
			$this->assertEquals( self::FR, $key['Z3K3']['Z12K1'][0]['Z11K1'] );
		}
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\API\ApiQueryZObjects::execute
	 */
	public function testUnavailableLanguage() {
		$result = $this->doApiRequest( [
			'action' => 'query',
			'list' => 'wikilambdaload_zobjects',
			'wikilambdaload_zids' => 'Z111',
			'wikilambdaload_language' => 'es',
		] );

		$z111 = $result[0]['query']['wikilambdaload_zobjects']['Z111']['data'];
		$keys = $z111['Z2K2']['Z4K2'];
		$labels = $z111['Z2K3']['Z12K1'];

		$this->assertCount( 1, $labels );
		$this->assertEquals( self::EN, $labels[0]['Z11K1'] );

		foreach ( $keys as $key ) {
			$this->assertCount( 1, $key['Z3K3']['Z12K1'] );
			$this->assertEquals( self::EN, $key['Z3K3']['Z12K1'][0]['Z11K1'] );
		}
	}

	/**
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
			'Z9K1' => 'Z0'
		];
		$stringZ111K1 = [
			'Z1K1' => 'Z6',
			'Z6K1' => 'Z111K1'
		];
		$referenceZ6 = [
			'Z1K1' => 'Z9',
			'Z9K1' => 'Z6'
		];

		$this->assertEquals( $z111_canonical['Z2K2']['Z4K3'], 'Z0' );
		$this->assertEquals( $z111_normal['Z2K2']['Z4K3'], $nullReference );

		$this->assertEquals( $z111_canonical['Z2K2']['Z4K2'][0]['Z3K1'], 'Z6' );
		$this->assertEquals( $z111_normal['Z2K2']['Z4K2'][0]['Z3K1'], $referenceZ6 );

		$this->assertEquals( $z111_canonical['Z2K2']['Z4K2'][0]['Z3K2'], 'Z111K1' );
		$this->assertEquals( $z111_normal['Z2K2']['Z4K2'][0]['Z3K2'], $stringZ111K1 );

		// Exclude ZMultilingualStrings
		$this->assertEquals( $z111_canonical['Z2K3']['Z12K1'], $z111_normal['Z2K3']['Z12K1'] );
	}
}
