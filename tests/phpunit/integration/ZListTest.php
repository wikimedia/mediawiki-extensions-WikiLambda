<?php

/**
 * WikiLambda integration test suite for the ZList class
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZList;
use MediaWiki\Extension\WikiLambda\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZString;

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

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 */
	public function testGetZType() {
		$testObject = new ZList( [ 'Test' ] );
		$this->assertSame( 'ZList', $testObject->getZType(), 'ZType of directly-created ZList' );

		$testObject = new ZPersistentObject( '["Test"]' );
		$this->assertSame( 'ZList', $testObject->getZType(), 'ZType of indirectly-created ZList' );
	}

	/**
	 * @dataProvider provideIsValid
	 * @covers ::isValid
	 * @covers ::isValidValue
	 */
	public function testIsValid( $inputHead, $inputTail, $expected ) {
		$testObject = new ZList( $inputHead, $inputTail );
		$this->assertSame( $expected, $testObject->isValid() );
	}

	public function provideIsValid() {
		return [
			'empty' => [ null, [], true ],

			'singleton string' => [ 'Test', [], true ],
			'multiple strings' => [ 'Test1', [ 'Test2','Test3' ], true ],

			'singleton list of a singleton string' => [ new ZList( 'Test', [] ), [], true ],
			'singleton list of multiple strings' => [ new ZList( 'Test1', [ 'Test2','Test3' ] ), [], true ],

			'singleton non-ZObject object' => [ new \stdClass(), [], false ],

			'singleton ZString object' => [ new ZString(), [], true ],
			'multiple ZString objects' => [ new ZString(), [ new ZString(),new \stdClass(),new ZString() ], false ],

			'multiple ZString objects with a non-ZObject' => [ new ZString(), [ new ZString(),new ZString() ], true ],
		];
	}
}
