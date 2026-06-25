<?php

/**
 * WikiLambda integration test for the updateAbstractWikiArticleStore maintenance script.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Maintenance;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractContentUtils;
use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiContent;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleMetadata;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\AWFragmentStore;
use MediaWiki\Extension\WikiLambda\AWStorage\AWSection;
use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\Maintenance\UpdateAbstractWikiArticleStore;
use MediaWiki\Extension\WikiLambda\Tests\Integration\MockWikidataEntityLookupTrait;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Title\Title;
use Wikimedia\Timestamp\ConvertibleTimestamp;
use Wikimedia\Timestamp\TimestampFormat as TS;

require_once dirname( __DIR__, 3 ) . '/maintenance/updateAbstractWikiArticleStore.php';

/**
 * @group Database
 * @group WikiLambdaIntegration
 *
 * @covers \MediaWiki\Extension\WikiLambda\Maintenance\UpdateAbstractWikiArticleStore
 */
class UpdateAbstractWikiArticleStoreTest extends WikiLambdaMaintenanceTestCase {
	use MockWikidataEntityLookupTrait;

	private const TEST_ABSTRACT_NS = 2300;
	private const NOW = '20260101081300';
	private const PAST = '20200101081300';

	private MemcachedWrapper $objectCache;
	private AWArticleStore $articleStore;

	protected function setUp(): void {
		parent::setUp();

		$this->mockWikidataEntityLookup( [ 'Q42' => [] ] );

		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', true );
		$this->overrideConfigValue( 'WikiLambdaAbstractNamespaces', [ 2300 => 'Abstract_Wikipedia' ] );

		ConvertibleTimestamp::setFakeTime( self::NOW );

		$this->objectCache = WikiLambdaServices::getMemcachedWrapper();
		$this->articleStore = WikiLambdaServices::getAWArticleStore();
	}

	protected function tearDown(): void {
		ConvertibleTimestamp::setFakeTime( false );
		parent::tearDown();
	}

	protected function getMaintenanceClass(): string {
		return UpdateAbstractWikiArticleStore::class;
	}

	// Option validation
	// =================

	/**
	 * @dataProvider provideInvalidOptions
	 */
	public function testInvalidOptions( array $argv ): void {
		$this->maintenance->loadWithArgv( $argv );
		$this->expectCallToFatalError();
		$this->maintenance->execute();
	}

	public static function provideInvalidOptions(): iterable {
		yield 'no flags' => [ [] ];
		yield 'missing topics' => [ [ '--langs', 'en' ] ];
		yield 'missing langs' => [ [ '--topics', 'Q1' ] ];
		yield 'invalid topics only' => [ [ '--topics', 'not-a-qid,abc', '--langs', 'en' ] ];
		yield 'invalid langs only' => [ [ '--topics', 'Q1', '--langs', '$$$,???' ] ];
		yield 'language zids instead of codes' => [ [ '--topics', 'Q1', '--langs', 'Z1002' ] ];
		yield 'empty topics' => [ [ '--topics', '', '--langs', 'en' ] ];
		yield 'empty langs' => [ [ '--topics', 'Q1', '--langs', '' ] ];
	}

	// Execution
	// =========

