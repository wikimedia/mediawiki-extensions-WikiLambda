<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZPersistentObject;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZList
 */
class ZListTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getInnerZObject
	 */
	public function testPersistentCreation() {
		$testObject = new ZPersistentObject( '[]' );
		$this->assertSame( $testObject->getZType(), 'ZList' );
		$this->assertSame( $testObject->getZValue(), [ null, [] ] );

		$testObject = new ZPersistentObject( '["Test"]' );
		$this->assertSame( $testObject->getZType(), 'ZList' );
		$this->assertSame( $testObject->getZValue(), [ 'Test', 	[] ] );

		$testObject = new ZPersistentObject( '["Test", "Test2"]' );
		$this->assertSame( $testObject->getZType(), 'ZList' );
		$this->assertSame( $testObject->getZValue(), [ 'Test', [ 'Test2' ] ] );

		$testObject = new ZPersistentObject( '["Test","Test2","Test3"]' );
		$this->assertSame( $testObject->getZType(), 'ZList' );
		$this->assertSame( $testObject->getZValue(), [ 'Test', [ "Test2", "Test3" ] ] );

		$testObject = new ZPersistentObject( '[["Test"],["Test2"],["Test3"]]' );
		$this->assertSame( $testObject->getZType(), 'ZList' );
		$this->assertSame( $testObject->getZValue(), [ [ 'Test' ], [ [ "Test2" ], [ "Test3" ] ] ] );

		$testObject = new ZPersistentObject( '[["Test"],["Test2","Test3"]]' );
		$this->assertSame( $testObject->getZType(), 'ZList' );
		$this->assertSame( $testObject->getZValue(), [ [ 'Test' ], [ [ "Test2", "Test3" ] ] ] );

		$testObject = new ZPersistentObject( '[["Test", "Test2"],["Test3","Test4"]]' );
		$this->assertSame( $testObject->getZType(), 'ZList' );
		$this->assertSame( $testObject->getZValue(), [ [ 'Test', 'Test2' ], [ [ "Test3", "Test4" ] ] ] );
	}
}
