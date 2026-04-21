<?php

/**
 * WikiLambda integration test for the WikifunctionsSuggestions
 * CommunityConfiguration provider (T394410).
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
class SuggestedFunctionsProviderTest extends MediaWikiIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			$this->markTestSkipped( 'CommunityConfiguration extension is not loaded' );
		}
	}

	public function testProviderIsRegistered(): void {
		$factory = $this->getServiceContainer()->getService( 'CommunityConfiguration.ProviderFactory' );
		$provider = $factory->newProvider( 'WikifunctionsSuggestions' );
		$this->assertNotNull( $provider );
		$this->assertSame( 'WikifunctionsSuggestions', $provider->getId() );
	}

	public function testDefaultValueWhenWikipageMissing(): void {
		$factory = $this->getServiceContainer()->getService( 'CommunityConfiguration.ProviderFactory' );
		$provider = $factory->newProvider( 'WikifunctionsSuggestions' );

		$status = $provider->loadValidConfiguration();
		$this->assertTrue(
			$status->isOK(),
			'loadValidConfiguration on an empty wiki should succeed (got: ' . $status . ')'
		);
		$value = $status->getValue();
		$this->assertObjectHasProperty( 'SuggestedFunctions', $value );
		$this->assertSame(
			[ 'Z20756', 'Z18428' ],
			array_values( (array)$value->SuggestedFunctions ),
			'Default ZID list should be exposed when the CC wikipage does not exist'
		);
	}
}
