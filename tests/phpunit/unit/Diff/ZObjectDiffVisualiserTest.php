<?php

/**
 * WikiLambda unit test suite for the ZObjectDiffVisualiser
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\Diff\ZObjectDiffer;
use MediaWiki\Extension\WikiLambda\Diff\ZObjectDiffVisualiser;
use MediaWiki\Language\MessageLocalizer;
use MediaWiki\Message\Message;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Diff\ZObjectDiffVisualiser
 */
class ZObjectDiffVisualiserTest extends MediaWikiUnitTestCase {

	/**
	 * Build a visualiser whose MessageLocalizer echoes each message key back as
	 * its text, and whose language resolver knows English and French, so tests
	 * can assert grouping and language-keying without the real i18n or DB stack.
	 */
	private function newVisualiser(): ZObjectDiffVisualiser {
		$localizer = $this->createMock( MessageLocalizer::class );
		$localizer->method( 'msg' )->willReturnCallback( function ( $key ) {
			$message = $this->createMock( Message::class );
			$message->method( 'text' )->willReturn( "[$key]" );
			return $message;
		} );
		$languageResolver = static fn ( string $zid ): string => [
			'Z1002' => 'English',
			'Z1004' => 'French',
		][$zid] ?? $zid;
		$keyResolver = static fn ( string $key ): string => [
			'Z8K1' => 'arguments',
			'Z17K3' => 'label',
		][$key] ?? $key;
		$referenceResolver = static fn ( string $zid ): ?array => [
			'Z6' => [ 'label' => 'String', 'url' => '/wiki/Z6' ],
			'Z40' => [ 'label' => 'Boolean', 'url' => '/wiki/Z40' ],
		][$zid] ?? null;
		return new ZObjectDiffVisualiser( $localizer, $languageResolver, $keyResolver, $referenceResolver );
	}

	/**
	 * Wrap a monolingual string value in the ZObject structure under the given
	 * top-level key (a Z12 multilingual text with a single English entry).
	 *
	 * @param string $key Top-level key, e.g. 'Z2K3'
	 * @param string $value
	 * @return array
	 */
	private function monolingualField( string $key, string $value ): array {
		return [
			'Z1K1' => 'Z2',
			$key => [
				'Z1K1' => 'Z12',
				'Z12K1' => [
					'Z11',
					[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => $value ],
				],
			],
		];
	}

	private function diffOf( array $old, array $new ) {
		return ( new ZObjectDiffer() )->doDiff( $old, $new );
	}

	public function testIdenticalObjectsProduceEmptyDiff() {
		$object = $this->monolingualField( 'Z2K3', 'Mushroom' );
		$this->assertSame(
			'',
			$this->newVisualiser()->visualiseDiff( $this->diffOf( $object, $object ), $object, $object )
		);
	}

	public function testChangedNameShowsLanguageNotListIndex() {
		$old = $this->monolingualField( 'Z2K3', 'Mushroom' );
		$new = $this->monolingualField( 'Z2K3', 'Toadstool' );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		// Grouped under the localised "name" header, keyed by language.
		$this->assertStringContainsString( 'wikilambda-diff-group-name', $html );
		$this->assertStringContainsString( '(English)', $html );
		// The raw monolingual navigation must not leak into the header.
		$this->assertStringNotContainsString( 'Z11K2', $html );
		$this->assertStringNotContainsString( 'Z12K1', $html );
		// Both sides of the change are shown.
		$this->assertStringContainsString( 'diff-deletedline', $html );
		$this->assertStringContainsString( 'diff-addedline', $html );
		$this->assertStringContainsString( 'Mushroom', $html );
		$this->assertStringContainsString( 'Toadstool', $html );
	}

