<?php

/**
 * WikiLambda unit test suite for AbstractSuggestedFunctionsSchema.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Config;

use MediaWiki\Extension\WikiLambda\Config\AbstractSuggestedFunctionsSchema;
use MediaWikiUnitTestCase;
use ReflectionClass;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Config\AbstractSuggestedFunctionsSchema
 */
class AbstractSuggestedFunctionsSchemaTest extends MediaWikiUnitTestCase {

	private static function getProperty(): array {
		$reflection = new ReflectionClass( AbstractSuggestedFunctionsSchema::class );
		return $reflection->getConstant( 'SuggestedFunctions' );
	}

	public function testIsArrayType(): void {
		$property = self::getProperty();
		$this->assertSame( 'array', $property['type'] ?? null );
	}

	public function testMaxItemsIsTen(): void {
		$property = self::getProperty();
		$this->assertSame( 10, $property['maxItems'] ?? null );
	}

	public function testItemsAreZidStrings(): void {
		$property = self::getProperty();
		$this->assertSame( 'string', $property['items']['type'] ?? null );
		$pattern = $property['items']['pattern'] ?? null;
		$this->assertIsString( $pattern );

		$regex = '/' . $pattern . '/';
		$this->assertSame( 1, preg_match( $regex, 'Z20756' ) );
		$this->assertSame( 1, preg_match( $regex, 'Z1' ) );
		$this->assertSame( 0, preg_match( $regex, 'Z0' ) );
		$this->assertSame( 0, preg_match( $regex, 'hello' ) );
	}

	public function testDefaultIsSeededFromLegacyList(): void {
		$property = self::getProperty();
		$this->assertSame(
			[ 'Z31465', 'Z32123', 'Z31331', 'Z31921', 'Z31870' ],
			$property['default'] ?? null,
			'Default should mirror the live value of abstract.wikipedia.org\'s '
			. 'MediaWiki:Abstractwiki-suggested-functions.json at migration time'
		);
	}
}