	/**
	 * Happy path:
	 * * executes the script for `--topics Q42 --langs en`
	 * * all fragments are available
	 */
	public function testSuccessfulRun(): void {
		$topicQid = 'Q42';
		$sectionQid = 'Q8776414';
		$langZid = 'Z1002';
		$ts = new ConvertibleTimestamp();
		$date = $ts->format( 'Y-m-d' );

		$fragment1 = [ 'Z1K1' => 'Z7', 'Z7K1' => 'Z400', 'Z400K1' => 'F1' ];
		$fragment2 = [ 'Z1K1' => 'Z7', 'Z7K1' => 'Z400', 'Z400K1' => 'F2' ];

		$value1 = [ 'success' => true, 'value' => '<h1>Fragment 1</h1>' ];
		$value2 = [ 'success' => true, 'value' => '<h2>Fragment 2</h2>' ];

		$awJson = '{ "qid": "' . $topicQid . '", "sections": {'
			. ' "' . $sectionQid . '": { "index": 0,'
			. ' "fragments": [ "Z89",'
			. json_encode( $fragment1 ) . ', '
			. json_encode( $fragment2 ) . ' ] } } }';

		// SETUP:
		// Load AW content for Q42
		$this->loadAWContent( $topicQid, $awJson );
		// Load fragment 1 for:
		// * Q42,Z1002,today
		// * Q42,Z1002,stale
		$this->loadAWFragment( $fragment1, $topicQid, $langZid, $date, $value1 );
		$this->loadAWFragment( $fragment1, $topicQid, $langZid, null, $value1 );
		// Load fragment 2 for:
		// * Q42,Z1002,today
		// * Q42,Z1002,stale
		$this->loadAWFragment( $fragment2, $topicQid, $langZid, $date, $value2 );
		$this->loadAWFragment( $fragment2, $topicQid, $langZid, null, $value2 );

		// ASSERT PRE:
		// Before execution there are no sections in the store
		$sections = $this->articleStore->getSectionsForTopic( $topicQid, 'en' );
		$this->assertCount( 0, $sections );
		// Keep old metadata payload to check that keys weren't overwritten
		$metadata = $this->articleStore->getArticleMetadata( $topicQid );
		$oldMetadata = $metadata->getPayload();

		// EXECUTE:
		// Run the script for --topics Q42 --langs en
		$this->maintenance->loadWithArgv( [ '--topics', 'Q42', '--langs', 'en' ] );
		$this->maintenance->execute();

		// ASSERT POST:
		// AWSectionStore has successfully created AWSection and AWArticleMetadata rows
		$section = $this->articleStore->getSection( $topicQid, $sectionQid, 'en' );
		$metadata = $this->articleStore->getArticleMetadata( $topicQid );

		$this->assertInstanceOf( AWSection::class, $section );
		$this->assertInstanceOf( AWArticleMetadata::class, $metadata );

		$this->assertSame( self::NOW, $section->getLastUpdated()->getTimestamp( TS::MW ) );
		$this->assertSame( "<h1>Fragment 1</h1>\n<h2>Fragment 2</h2>", $section->getPayload() );
		$this->assertSame( $topicQid, $section->getTopicQid() );
		$this->assertSame( $sectionQid, $section->getSectionQid() );
		$this->assertSame( 'en', $section->getLocale() );

		$this->assertSame( self::NOW, $metadata->getLastUpdated()->getTimestamp( TS::MW ) );
		$newMetadata = $metadata->getPayload();
		// Existing keys remain the same
		$this->assertSame( $oldMetadata[ 'awLastUpdated' ], $newMetadata[ 'awLastUpdated' ] );
		$this->assertSame( $oldMetadata[ 'awLatestRevID' ], $newMetadata[ 'awLatestRevID' ] );
		// New keys have been added
		$this->assertSame( self::NOW, $newMetadata[ 'lastRendered' ] );
		$this->assertSame( [], $newMetadata[ 'pendingSections' ] );
		$this->assertEquals( [ 'en' ], $newMetadata[ 'renderedLangs' ] );
	}

