<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObject;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObject
 */
class ZObjectTest extends \MediaWikiIntegrationTestCase {

	protected function setUp() : void {
		parent::setUp();
		require_once dirname( __DIR__ ) . '/../../includes/defines.php';
	}

	/**
	 * @covers ::getType
	 */
	public function testGetType_emptyString() {
		$testObject = new ZObject( '' );
		$this->assertSame( $testObject->getType(), 'ZString' );
	}

	/**
	 * @covers ::getType
	 */
	public function testGetType_string() {
		$testObject = new ZObject( 'Test' );
		$this->assertSame( $testObject->getType(), 'ZString' );
	}

	/**
	 * @covers ::getType
	 */
	public function testGetType_list() {
		$testObject = new ZObject( '["Test"]' );
		$this->assertSame( $testObject->getType(), 'ZList' );
	}

	/**
	 * @covers ::getType
	 */
	public function testGetType_record() {
		$testObject = new ZObject( '{ "Z1K1": "Z1" }' );
		$this->assertSame( $testObject->getType(), 'ZObject' );
	}

	/**
	 * @covers ::getType
	 */
	public function testGetType_invalidThrows() {
		$testObject = new ZObject( '{ "Z2K1": "Test" }' );
		$this->expectException( \InvalidArgumentException::class );
		$this->assertSame( $testObject->getType(), 'Invalid so it matters not' );
	}
}