	public function testAddedMultilingualDescriptionIsDecomposedPerLanguage() {
		$old = [ 'Z1K1' => 'Z2' ];
		$new = [
			'Z1K1' => 'Z2',
			'Z2K5' => [
				'Z1K1' => 'Z12',
				'Z12K1' => [
					'Z11',
					[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => '!' ],
					[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1004', 'Z11K2' => "foo\nbar\nbaz" ],
				],
			],
		];
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		// One row per language, not a raw JSON blob.
		$this->assertStringContainsString( 'wikilambda-diff-group-description', $html );
		$this->assertStringContainsString( '(English)', $html );
		$this->assertStringContainsString( '(French)', $html );
		$this->assertStringContainsString( '!', $html );
		$this->assertStringNotContainsString( '{"Z1K1"', $html );
		// The multi-line French value is preserved with visible line breaks.
		$this->assertStringContainsString( 'foo<br />bar<br />baz', $html );
		// A pure addition emits no deleted side.
		$this->assertStringNotContainsString( 'diff-deletedline', $html );
	}

	public function testAliasChangeShowsLanguage() {
		$aliases = static fn ( string $last ): array => [
			'Z1K1' => 'Z2',
			'Z2K4' => [
				'Z1K1' => 'Z32',
				'Z32K1' => [
					'Z31',
					[ 'Z1K1' => 'Z31', 'Z31K1' => 'Z1002', 'Z31K2' => [ 'Z6', 'a', 'b', $last ] ],
				],
			],
		];
		$old = $aliases( 'c' );
		$new = $aliases( 'd' );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		$this->assertStringContainsString( 'wikilambda-diff-group-aliases', $html );
		$this->assertStringContainsString( '(English)', $html );
		$this->assertStringNotContainsString( 'Z31K2', $html );
	}

	public function testAddedAliasShowsLanguageNotListIndex() {
		$aliasSet = static fn ( array $strings ): array => [
			'Z1K1' => 'Z2',
			'Z2K4' => [
				'Z1K1' => 'Z32',
				'Z32K1' => [
					'Z31',
					[ 'Z1K1' => 'Z31', 'Z31K1' => 'Z1002', 'Z31K2' => $strings ],
				],
			],
		];
		$old = $aliasSet( [ 'Z6', 'a', 'b' ] );
		$new = $aliasSet( [ 'Z6', 'a', 'b', 'c' ] );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		$this->assertStringContainsString( 'wikilambda-diff-group-aliases', $html );
		$this->assertStringContainsString( '(English)', $html );
		$this->assertStringContainsString( 'diff-addedline', $html );
		// The raw list-index breadcrumb must not leak.
		$this->assertStringNotContainsString( 'Z31K2', $html );
		$this->assertStringNotContainsString( 'Z32K1', $html );
	}

	public function testAboutAndContentsSectionsAreHeaded() {
		$build = static fn ( string $name, string $return ): array => [
			'Z1K1' => 'Z2',
			'Z2K2' => [ 'Z1K1' => 'Z8', 'Z8K5' => $return ],
			'Z2K3' => [
				'Z1K1' => 'Z12',
				'Z12K1' => [
					'Z11',
					[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1002', 'Z11K2' => $name ],
				],
			],
		];
		$old = $build( 'Mushroom', 'Z401' );
		$new = $build( 'Toadstool', 'Z402' );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		// Both super-groups appear as <h2> headings, About before Contents.
		$this->assertStringContainsString( '<h2>[wikilambda-diff-section-about]</h2>', $html );
		$this->assertStringContainsString( '<h2>[wikilambda-diff-section-contents]</h2>', $html );
		$this->assertLessThan(
			strpos( $html, '[wikilambda-diff-section-contents]' ),
			strpos( $html, '[wikilambda-diff-section-about]' ),
			'The About section should precede the Contents section'
		);
		// The "Value" group key is promoted to the Contents heading, so it must
		// not also appear as a per-row breadcrumb; the body key is shown raw.
		$this->assertStringNotContainsString( 'wikilambda-diff-group-value', $html );
		$this->assertStringContainsString( 'Z8K5', $html );
		// The About row is still language-keyed under its heading.
		$this->assertStringContainsString( '(English)', $html );
	}

	public function testBodyKeysAreLabelled() {
		$function = static fn ( string $argType ): array => [
			'Z1K1' => 'Z2',
			'Z2K2' => [
				'Z1K1' => 'Z8',
				'Z8K1' => [
					'Z17',
					[ 'Z1K1' => 'Z17', 'Z17K1' => $argType, 'Z17K2' => 'Z10000K1' ],
				],
			],
		];
		$old = $function( 'Z6' );
		$new = $function( 'Z40' );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		// Under the Contents heading, the body key Z8K1 is shown by its label.
		$this->assertStringContainsString( '<h2>[wikilambda-diff-section-contents]</h2>', $html );
		$this->assertStringContainsString( 'arguments', $html );
		$this->assertStringNotContainsString( 'Z8K1', $html );
		// The value change itself is still shown.
		$this->assertStringContainsString( 'Z40', $html );
	}

	public function testReferenceValueRendersAsLabelledLink() {
		$function = static fn ( string $argType ): array => [
			'Z1K1' => 'Z2',
			'Z2K2' => [
				'Z1K1' => 'Z8',
				'Z8K1' => [
					'Z17',
					[ 'Z1K1' => 'Z17', 'Z17K1' => $argType, 'Z17K2' => 'Z10000K1' ],
				],
			],
		];
		$old = $function( 'Z6' );
		$new = $function( 'Z40' );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		// Each side of the reference change links to the target's page,
		// labelled "<label> (<zid>)".
		$this->assertStringContainsString( '<a href="/wiki/Z6">String (Z6)</a>', $html );
		$this->assertStringContainsString( '<a href="/wiki/Z40">Boolean (Z40)</a>', $html );
	}

	public function testLiteralValueUnderStringKeyIsNotLinked() {
		$string = static fn ( string $value ): array => [
			'Z1K1' => 'Z2',
			'Z2K2' => [ 'Z1K1' => 'Z6', 'Z6K1' => $value ],
		];
		$old = $string( 'Z6' );
		$new = $string( 'Z40' );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		// A Z6 string literal that happens to look like a ZID must not be linked.
		$this->assertStringNotContainsString( '<a ', $html );
		$this->assertStringContainsString( 'Z40', $html );
	}

	public function testMonolingualValueLookingLikeReferenceIsNotLinked() {
		$old = $this->monolingualField( 'Z2K3', 'safe' );
		$new = $this->monolingualField( 'Z2K3', 'Z40' );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		// A name whose text happens to be a ZID is free text, not a reference.
		$this->assertStringNotContainsString( '<a ', $html );
		$this->assertStringContainsString( 'Z40', $html );
	}

	public function testHostileValueIsEscaped() {
		$old = $this->monolingualField( 'Z2K3', 'safe' );
		$new = $this->monolingualField( 'Z2K3', '<script>alert(1)</script>' );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		$this->assertStringNotContainsString( '<script>', $html );
		$this->assertStringContainsString( '&lt;script&gt;', $html );
	}

	public function testUnrecognisedTopLevelKeyFallsBackToRawKey() {
		// Z1K1 (the object's own type) has no group message and no language
		// context, so it must fall back to the raw key in the header.
		$old = [ 'Z1K1' => 'Z6', 'Z2K1' => 'Z401' ];
		$new = [ 'Z1K1' => 'Z8', 'Z2K1' => 'Z401' ];
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		$this->assertStringContainsString( 'Z1K1', $html );
		$this->assertStringNotContainsString( 'wikilambda-diff-group', $html );
	}
}