	/**
	 * Sad path:
	 * * executes the script for `--topics Q42 --langs en,es`
	 * * few of the fragments are pending
	 */
	public function testPendingRun(): void {
		$topicQid = 'Q42';
		$section1 = 'Q8776414';
		$section2 = 'Q101';
		$section3 = 'Q102';
		$date = ( new ConvertibleTimestamp() )->format( 'Y-m-d' );

		$fragment1 = '{ "Z1K1": "Z7", "Z7K1": "Z401" }';
		$fragment2 = '{ "Z1K1": "Z7", "Z7K1": "Z402" }';
		$fragment3 = '{ "Z1K1": "Z7", "Z7K1": "Z403" }';
		$fragment4 = '{ "Z1K1": "Z7", "Z7K1": "Z404" }';

		$value1 = [ 'success' => true, 'value' => '<p>Fragment 1</p>' ];
		$value2 = [ 'success' => true, 'value' => '<p>Fragment 2</p>' ];
		$value3 = [ 'success' => true, 'value' => '<p>Fragment 3</p>' ];
		$value4 = [ 'success' => true, 'value' => '<p>Fragment 4</p>' ];

		$awJson = '{ "qid": "' . $topicQid . '", "sections": {'
			. ' "' . $section1 . '": { "index": 0,'
			. ' "fragments": [ "Z89",' . $fragment1 . ',' . $fragment2 . ' ] },'
			. ' "' . $section2 . '": {' . ' "index": 1,'
			. ' "fragments": [ "Z89",' . $fragment3 . ' ] },'
			. ' "' . $section3 . '": {' . ' "index": 2,'
			. ' "fragments": [ "Z89",' . $fragment4 . ' ] }'
			. ' } }';

		// SETUP:
		// Load AW content for Q42
		$this->loadAWContent( $topicQid, $awJson );

		// Load fragments for the following states:
		$expectedPendingSections = [
			'en' => [ $section1 ],
			'es' => [ $section1, $section2 ]
			/* no fr key as it will be fully ready */
		];
		// Section 1:
		// * ES: pending -- all fragments pending
		// * EN: pending -- some fragments pending
		// * FR: ready
		$this->loadAWFragment( json_decode( $fragment1, true ), $topicQid, 'Z1002', $date, $value1 );
		$this->loadAWFragment( json_decode( $fragment1, true ), $topicQid, 'Z1004', $date, $value1 );
		$this->loadAWFragment( json_decode( $fragment2, true ), $topicQid, 'Z1004', $date, $value2 );
		// Section 2:
		// * ES: pending -- one fragment pending
		// * EN: ready -- one fragment ready
		// * FR: ready
		$this->loadAWFragment( json_decode( $fragment3, true ), $topicQid, 'Z1002', $date, $value3 );
		$this->loadAWFragment( json_decode( $fragment3, true ), $topicQid, 'Z1004', $date, $value3 );
		// Section 3:
		// * EN/ES: ready -- all fragments ready
		// * FR: ready
		$this->loadAWFragment( json_decode( $fragment4, true ), $topicQid, 'Z1002', $date, $value4 );
		$this->loadAWFragment( json_decode( $fragment4, true ), $topicQid, 'Z1003', $date, $value4 );
		$this->loadAWFragment( json_decode( $fragment4, true ), $topicQid, 'Z1004', $date, $value4 );

		// ASSERT PRE:
		// Before execution there are no sections in the store
		$sectionsEn = $this->articleStore->getSectionsForTopic( $topicQid, 'en' );
		$sectionsEs = $this->articleStore->getSectionsForTopic( $topicQid, 'es' );
		$sectionsFr = $this->articleStore->getSectionsForTopic( $topicQid, 'fr' );
		$this->assertCount( 0, $sectionsEn );
		$this->assertCount( 0, $sectionsEs );
		$this->assertCount( 0, $sectionsFr );

		// Keep old metadata payload to check that keys weren't overwritten
		$metadata = $this->articleStore->getArticleMetadata( $topicQid );
		$oldMetadata = $metadata->getPayload();

		// EXECUTE:
		// Run the script for --topics Q42 --langs en,es
		$this->maintenance->loadWithArgv( [ '--topics', 'Q42', '--langs', 'en,es,fr' ] );
		$this->maintenance->execute();

		// ASSERT POST:
		// AWSectionStore has successfully created AWSection and AWArticleMetadata rows
		$sectionsEn = $this->articleStore->getSectionsForTopic( $topicQid, 'en' );
		$sectionsEs = $this->articleStore->getSectionsForTopic( $topicQid, 'es' );
		$sectionsFr = $this->articleStore->getSectionsForTopic( $topicQid, 'fr' );
		$this->assertCount( 3, $sectionsEn );
		$this->assertCount( 3, $sectionsEs );
		$this->assertCount( 3, $sectionsFr );

		$metadata = $this->articleStore->getArticleMetadata( $topicQid );
		$this->assertInstanceOf( AWArticleMetadata::class, $metadata );

		// Check one ready section
		$sectionReady = $this->articleStore->getSection( $topicQid, $section1, 'fr' );
		$this->assertSame( self::NOW, $sectionReady->getLastUpdated()->getTimestamp( TS::MW ) );
		$this->assertSame( "<p>Fragment 1</p>\n<p>Fragment 2</p>", $sectionReady->getPayload() );
		$this->assertSame( $topicQid, $sectionReady->getTopicQid() );
		$this->assertSame( $section1, $sectionReady->getSectionQid() );
		$this->assertSame( 'fr', $sectionReady->getLocale() );

		// Check one pending section
		$sectionPending = $this->articleStore->getSection( $topicQid, $section1, 'es' );
		$this->assertSame( self::NOW, $sectionPending->getLastUpdated()->getTimestamp( TS::MW ) );
		$this->assertStringContainsString( 'pending', $sectionPending->getPayload() );
		$this->assertSame( $topicQid, $sectionPending->getTopicQid() );
		$this->assertSame( $section1, $sectionPending->getSectionQid() );
		$this->assertSame( 'es', $sectionPending->getLocale() );

		$this->assertSame( self::NOW, $metadata->getLastUpdated()->getTimestamp( TS::MW ) );
		$newMetadata = $metadata->getPayload();
		// Existing keys remain the same
		$this->assertSame( $oldMetadata[ 'awLastUpdated' ], $newMetadata[ 'awLastUpdated' ] );
		$this->assertSame( $oldMetadata[ 'awLatestRevID' ], $newMetadata[ 'awLatestRevID' ] );
		// New keys have been added
		$this->assertSame( self::NOW, $newMetadata[ 'lastRendered' ] );
		$this->assertEquals( $expectedPendingSections, $newMetadata[ 'pendingSections' ] );
		$this->assertEquals( [ 'en', 'es', 'fr' ], $newMetadata[ 'renderedLangs' ] );
	}

