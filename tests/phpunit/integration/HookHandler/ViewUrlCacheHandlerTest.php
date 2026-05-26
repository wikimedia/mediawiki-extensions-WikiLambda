<?php

/**
 * WikiLambda integration test suite for ViewUrlCacheHandler
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\HookHandler;

use MediaWiki\Cache\HTMLCacheUpdater;
use MediaWiki\Config\HashConfig;
use MediaWiki\Extension\WikiLambda\HookHandler\ViewUrlCacheHandler;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Language\LanguageNameUtils;
use MediaWiki\Page\WikiPage;
use MediaWiki\Title\Title;
use MediaWiki\Utils\UrlUtils;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\HookHandler\ViewUrlCacheHandler
 */
class ViewUrlCacheHandlerTest extends MediaWikiIntegrationTestCase {

	private const ABSTRACT_NS = NS_MAIN;

	/** @var string[] URLs captured from the mocked HTMLCacheUpdater::purgeUrls() */
	private array $purgedUrls = [];

	/**
	 * Build a handler whose collaborators are all mocked. purgeUrls() output is captured into
	 * $this->purgedUrls; expand() returns a stable host so URLs are easy to assert on.
	 *
	 * @param array $configMap Values for the HashConfig (mode flags + abstract namespaces)
	 * @param string[] $supportedLanguages Codes returned by the mocked LanguageNameUtils
	 * @return ViewUrlCacheHandler
	 */
	private function makeHandler( array $configMap, array $supportedLanguages = [] ): ViewUrlCacheHandler {
		$this->purgedUrls = [];

		$htmlCacheUpdater = $this->createMock( HTMLCacheUpdater::class );
		$htmlCacheUpdater->method( 'purgeUrls' )->willReturnCallback(
			function ( $urls ) {
				$this->purgedUrls = array_merge( $this->purgedUrls, (array)$urls );
			}
		);

		$urlUtils = $this->createMock( UrlUtils::class );
		$urlUtils->method( 'expand' )->willReturnCallback(
			static fn ( string $path ): string => 'https://example.test' . $path
		);

		$languageNameUtils = $this->createMock( LanguageNameUtils::class );
		$languageNameUtils->method( 'getLanguageNames' )->willReturn(
			array_fill_keys( $supportedLanguages, 'name' )
		);

		return new ViewUrlCacheHandler(
			new HashConfig( $configMap ),
			$htmlCacheUpdater,
			$languageNameUtils,
			$urlUtils
		);
	}

	/**
	 * @param array $configMap
	 * @return array Config plus the two flags the abstract branch always reads
	 */
	private function configWith( array $configMap ): array {
		return $configMap + [
			'WikiLambdaEnableRepoMode' => false,
			'WikiLambdaEnableAbstractMode' => false,
			'WikiLambdaAbstractNamespaces' => [],
		];
	}

	private function mockWikiPageFor( Title $title ): WikiPage {
		$wikiPage = $this->createMock( WikiPage::class );
		$wikiPage->method( 'getTitle' )->willReturn( $title );
		return $wikiPage;
	}

	private function setZLanguageCodes( array $codes ): void {
		$store = $this->createMock( ZObjectStore::class );
		$store->method( 'fetchAllZLanguageCodes' )->willReturn( $codes );
		$this->setService( 'WikiLambdaZObjectStore', $store );
	}

	public function testRepoModePurgesOneUrlPerZLanguageCode(): void {
		$this->setZLanguageCodes( [ 'en', 'fr', 'de' ] );
		$handler = $this->makeHandler( $this->configWith( [ 'WikiLambdaEnableRepoMode' => true ] ) );

		$handler->onPageSaveComplete(
			$this->mockWikiPageFor( Title::makeTitle( NS_MAIN, 'Z12345' ) ),
			null, '', 0, null, null
		);

		$this->assertSame( [
			'https://example.test/view/en/Z12345',
			'https://example.test/view/fr/Z12345',
			'https://example.test/view/de/Z12345',
		], $this->purgedUrls );
	}

	public function testAbstractModePurgesOneUrlPerSupportedLanguage(): void {
		$handler = $this->makeHandler(
			$this->configWith( [
				'WikiLambdaEnableAbstractMode' => true,
				'WikiLambdaAbstractNamespaces' => [ self::ABSTRACT_NS => [ 'Whatever', 'Q1' ] ],
			] ),
			[ 'en', 'fr' ]
		);

		$handler->onPageSaveComplete(
			$this->mockWikiPageFor( Title::makeTitle( self::ABSTRACT_NS, 'Q42' ) ),
			null, '', 0, null, null
		);

		$this->assertSame( [
			'https://example.test/view/en/Q42',
			'https://example.test/view/fr/Q42',
		], $this->purgedUrls );
	}

	public function testDeleteAlsoPurges(): void {
		$this->setZLanguageCodes( [ 'en' ] );
		$handler = $this->makeHandler( $this->configWith( [ 'WikiLambdaEnableRepoMode' => true ] ) );

		$handler->onPageDeleteComplete(
			Title::makeTitle( NS_MAIN, 'Z12345' ),
			null, '', 0, null, null, 0
		);

		$this->assertSame( [ 'https://example.test/view/en/Z12345' ], $this->purgedUrls );
	}

	public function testNoPurgeWhenRepoTitleIsNotAZObject(): void {
		$handler = $this->makeHandler( $this->configWith( [ 'WikiLambdaEnableRepoMode' => true ] ) );

		$handler->onPageSaveComplete(
			$this->mockWikiPageFor( Title::makeTitle( NS_MAIN, 'Not_A_Zid' ) ),
			null, '', 0, null, null
		);

		$this->assertSame( [], $this->purgedUrls );
	}

	public function testNoPurgeWhenAbstractPageOutsideConfiguredNamespace(): void {
		$handler = $this->makeHandler(
			$this->configWith( [
				'WikiLambdaEnableAbstractMode' => true,
				'WikiLambdaAbstractNamespaces' => [ self::ABSTRACT_NS => [ 'Whatever', 'Q1' ] ],
			] ),
			[ 'en', 'fr' ]
		);

		$handler->onPageSaveComplete(
			$this->mockWikiPageFor( Title::makeTitle( NS_PROJECT, 'Q42' ) ),
			null, '', 0, null, null
		);

		$this->assertSame( [], $this->purgedUrls );
	}

	public function testNoPurgeWhenNeitherModeEnabled(): void {
		$this->setZLanguageCodes( [ 'en', 'fr' ] );
		$handler = $this->makeHandler( $this->configWith( [] ) );

		$handler->onPageSaveComplete(
			$this->mockWikiPageFor( Title::makeTitle( NS_MAIN, 'Z12345' ) ),
			null, '', 0, null, null
		);

		$this->assertSame( [], $this->purgedUrls );
	}
}
