<?php

/**
 * WikiLambda unit test suite for SuggestedFunctionsSchema.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Config;

use MediaWiki\Extension\WikiLambda\Config\SuggestedFunctionsSchema;
use MediaWikiUnitTestCase;
use ReflectionClass;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Config\SuggestedFunctionsSchema
 */
class SuggestedFunctionsSchemaTest extends MediaWikiUnitTestCase {

	private static function getProperty(): array {
		$reflection = new ReflectionClass( SuggestedFunctionsSchema::class );
		return $reflection->getConstant( 'SuggestedFunctions' );
	}

	public function testIsArrayType(): void {
		$property = self::getProperty();
		$this->assertSame( 'array', $property['type'] ?? null );
	}

	public function testMaxItemsIsFive(): void {
		$property = self::getProperty();
		$this->assertSame( 5, $property['maxItems'] ?? null );
	}

	public function testItemsAreZidStrings(): void {
		$property = self::getProperty();
		$this->assertSame( 'string', $property['items']['type'] ?? null );
		$pattern = $property['items']['pattern'] ?? null;
		$this->assertIsString( $pattern );

		$regex = '/' . $pattern . '/';
		$this->assertSame( 1, preg_match( $regex, 'Z20756' ) );
		$this->assertSame( 1, preg_match( $regex, 'Z1' ) );
		$this->assertSame( 0, preg_match( $regex, 'Z0' ),
			'Leading-zero ZID should be rejected' );
		$this->assertSame( 0, preg_match( $regex, 'hello' ),
			'Non-ZID string should be rejected' );
		$this->assertSame( 0, preg_match( $regex, 'z20756' ),
			'Lowercase prefix should be rejected' );
	}

	public function testDefaultIsSeededWithTwoZids(): void {
		$property = self::getProperty();
		$this->assertSame( [ 'Z20756', 'Z18428' ], $property['default'] ?? null );
	}
}
