<?php

/**
 * WikiLambda integration test suite for the ZHTMLFragment (Z89) class
 *
 * ZHTMLFragment is a data container for raw HTML produced by functions; sanitisation /
 * escaping is the consumer's responsibility. These tests lock in two security-relevant
 * invariants: (a) the container preserves its input string byte-for-byte (no silent
 * transformation that could neutralise or introduce XSS), and (b) a non-string payload
 * is rejected by isValid() so it never reaches a renderer that assumes string.
 *
 * @copyright 2024– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjects\ZHTMLFragment;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZHTMLFragment
 *
 * @group Database
 */
class ZHTMLFragmentTest extends WikiLambdaIntegrationTestCase {

	public function testConstructor_default() {
		$testObject = new ZHTMLFragment();
		$this->assertTrue( $testObject->isValid(), 'Default ZHTMLFragment is valid' );
		$this->assertSame( '', $testObject->getZValue(), 'Default ZHTMLFragment has empty value' );
	}

	public function testConstructor_emptyString() {
		$testObject = new ZHTMLFragment( '' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( '', $testObject->getZValue() );
	}

	public function testConstructor_plainText() {
		$testObject = new ZHTMLFragment( 'plain text with no markup' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'plain text with no markup', $testObject->getZValue() );
	}

	/**
	 * @dataProvider provideHtmlPayloads
	 */
	public function testConstructor_preservesExactInput( string $input ) {
		$testObject = new ZHTMLFragment( $input );
		$this->assertTrue( $testObject->isValid(), 'String input is valid' );
		$this->assertSame(
			$input,
			$testObject->getZValue(),
			'ZHTMLFragment stores its input verbatim — no silent transformation'
		);
	}

	public static function provideHtmlPayloads(): array {
		return [
			'benign markup' => [ '<p>Hello, world.</p>' ],
			'nested markup' => [ '<div class="x"><span>text</span></div>' ],
			'script-tag payload' => [ '<script>alert(1)</script>' ],
			'javascript-url payload' => [ '<a href="javascript:alert(1)">click</a>' ],
			'img onerror payload' => [ '<img src=x onerror="alert(1)">' ],
			'entity-encoded content' => [ '&lt;script&gt;alert(1)&lt;/script&gt;' ],
			'mixed quotes and backticks' => [ '<a title="\'`\\"`\'">x</a>' ],
			'non-ascii unicode' => [ '<p>→ δοκιμή ←</p>' ],
			'NULL byte in content' => [ "before\0after" ],
			'CRLF in content' => [ "line1\r\nline2" ],
		];
	}

	/**
	 * @dataProvider provideNonStringPayloads
	 */
	public function testIsValid_rejectsNonString( $input ) {
		$testObject = new ZHTMLFragment( $input );
		$this->assertFalse(
			$testObject->isValid(),
			'Non-string payload must not validate — downstream renderers assume string'
		);
	}

	public static function provideNonStringPayloads(): array {
		return [
			'null' => [ null ],
			'integer' => [ 42 ],
			'float' => [ 3.14 ],
			'bool true' => [ true ],
			'bool false' => [ false ],
			'array' => [ [ 'not', 'a', 'string' ] ],
			'stdClass' => [ new \stdClass() ],
		];
	}

	public function testGetZType() {
		$testObject = new ZHTMLFragment( 'x' );
		$this->assertSame(
			ZTypeRegistry::Z_HTML_FRAGMENT,
			$testObject->getZType(),
			'ZType is Z89'
		);
	}

	public function testGetDefinition() {
		$definition = ZHTMLFragment::getDefinition();

		$this->assertSame( ZTypeRegistry::Z_REFERENCE, $definition['type']['type'] );
		$this->assertSame( ZTypeRegistry::Z_HTML_FRAGMENT, $definition['type']['value'] );

		$this->assertArrayHasKey( ZTypeRegistry::Z_HTML_FRAGMENT_VALUE, $definition['keys'] );
		$valueKey = $definition['keys'][ ZTypeRegistry::Z_HTML_FRAGMENT_VALUE ];
		$this->assertSame( ZTypeRegistry::BUILTIN_STRING, $valueKey['type'] );
		$this->assertSame( '', $valueKey['default'] );
	}
}
