<?php

/**
 * WikiLambda test suite for the AWSection class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
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
	}

	public function testEmptySection_otherSection(): void {
		// Other section, called with index>0, title='something'
		$sectionHtml = AWSection::emptyWikiSection( 4, 'Other section', 'Q201', '04:05' );
		$html = HtmlArmor::getHtml( $sectionHtml );

		$this->assertStringContainsString( '<section data-mw-section-id="4"', $html );
		$this->assertStringContainsString( 'Other section</h2>', $html );
		$this->assertStringContainsString( 'cdx-message--warning', $html );
		$this->assertStringContainsString( 'This section is not yet rendered', $html );
	}
}
