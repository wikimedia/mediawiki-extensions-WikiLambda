<?php

/**
 * WikiLambda integration test for the AbstractWikiOptedInArticles
 * CommunityConfiguration provider.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Config;

use MediaWiki\Registration\ExtensionRegistry;
use MediaWikiIntegrationTestCase;

/**
 * @group Database
 * @group WikiLambdaIntegration
 *
 * @coversNothing
 */
class AbstractWikiOptedInArticlesSchemaTest extends MediaWikiIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			$this->markTestSkipped( 'CommunityConfiguration extension is not loaded' );
		}
	}

	public function testProviderIsRegistered(): void {
		$factory = $this->getServiceContainer()->getService( 'CommunityConfiguration.ProviderFactory' );
		$provider = $factory->newProvider( 'AbstractWikiOptedInArticles' );
		$this->assertNotNull( $provider );
		$this->assertSame( 'AbstractWikiOptedInArticles', $provider->getId() );
	}

	public function testDefaultValueWhenWikipageMissing(): void {
		$factory = $this->getServiceContainer()->getService( 'CommunityConfiguration.ProviderFactory' );
		$provider = $factory->newProvider( 'AbstractWikiOptedInArticles' );

		$status = $provider->loadValidConfiguration();
		$this->assertTrue(
			$status->isOK(),
			'loadValidConfiguration on an empty wiki should succeed (got: ' . $status . ')'
		);
		$value = $status->getValue();
		$this->assertObjectHasProperty( 'OptedInArticles', $value );
		$this->assertSame( [], array_values( $value->OptedInArticles ), 'Schema DEFAULT should be an empty list' );
	}
}
