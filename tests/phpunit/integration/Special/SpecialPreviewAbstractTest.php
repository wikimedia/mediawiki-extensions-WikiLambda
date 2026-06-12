<?php

/**
 * WikiLambda integration test suite for the PreviewAbstract special page
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Special;

use MediaWiki\Context\RequestContext;
use MediaWiki\Exception\ErrorPageError;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleMetadata;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\AWSection;
use MediaWiki\Extension\WikiLambda\Special\SpecialPreviewAbstract;
use MediaWiki\Extension\WikiLambda\Tests\Integration\MockWikidataEntityLookupTrait;
use MediaWiki\Permissions\Authority;
use MediaWiki\Tests\Specials\SpecialPageTestBase;
use Wikimedia\Timestamp\ConvertibleTimestamp;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Special\SpecialPreviewAbstract
 * @group Database
 */
class SpecialPreviewAbstractTest extends SpecialPageTestBase {
	use MockWikidataEntityLookupTrait;

	private const TEST_ABSTRACT_NS = 2300;

	private const ALLOWED_TOPICS = [ 'Q42' ];
	private const ALLOWED_LANGS = [ 'en' ];

	private const LEDE_SECTION = 'Q8776414';
	private const OTHER_SECTION = 'Q111';

	private Authority $performer;

	protected function setUp(): void {
		parent::setUp();

		$this->performer = $this->getTestUser()->getAuthority();

		$this->overrideConfigValue( 'WikiLambdaEnableRepoMode', false );
		$this->overrideConfigValue( 'WikiLambdaEnableClientMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractMode', true );
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientMode', true );

		$this->overrideConfigValue( 'WikiLambdaAbstractWikiAllowedTopics', self::ALLOWED_TOPICS );
		$this->overrideConfigValue( 'WikiLambdaAbstractWikiAllowedLangs', self::ALLOWED_LANGS );

		$this->mockWikidataEntityLookup( [
			'Q42' => [ 'en' => 'Douglas Adams' ],
			'Q319' => [ 'en' => 'Jupiter' ],
			'Q111' => [ 'en' => 'Other Section' ],
		] );
	}

	/**
	 * @inheritDoc
	 */
	protected function newSpecialPage(): SpecialPreviewAbstract {
		return $this->getServiceContainer()->getSpecialPageFactory()->getPage( 'PreviewAbstract' );
	}

	public function testExecuteThrowsIfAbstractClientModeDisabled(): void {
		$this->overrideConfigValue( 'WikiLambdaEnableAbstractClientMode', false );

		$this->expectException( ErrorPageError::class );

		$this->executeSpecialPage(
			/* subpage */ 'en/Q42',
			/* request */ null,
			/* language */ null,
			/* performer */ $this->performer
		);
	}

	public function testShowsErrorWithNoSubpage(): void {
		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ '',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		$this->assertStringContainsString( 'cdx-message--error', $html );
		$this->assertStringContainsString( 'Missing URL parameters', $html );
		$this->assertStringContainsString( 'The URL should have language and topic Qid', $html );
	}

	public function testShowsErrorWithBadLanguage(): void {
		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ 'foo/Q42',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		$this->assertStringContainsString( 'cdx-message--error', $html );
		$this->assertStringContainsString( 'Bad language code', $html );
		$this->assertStringContainsString( 'The code "foo" is not', html_entity_decode( $html ) );
	}

	public function testShowsErrorWithBadQid(): void {
		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ 'en/bar',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		$this->assertStringContainsString( 'cdx-message--error', $html );
		$this->assertStringContainsString( 'Bad topic Qid', $html );
		$this->assertStringContainsString( 'The identifier "bar" is not', html_entity_decode( $html ) );
	}

	public function testShowsWarningWithUnsupportedLang(): void {
		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ 'es/Q42',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		$this->assertStringContainsString( 'cdx-message--warning', $html );
		$this->assertStringContainsString( 'This language is not supported yet', $html );
		$this->assertStringContainsString( 'The language "español" has not', html_entity_decode( $html ) );
	}

	public function testShowsWarningWithUnsupportedTopic(): void {
		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ 'en/Q319',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		$this->assertStringContainsString( 'cdx-message--warning', $html );
		$this->assertStringContainsString( 'This topic is not supported yet', $html );
		$this->assertStringContainsString( 'The topic "Jupiter" (Q319) does not', html_entity_decode( $html ) );
	}

	private function mockArticleStoreWithMetadata( $topic, $metadata = null ) {
		$mockArticleStore = $this->createMock( AWArticleStore::class );
		$mockArticleStore
			->method( 'getArticleMetadata' )
			->with( $topic )
			->willReturn( $metadata );

		$this->setService( 'AbstractWikiArticleStore', $mockArticleStore );
	}

	public function testShowsWarningWithNotReadyArticle(): void {
		$this->mockArticleStoreWithMetadata( 'Q42', null );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ 'en/Q42',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		$this->assertStringContainsString( 'cdx-message--warning', $html );
		$this->assertStringContainsString( 'This article preview is not ready yet', $html );
		$this->assertStringContainsString(
			'The article preview for the topic "Douglas Adams" (Q42) in English has not been generated yet',
			html_entity_decode( $html )
		);
	}

	public function testSuccessHasMetadata(): void {
		$metadata = new AWArticleMetadata(
			/* topicQid= */ 'Z42',
			/* payload= */ [ 'sections' => [ self::LEDE_SECTION ] ],
			/* lastUpdated= */ new ConvertibleTimestamp( '2026-05-31T04:05:00Z' )
		);

		$this->mockArticleStoreWithMetadata( 'Q42', $metadata );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ 'en/Q42',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		// Check provenance banner
		$this->assertStringContainsString( 'cdx-message--notice', $html );
		$this->assertStringContainsString( 'Last updated from Abstract Wikipedia as of 04:05, 31 May 2026', $html );
	}