	/**
	 * Config fallback:
	 * * no --topics/--langs flags are passed
	 * * the topics and langs come from $wgWikiLambdaAbstractWikiArticleStore{Topics,Langs}
	 */
	public function testConfigDefaultsUsedWhenNoFlags(): void {
		$topicQid = 'Q42';
		$sectionQid = 'Q8776414';
		$langZid = 'Z1002';
		$date = ( new ConvertibleTimestamp() )->format( 'Y-m-d' );

		$fragment1 = [ 'Z1K1' => 'Z7', 'Z7K1' => 'Z400', 'Z400K1' => 'F1' ];
		$value1 = [ 'success' => true, 'value' => '<h1>Fragment 1</h1>' ];

		$awJson = '{ "qid": "' . $topicQid . '", "sections": {'
			. ' "' . $sectionQid . '": { "index": 0,'
			. ' "fragments": [ "Z89",' . json_encode( $fragment1 ) . ' ] } } }';

		// SETUP:
		// Provide the topics and langs through config rather than CLI flags.
		// overrideConfigValues() resets the service container, so re-capture the
		// cache/store handles afterwards (setUp's copies now point at stale services).
		$this->overrideConfigValues( [
			'WikiLambdaAbstractWikiArticleStoreTopics' => [ $topicQid ],
			'WikiLambdaAbstractWikiArticleStoreLangs' => [ 'en' ],
		] );
		$this->objectCache = WikiLambdaServices::getMemcachedWrapper();
		$this->articleStore = WikiLambdaServices::getAWArticleStore();
		$this->loadAWContent( $topicQid, $awJson );
		$this->loadAWFragment( $fragment1, $topicQid, $langZid, $date, $value1 );

		// EXECUTE:
		// Run the script with no flags, so it relies on config defaults
		$this->maintenance->loadWithArgv( [] );
		$this->maintenance->execute();

		// ASSERT POST:
		// The config-driven topic/lang produced the expected section
		$section = $this->articleStore->getSection( $topicQid, $sectionQid, 'en' );
		$this->assertInstanceOf( AWSection::class, $section );
		$this->assertSame( $topicQid, $section->getTopicQid() );
		$this->assertSame( 'en', $section->getLocale() );
		$this->assertSame( '<h1>Fragment 1</h1>', $section->getPayload() );
	}

