<?php

/**
 * WikiLambda test suite for the MainStash implementation of AWArticleStore
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Unit\AWStorage;

use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleMetadata;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\AWSection;
use MediaWiki\Extension\WikiLambda\AWStorage\MainStashAWArticleStore;
use MediaWikiUnitTestCase;
use OverflowException;
use Wikimedia\ObjectCache\HashBagOStuff;
use Wikimedia\Timestamp\ConvertibleTimestamp;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore
 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\MainStashAWArticleStore
 */
class MainStashAWArticleStoreTest extends MediaWikiUnitTestCase {

	private HashBagOStuff $stash;
	private MainStashAWArticleStore $store;

	protected function setUp(): void {
		parent::setUp();
		$this->stash = new HashBagOStuff();
		$this->store = new MainStashAWArticleStore( $this->stash );
	}

	protected function tearDown(): void {
		ConvertibleTimestamp::setFakeTime( false );
		parent::tearDown();
	}

	public function testSetAndGetSectionRoundTrip(): void {
		$mockTime = '20260101000000';
		ConvertibleTimestamp::setFakeTime( $mockTime );

		$initial = new AWSection( 'Q101', 'Q201', 'en', '<p>Some article section</p>' );
		$this->assertTrue( $this->store->setSection( $initial ) );

		$retrieved = $this->store->getSection( 'Q101', 'Q201', 'en' );

		$this->assertInstanceOf( AWSection::class, $retrieved );
		$this->assertSame( $initial->getTopicQid(), $retrieved->getTopicQid() );
		$this->assertSame( $initial->getSectionQid(), $retrieved->getSectionQid() );
		$this->assertSame( $initial->getLocale(), $retrieved->getLocale() );
		$this->assertSame( $initial->getPayload(), $retrieved->getPayload() );
		$this->assertSame( $initial->getSchemaVersion(), $retrieved->getSchemaVersion() );
		$this->assertSame( $mockTime, $retrieved->getLastUpdated()->getTimestamp( TS_MW ) );
	}

	public function testGetSectionReturnsNullForMissingEntry(): void {
		$this->assertNull( $this->store->getSection( 'Q101', 'Q999', 'en' ) );
	}

	public function testGetSectionExplicitlyRejectsMetadataKey(): void {
		// Even if a metadata blob was stored, getSection() must not return it,
		// matching DBAWArticleStore's behaviour.
		$metadata = new AWArticleMetadata( 'Q101', [ 'sections' => [ 'Q201' ] ] );
		$this->store->setArticleMetadata( $metadata );

		$this->assertNull( $this->store->getSection(
			'Q101',
			AWArticleStore::AW_STORAGE_METADATA_KEY,
			AWArticleStore::AW_STORAGE_LOCALE_MULTILINGUAL
		) );
	}

	public function testSetSectionsAndUpdate(): void {
		ConvertibleTimestamp::setFakeTime( '20260101000000' );

		$this->store->setArticleMetadata( new AWArticleMetadata(
			'Q101',
			[ 'sections' => [ 'Q201' ] ]
		) );

		$section1 = new AWSection( 'Q101', 'Q201', 'en', '<p>First article section</p>' );
		$this->store->setSection( $section1 );

		$first = $this->store->getSection( 'Q101', 'Q201', 'en' );
		$this->assertSame( '<p>First article section</p>', $first->getPayload() );

		// ... a week passes; we re-set the same compound key.
		ConvertibleTimestamp::setFakeTime( '20260108000000' );
		$section1b = new AWSection( 'Q101', 'Q201', 'en', '<p>First article section (edited)</p>' );
		$this->store->setSection( $section1b );

		$updated = $this->store->getSection( 'Q101', 'Q201', 'en' );
		$this->assertSame( '<p>First article section (edited)</p>', $updated->getPayload() );
		$this->assertGreaterThan(
			$first->getLastUpdated()->getTimestamp(),
			$updated->getLastUpdated()->getTimestamp()
		);

		// Repeated setSection() against the same key replaces in place; the
		// metadata manifest still lists the section exactly once.
		$sections = $this->store->getSectionsForTopic( 'Q101', 'en' );
		$this->assertCount( 1, $sections );
	}

