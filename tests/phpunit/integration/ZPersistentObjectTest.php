<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZPersistentObject;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZPersistentObject
 */
class ZPersistentObjectTest extends \MediaWikiIntegrationTestCase {

	protected function setUp() : void {
		parent::setUp();
		require_once dirname( __DIR__ ) . '/../../includes/defines.php';
	}

	/**
	 * @covers ::getType
	 */
	public function testGetType_emptyString() {
		$testObject = new ZPersistentObject( '' );
		$this->assertSame( $testObject->getType(), 'ZString' );
	}

	/**
	 * @covers ::getType
	 */
	public function testGetType_string() {
		$testObject = new ZPersistentObject( 'Test' );
		$this->assertSame( $testObject->getType(), 'ZString' );
	}

	/**
	 * @covers ::getType
	 */
	public function testGetType_list() {
		$testObject = new ZPersistentObject( '["Test"]' );
		$this->assertSame( $testObject->getType(), 'ZList' );
	}

	/**
	 * @covers ::getType
	 */
	public function testGetType_record() {
		$testObject = new ZPersistentObject( '{ "Z1K1": "Z1" }' );
		$this->assertSame( $testObject->getType(), 'ZObject' );
	}

	/**
	 * @covers ::getType
	 */
	public function testGetType_invalidThrows() {
		$testObject = new ZPersistentObject( '{ "Z2K1": "Test" }' );
		$this->expectException( \InvalidArgumentException::class );
		$this->assertSame( $testObject->getType(), 'Invalid so it matters not' );
	}
}
