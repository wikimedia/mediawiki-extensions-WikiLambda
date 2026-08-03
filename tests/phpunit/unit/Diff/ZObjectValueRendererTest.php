<?php

/**
 * WikiLambda unit test suite for the ZObjectValueRenderer
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\Diff\DiffLabelResolver;
use MediaWiki\Extension\WikiLambda\Diff\ZObjectValueRenderer;
use MediaWiki\Language\MessageLocalizer;
use MediaWiki\Message\Message;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Diff\ZObjectValueRenderer
 */
class ZObjectValueRendererTest extends MediaWikiUnitTestCase {

	/**
	 * A renderer whose labels come from the fixtures of the reported case
	 * (T284473): the "configuration of functions for given languages" object
	 * Z26096, whose option list holds Z14293 records.
	 */
	private function newRenderer(): ZObjectValueRenderer {
		$localizer = $this->createMock( MessageLocalizer::class );
		$localizer->method( 'msg' )->willReturnCallback( function ( $key ) {
			$message = $this->createMock( Message::class );
			$message->method( 'numParams' )->willReturnSelf();
			$message->method( 'text' )->willReturn( "[$key]" );
			return $message;
		} );

		$labels = $this->createMock( DiffLabelResolver::class );
		$labels->method( 'getKeyLabel' )->willReturnCallback(
			static fn ( string $key ): string => [
				'Z14293K1' => 'function to use',
				'Z14293K2' => 'for the following languages',
				'Z14294K1' => 'option',
				'Z8K1' => 'arguments',
				'Z16K2' => 'code',
			][$key] ?? $key
		);
		$labels->method( 'getReference' )->willReturnCallback(
			static fn ( string $zid ): ?array => [
				'Z32270' => [ 'label' => 'subject is type of, Lorrain', 'url' => '/wiki/Z32270' ],
				'Z2053' => [ 'label' => 'Lorrain', 'url' => '/wiki/Z2053' ],
				'Z1332' => [ 'label' => 'Chinese', 'url' => '/wiki/Z1332' ],
				'Z600' => [ 'label' => null, 'url' => '/wiki/Z600' ],
			][$zid] ?? null
		);
		$labels->method( 'getLanguage' )->willReturnCallback(
			static fn ( string $zid ): array => [
				'Z1002' => [ 'name' => 'English', 'code' => 'en', 'dir' => 'ltr' ],
			][$zid] ?? [ 'name' => $zid, 'code' => '', 'dir' => 'auto' ]
		);

		return new ZObjectValueRenderer( $localizer, $labels );
	}

	public function testReportedCaseRendersAsLabelledLinkedLines() {
		// The value that used to appear as raw JSON on
		// https://www.wikifunctions.org/w/index.php?title=Z26096&diff=0&oldid=293803
		$value = [
			'Z1K1' => 'Z14293',
			'Z14293K1' => 'Z32270',
			'Z14293K2' => [ 'Z60', 'Z2053' ],
		];

		$this->assertSame(
			'function to use: <a href="/wiki/Z32270">subject is type of, Lorrain (Z32270)</a>'
				. '<br />for the following languages: <a href="/wiki/Z2053">Lorrain (Z2053)</a>',
			$this->newRenderer()->render( $value, '17' )
		);
	}

	public function testPlainTypeIsOmittedButStructuredTypeIsKept() {
		$renderer = $this->newRenderer();

		// A plain type reference repeats what the key already says.
		$this->assertStringNotContainsString(
			'Z14293',
			$renderer->render( [ 'Z1K1' => 'Z14293', 'Z14293K1' => 'Z32270' ], 'Z14294K1' )
		);

		// A generic type is itself informative, so it stays.
		$generic = [
			'Z1K1' => [ 'Z1K1' => 'Z7', 'Z7K1' => 'Z881', 'Z881K1' => 'Z6' ],
			'K1' => 'first',
		];
		$this->assertStringContainsString( 'Z881', $renderer->render( $generic, 'Z8K1' ) );
	}

	public function testStringObjectRendersAsItsTextOnly() {
		$this->assertSame(
			'Mushroom',
			$this->newRenderer()->render( [ 'Z1K1' => 'Z6', 'Z6K1' => 'Mushroom' ], 'Z8K1' )
		);
	}

	public function testStringObjectWhoseTextLooksLikeAReferenceIsNotLinked() {
		$this->assertSame(
			'Z32270',
			$this->newRenderer()->render( [ 'Z1K1' => 'Z6', 'Z6K1' => 'Z32270' ], 'Z8K1' )
		);
	}

	public function testMonolingualRendersAsLanguageAndText() {
		$this->assertSame(
			'English: Mushroom',
			$this->newRenderer()->render(
				[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => 'Mushroom' ], 'Z12K1'
			)
		);
	}

	public function testMonolingualStringSetJoinsItsStrings() {
		$this->assertSame(
			'English: a, b',
			$this->newRenderer()->render(
				[ 'Z1K1' => 'Z31', 'Z31K1' => 'Z1002', 'Z31K2' => [ 'Z6', 'a', 'b' ] ], 'Z32K1'
			)
		);
	}