	/**
	 * CLI precedence:
	 * * config sets decoy topics/langs (Q999/fr)
	 * * --topics Q42 --langs en override them entirely (not merge)
	 */
	public function testCliOptionsOverrideConfig(): void {
		$topicQid = 'Q42';
		$sectionQid = 'Q8776414';
		$langZid = 'Z1002';
		$date = ( new ConvertibleTimestamp() )->format( 'Y-m-d' );

		$fragment1 = [ 'Z1K1' => 'Z7', 'Z7K1' => 'Z400', 'Z400K1' => 'F1' ];
		$value1 = [ 'success' => true, 'value' => '<h1>Fragment 1</h1>' ];

		$awJson = '{ "qid": "' . $topicQid . '", "sections": {'
			. ' "' . $sectionQid . '": { "index": 0,'
			. ' "fragments": [ "Z89",' . json_encode( $fragment1 ) . ' ] } } }';

		// SETUP:
		// Config points at a topic with no content and a different language;
		// if the CLI flags didn't override config, no Q42/en section would be made.
		// overrideConfigValues() resets the service container, so re-capture the
		// cache/store handles afterwards (setUp's copies now point at stale services).
		$this->overrideConfigValues( [
			'WikiLambdaAbstractWikiArticleStoreTopics' => [ 'Q999' ],
			'WikiLambdaAbstractWikiArticleStoreLangs' => [ 'fr' ],
		] );
		$this->objectCache = WikiLambdaServices::getMemcachedWrapper();
		$this->articleStore = WikiLambdaServices::getAWArticleStore();
		$this->loadAWContent( $topicQid, $awJson );
		$this->loadAWFragment( $fragment1, $topicQid, $langZid, $date, $value1 );

		// EXECUTE:
		// Run the script for --topics Q42 --langs en
		$this->maintenance->loadWithArgv( [ '--topics', 'Q42', '--langs', 'en' ] );
		$this->maintenance->execute();

		// ASSERT POST:
		// The CLI topic+lang won: a Q42/en section exists...
		$section = $this->articleStore->getSection( $topicQid, $sectionQid, 'en' );
		$this->assertInstanceOf( AWSection::class, $section );
		$this->assertSame( 'en', $section->getLocale() );
		// ...and the config language 'fr' was not used.
		$this->assertCount( 0, $this->articleStore->getSectionsForTopic( $topicQid, 'fr' ) );
	}

