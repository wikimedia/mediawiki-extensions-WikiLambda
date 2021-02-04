<?php

/**
 * WikiLambda integration test suite for the ZList class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZList
 */
class ZListTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getInnerZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getInnerZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZList::getZListAsArray
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZList::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZList::getZValue
	 */
	public function testPersistentCreation() {
		$testObject = new ZObjectContent( '[]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [ null, [] ], $testObject->getZValue() );
		$this->assertSame( [], $testObject->getInnerZObject()->getZListAsArray() );

		$testObject = new ZObjectContent( '["Test"]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [ 'Test', [] ], $testObject->getZValue() );
		$this->assertSame( [ 'Test' ], $testObject->getInnerZObject()->getZListAsArray() );

		$testObject = new ZObjectContent( '["Test", "Test2"]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [ 'Test', [ 'Test2' ] ], $testObject->getZValue() );
		$this->assertSame( [ 'Test', 'Test2' ], $testObject->getInnerZObject()->getZListAsArray() );

		$testObject = new ZObjectContent( '["Test","Test2","Test3"]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [ 'Test', [ "Test2", "Test3" ] ], $testObject->getZValue() );
		$this->assertSame( [ 'Test', 'Test2', 'Test3' ], $testObject->getInnerZObject()->getZListAsArray() );

		$testObject = new ZObjectContent( '[["Test"],["Test2"],["Test3"]]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [ [ 'Test' ], [ [ "Test2" ], [ "Test3" ] ] ], $testObject->getZValue() );
		$this->assertSame(
			[ [ 'Test' ], [ 'Test2' ], [ 'Test3' ] ],
			$testObject->getInnerZObject()->getZListAsArray()
		);

		$testObject = new ZObjectContent( '[["Test"],["Test2","Test3"]]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [ [ 'Test' ], [ [ "Test2", "Test3" ] ] ], $testObject->getZValue() );
		$this->assertSame( [ [ 'Test' ], [ 'Test2', 'Test3' ] ], $testObject->getInnerZObject()->getZListAsArray() );

		$testObject = new ZObjectContent( '[["Test", "Test2"],["Test3","Test4"]]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [ [ 'Test', 'Test2' ], [ [ "Test3", "Test4" ] ] ], $testObject->getZValue() );
		$this->assertSame(
			[ [ 'Test', 'Test2' ], [ 'Test3', 'Test4' ] ],
			$testObject->getInnerZObject()->getZListAsArray()
		);

		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z10",
		"Z10K1": "Test",
		"Z10K2": [
			"Test2",
			"Test3"
		]
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": []
	}
}
EOT
		);
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [ 'Test', [ "Test2", "Test3" ] ], $testObject->getZValue() );
		$this->assertSame( [ 'Test', 'Test2', 'Test3' ], $testObject->getInnerZObject()->getZListAsArray() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 */
	public function testGetZType() {
		$testObject = new ZList( [ 'Test' ] );
		$this->assertSame( 'Z10', $testObject->getZType(), 'ZType of directly-created ZList' );

		$testObject = new ZObjectContent( '["Test"]' );
		$this->assertSame( 'Z10', $testObject->getZType(), 'ZType of indirectly-created ZList' );
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

			'singleton array' => [ [ 'Test' ], [], true ],
			'multiple arrays' => [ [ 'Test1' ], [ [ 'Test2' ],[ 'Test3' ] ], true ],

			'singleton list of a singleton string' => [ new ZList( 'Test', [] ), [], true ],
			'singleton list of multiple strings' => [ new ZList( 'Test1', [ 'Test2','Test3' ] ), [], true ],

			'singleton non-ZObject object' => [ new \stdClass(), [], false ],

			'singleton ZString object' => [ new ZString(), [], true ],
			'multiple ZString objects' => [ new ZString(), [ new ZString(),new \stdClass(),new ZString() ], false ],

			'multiple ZString objects with a non-ZObject' => [ new ZString(), [ new ZString(),new ZString() ], true ],
		];
	}
}