	public function testListOfReferencesIsRunTogetherAndLinked() {
		$this->assertSame(
			'<a href="/wiki/Z2053">Lorrain (Z2053)</a>, <a href="/wiki/Z1332">Chinese (Z1332)</a>',
			$this->newRenderer()->render( [ 'Z60', 'Z2053', 'Z1332' ], 'Z14293K2' )
		);
	}

	public function testListOfStringsIsNotLinkedEvenWhenItemsLookLikeReferences() {
		$this->assertSame(
			'Z2053, plain',
			$this->newRenderer()->render( [ 'Z6', 'Z2053', 'plain' ], 'Z31K2' )
		);
	}

	public function testReferenceWithoutALabelStillLinks() {
		$this->assertSame(
			'<a href="/wiki/Z600">Z600</a>',
			$this->newRenderer()->render( 'Z600', 'Z8K1' )
		);
	}

	public function testUnresolvableReferenceIsPlainText() {
		$this->assertSame( 'Z9999', $this->newRenderer()->render( 'Z9999', 'Z8K1' ) );
	}

	public function testFreeTextIsNeverLinked() {
		$this->assertSame( 'Z32270', $this->newRenderer()->render( 'Z32270', null ) );
	}

	public function testNestedRecordIsIndentedUnderItsKey() {
		$value = [
			'Z1K1' => 'Z14293',
			'Z14293K1' => [
				'Z1K1' => 'Z14293',
				'Z14293K1' => 'Z32270',
				'Z14293K2' => [ 'Z60', 'Z2053' ],
			],
		];
		$html = $this->newRenderer()->render( $value, 'Z14294K1' );

		// The key is on its own line, with the nested value's lines beneath it.
		$this->assertStringContainsString( 'function to use:<br />', $html );
		$this->assertStringContainsString( "\u{00A0}\u{00A0}function to use: ", $html );
	}

	public function testValueIsEscaped() {
		$html = $this->newRenderer()->render(
			[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => '<script>alert(1)</script>' ], 'Z12K1'
		);

		$this->assertStringNotContainsString( '<script>', $html );
		$this->assertStringContainsString( '&lt;script&gt;', $html );
	}

	public function testMultilineTextBecomesVisibleBreaks() {
		$this->assertSame(
			'foo<br />bar',
			$this->newRenderer()->render( [ 'Z1K1' => 'Z6', 'Z6K1' => "foo\nbar" ], 'Z16K2' )
		);
	}

	public function testTooDeeplyNestedValueIsElided() {
		// Four levels of records: the innermost is past MAX_DEPTH.
		$value = [ 'K1' => [ 'K1' => [ 'K1' => [ 'K1' => 'buried' ] ] ] ];
		$html = $this->newRenderer()->render( $value, 'Z8K1' );

		$this->assertStringNotContainsString( 'buried', $html );
		$this->assertStringContainsString( '[wikilambda-diff-value-elided]', $html );
	}

	public function testOverlongValueIsElidedRatherThanFlooding() {
		// A record of 50 keys, well past the 20-line budget.
		$value = [];
		for ( $index = 1; $index <= 50; $index++ ) {
			$value["K$index"] = "value $index";
		}
		$html = $this->newRenderer()->render( $value, 'Z8K1' );

		$this->assertSame( 20, substr_count( $html, '<br />' ) );
		$this->assertStringContainsString( '[wikilambda-diff-value-elided]', $html );
		$this->assertStringNotContainsString( 'value 50', $html );
	}

	public function testBudgetIsPerRenderNotPerRenderer() {
		$value = [];
		for ( $index = 1; $index <= 50; $index++ ) {
			$value["K$index"] = "value $index";
		}
		$renderer = $this->newRenderer();

		$this->assertSame( $renderer->render( $value, 'Z8K1' ), $renderer->render( $value, 'Z8K1' ) );
	}

	/**
	 * @dataProvider provideWholeRendering
	 */
	public function testRendersWhole( $value, ?string $valueKey, bool $expected ) {
		$this->assertSame( $expected, $this->newRenderer()->rendersWhole( $value, $valueKey ) );
	}

	public static function provideWholeRendering() {
		return [
			'structure' => [ [ 'Z1K1' => 'Z6' ], 'Z8K1', true ],
			'resolvable reference' => [ 'Z2053', 'Z8K1', true ],
			'reference in a literal position' => [ 'Z2053', 'Z6K1', false ],
			'reference as free text' => [ 'Z2053', null, false ],
			'unresolvable reference' => [ 'Z9999', 'Z8K1', false ],
			'plain text' => [ 'Toadstool', 'Z8K1', false ],
		];
	}

	public function testRenderTextLeavesStringsAloneAndSerialisesStructures() {
		$renderer = $this->newRenderer();

		$this->assertSame( 'Mushroom', $renderer->renderText( 'Mushroom' ) );
		$this->assertSame( '{"Z1K1":"Z6"}', $renderer->renderText( [ 'Z1K1' => 'Z6' ] ) );
	}
}