	public function testUpdatePending() {
		// We want to check that:
		// * stuff not in the input --lang <langs> not re-rendered
		// * stuff that is successfully updated is removed from the pending array
		// * stuff that is not updated remains in the pending array
		// * anything that was registered as pending will not be touched
		//
		// For this we need 4 languages:
		// * en: was pending, now done
		// * es: was pending, still pending
		// * fr: was pending, could be resolved, but remains pending
		// * ru: was ready, could be overwritten, but it's not
		//
		// Setup:
		// * metadata has pending en, es, fr
		// * metadata has non-pending russian, although section for ru has some outdated content
		//
		// Act:
		// call script with --pending --langs en,es,ru
		//
		// Assert:
		// * metadata still has pending for es (cause fragment wasn't ready)
		// * metadata still has pending for fr (cause it wasn't requested)
		// * metadata has no en nor ru
		// * section for en has been overwritten
		// * section for fr and ru have not been overwritten
		$topicQid = 'Q42';
		$sectionQid = 'Q8776414';

		$fragment = [ 'Z1K1' => 'Z7', 'Z7K1' => 'Z400' ];
		$value = [ 'success' => true, 'value' => '<p>Updated</p>' ];

		$awJson = '{ "qid": "' . $topicQid . '", "sections": {'
			. ' "' . $sectionQid . '": { "index": 0,'
			. ' "fragments": [ "Z89",' . json_encode( $fragment ) . ' ] } } }';

		ConvertibleTimestamp::setFakeTime( self::PAST );

		// SETUP:
		$this->loadAWContent( $topicQid, $awJson );
		// Sections are stored for all objects, with outdated value
		$oldValue = '<p>Outdated</p>';
		$this->articleStore->setSection( new AWSection( $topicQid, $sectionQid, 'en', $oldValue ) );
		$this->articleStore->setSection( new AWSection( $topicQid, $sectionQid, 'es', $oldValue ) );
		$this->articleStore->setSection( new AWSection( $topicQid, $sectionQid, 'fr', $oldValue ) );
		$this->articleStore->setSection( new AWSection( $topicQid, $sectionQid, 'ru', $oldValue ) );
		// Metadata knows that en, es, and fr are pending, but not russian
		$oldMetadata = json_decode( '{"sections":["Q8776414"],'
			. '"pendingSections":{ "en":["Q8776414"], "es":["Q8776414"], "fr":["Q8776414"] },'
			. '"lastRendered":"' . self::PAST . '"}', true );
		$this->articleStore->setArticleMetadata( new AWArticleMetadata( $topicQid, $oldMetadata ) );

		ConvertibleTimestamp::setFakeTime( self::NOW );
		$date = ( new ConvertibleTimestamp() )->format( 'Y-m-d' );

		// Fragments are freshly ready for english, french and russian
		$this->loadAWFragment( $fragment, $topicQid, 'Z1002', $date, $value );
		$this->loadAWFragment( $fragment, $topicQid, 'Z1004', $date, $value );
		$this->loadAWFragment( $fragment, $topicQid, 'Z1005', $date, $value );

		// EXECUTE:
		// Run the script for --topics Q42 --langs en,es,ru --pending
		$this->maintenance->loadWithArgv( [ '--topics', 'Q42', '--langs', 'en,es,ru', '--pending' ] );
		$this->maintenance->execute();

		// ASSERT POST:
		$metadata = $this->articleStore->getArticleMetadata( $topicQid );
		$newPending = $metadata->getPayload()[ 'pendingSections' ] ?? [];
		$expectedPending = [ 'es' => [ $sectionQid ], 'fr' => [ $sectionQid ] ];
		$this->assertSame( self::NOW, $metadata->getLastUpdated()->getTimestamp( TS::MW ) );
		$this->assertEquals( $expectedPending, $newPending );

		// English section has been updated because:
		// 1) metadata said pending, 2) called with --langs en --pending, 3) fragment was ready
		$section = $this->articleStore->getSection( $topicQid, $sectionQid, 'en' );
		$this->assertInstanceOf( AWSection::class, $section );
		$this->assertSame( self::NOW, $section->getLastUpdated()->getTimestamp( TS::MW ) );
		$this->assertSame( "<p>Updated</p>", $section->getPayload() );
		// English is no longer pending section in metadata
		$this->assertArrayNotHasKey( 'en', $newPending );

		// Spanish section has not been updated because:
		// 1) metadata said pending, 2) called with --langs es --pending, 3) fragment was NOT ready
		$section = $this->articleStore->getSection( $topicQid, $sectionQid, 'es' );
		$this->assertInstanceOf( AWSection::class, $section );
		$this->assertSame( self::PAST, $section->getLastUpdated()->getTimestamp( TS::MW ) );
		$this->assertSame( "<p>Outdated</p>", $section->getPayload() );
		// Spanish is still pending section in metadata
		$this->assertArrayHasKey( 'es', $newPending );
		$this->assertEquals( [ $sectionQid ], $newPending['es'] );

		// French section has not been updated because:
		// 1) metadata said pending, but 2) script was not called with --lang fr
		$section = $this->articleStore->getSection( $topicQid, $sectionQid, 'fr' );
		$this->assertInstanceOf( AWSection::class, $section );
		$this->assertSame( self::PAST, $section->getLastUpdated()->getTimestamp( TS::MW ) );
		$this->assertSame( "<p>Outdated</p>", $section->getPayload() );
		// French is still pending section in metadata
		$this->assertArrayHasKey( 'fr', $newPending );
		$this->assertEquals( [ $sectionQid ], $newPending['fr'] );

		// Russian section has not been updated because:
		// 1) script was called with --lang ru, but 2) metadata did not register russian as pending
		$section = $this->articleStore->getSection( $topicQid, $sectionQid, 'ru' );
		$this->assertInstanceOf( AWSection::class, $section );
		$this->assertSame( self::PAST, $section->getLastUpdated()->getTimestamp( TS::MW ) );
		$this->assertSame( "<p>Outdated</p>", $section->getPayload() );
		// French is still pending section in metadata
		$this->assertArrayNotHasKey( 'ru', $newPending );
	}

