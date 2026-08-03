<?php

/**
 * WikiLambda unit test suite for the DiffLabelResolver
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\Diff\DiffLabelResolver;
use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjectStore;
use MediaWiki\Language\Language;
use MediaWiki\Languages\LanguageFactory;
use MediaWiki\Title\Title;
use MediaWiki\Title\TitleFactory;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Diff\DiffLabelResolver
 */
class DiffLabelResolverTest extends MediaWikiUnitTestCase {

	private function newResolver(
		ZObjectStore $store,
		?TitleFactory $titleFactory = null,
		?LanguageFactory $languageFactory = null,
		?ZLangRegistry $langRegistry = null
	): DiffLabelResolver {
		$language = $this->createMock( Language::class );
		$language->method( 'getCode' )->willReturn( 'en' );

		return new DiffLabelResolver(
			$store,
			$language,
			$languageFactory ?? $this->createMock( LanguageFactory::class ),
			$titleFactory ?? $this->createMock( TitleFactory::class ),
			$langRegistry ?? $this->createMock( ZLangRegistry::class )
		);
	}

	/**
	 * @dataProvider provideNonGlobalKeys
	 */
	public function testNonGlobalKeyIsReturnedUnchangedWithoutFetching( string $segment ) {
		$store = $this->createMock( ZObjectStore::class );
		$store->expects( $this->never() )->method( 'fetchZObject' );

		$this->assertSame( $segment, $this->newResolver( $store )->getKeyLabel( $segment ) );
	}

	public static function provideNonGlobalKeys() {
		return [
			'list index' => [ '1' ],
			'bare local key' => [ 'K1' ],
			'plain reference' => [ 'Z6' ],
			'empty' => [ '' ],
		];
	}

	public function testUnresolvableDefinitionFallsBackToKey() {
		$store = $this->createMock( ZObjectStore::class );
		$store->method( 'fetchZObject' )->willReturn( false );

		$this->assertSame( 'Z8K1', $this->newResolver( $store )->getKeyLabel( 'Z8K1' ) );
	}

	public function testDefinitionIsFetchedOncePerZid() {
		$store = $this->createMock( ZObjectStore::class );
		$store->expects( $this->once() )
			->method( 'fetchZObject' )
			->with( 'Z8' )
			->willReturn( false );

		$resolver = $this->newResolver( $store );
		// Two keys owned by the same ZID must share a single fetch.
		$resolver->getKeyLabel( 'Z8K1' );
		$resolver->getKeyLabel( 'Z8K2' );
	}

	public function testReferenceResolvesToLabelAndUrl() {
		$store = $this->createMock( ZObjectStore::class );
		$store->method( 'fetchZObjectLabel' )->with( 'Z40', 'en' )->willReturn( 'Boolean' );

		$this->assertSame(
			[ 'label' => 'Boolean', 'url' => '/wiki/Z40' ],
			$this->newResolver( $store, $this->titleFactoryFor( 'Z40', '/wiki/Z40' ) )->getReference( 'Z40' )
		);
	}

	public function testReferenceWithoutLabelKeepsANullLabel() {
		$store = $this->createMock( ZObjectStore::class );
		$store->method( 'fetchZObjectLabel' )->willReturn( null );

		$this->assertSame(
			[ 'label' => null, 'url' => '/wiki/Z400' ],
			$this->newResolver( $store, $this->titleFactoryFor( 'Z400', '/wiki/Z400' ) )->getReference( 'Z400' )
		);
	}

	public function testReferenceWithNoValidTitleIsNull() {
		$store = $this->createMock( ZObjectStore::class );
		$store->expects( $this->never() )->method( 'fetchZObjectLabel' );

		$titleFactory = $this->createMock( TitleFactory::class );
		$titleFactory->method( 'newFromText' )->willReturn( null );

		$this->assertNull( $this->newResolver( $store, $titleFactory )->getReference( '<invalid>' ) );
	}

	public function testReferenceIsResolvedOncePerZid() {
		$store = $this->createMock( ZObjectStore::class );
		$store->expects( $this->once() )->method( 'fetchZObjectLabel' )->willReturn( 'Boolean' );

		$resolver = $this->newResolver( $store, $this->titleFactoryFor( 'Z40', '/wiki/Z40' ) );
		$resolver->getReference( 'Z40' );
		$resolver->getReference( 'Z40' );
	}

	public function testLanguageResolvesToNameCodeAndDirection() {
		$store = $this->createMock( ZObjectStore::class );
		$store->method( 'fetchZObjectLabel' )->with( 'Z1005', 'en' )->willReturn( 'Arabic' );

		$this->assertSame(
			[ 'name' => 'Arabic', 'code' => 'ar', 'dir' => 'rtl' ],
			$this->newResolver(
				$store, null, $this->languageFactoryFor( 'rtl' ), $this->langRegistryFor( 'ar' )
			)->getLanguage( 'Z1005' )
		);
	}

	public function testUnknownLanguageDegradesToTheZidAndNoDirection() {
		$store = $this->createMock( ZObjectStore::class );
		$store->method( 'fetchZObjectLabel' )->willReturn( null );

		$error = $this->createMock( ZError::class );
		$error->method( 'getMessage' )->willReturn( 'Language code not found' );
		$langRegistry = $this->createMock( ZLangRegistry::class );
		$langRegistry->method( 'getLanguageCodeFromZid' )
			->willThrowException( new ZErrorException( $error ) );

		$this->assertSame(
			[ 'name' => 'Z9999', 'code' => '', 'dir' => 'auto' ],
			$this->newResolver( $store, null, null, $langRegistry )->getLanguage( 'Z9999' )
		);
	}

	public function testLanguageIsResolvedOncePerZid() {
		$store = $this->createMock( ZObjectStore::class );
		$store->expects( $this->once() )->method( 'fetchZObjectLabel' )->willReturn( 'Arabic' );

		$resolver = $this->newResolver(
			$store, null, $this->languageFactoryFor( 'rtl' ), $this->langRegistryFor( 'ar' )
		);
		$resolver->getLanguage( 'Z1005' );
		$resolver->getLanguage( 'Z1005' );
	}

	private function titleFactoryFor( string $text, string $url ): TitleFactory {
		$title = $this->createMock( Title::class );
		$title->method( 'getLocalURL' )->willReturn( $url );

		$titleFactory = $this->createMock( TitleFactory::class );
		$titleFactory->method( 'newFromText' )->with( $text, NS_MAIN )->willReturn( $title );
		return $titleFactory;
	}

	private function languageFactoryFor( string $dir ): LanguageFactory {
		$language = $this->createMock( Language::class );
		$language->method( 'getDir' )->willReturn( $dir );

		$languageFactory = $this->createMock( LanguageFactory::class );
		$languageFactory->method( 'getLanguage' )->willReturn( $language );
		return $languageFactory;
	}

	private function langRegistryFor( string $code ): ZLangRegistry {
		$langRegistry = $this->createMock( ZLangRegistry::class );
		$langRegistry->method( 'getLanguageCodeFromZid' )->willReturn( $code );
		return $langRegistry;
	}
}