	public function testGetSectionsForTopic(): void {
		$section1en = new AWSection( 'Q101', 'Q201', 'en', '<p>First article section</p>' );
		$section2en = new AWSection( 'Q101', 'Q202', 'en', '<p>Second article section</p>' );
		$section3en = new AWSection( 'Q101', 'Q203', 'en', '<p>Third article section</p>' );

		$section1es = new AWSection( 'Q101', 'Q201', 'es', '<p>Primera sección del artículo</p>' );
		$section1eu = new AWSection( 'Q101', 'Q201', 'eu', '<p>Artikuluaren lehen atala</p>' );
		$section2eu = new AWSection( 'Q101', 'Q202', 'eu', '<p>Artikuluaren bigarren atala</p>' );

		$this->store->setSection( $section1en );
		$this->store->setSection( $section2en );
		$this->store->setSection( $section3en );
		$this->store->setSection( $section1es );
		$this->store->setSection( $section1eu );
		$this->store->setSection( $section2eu );

		// The metadata is the manifest that drives getSectionsForTopic().
		$this->store->setArticleMetadata( new AWArticleMetadata(
			'Q101',
			[ 'sections' => [ 'Q201', 'Q202', 'Q203' ] ]
		) );

		$enSections = $this->store->getSectionsForTopic( 'Q101', 'en' );
		$this->assertCount( 3, $enSections );

		// Only Q201 was rendered in 'es', so only one is enumerated.
		$esSections = $this->store->getSectionsForTopic( 'Q101', 'es' );
		$this->assertCount( 1, $esSections );

		// Q201 and Q202 were rendered in 'eu'; ordering follows the
		// manifest's order (Q201 first, then Q202).
		$euSections = $this->store->getSectionsForTopic( 'Q101', 'eu' );
		$this->assertCount( 2, $euSections );
		$this->assertStringContainsString( 'lehen', $euSections[0]->getPayload() );
		$this->assertStringContainsString( 'bigarren', $euSections[1]->getPayload() );
	}

	public function testGetSectionsForTopicReturnsEmptyArrayWhenNoMetadata(): void {
		// Sections exist for the topic, but no metadata has been written,
		// so the manifest is empty and the listing is empty too.
		$this->store->setSection( new AWSection( 'Q101', 'Q201', 'en', '<p>orphan</p>' ) );
		$this->assertSame( [], $this->store->getSectionsForTopic( 'Q101', 'en' ) );
	}

	public function testGetSectionsForTopicReturnsEmptyArrayWhenMetadataHasNoSections(): void {
		$this->store->setArticleMetadata( new AWArticleMetadata(
			'Q101',
			[ 'created' => '2026-01-01' ]
		) );
		$this->assertSame( [], $this->store->getSectionsForTopic( 'Q101', 'en' ) );
	}

	public function testGetSectionsForTopicReturnsEmptyArrayWhenUnknown(): void {
		$this->assertSame( [], $this->store->getSectionsForTopic( 'Q999', 'en' ) );
	}

