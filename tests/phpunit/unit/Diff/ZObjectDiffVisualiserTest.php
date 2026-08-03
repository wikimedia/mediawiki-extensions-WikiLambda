<?php

/**
 * WikiLambda unit test suite for the ZObjectDiffVisualiser
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\Diff\DiffLabelResolver;
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
	 * its text, and whose label resolver knows a handful of keys, references and
	 * languages, so tests can assert grouping and language-keying without the
	 * real i18n or DB stack.
	 */
	private function newVisualiser(): ZObjectDiffVisualiser {
		$localizer = $this->createMock( MessageLocalizer::class );
		$localizer->method( 'msg' )->willReturnCallback( function ( $key ) {
			$message = $this->createMock( Message::class );
			$message->method( 'text' )->willReturn( "[$key]" );
			return $message;
		} );

		$labels = $this->createMock( DiffLabelResolver::class );
		$labels->method( 'getLanguage' )->willReturnCallback(
			static fn ( string $zid ): array => [
				'Z1002' => [ 'name' => 'English', 'code' => 'en', 'dir' => 'ltr' ],
				'Z1004' => [ 'name' => 'French', 'code' => 'fr', 'dir' => 'ltr' ],
				'Z1005' => [ 'name' => 'Arabic', 'code' => 'ar', 'dir' => 'rtl' ],
			][$zid] ?? [ 'name' => $zid, 'code' => '', 'dir' => 'auto' ]
		);
		$labels->method( 'getKeyLabel' )->willReturnCallback(
			static fn ( string $key ): string => [
				'Z8K1' => 'arguments',
				'Z17K3' => 'label',
			][$key] ?? $key
		);
		$labels->method( 'getReference' )->willReturnCallback(
			static fn ( string $zid ): ?array => [
				'Z6' => [ 'label' => 'String', 'url' => '/wiki/Z6' ],
				'Z40' => [ 'label' => 'Boolean', 'url' => '/wiki/Z40' ],
			][$zid] ?? null
		);

		return new ZObjectDiffVisualiser( $localizer, $labels );
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

	/**
	 * The reported case (T284473): an option appended to Z26096's list of
	 * per-language function options.
	 *
	 * @param array $options Each a [ function, languages ] pair
	 * @return array
	 */
	private function optionList( array $options ): array {
		$items = [ 'Z14293' ];
		foreach ( $options as [ $function, $languages ] ) {
			$items[] = [
				'Z1K1' => 'Z14293',
				'Z14293K1' => $function,
				'Z14293K2' => array_merge( [ 'Z60' ], $languages ),
			];
		}
		return [
			'Z1K1' => 'Z2',
			'Z2K2' => [ 'Z1K1' => 'Z14294', 'Z14294K1' => $items ],
		];
	}

	public function testAddedListItemIsHeadedByItsIdentityNotItsIndex() {
		$old = $this->optionList( [ [ 'Z23410', [ 'Z1002' ] ] ] );
		$new = $this->optionList( [ [ 'Z23410', [ 'Z1002' ] ], [ 'Z40', [ 'Z1004' ] ] ] );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		// "option (Boolean)", not "option / 2"; the key is unlabelled by the stub.
		$this->assertStringContainsString( 'Z14294K1 (Boolean)', $html );
		$this->assertStringNotContainsString( 'Z14294K1 / 2', $html );
	}

	public function testChangeInsideAListItemIsHeadedByThatItemsIdentity() {
		$old = $this->optionList( [ [ 'Z40', [ 'Z1002' ] ] ] );
		$new = $this->optionList( [ [ 'Z40', [ 'Z1004' ] ] ] );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		// The item is unchanged in identity, so both sides agree on its name.
		$this->assertStringContainsString( 'Z14294K1 (Boolean)', $html );
		$this->assertStringNotContainsString( 'Z14294K1 / 1', $html );
	}

	public function testItemWithNoDerivableIdentityKeepsItsIndex() {
		// A list of records whose only key holds a structure: nothing names them.
		$build = static fn ( string $last ): array => [
			'Z1K1' => 'Z2',
			'Z2K2' => [
				'Z1K1' => 'Z14294',
				'Z14294K1' => [
					'Z14293',
					[ 'Z1K1' => 'Z14293', 'Z14293K1' => [ 'Z1K1' => 'Z6', 'Z6K1' => $last ] ],
				],
			],
		];
		$old = $build( 'a' );
		$new = $build( 'b' );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		$this->assertStringContainsString( 'Z14294K1 / 1', $html );
	}

	public function testStringInAListIsNotLinkedEvenWhenItLooksLikeAReference() {
		// A list of strings, not of references: an item that happens to read like a
		// ZID is still literal text. The index holding it says nothing either way,
		// so the list's declared item type has to decide.
		$build = static fn ( string $last ): array => [
			'Z1K1' => 'Z2',
			'Z2K2' => [ 'Z1K1' => 'Z14294', 'Z14294K1' => [ 'Z6', 'a', $last ] ],
		];
		$old = $build( 'b' );
		$new = $build( 'Z40' );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		$this->assertStringNotContainsString( '<a ', $html );
		$this->assertStringContainsString( 'Z40', $html );
	}

	public function testReferenceInAListIsStillLinked() {
		$build = static fn ( string $last ): array => [
			'Z1K1' => 'Z2',
			'Z2K2' => [ 'Z1K1' => 'Z14294', 'Z14294K1' => [ 'Z14293', 'Z6', $last ] ],
		];
		$old = $build( 'Z600' );
		$new = $build( 'Z40' );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		$this->assertStringContainsString( '<a href="/wiki/Z40">Boolean (Z40)</a>', $html );
	}

	public function testLabelsArePrefetchedOnceForTheWholeDiff() {
		$prefetched = [];
		$labels = $this->createMock( DiffLabelResolver::class );
		$labels->expects( $this->once() )->method( 'prefetch' )->willReturnCallback(
			static function ( array $identifiers ) use ( &$prefetched ): void {
				$prefetched = $identifiers;
			}
		);
		$labels->method( 'getKeyLabel' )->willReturnArgument( 0 );
		$labels->method( 'getLanguage' )->willReturn( [ 'name' => 'English', 'code' => 'en', 'dir' => 'ltr' ] );

		$localizer = $this->createMock( MessageLocalizer::class );
		$localizer->method( 'msg' )->willReturnCallback( function () {
			$message = $this->createMock( Message::class );
			$message->method( 'text' )->willReturn( '' );
			return $message;
		} );

		$old = [ 'Z1K1' => 'Z2' ];
		$new = [
			'Z1K1' => 'Z2',
			'Z2K2' => [
				'Z1K1' => 'Z14293',
				'Z14293K1' => 'Z32270',
				'Z14293K2' => [ 'Z60', 'Z2053' ],
			],
		];
		( new ZObjectDiffVisualiser( $localizer, $labels ) )
			->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		// Both the keys naming the change and the references nested inside the
		// added value must be offered up, so that neither needs its own read.
		$this->assertContains( 'Z2K2', $prefetched );
		$this->assertContains( 'Z14293', $prefetched );
		$this->assertContains( 'Z32270', $prefetched );
		$this->assertContains( 'Z2053', $prefetched );
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

	public function testLanguageSpecificValueCarriesLangAndDir() {
		$old = $this->monolingualField( 'Z2K3', 'Mushroom' );
		$new = $this->monolingualField( 'Z2K3', 'Toadstool' );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		// The English value is tagged with its own language and direction.
		$this->assertStringContainsString( 'lang="en"', $html );
		$this->assertStringContainsString( 'dir="ltr"', $html );
	}

	public function testRightToLeftValueIsMarkedRtl() {
		$arabicName = static fn ( string $value ): array => [
			'Z1K1' => 'Z2',
			'Z2K3' => [
				'Z1K1' => 'Z12',
				'Z12K1' => [
					'Z11',
					[ 'Z1K1' => 'Z11', 'Z11K1' => 'Z1005', 'Z11K2' => $value ],
				],
			],
		];
		$old = $arabicName( 'فطر' );
		$new = $arabicName( 'خُبْز' );
		$html = $this->newVisualiser()->visualiseDiff( $this->diffOf( $old, $new ), $old, $new );

		// A right-to-left value must not inherit the chrome's direction.
		$this->assertStringContainsString( 'lang="ar"', $html );
		$this->assertStringContainsString( 'dir="rtl"', $html );
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
