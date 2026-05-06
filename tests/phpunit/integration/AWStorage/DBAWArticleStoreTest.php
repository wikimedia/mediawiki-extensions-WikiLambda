<?php

/**
 * WikiLambda test suite for the RDBMS implementation of AWArticleStore
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleMetadata;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\AWSection;
use MediaWiki\Extension\WikiLambda\AWStorage\DBAWArticleStore;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use Wikimedia\Rdbms\SelectQueryBuilder;
use Wikimedia\Timestamp\ConvertibleTimestamp;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore
 * @covers \MediaWiki\Extension\WikiLambda\AWStorage\DBAWArticleStore
 * @group Database
 */
class DBAWArticleStoreTest extends AbstractClientIntegrationTestCase {

	private DBAWArticleStore $store;

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsAbstractClientMode();
		$this->store = WikiLambdaServices::getAWArticleStore();
	}

	public function testSetSections() {
		$dbr = $this->getPrimaryDB();

		$section1 = new AWSection( 'Q101', 'Q201', 'en', '<p>First article section</p>' );
		$section2 = new AWSection( 'Q101', 'Q202', 'en', '<p>Second article section</p>' );
		$section3 = new AWSection( 'Q101', 'Q203', 'en', '<p>Third article section</p>' );

		// Mock time:
		$mockTime = '20260101000000';
		ConvertibleTimestamp::setFakeTime( $mockTime );

		$this->store->setSection( $section1 );
		$this->store->setSection( $section2 );
		$this->store->setSection( $section3 );

		// Get all rows
		$res = $dbr->newSelectQueryBuilder()
			->select( '*' )
			->from( 'aw_article_sections' )
			->orderBy( 'awas_section_qid', SelectQueryBuilder::SORT_ASC )
		  ->caller( __METHOD__ )
		  ->fetchResultSet();

		$this->assertEquals( 3, $res->numRows() );
		$rows = iterator_to_array( $res );

		$this->assertEquals( 'Q101', $rows[0]->awas_topic_qid );
		$this->assertEquals( 'Q201', $rows[0]->awas_section_qid );
		$this->assertEquals( 'en', $rows[0]->awas_locale );
		$this->assertEquals( $mockTime, $rows[0]->awas_last_updated );
		$this->assertStringContainsString( '<p>First', $rows[0]->awas_payload );

		$this->assertEquals( 'Q101', $rows[1]->awas_topic_qid );
		$this->assertEquals( 'Q202', $rows[1]->awas_section_qid );
		$this->assertEquals( 'en', $rows[1]->awas_locale );
		$this->assertEquals( $mockTime, $rows[1]->awas_last_updated );
		$this->assertStringContainsString( '<p>Second', $rows[1]->awas_payload );

		$this->assertEquals( 'Q101', $rows[2]->awas_topic_qid );
		$this->assertEquals( 'Q203', $rows[2]->awas_section_qid );
		$this->assertEquals( 'en', $rows[2]->awas_locale );
		$this->assertEquals( $mockTime, $rows[2]->awas_last_updated );
		$this->assertStringContainsString( '<p>Third', $rows[2]->awas_payload );
	}

	public function testSetSectionsAndUpdate() {
		$dbr = $this->getPrimaryDB();

		$section1 = new AWSection( 'Q101', 'Q201', 'en', '<p>First article section</p>' );
		$section2 = new AWSection( 'Q101', 'Q202', 'en', '<p>Second article section</p>' );
		$section3 = new AWSection( 'Q101', 'Q203', 'en', '<p>Third article section</p>' );

		// Mock time:
		ConvertibleTimestamp::setFakeTime( '2026-01-01T00:00:00Z' );

		$this->store->setSection( $section1 );
		$this->store->setSection( $section2 );
		$this->store->setSection( $section3 );

		// Get all rows
		$res = $dbr->newSelectQueryBuilder()
			->select( '*' )
			->from( 'aw_article_sections' )
			->orderBy( 'awas_section_qid', SelectQueryBuilder::SORT_ASC )
		  ->caller( __METHOD__ )
		  ->fetchResultSet();

		// Check that all rows were inserted
		$this->assertEquals( 3, $res->numRows() );

		// Check the content of first section
		$row = $res->current();
		$this->assertEquals( '<p>First article section</p>', $row->awas_payload );

		// ... a week has passed:
		ConvertibleTimestamp::setFakeTime( '2026-01-08T00:00:00Z' );

		// Update the first section with new value
		$section1b = new AWSection( 'Q101', 'Q201', 'en', '<p>First article section (edited)</p>' );
		$this->store->setSection( $section1b );

		// Get all rows
		$res = $dbr->newSelectQueryBuilder()
			->select( '*' )
			->from( 'aw_article_sections' )
			->orderBy( 'awas_section_qid', SelectQueryBuilder::SORT_ASC )
		  ->caller( __METHOD__ )
		  ->fetchResultSet();

		// Check that we still have only 3 rows (no duplication)
		$this->assertEquals( 3, $res->numRows() );

		// Check the updated content (and date) of first section
		$newRow = $res->current();
		$this->assertEquals( '<p>First article section (edited)</p>', $newRow->awas_payload );
		$this->assertGreaterThan( $row->awas_last_updated, $newRow->awas_last_updated );
	}

	public function testSetAndGetSectionRoundTrip() {
		$initial = new AWSection( 'Q101', 'Q201', 'en', '<p>Some article section</p>' );

		// First set section with the store setter...
		$this->store->setSection( $initial );

		// ... and then use the store getter
		$retrieved = $this->store->getSection( 'Q101', 'Q201', 'en' );

		$this->assertInstanceOf( AWSection::class, $retrieved );
		$this->assertSame( $initial->getTopicQid(), $retrieved->getTopicQid() );
		$this->assertSame( $initial->getSectionQid(), $retrieved->getSectionQid() );
		$this->assertSame( $initial->getLocale(), $retrieved->getLocale() );
		$this->assertSame( $initial->getPayload(), $retrieved->getPayload() );
		$this->assertSame( $initial->getSchemaVersion(), $retrieved->getSchemaVersion() );
		$this->assertSame(
			$initial->getLastUpdated()->getTimestamp(),
			$retrieved->getLastUpdated()->getTimestamp()
		);
	}

	public function testGetSectionsForTopic() {
		$section1en = new AWSection( 'Q101', 'Q201', 'en', '<p>First article section</p>' );
		$section2en = new AWSection( 'Q101', 'Q202', 'en', '<p>Second article section</p>' );
		$section3en = new AWSection( 'Q101', 'Q203', 'en', '<p>Third article section</p>' );

		$section1es = new AWSection( 'Q101', 'Q201', 'es', '<p>Primera sección del artículo</p>' );
		$section1eu = new AWSection( 'Q101', 'Q201', 'eu', '<p>Artikuluaren lehen atala</p>' );
		$section2eu = new AWSection( 'Q101', 'Q202', 'eu', '<p>Artikuluaren bigarren atala</p>' );

		// FIrst set all sections with the store setter, in English...
		$this->store->setSection( $section1en );
		$this->store->setSection( $section2en );
		$this->store->setSection( $section3en );
		// ... and some in Spanish and Basque
		$this->store->setSection( $section1es );
		$this->store->setSection( $section1eu );
		$this->store->setSection( $section2eu );

		// ... and then use the store batch section getters for topic and language:

		// Tree sections for the topic in English
		$enSections = $this->store->getSectionsForTopic( 'Q101', 'en' );
		$this->assertCount( 3, $enSections );

		// One section for the topic in Spanish
		$esSections = $this->store->getSectionsForTopic( 'Q101', 'es' );
		$this->assertCount( 1, $esSections );

		// Two sections for the topic in Basque
		$euSections = $this->store->getSectionsForTopic( 'Q101', 'eu' );
		$this->assertCount( 2, $euSections );

		// Extra check to verify tis the right section
		$this->assertStringContainsString( 'lehen', $euSections[0]->getPayload() );
		$this->assertStringContainsString( 'bigarren', $euSections[1]->getPayload() );
	}

	public function testDeleteSection() {
		$section1 = new AWSection( 'Q101', 'Q201', 'en', '<p>First article section</p>' );
		$section2 = new AWSection( 'Q101', 'Q202', 'en', '<p>Second article section</p>' );
		$section3 = new AWSection( 'Q101', 'Q203', 'en', '<p>Third article section</p>' );

		// First set all sections with the store setter, in English...
		$this->store->setSection( $section1 );
		$this->store->setSection( $section2 );
		$this->store->setSection( $section3 );

		// Check that all are stored
		$sections = $this->store->getSectionsForTopic( 'Q101', 'en' );
		$this->assertCount( 3, $sections );

		// Let's remove one section
		$this->store->deleteSection( 'Q101', 'Q202', 'en' );

		// Check that one section was deleted
		$sections = $this->store->getSectionsForTopic( 'Q101', 'en' );
		$this->assertCount( 2, $sections );

		$this->assertEquals( 'Q201', $sections[0]->getSectionQid() );
		$this->assertEquals( 'Q203', $sections[1]->getSectionQid() );
	}

	public function testSetArticleMetadata() {
		$dbr = $this->getPrimaryDB();

		// Mock initial time and metadata:
		$mockTime = '20260101000000';
		ConvertibleTimestamp::setFakeTime( $mockTime );

		$metadataEncoded = '{ "created": "xxx", "updated": "xxx", "sections": ["Q201", "Q202", "Q203"] }';
		$metadataArray = json_decode( $metadataEncoded, true );
		$metadata = new AWArticleMetadata( 'Q101', $metadataArray );

		$this->store->setArticleMetadata( $metadata );

		// Get all rows
		$res = $dbr->newSelectQueryBuilder()
			->select( '*' )
			->from( 'aw_article_sections' )
		  ->caller( __METHOD__ )
		  ->fetchResultSet();

		$this->assertSame( 1, $res->numRows() );
		$rows = iterator_to_array( $res );

		$this->assertEquals( 'Q101', $rows[0]->awas_topic_qid );
		$this->assertEquals( AWArticleStore::AW_STORAGE_METADATA_KEY, $rows[0]->awas_section_qid );
		$this->assertEquals( AWArticleStore::AW_STORAGE_LOCALE_MULTILINGUAL, $rows[0]->awas_locale );
		$this->assertEquals( $mockTime, $rows[0]->awas_last_updated );
		$this->assertEquals( $metadataArray, json_decode( $rows[0]->awas_payload, true ) );
	}

	public function testSetMetadataAndUpdate() {
		$dbr = $this->getPrimaryDB();

		// Mock initial time and metadata:
		$mockTime = '20260101000000';
		ConvertibleTimestamp::setFakeTime( $mockTime );
		$metadataEncoded = '{ "sections": [ "Q201", "Q202", "Q203" ] }';
		$metadata = new AWArticleMetadata( 'Q101', json_decode( $metadataEncoded, true ) );

		$this->store->setArticleMetadata( $metadata );

		// Get the metadata row
		$res = $dbr->newSelectQueryBuilder()
			->select( '*' )
			->from( 'aw_article_sections' )
			->where( [
				'awas_topic_qid' => 'Q101',
				'awas_section_qid' => AWArticleStore::AW_STORAGE_METADATA_KEY
			] )
		  ->caller( __METHOD__ )
		  ->fetchResultSet();

		// Making sure there's only one
		$this->assertSame( 1, $res->numRows() );
		$row = $res->current();

		$this->assertEquals( $mockTime, $row->awas_last_updated );
		$this->assertEquals(
			json_decode( $metadataEncoded, true ),
			json_decode( $row->awas_payload, true )
		);

		// Fast-forward to next week:
		$mockNextTime = '20260108000000';
		ConvertibleTimestamp::setFakeTime( $mockNextTime );
		$nextMetadataEncoded = '{ "sections": [ "Q201", "Q202", "Q203", "Q204" ] }';
		$nextMetadata = new AWArticleMetadata( 'Q101', json_decode( $nextMetadataEncoded, true ) );

		$this->store->setArticleMetadata( $nextMetadata );

		// Get the metadata row(s)
		$res = $dbr->newSelectQueryBuilder()
			->select( '*' )
			->from( 'aw_article_sections' )
			->where( [
				'awas_topic_qid' => 'Q101',
				'awas_section_qid' => AWArticleStore::AW_STORAGE_METADATA_KEY
			] )
		  ->caller( __METHOD__ )
		  ->fetchResultSet();

		// Making sure we still have only one
		$this->assertSame( 1, $res->numRows() );
		$row = $res->current();

		// Row was updated with new date and new payload
		$this->assertEquals( $mockNextTime, $row->awas_last_updated );
		$this->assertEquals(
			json_decode( $nextMetadataEncoded, true ),
			json_decode( $row->awas_payload, true )
		);
	}

	public function testSetAndGetMetadataRoundTrip() {
		$metadataEncoded = '{ "sections": [ "Q201", "Q202", "Q203" ] }';
		$initial = new AWArticleMetadata( 'Q101', json_decode( $metadataEncoded, true ) );

		// First set the metadata with the store setter...
		$this->store->setArticleMetadata( $initial );

		// ... and then use the store getter
		$retrieved = $this->store->getArticleMetadata( 'Q101' );

		$this->assertInstanceOf( AWArticleMetadata::class, $retrieved );
		$this->assertSame( $initial->getTopicQid(), $retrieved->getTopicQid() );
		$this->assertSame( $initial->getPayload(), $retrieved->getPayload() );
		$this->assertSame( $initial->getSchemaVersion(), $retrieved->getSchemaVersion() );
		$this->assertSame(
			$initial->getLastUpdated()->getTimestamp(),
			$retrieved->getLastUpdated()->getTimestamp()
		);
	}

	public function testSectionsAndMetadata() {
		$section1en = new AWSection( 'Q101', 'Q201', 'en', '<p>First article section</p>' );
		$section2en = new AWSection( 'Q101', 'Q202', 'en', '<p>Second article section</p>' );
		$section3en = new AWSection( 'Q101', 'Q203', 'en', '<p>Third article section</p>' );

		$section1es = new AWSection( 'Q101', 'Q201', 'es', '<p>Primera sección del artículo</p>' );
		$section1eu = new AWSection( 'Q101', 'Q201', 'eu', '<p>Artikuluaren lehen atala</p>' );
		$section2eu = new AWSection( 'Q101', 'Q202', 'eu', '<p>Artikuluaren bigarren atala</p>' );

		$metadataEncoded = '{ "sections": [ "Q201", "Q202", "Q203" ] }';
		$metadata = new AWArticleMetadata( 'Q101', json_decode( $metadataEncoded, true ) );

		// First set all sections with the store setter, in English...
		$this->store->setSection( $section1en );
		$this->store->setSection( $section2en );
		$this->store->setSection( $section3en );
		// ... and some in Spanish and Basque
		$this->store->setSection( $section1es );
		$this->store->setSection( $section1eu );
		$this->store->setSection( $section2eu );

		// We also set the metadata row
		$this->store->setArticleMetadata( $metadata );

		// Tree sections for the topic in English
		$enSections = $this->store->getSectionsForTopic( 'Q101', 'en' );
		$this->assertCount( 3, $enSections );

		// One section for the topic in Spanish
		$esSections = $this->store->getSectionsForTopic( 'Q101', 'es' );
		$this->assertCount( 1, $esSections );

		// Two sections for the topic in Basque
		$euSections = $this->store->getSectionsForTopic( 'Q101', 'eu' );
		$this->assertCount( 2, $euSections );

		// We also get the metadata
		$mulMetadata = $this->store->getArticleMetadata( 'Q101' );

		// We cannot get the metadata row with getSectionsForTopic
		$mulSections = $this->store->getSectionsForTopic(
			'Q101',
			AWArticleStore::AW_STORAGE_LOCALE_MULTILINGUAL
		);
		$this->assertCount( 0, $mulSections );

		// We cannot get the metadata row with getSection
		$mulSection = $this->store->getSection(
			'Q101',
			AWArticleStore::AW_STORAGE_METADATA_KEY,
			AWArticleStore::AW_STORAGE_LOCALE_MULTILINGUAL
		);
		$this->assertNull( $mulSection );
	}
}