	public function testDeleteSection(): void {
		$this->store->setSection( new AWSection( 'Q101', 'Q201', 'en', '<p>First</p>' ) );
		$this->store->setSection( new AWSection( 'Q101', 'Q202', 'en', '<p>Second</p>' ) );
		$this->store->setSection( new AWSection( 'Q101', 'Q203', 'en', '<p>Third</p>' ) );
		$this->store->setArticleMetadata( new AWArticleMetadata(
			'Q101',
			[ 'sections' => [ 'Q201', 'Q202', 'Q203' ] ]
		) );

		$this->assertCount( 3, $this->store->getSectionsForTopic( 'Q101', 'en' ) );

		$this->store->deleteSection( 'Q101', 'Q202', 'en' );

		// The direct-key fetch now misses ...
		$this->assertNull( $this->store->getSection( 'Q101', 'Q202', 'en' ) );

		// ... and the listing skips the deleted entry because the per-section
		// fetch returns null. The metadata manifest itself is unchanged: the
		// caller owns its lifecycle separately.
		$sections = $this->store->getSectionsForTopic( 'Q101', 'en' );
		$this->assertCount( 2, $sections );
		$this->assertSame( 'Q201', $sections[0]->getSectionQid() );
		$this->assertSame( 'Q203', $sections[1]->getSectionQid() );
	}

	public function testDeleteSectionThatDoesNotExistIsANoop(): void {
		// No store entry and no metadata; deleteSection() must not throw.
		$this->store->deleteSection( 'Q101', 'Q201', 'en' );
		$this->assertNull( $this->store->getSection( 'Q101', 'Q201', 'en' ) );
		$this->assertSame( [], $this->store->getSectionsForTopic( 'Q101', 'en' ) );
	}

	public function testSetAndGetArticleMetadataRoundTrip(): void {
		$mockTime = '20260101000000';
		ConvertibleTimestamp::setFakeTime( $mockTime );

		$payload = [ 'sections' => [ 'Q201', 'Q202', 'Q203' ] ];
		$metadata = new AWArticleMetadata( 'Q101', $payload );
		$this->assertTrue( $this->store->setArticleMetadata( $metadata ) );

		$retrieved = $this->store->getArticleMetadata( 'Q101' );

		$this->assertInstanceOf( AWArticleMetadata::class, $retrieved );
		$this->assertSame( 'Q101', $retrieved->getTopicQid() );
		$this->assertSame( $payload, $retrieved->getPayload() );
		$this->assertSame( $metadata->getSchemaVersion(), $retrieved->getSchemaVersion() );
		$this->assertSame( $mockTime, $retrieved->getLastUpdated()->getTimestamp( TS_MW ) );
	}

	public function testSetMetadataAndUpdate(): void {
		ConvertibleTimestamp::setFakeTime( '20260101000000' );
		$this->store->setArticleMetadata( new AWArticleMetadata(
			'Q101',
			[ 'sections' => [ 'Q201', 'Q202', 'Q203' ] ]
		) );

		ConvertibleTimestamp::setFakeTime( '20260108000000' );
		$this->store->setArticleMetadata( new AWArticleMetadata(
			'Q101',
			[ 'sections' => [ 'Q201', 'Q202', 'Q203', 'Q204' ] ]
		) );

		$retrieved = $this->store->getArticleMetadata( 'Q101' );
		$this->assertSame(
			[ 'sections' => [ 'Q201', 'Q202', 'Q203', 'Q204' ] ],
			$retrieved->getPayload()
		);
		$this->assertSame( '20260108000000', $retrieved->getLastUpdated()->getTimestamp( TS_MW ) );
	}

	public function testGetArticleMetadataReturnsNullForMissing(): void {
		$this->assertNull( $this->store->getArticleMetadata( 'Q999' ) );
	}

	public function testSectionsAndMetadataAreNotConflated(): void {
		$this->store->setSection( new AWSection( 'Q101', 'Q201', 'en', '<p>en1</p>' ) );
		$this->store->setSection( new AWSection( 'Q101', 'Q202', 'en', '<p>en2</p>' ) );
		$this->store->setSection( new AWSection( 'Q101', 'Q201', 'es', '<p>es1</p>' ) );
		$this->store->setArticleMetadata( new AWArticleMetadata(
			'Q101',
			[ 'sections' => [ 'Q201', 'Q202' ] ]
		) );

		// getSectionsForTopic with the metadata locale yields nothing.
		$this->assertSame(
			[],
			$this->store->getSectionsForTopic( 'Q101', AWArticleStore::AW_STORAGE_LOCALE_MULTILINGUAL )
		);

		// getSection with the metadata key yields nothing.
		$this->assertNull( $this->store->getSection(
			'Q101',
			AWArticleStore::AW_STORAGE_METADATA_KEY,
			AWArticleStore::AW_STORAGE_LOCALE_MULTILINGUAL
		) );

		// Metadata is still available via its dedicated getter.
		$this->assertNotNull( $this->store->getArticleMetadata( 'Q101' ) );

		// And the per-locale section listings are correct.
		$this->assertCount( 2, $this->store->getSectionsForTopic( 'Q101', 'en' ) );
		$this->assertCount( 1, $this->store->getSectionsForTopic( 'Q101', 'es' ) );
	}