	private function mockArticleStoreWithSections( $topic, $locale, $sections ) {
		$mockArticleStore = $this->createMock( AWArticleStore::class );
		$mockArticleStore
			->method( 'getArticleMetadata' )
			->with( $topic )
			->willReturn( new AWArticleMetadata(
				/* topicQid= */ $topic,
				/* payload= */ [ 'sections' => array_keys( $sections ) ],
				/* lastUpdated= */ new ConvertibleTimestamp( '2026-05-31T04:05:00Z' )
			) );

		$mockArticleStore
			->method( 'getSection' )
			->willReturnCallback(
				static function ( $topicQid, $sectionQid, $lang ) use ( $topic, $locale, $sections ): ?AWSection {
					if ( ( $topic !== $topicQid ) || ( $locale !== $lang ) ) {
						return null;
					}
					$sectionPayload = $sections[ $sectionQid ] ?? null;
					if ( $sectionPayload === null ) {
						return null;
					}
					return new AWSection(
						/* topicQid= */ $topicQid,
						/* sectionQid= */ $sectionQid,
						/* locale= */ $lang,
						/* payload= */ $sectionPayload
					);
				}
			);

		$this->setService( 'AbstractWikiArticleStore', $mockArticleStore );
	}

	public function testSuccessLedeSectionAvailable(): void {
		$this->mockArticleStoreWithSections( 'Q42', 'en', [
			self::LEDE_SECTION => '<b>some neutral but interesting text</b>'
		] );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ 'en/Q42',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		// Check provenance banner
		$this->assertStringContainsString( 'cdx-message--notice', $html );
		$this->assertStringContainsString( 'Last updated from Abstract Wikipedia as of 04:05, 31 May 2026', $html );

		// Check sections
		preg_match_all( '/<section[^>]*>.*?<\/section>/s', $html, $matches );
		$sections = $matches[0];
		$this->assertCount( 1, $sections );

		// Section 0: lede section
		$this->assertStringContainsString( '<section data-mw-section-id="0"', $sections[0] );
		$this->assertStringNotContainsString( '<h2', $sections[0] );
		$this->assertStringContainsString( '<b>some neutral but interesting text</b>', $sections[0] );
	}

	public function testSuccessTwoSectionsAvailable(): void {
		$this->mockArticleStoreWithSections( 'Q42', 'en', [
			self::LEDE_SECTION => '<b>some neutral but interesting text</b>',
			self::OTHER_SECTION => '<b>some other section</b>'
		] );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ 'en/Q42',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		// Show provenance banner
		$this->assertStringContainsString( 'cdx-message--notice', $html );
		$this->assertStringContainsString( 'Last updated from Abstract Wikipedia as of 04:05, 31 May 2026', $html );

		// Check sections
		preg_match_all( '/<section[^>]*>.*?<\/section>/s', $html, $matches );
		$sections = $matches[0];
		$this->assertCount( 2, $sections );

		// Section 0: lede section
		$this->assertStringContainsString( '<section data-mw-section-id="0"', $sections[0] );
		$this->assertStringNotContainsString( '<h2', $sections[0] );
		$this->assertStringContainsString( '<b>some neutral but interesting text</b>', $sections[0] );

		// Section 1: non-lede section
		$this->assertStringContainsString( '<section data-mw-section-id="1"', $sections[1] );
		$this->assertStringContainsString( '<h2 id="Other Section"', $sections[1] );
		$this->assertStringContainsString( '<b>some other section</b>', $sections[1] );
	}

	public function testSuccessNoSectionsAvailable(): void {
		// Mock store with another language available, which means:
		// * getArticleMetadata will return two sections
		// * getSection will return NULL for language='en'
		$this->mockArticleStoreWithSections( 'Q42', 'es', [
			self::LEDE_SECTION => '<b>texto de introducción</b>',
			self::OTHER_SECTION => '<b>más texto</b>'
		] );

		$context = RequestContext::getMain();
		$context->setUser( $this->performer );
		$context->setLanguage( 'en' );

		[ $html ] = $this->executeSpecialPage(
			/* subpage */ 'en/Q42',
			/* request */ $context->getRequest(),
			/* language */ null,
			/* performer */ null,
			/* fullHtml */ false,
			/* context */ $context
		);

		// Show provenance banner
		$this->assertStringContainsString( 'cdx-message--notice', $html );
		$this->assertStringContainsString( 'Last updated from Abstract Wikipedia as of 04:05, 31 May 2026', $html );

		// Check sections
		preg_match_all( '/<section[^>]*>.*?<\/section>/s', $html, $matches );
		$sections = $matches[0];
		$this->assertCount( 2, $sections );

		// Section 0: lede section
		$this->assertStringContainsString( '<section data-mw-section-id="0"', $sections[0] );
		$this->assertStringNotContainsString( '<h2', $sections[0] );
		$this->assertStringContainsString( 'cdx-message--warning', $sections[0] );
		$this->assertStringContainsString( 'This section is not yet rendered', $sections[0] );
		$this->assertStringContainsString(
			'This article was last updated as of 04:05, 31 May 2026 but',
			html_entity_decode( $sections[0] )
		);

		// Section 1: non-lede section
		$this->assertStringContainsString( '<section data-mw-section-id="1"', $sections[1] );
		$this->assertStringContainsString( '<h2 id="Other Section"', $sections[1] );
		$this->assertStringContainsString( 'cdx-message--warning', $sections[1] );
		$this->assertStringContainsString( 'This section is not yet rendered', $sections[1] );
		$this->assertStringContainsString(
			'This article was last updated as of 04:05, 31 May 2026 but',
			html_entity_decode( $sections[1] )
		);
	}
}
