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
	 * @covers \MediaWiki\Extension\WikiLambda\ZList::getZListAsArray
	 * @covers \MediaWiki\Extension\WikiLambda\ZList::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZList::getZValue
	 */
	public function testPersistentCreation() {
		$testObject = new ZPersistentObject( '[]' );
		$this->assertSame( 'ZList', $testObject->getZType() );
		$this->assertSame( [ null, [] ], $testObject->getZValue() );
		$this->assertSame( [], $testObject->getInnerZObject()->getZListAsArray() );

		$testObject = new ZPersistentObject( '["Test"]' );
		$this->assertSame( 'ZList', $testObject->getZType() );
		$this->assertSame( [ 'Test', [] ], $testObject->getZValue() );
		$this->assertSame( [ 'Test' ], $testObject->getInnerZObject()->getZListAsArray() );

		$testObject = new ZPersistentObject( '["Test", "Test2"]' );
		$this->assertSame( 'ZList', $testObject->getZType() );
		$this->assertSame( [ 'Test', [ 'Test2' ] ], $testObject->getZValue() );
		$this->assertSame( [ 'Test', 'Test2' ], $testObject->getInnerZObject()->getZListAsArray() );

		$testObject = new ZPersistentObject( '["Test","Test2","Test3"]' );
		$this->assertSame( 'ZList', $testObject->getZType() );
		$this->assertSame( [ 'Test', [ "Test2", "Test3" ] ], $testObject->getZValue() );
		$this->assertSame( [ 'Test', 'Test2', 'Test3' ], $testObject->getInnerZObject()->getZListAsArray() );

		$testObject = new ZPersistentObject( '[["Test"],["Test2"],["Test3"]]' );
		$this->assertSame( 'ZList', $testObject->getZType() );
		$this->assertSame( [ [ 'Test' ], [ [ "Test2" ], [ "Test3" ] ] ], $testObject->getZValue() );
		$this->assertSame( [ [ 'Test' ], [ 'Test2' ], [ 'Test3' ] ], $testObject->getInnerZObject()->getZListAsArray() );

		$testObject = new ZPersistentObject( '[["Test"],["Test2","Test3"]]' );
		$this->assertSame( 'ZList', $testObject->getZType() );
		$this->assertSame( [ [ 'Test' ], [ [ "Test2", "Test3" ] ] ], $testObject->getZValue() );
		$this->assertSame( [ [ 'Test' ], [ 'Test2', 'Test3' ] ], $testObject->getInnerZObject()->getZListAsArray() );

		$testObject = new ZPersistentObject( '[["Test", "Test2"],["Test3","Test4"]]' );
		$this->assertSame( 'ZList', $testObject->getZType() );
		$this->assertSame( [ [ 'Test', 'Test2' ], [ [ "Test3", "Test4" ] ] ], $testObject->getZValue() );
		$this->assertSame( [ [ 'Test', 'Test2' ], [ 'Test3', 'Test4' ] ], $testObject->getInnerZObject()->getZListAsArray() );
	}
}
