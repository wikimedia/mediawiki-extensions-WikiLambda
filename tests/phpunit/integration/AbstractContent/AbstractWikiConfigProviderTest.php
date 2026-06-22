<?php
/**
 * WikiLambda integration test suite for AbstractWikiConfigProvider
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiConfigProvider;
use MediaWiki\Registration\ExtensionRegistry;

/**
 * @covers \MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiConfigProvider
 * @group Database
 */
class AbstractWikiConfigProviderTest extends WikiLambdaAbstractClientIntegrationTestCase {

	private function mockProvider( array $items = [] ) {
		$value = (object)[ 'OptedInArticles' => $items ];
		$status = \StatusValue::newGood( $value );

		$mockProvider = $this->createMock(
			\MediaWiki\Extension\CommunityConfiguration\Provider\IConfigurationProvider::class );
		$mockProvider->method( 'loadValidConfiguration' )->willReturn( $status );

		$mockProviderFactory = $this->createMock(
			\MediaWiki\Extension\CommunityConfiguration\Provider\ConfigurationProviderFactory::class );
		$mockProviderFactory->method( 'newProvider' )->willReturn( $mockProvider );

		$this->setService( 'CommunityConfiguration.ProviderFactory', $mockProviderFactory );

		return new AbstractWikiConfigProvider();
	}

	private function makeItem( array $titles, string $qid ): object {
		return (object)[
			'title' => $titles,
			'qid' => $qid
		];
	}

	protected function setUp(): void {
		parent::setUp();

		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			$this->markTestSkipped( 'CommunityConfiguration extension is not loaded' );
		}
	}

	public function testGetOptedInEmpty(): void {
		$provider = $this->mockProvider( [] );
		$this->assertSame( [], $provider->provideOptedIn() );
	}

	public function testGetOptedInSingleArticleNoRedirect(): void {
		$provider = $this->mockProvider( [
			$this->makeItem( [ 'Douglas Adams' ], 'Q42' )
		] );

		$result = $provider->provideOptedIn();

		$this->assertArrayHasKey( 'Douglas Adams', $result );
		$this->assertSame( 'Q42', $result[ 'Douglas Adams' ][ 'qid' ] );
		$this->assertFalse( $result[ 'Douglas Adams' ][ 'redirect' ] );
	}

	public function testGetOptedInWithRedirect(): void {
		$provider = $this->mockProvider( [
			$this->makeItem( [ 'Douglas Adams', 'Douglas Noël Adams' ], 'Q42' )
		] );

		$result = $provider->provideOptedIn();

		$this->assertArrayHasKey( 'Douglas Adams', $result );
		$this->assertFalse( $result[ 'Douglas Adams' ][ 'redirect' ] );

		$this->assertArrayHasKey( 'Douglas Noël Adams', $result );
		$this->assertSame( 'Douglas Adams', $result[ 'Douglas Noël Adams' ][ 'redirect' ] );
		$this->assertSame( 'Q42', $result[ 'Douglas Noël Adams' ][ 'qid' ] );
	}

	public function testGetOptedInMultipleArticles(): void {
		$provider = $this->mockProvider( [
			$this->makeItem( [ 'Douglas Adams' ], 'Q42' ),
			$this->makeItem( [ 'Wikifunctions' ], 'Q104587954' ),
		] );

		$result = $provider->provideOptedIn();

		$this->assertCount( 2, $result );
		$this->assertArrayHasKey( 'Douglas Adams', $result );
		$this->assertArrayHasKey( 'Wikifunctions', $result );
	}

	public function testGetOptedInMalformedItemIsSkipped(): void {
		$provider = $this->mockProvider( [
			$this->makeItem( [], 'Q42' ),
			$this->makeItem( [ 'Wikifunctions' ], 'Q104587954' ),
		] );

		$result = $provider->provideOptedIn();

		$this->assertCount( 1, $result );
		$this->assertArrayHasKey( 'Wikifunctions', $result );
		$this->assertArrayNotHasKey( '', $result );
	}
}
