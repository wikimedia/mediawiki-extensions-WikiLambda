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
use Wikimedia\Timestamp\ConvertibleTimestamp;
use Wikimedia\Timestamp\TimestampFormat as TS;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\AWSection
 */
class AWSectionTest extends AbstractClientIntegrationTestCase {

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
}
