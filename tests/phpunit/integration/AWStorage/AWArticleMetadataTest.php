<?php

/**
 * WikiLambda test suite for the AWArticleMetadata class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleMetadata;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use Wikimedia\Timestamp\ConvertibleTimestamp;
use Wikimedia\Timestamp\TimestampFormat as TS;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\AWArticleMetadata
 */
class AWArticleMetadataTest extends WikiLambdaAbstractClientIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsAbstractClientMode();
	}

	public function testConstructor(): void {
		$payload = json_decode( '{ "sections": ["Q201", "Q202" ] }', true );
		$timestamp = new ConvertibleTimestamp( '20260101010101' );

		$metadata = new AWArticleMetadata( 'Q101', $payload, $timestamp, 2 );

		$this->assertSame( 'Q101', $metadata->getTopicQid() );
		$this->assertEquals( $payload, $metadata->getPayload() );
		$this->assertSame( $timestamp, $metadata->getLastUpdated() );
		$this->assertSame( 2, $metadata->getSchemaVersion() );
	}

	public function testDefaultLastUpdatedNow(): void {
		$payload = json_decode( '{ "sections": ["Q201", "Q202" ] }', true );

		// Mock current time:
		$mockNow = '20260101000000';
		ConvertibleTimestamp::setFakeTime( $mockNow );

		$metadata = new AWArticleMetadata( 'Q101', $payload );
		$lastUpdated = $metadata->getLastUpdated();

		$this->assertInstanceOf( ConvertibleTimestamp::class, $lastUpdated );
		$this->assertSame( $mockNow, $lastUpdated->getTimestamp( TS::MW ) );
	}

	public function testDefaultSchemaVersion(): void {
		$payload = json_decode( '{ "sections": ["Q201", "Q202" ] }', true );

		$metadata = new AWArticleMetadata( 'Q101', $payload );
		$this->assertSame( AWArticleStore::AW_STORAGE_SCHEMA_VERSION, $metadata->getSchemaVersion() );
	}

	public function testGetSectionQids(): void {
		$payload = [
			'sections' => [
				'1' => 'Q202',
				'0' => 'Q201'
			]
		];

		$metadata = new AWArticleMetadata( 'Q101', $payload );
		// Sections are sorted by index
		$this->assertSame( 'Q201', $metadata->getSectionQids()[0] );
		$this->assertSame( 'Q202', $metadata->getSectionQids()[1] );
	}
}