	public function testSchemaVersionsAreSegregated(): void {
		$v1 = new AWSection( 'Q101', 'Q201', 'en', '<p>v1</p>', null, 1 );
		$v2 = new AWSection( 'Q101', 'Q201', 'en', '<p>v2</p>', null, 2 );

		$this->store->setSection( $v1 );
		$this->store->setSection( $v2 );

		// Metadata is also segregated by schema version.
		$this->store->setArticleMetadata( new AWArticleMetadata(
			'Q101',
			[ 'sections' => [ 'Q201' ] ],
			null,
			1
		) );
		$this->store->setArticleMetadata( new AWArticleMetadata(
			'Q101',
			[ 'sections' => [ 'Q201' ] ],
			null,
			2
		) );

		$this->assertSame( '<p>v1</p>', $this->store->getSection( 'Q101', 'Q201', 'en', 1 )->getPayload() );
		$this->assertSame( '<p>v2</p>', $this->store->getSection( 'Q101', 'Q201', 'en', 2 )->getPayload() );

		$this->assertCount( 1, $this->store->getSectionsForTopic( 'Q101', 'en', 1 ) );
		$this->assertCount( 1, $this->store->getSectionsForTopic( 'Q101', 'en', 2 ) );

		// A schema version with no metadata returns empty (not the v1 entries).
		$this->assertSame( [], $this->store->getSectionsForTopic( 'Q101', 'en', 99 ) );
	}

	/**
	 * Build an HTML blob of at least the requested number of bytes by repeating
	 * a paragraph-shaped chunk. Returned length will be slightly above the
	 * target (last chunk is not truncated) so callers can rely on
	 * `strlen($payload) >= $targetBytes`.
	 */
	private static function buildLargeHtmlPayload( int $targetBytes ): string {
		$chunk = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>';
		$repeats = (int)ceil( $targetBytes / strlen( $chunk ) );
		return str_repeat( $chunk, $repeats );
	}

	public function testSetAndGetSectionWithLargePayload(): void {
		// T426873 noted that section payloads are "potentially very heavy".
		// Exercise the round-trip with ~512 KiB of HTML to catch any
		// truncation, encoding, or serialization surprises.
		$payload = self::buildLargeHtmlPayload( 512 * 1024 );
		$this->assertGreaterThanOrEqual( 512 * 1024, strlen( $payload ) );

		$section = new AWSection( 'Q101', 'Q201', 'en', $payload );
		$this->assertTrue( $this->store->setSection( $section ) );

		$retrieved = $this->store->getSection( 'Q101', 'Q201', 'en' );
		$this->assertNotNull( $retrieved );
		$this->assertSame( strlen( $payload ), strlen( $retrieved->getPayload() ) );
		$this->assertSame( $payload, $retrieved->getPayload() );
	}

