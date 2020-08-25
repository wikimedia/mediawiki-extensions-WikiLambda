<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZPersistentObject;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZString
 */
class ZStringTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getInnerZObject
	 */
	public function testPersistentCreation() {
		$testObject = new ZPersistentObject( '' );
		$this->assertSame( $testObject->getZType(), 'ZString' );
		$this->assertSame( $testObject->getZValue(), '' );

		$testObject = new ZPersistentObject( 'Test' );
		$this->assertSame( $testObject->getZType(), 'ZString' );
		$this->assertSame( $testObject->getZValue(), 'Test' );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z6", "Z6K1": "Test" }' );
		$this->assertSame( $testObject->getZType(), 'ZString' );
		$this->assertSame( $testObject->getZValue(), 'Test' );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z6", "Z6K1": "Test" }, "Z2K3": [] }' );
		$this->assertSame( $testObject->getZType(), 'ZString' );
		$this->assertSame( $testObject->getZValue(), 'Test' );
	}
}
