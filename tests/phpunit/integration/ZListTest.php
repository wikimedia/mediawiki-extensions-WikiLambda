<?php

/**
 * WikiLambda integration test suite for the ZList class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use FormatJson;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZList
 */
class ZListTest extends WikiLambdaIntegrationTestCase {

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
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZList::getDefinition
	 */
	public function testPersistentCreation() {
		$testObject = new ZObjectContent( '[]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [], $testObject->getZValue() );
		$this->assertSame( [], $testObject->getInnerZObject()->getZListAsArray() );

		$testObject = new ZObjectContent( '["Test"]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [ 'Test' ], $testObject->getInnerZObject()->getSerialized() );

		$testObject = new ZObjectContent( '["Test", "Test2"]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [ 'Test', 'Test2' ], $testObject->getInnerZObject()->getSerialized() );

		$testObject = new ZObjectContent( '["Test","Test2","Test3"]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [ 'Test', 'Test2', 'Test3' ], $testObject->getInnerZObject()->getSerialized() );

		$testObject = new ZObjectContent( '[["Test"],["Test2"],["Test3"]]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame(
			[ [ 'Test' ], [ 'Test2' ], [ 'Test3' ] ],
			$testObject->getInnerZObject()->getSerialized()
		);

		$testObject = new ZObjectContent( '[["Test"],["Test2","Test3"]]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [ [ 'Test' ], [ 'Test2', 'Test3' ] ], $testObject->getInnerZObject()->getSerialized() );

		$testObject = new ZObjectContent( '[["Test", "Test2"],["Test3","Test4"]]' );
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame(
			[ [ 'Test', 'Test2' ], [ 'Test3', 'Test4' ] ],
			$testObject->getInnerZObject()->getSerialized()
		);

		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": [
		"Test",
		"Test2",
	 	"Test3"
	],
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": []
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": []
	}
}
EOT
		);
		$this->assertSame( 'Z10', $testObject->getZType() );
		$this->assertSame( [ 'Test', 'Test2', 'Test3' ], $testObject->getInnerZObject()->getSerialized() );
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
	 */
	public function testIsValid( $input, $expected ) {
		$testObject = new ZList( $input );
		$this->assertSame( $expected, $testObject->isValid() );
	}

	public function provideIsValid() {
		return [
			'empty' => [ [], true ],
			'invalid elements' => [ [ 'invalid', 'elements' ], false ],
			'singleton array' => [ [ new ZString() ], true ],
			'array of strings' => [ [ new ZString(), new ZString() ], true ],
			'array of string and ref' => [ [ new ZString(), new ZReference( 'Z1' ) ], true ],
			'array of valid arrays' => [ [ new ZList( [ new ZString() ] ) ] , true ],
			'array of invalid arrays' => [ [ new ZList( [ 'invalid array' ] ) ] , false ],
			'array with invalid second element' => [ [ new ZString(), 'invalid element', new ZString() ], false ]
		];
	}

	/**
	 * @dataProvider provideSerializeCanonical
	 * @covers ::getSerialized
	 * @covers ::getSerializedCanonical
	 */
	public function testSerializeCanonical( $zlist, $expected ) {
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $expected ) ),
			FormatJson::encode( $zlist->getSerialized() )
		);
	}

	public function provideSerializeCanonical() {
		return [
			'list of strings' => [
				new ZList( [ new ZString( 'one' ), new ZString( 'two' ) ] ),
				'["one", "two"]'
			],
			'list of string and reference' => [
				new ZList( [ new ZString( 'one' ), new ZReference( 'Z6' ) ] ),
				'["one", "Z6"]'
			],
			'list of Z6 as string and as reference' => [
				new ZList( [ new ZString( 'Z6' ), new ZReference( 'Z6' ) ] ),
				'[{ "Z1K1": "Z6", "Z6K1": "Z6"}, "Z6"]'
			],
			'list of lists' => [
				new ZList( [ new ZList( [ new ZString( 'Z6' ) ] ), new ZList( [ new ZReference( 'Z6' ) ] ) ] ),
				'[[{ "Z1K1": "Z6", "Z6K1": "Z6"}], ["Z6"]]'
			],
		];
	}

	/**
	 * @dataProvider provideSerializeCanonical
	 * @covers ::getSerialized
	 * @covers ::getSerializedNormal
	 */
	public function testSerializeNormal( $zlist, $expected ) {
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $expected ) ),
			FormatJson::encode( $zlist->getSerialized() )
		);
	}

	public function provideSerializeNormal() {
		return [
			'list of strings' => [
				new ZList( [ new ZString( 'one' ), new ZString( 'two' ) ] ),
				'{"Z1K1": {"Z1K1": "Z9", "Z9K1": "Z10"}, "Z10K1": {"Z1K1": "Z6", "Z6K1": "one"}, "Z10K2": {'
					. '{"Z1K1": {"Z1K1": "Z9", "Z9K1": "Z10"}, "Z10K1": {"Z1K1": "Z6", "Z6K1": "two", "Z10K2": {'
					. '{"Z1K1": {"Z1K1": "Z9", "Z9K1": "Z10"}}}}}}}'
			],
		];
	}
}