	public function testSectionPayloadContainsStatusMetadata(): void {
		$topicQid = 'Q42';
		$sectionQid = 'Q8776414';
		$date = ( new ConvertibleTimestamp() )->format( 'Y-m-d' );

		$fragment1 = [ 'Z1K1' => 'Z7', 'Z7K1' => 'Z401' ];
		$fragment2 = [ 'Z1K1' => 'Z7', 'Z7K1' => 'Z402' ];
		$fragment3 = [ 'Z1K1' => 'Z7', 'Z7K1' => 'Z403' ];

		$awJson = '{ "qid": "' . $topicQid . '", "sections": {'
			. ' "' . $sectionQid . '": { "index": 0,'
			. ' "fragments": [ "Z89",'
			. json_encode( $fragment1 ) . ','
			. json_encode( $fragment2 ) . ','
			. json_encode( $fragment3 ) . ' ] } } }';

		$valueOk = [ 'success' => true, 'value' => '<p>Fragment</p>' ];
		$valueFailed = [ 'success' => false, 'value' => [] ];

		$this->loadAWContent( $topicQid, $awJson );
		// Fragment 1 is pending
		// Fragment 2 is OK but stale
		// Fragment 3 is fresh but failed
		$this->loadAWFragment( $fragment2, $topicQid, 'Z1002', null, $valueOk );
		$this->loadAWFragment( $fragment3, $topicQid, 'Z1002', $date, $valueFailed );

		$this->maintenance->loadWithArgv( [ '--topics', 'Q42', '--langs', 'en' ] );
		$this->maintenance->execute();

		$payload = $this->articleStore->getSection( $topicQid, $sectionQid, 'en' )->getPayload();

		preg_match( '/<meta itemprop="aw-section-status"[^>]*>/', $payload, $matches );
		$this->assertNotEmpty( $matches, 'Expected aw-section-status meta tag in payload' );
		$metaTag = $matches[0];

		$this->assertStringContainsString( 'data-pending="1"', $metaTag );
		$this->assertStringContainsString( 'data-failed="1"', $metaTag );
		$this->assertStringContainsString( 'data-stale="1"', $metaTag );
	}

	// Helper functions
	// ================

	/**
	 * Loads an AbstractWikiContent object into the abstract namespace given
	 * a topic QID and a string-encoded JSON with a valid AW object.
	 *
	 * @param string $qid
	 * @param string $json
	 */
	private function loadAWContent( $qid, $json ) {
		$title = Title::newFromText( $qid, self::TEST_ABSTRACT_NS );
		$content = new AbstractWikiContent( $json );
		$status = $this->editPage( $title, $content, "test create AbstractWikiContent object", self::TEST_ABSTRACT_NS );
	}

	/**
	 * Loads a rendered AbstractWiki Fragment into the object cache, given
	 * its topic qid, language, fragment, date and value:
	 * * If the date is null, stores it as stale value,
	 * * If the date is not null, stores it as dated value.
	 *
	 * @param array $fragment
	 * @param string $qid
	 * @param string $lang
	 * @param ?string $date
	 * @param array $value
	 */
	private function loadAWFragment( $fragment, $qid, $lang, $date, $value ) {
		// Assemble cache key arguments for fresh or stale key (depending on $date)
		$cacheKeyArgs = [ AWFragmentStore::ABSTRACT_FRAGMENT_CACHE_KEY_PREFIX, $qid, $lang ];
		if ( $date ) {
			$cacheKeyArgs[] = $date;
		}
		$cacheKeyArgs[] = AbstractContentUtils::makeCacheKeyForAbstractFragment( $fragment );
		$cacheKey = $this->objectCache->makeKey( ...$cacheKeyArgs );

		$encodedValue = json_encode( $value );

		$this->objectCache->set( $cacheKey, $encodedValue, MemcachedWrapper::TTL_DAY );
	}
}
