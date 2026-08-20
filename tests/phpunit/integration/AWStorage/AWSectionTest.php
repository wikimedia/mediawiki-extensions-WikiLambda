<?php

/**
 * WikiLambda test suite for the AWSection class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragment;
use MediaWiki\Extension\WikiLambda\AWStorage\AWSection;
use Wikimedia\HtmlArmor\HtmlArmor;
use Wikimedia\Timestamp\ConvertibleTimestamp;
use Wikimedia\Timestamp\TimestampFormat as TS;

/**
 * @group Database
 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\AWSection
 */
class AWSectionTest extends WikiLambdaAbstractClientIntegrationTestCase {

	private const LEDE_SECTION = 'Q8776414';

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsAbstractClientMode();
	}

	public function testConstructor(): void {
		$timestamp = new ConvertibleTimestamp( '20260101010101' );
		$section = new AWSection( 'Q101', 'Q201', 'en', '<p>Some article section</p>', $timestamp, 2 );

		$this->assertSame( 'Q101', $section->getTopicQid() );
		$this->assertSame( 'Q201', $section->getSectionQid() );
		$this->assertSame( 'en', $section->getLocale() );
		$this->assertSame( '<p>Some article section</p>', $section->getPayload() );
		$this->assertSame( $timestamp, $section->getLastUpdated() );
		$this->assertSame( 2, $section->getSchemaVersion() );
	}

	public function testDefaultLastUpdatedNow(): void {
		// Mock current time:
		$mockNow = '20260101000000';
		ConvertibleTimestamp::setFakeTime( $mockNow );

		$section = new AWSection( 'Q101', 'Q201', 'en', '<p>Some article section</p>' );
		$lastUpdated = $section->getLastUpdated();

		$this->assertInstanceOf( ConvertibleTimestamp::class, $lastUpdated );
		$this->assertSame( $mockNow, $lastUpdated->getTimestamp( TS::MW ) );
	}

	public function testDefaultSchemaVersion(): void {
		$section = new AWSection( 'Q101', 'Q201', 'en', '<p>Some article section</p>' );
		$this->assertSame( AWArticleStore::AW_STORAGE_SCHEMA_VERSION, $section->getSchemaVersion() );
	}

	public function testAsWikiSection_ledeSection(): void {
		$section = new AWSection( 'Q42', self::LEDE_SECTION, 'en', '<p>some leading text</p>' );

		// Lede section, called with index=0, title=null
		$sectionHtml = $section->asWikiSection( 0, null );
		$html = HtmlArmor::getHtml( $sectionHtml );

		$this->assertStringContainsString( '<section data-mw-section-id="0"', $html );
		$this->assertStringNotContainsString( '<h2', $html );
		$this->assertStringContainsString( '<p>some leading text</p>', $html );
	}

	public function testAsWikiSection_otherSection(): void {
		$section = new AWSection( 'Q42', 'Q201', 'en', '<p>some other text</p>' );

		// Other section, called with index>0, title='something'
		$sectionHtml = $section->asWikiSection( 3, 'Other section' );
		$html = HtmlArmor::getHtml( $sectionHtml );

		$this->assertStringContainsString( '<section data-mw-section-id="3"', $html );
		$this->assertStringContainsString( 'Other section</h2>', $html );
		$this->assertStringContainsString( '<p>some other text</p>', $html );
	}

	public function testEmptySection_ledeSection(): void {
		// Lede section, called with index=0, title=null
		$sectionHtml = AWSection::emptyWikiSection( 0, null, self::LEDE_SECTION, '04:05' );
		$html = HtmlArmor::getHtml( $sectionHtml );

		$this->assertStringContainsString( '<section data-mw-section-id="0"', $html );
		$this->assertStringNotContainsString( '<h2', $html );
		$this->assertStringContainsString( 'cdx-message--warning', $html );
		$this->assertStringContainsString( 'This section is not yet rendered', $html );
		// The client-side abstractpreview module scans for this marker to record reader-facing
		// completeness telemetry.
		$this->assertStringContainsString( 'data-wikilambda-aw-section-status="pending"', $html );
	}

	public function testEmptySection_otherSection(): void {
		// Other section, called with index>0, title='something'
		$sectionHtml = AWSection::emptyWikiSection( 4, 'Other section', 'Q201', '04:05' );
		$html = HtmlArmor::getHtml( $sectionHtml );

		$this->assertStringContainsString( '<section data-mw-section-id="4"', $html );
		$this->assertStringContainsString( 'Other section</h2>', $html );
		$this->assertStringContainsString( 'cdx-message--warning', $html );
		$this->assertStringContainsString( 'This section is not yet rendered', $html );
		$this->assertStringContainsString( 'data-wikilambda-aw-section-status="pending"', $html );
	}

	/**
	 * @dataProvider provideBuildSection
	 */
	public function testBuildSection_appendFragments(
		$fragments,
		$expectPending,
		$expectFailed,
		$expectStale,
		$expectHtmlBits
	): void {
		// Construct a new empty section by appeding fragments
		$section = new AWSection( 'Q42', 'Q201', 'en' );
		foreach ( $fragments as $fragment ) {
			$section->appendFragment( $fragment );
		}
		// Append status metadata to object
		$section->appendStatusMetadata();

		// Assert status and counters
		$sectionStatus = $section->getFragmentStatus();
		$this->assertSame( $expectPending > 0, $section->isPending() );

		$this->assertSame( $expectPending, $sectionStatus[ 'pending' ] );
		$this->assertSame( $expectFailed, $sectionStatus[ 'failed' ] );
		$this->assertSame( $expectStale, $sectionStatus[ 'stale' ] );

		// Assert payload
		$htmlRegex = '/' . implode( '.*', array_map( 'preg_quote', $expectHtmlBits ) ) . '/s';
		$this->assertMatchesRegularExpression( $htmlRegex, $section->getPayload() );

		// Assert meta itemprop
		$itempropRegex = '/<meta itemprop="aw-section-status"[^>]*\/?>/';

		if ( $expectPending || $expectFailed || $expectStale ) {
			// Assert status metadata (if non-zero values)
			$this->assertMatchesRegularExpression( $itempropRegex, $section->getPayload() );

			preg_match( $itempropRegex, $section->getPayload(), $matches );
			$itemprop = $matches[0];

			// Assert presence (or absence) of itemprop data properties
			$checkProps = [
				'data-pending' => $expectPending,
				'data-failed' => $expectFailed,
				'data-stale' => $expectStale
			];

			foreach ( $checkProps as $attr => $value ) {
				if ( $value ) {
					// Assert than when non-zero, the data property contains the right value
					$this->assertStringContainsString( "$attr=\"$value\"", $itemprop );
				} else {
					// Assert that when zero, the data property is not shown
					$this->assertStringNotContainsString( $attr, $itemprop );
				}
			}
		} else {
			// Assert no meta itemprop element is added for zero values
			$this->assertDoesNotMatchRegularExpression( $itempropRegex, $section->getPayload() );
		}
	}

	private static function makeFragment( $payload = null, $fresh = true ) {
		$topicQid = 'Q42';
		$sectionQid = 'Q201';
		$locale = 'en';

		$fragment = new AWFragment( $topicQid, $sectionQid, $locale );
		if ( $payload !== null ) {
			$availability = $fresh ? AWFragment::AVAILABILITY_FRESH : AWFragment::AVAILABILITY_STALE;
			$fragment->setValue( $payload, $availability );
		}
		return $fragment;
	}

	public static function provideBuildSection() {
		yield 'no fragments' => [ [], 0, 0, 0, [] ];

		yield 'one fresh successful fragment' => [
			[ self::makeFragment( [ 'success' => true, 'value' => 'a' ] ) ],
			/* pending */ 0,
			/* failed */ 0,
			/* stale */ 0,
			[ "a" ]
		];

		yield 'two fresh successful fragments' => [
			[
				self::makeFragment( [ 'success' => true, 'value' => 'a' ] ),
				self::makeFragment( [ 'success' => true, 'value' => 'b' ] ),
			],
			/* pending */ 0,
			/* failed */ 0,
			/* stale */ 0,
			[ "a", "b" ]
		];

		yield 'one fresh and two stale successful fragments' => [
			[
				self::makeFragment( [ 'success' => true, 'value' => 'a' ] ),
				self::makeFragment( [ 'success' => true, 'value' => 'b' ], false ),
				self::makeFragment( [ 'success' => true, 'value' => 'c' ], false ),
			],
			/* pending */ 0,
			/* failed */ 0,
			/* stale */ 2,
			[ "a", "b", "c" ]
		];

		yield 'one fresh, one stale, and two missing fragments' => [
			[
				self::makeFragment(),
				self::makeFragment( [ 'success' => true, 'value' => 'a' ], false ),
				self::makeFragment(),
				self::makeFragment( [ 'success' => true, 'value' => 'b' ] ),
			],
			/* pending */ 2,
			/* failed */ 0,
			/* stale */ 1,
			[ "a", "Content pending", "b", "Content pending" ]
		];

		yield 'all fragments are both stale and failing' => [
			[
				self::makeFragment( [ 'success' => false, 'value' => [] ], false ),
				self::makeFragment( [ 'success' => false, 'value' => [] ], false ),
				self::makeFragment( [ 'success' => false, 'value' => [] ], false ),
			],
			/* pending */ 0,
			/* failed */ 3,
			/* stale */ 3,
			[ "Content unavailable", "Content unavailable", "Content unavailable" ]
		];

		yield 'big section with all states' => [
			[
				self::makeFragment( [ 'success' => true, 'value' => 'a' ] ),
				self::makeFragment( [ 'success' => true, 'value' => 'b' ], false ),
				self::makeFragment( [ 'success' => true, 'value' => 'c' ], false ),
				self::makeFragment( [ 'success' => true, 'value' => 'd' ] ),
				self::makeFragment(),
				self::makeFragment( [ 'success' => false, 'value' => [] ], false ),
				self::makeFragment( [ 'success' => false, 'value' => [] ] ),
				self::makeFragment( [ 'success' => true, 'value' => 'd' ] ),
				self::makeFragment( [ 'success' => true, 'value' => 'e' ], false ),
				self::makeFragment(),
			],
			/* pending */ 2,
			/* failed */ 2,
			/* stale */ 4,
			[
				"a", "b", "c", "d", "Content pending", "Content unavailable",
				"Content unavailable", "d", "e", "Content pending"
			]
		];
	}

	/**
	 * @dataProvider provideLoadSection
	 */
	public function testLoadSection_parseStatusMetadata( $payload, $expectPending, $expectFailed, $expectStale ) {
		$topicQid = 'Q42';
		$sectionQid = 'Q201';
		$locale = 'en';

		$section = new AWSection( $topicQid, $sectionQid, $locale, $payload );

		// Assert status and counters
		$sectionStatus = $section->getFragmentStatus();

		$this->assertSame( $expectPending > 0, $section->isPending() );

		$this->assertSame( $expectPending, $sectionStatus[ 'pending' ] );
		$this->assertSame( $expectFailed, $sectionStatus[ 'failed' ] );
		$this->assertSame( $expectStale, $sectionStatus[ 'stale' ] );
	}

	public static function provideLoadSection() {
		yield 'no itemprop when zero values is ok' => [
			'EEE',
			/* pending */ 0,
			/* failed */ 0,
			/* stale */ 0,
		];

		// NOTE: While we test that generatos don't produce extra
		// data, we want to also test that consumers can understand
		// different shapes of zero-data
		yield 'no data in meta itemprop is also ok' => [
			'A'
			. '<meta itemprop="aw-section-status">',
			/* pending */ 0,
			/* failed */ 0,
			/* stale */ 0,
		];

		yield 'explicit zero values in meta itemprop is ok' => [
			'A'
			. '<meta itemprop="aw-section-status" '
			. 'data-pending="0" data-failed="0" data-stale="0">',
			/* pending */ 0,
			/* failed */ 0,
			/* stale */ 0,
		];

		yield 'two pending fragments' => [
			'APP'
			. '<meta itemprop="aw-section-status" '
			. 'data-pending="2">',
			/* pending */ 2,
			/* failed */ 0,
			/* stale */ 0,
		];

		yield 'one pending, three failed and one ok, all stale' => [
			'PAFFF'
			. '<meta itemprop="aw-section-status" '
			. 'data-pending="1" data-failed="3" data-stale="4">',
			/* pending */ 1,
			/* failed */ 3,
			/* stale */ 4,
		];

		yield 'one failed, three stale, four pending - in different order' => [
			'PAFFPPP'
			. '<meta itemprop="aw-section-status" '
			. 'data-failed="1" data-stale="3" data-pending="4">',
			/* pending */ 4,
			/* failed */ 1,
			/* stale */ 3,
		];

		yield 'no data on pending, means all ready' => [
			'AF'
			. '<meta itemprop="aw-section-status" '
			. 'data-failed="1" data-stale="2">',
			/* pending */ 0,
			/* failed */ 1,
			/* stale */ 2,
		];

		yield 'no data on failed, means all ok' => [
			'ABP'
			. '<meta itemprop="aw-section-status" '
			. 'data-pending="1" data-stale="2">',
			/* pending */ 1,
			/* failed */ 0,
			/* stale */ 2,
		];

		yield 'no data on stale, means all fresh' => [
			'PFF'
			. '<meta itemprop="aw-section-status" '
			. 'data-pending="1" data-failed="2">',
			/* pending */ 1,
			/* failed */ 2,
			/* stale */ 0,
		];
	}
}