	public function testGetSectionsForTopicWithLargePayloads(): void {
		// Multiple ~512 KiB sections under the same topic, plus a manifest:
		// confirm getSectionsForTopic() returns each in full without
		// truncating or conflating blobs across the listing.
		$payload1 = '<h1>Section one</h1>' . self::buildLargeHtmlPayload( 512 * 1024 );
		$payload2 = '<h1>Section two</h1>' . self::buildLargeHtmlPayload( 512 * 1024 );
		$payload3 = '<h1>Section three</h1>' . self::buildLargeHtmlPayload( 512 * 1024 );

		$this->store->setSection( new AWSection( 'Q101', 'Q201', 'en', $payload1 ) );
		$this->store->setSection( new AWSection( 'Q101', 'Q202', 'en', $payload2 ) );
		$this->store->setSection( new AWSection( 'Q101', 'Q203', 'en', $payload3 ) );
		$this->store->setArticleMetadata( new AWArticleMetadata(
			'Q101',
			[ 'sections' => [ 'Q201', 'Q202', 'Q203' ] ]
		) );

		$sections = $this->store->getSectionsForTopic( 'Q101', 'en' );
		$this->assertCount( 3, $sections );
		$this->assertSame( $payload1, $sections[0]->getPayload() );
		$this->assertSame( $payload2, $sections[1]->getPayload() );
		$this->assertSame( $payload3, $sections[2]->getPayload() );
	}

	public function testSetSectionRejectsOversizedPayload(): void {
		$oversized = str_repeat( 'a', MainStashAWArticleStore::MAX_PAYLOAD_BYTES + 1 );
		$section = new AWSection( 'Q101', 'Q201', 'en', $oversized );

		$this->expectException( OverflowException::class );
		$this->expectExceptionMessageMatches( '/Q101.*Q201.*en.*MainStash limit/' );

		$this->store->setSection( $section );
	}

	public function testSetSectionAcceptsPayloadExactlyAtLimit(): void {
		$atLimit = str_repeat( 'a', MainStashAWArticleStore::MAX_PAYLOAD_BYTES );
		$section = new AWSection( 'Q101', 'Q201', 'en', $atLimit );

		// Exactly at the limit must still be accepted; the guard is strict-greater-than.
		$this->assertTrue( $this->store->setSection( $section ) );
		$this->assertSame( $atLimit, $this->store->getSection( 'Q101', 'Q201', 'en' )->getPayload() );
	}

	public function testSetArticleMetadataRejectsOversizedPayload(): void {
		// JSON-encoding a string of N bytes produces ~N+2 bytes (the surrounding
		// quotes), so a value above the threshold guarantees the encoded length
		// also exceeds the threshold.
		$bigArray = [ 'data' => str_repeat( 'a', MainStashAWArticleStore::MAX_PAYLOAD_BYTES + 100 ) ];
		$metadata = new AWArticleMetadata( 'Q101', $bigArray );

		$this->expectException( OverflowException::class );
		$this->expectExceptionMessageMatches( '/Q101.*JSON-encoded.*MainStash limit/' );

		$this->store->setArticleMetadata( $metadata );
	}

	public function testSetAndGetSectionWithLargeUtf8Payload(): void {
		// Multi-byte content is the realistic case for article HTML in
		// non-ASCII languages (Basque, Spanish, etc.). Make sure a large
		// UTF-8 blob survives the round-trip byte-for-byte and that any
		// downstream string-length checks are byte- not codepoint-based.
		$chunk = '<p>Artikuluaren atal hau Wikifuntzioei buruzkoa da — café, naïve, façade. 🌍</p>';
		$repeats = (int)ceil( ( 512 * 1024 ) / strlen( $chunk ) );
		$payload = str_repeat( $chunk, $repeats );
		$this->assertGreaterThanOrEqual( 512 * 1024, strlen( $payload ) );

		$section = new AWSection( 'Q101', 'Q201', 'eu', $payload );
		$this->assertTrue( $this->store->setSection( $section ) );

		$retrieved = $this->store->getSection( 'Q101', 'Q201', 'eu' );
		$this->assertNotNull( $retrieved );
		$this->assertSame( strlen( $payload ), strlen( $retrieved->getPayload() ) );
		$this->assertSame( $payload, $retrieved->getPayload() );
	}
}
