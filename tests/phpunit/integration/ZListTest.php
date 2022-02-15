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
	 * @covers ::__construct
	 * @covers ::getZType
	 */
	public function testGetZType() {
		$testObject = new ZList( [ 'Test' ] );
		$this->assertSame( 'Z10', $testObject->getZType(), 'ZType of directly-created ZList' );

		$testObject = new ZObjectContent( '["Test"]' );
		$this->assertSame( 'Z881', $testObject->getZType(), 'ZType of indirectly-created ZList' );
	}

	/**
	 * @dataProvider provideIsValid
	 * @covers ::isValid
	 * @covers ::getAsArray
	 * @covers ::getZValue
	 */
	public function testIsValid( $input, $expected, $expectedCount ) {
		$testObject = new ZList( $input );
		$this->assertCount( $expectedCount, $testObject->getAsArray() );
		$this->assertSame( $expected, $testObject->isValid() );
	}

	public function provideIsValid() {
		return [
			'empty' => [ [], true, 0 ],
			'invalid elements' => [ [ 'invalid', 'elements' ], false, 2 ],
			'singleton array' => [ [ new ZString() ], true, 1 ],
			'array of strings' => [ [ new ZString(), new ZString() ], true, 2 ],
			'array of string and ref' => [ [ new ZString(), new ZReference( 'Z1' ) ], true, 2 ],
			'array of valid arrays' => [ [ new ZList( [ new ZString() ] ) ] , true, 1 ],
			'array of invalid arrays' => [ [ new ZList( [ 'invalid array' ] ) ] , false, 1 ],
			'array with invalid second element' => [ [ new ZString(), 'invalid element', new ZString() ], false, 3 ]
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
