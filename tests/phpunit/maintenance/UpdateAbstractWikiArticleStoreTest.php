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
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Title\Title;
use Wikimedia\Timestamp\ConvertibleTimestamp;

require_once dirname( __DIR__, 3 ) . '/maintenance/updateAbstractWikiArticleStore.php';

/**
 * @group Database
 * @group WikiLambdaIntegration
 *
 * @covers \MediaWiki\Extension\WikiLambda\Maintenance\UpdateAbstractWikiArticleStore
 */
class UpdateAbstractWikiArticleStoreTest extends WikiLambdaMaintenanceTestCase {

	private const TEST_ABSTRACT_NS = 2300;
	private MemcachedWrapper $objectCache;
	private AWArticleStore $articleStore;

	protected function setUp(): void {
		parent::setUp();
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', true );
		$this->overrideConfigValue( 'WikiLambdaAbstractNamespaces', [ 2300 => 'Abstract_Wikipedia' ] );

		ConvertibleTimestamp::setFakeTime( '2026-01-01T08:13:00Z' );

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
	 * Happy path, executes the script for `--topics Q42 --langs en`
	 */
	public function testSuccessfulInit(): void {
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
		// Before execution there is nothing in the store
		$sections = $this->articleStore->getSectionsForTopic( $topicQid, 'en' );
		$metadata = $this->articleStore->getArticleMetadata( $topicQid );
		$this->assertCount( 0, $sections );
		$this->assertNull( $metadata );

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

		$this->assertSame( '2026-01-01 08:13', $section->getLastUpdated()->format( 'Y-m-d H:i' ) );
		$this->assertSame( "<h1>Fragment 1</h1>\n<h2>Fragment 2</h2>", $section->getPayload() );
		$this->assertSame( $topicQid, $section->getTopicQid() );
		$this->assertSame( $sectionQid, $section->getSectionQid() );
		$this->assertSame( 'en', $section->getLocale() );

		$this->assertSame( '2026-01-01 08:13', $metadata->getLastUpdated()->format( 'Y-m-d H:i' ) );
		$expectedMetadata = [ 'sectionIndices' => [ 0 => $sectionQid ] ];
		$this->assertEquals( $expectedMetadata, $metadata->getPayload() );
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
		$this->editPage( $title, $content, "test create AbstractWikiContent object", self::TEST_ABSTRACT_NS );
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
