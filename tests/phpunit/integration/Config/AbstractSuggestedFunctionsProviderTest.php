<?php

/**
 * WikiLambda integration test for the AbstractWikiSuggestedWikifunctions
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
class AbstractSuggestedFunctionsProviderTest extends MediaWikiIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		if ( !ExtensionRegistry::getInstance()->isLoaded( 'CommunityConfiguration' ) ) {
			$this->markTestSkipped( 'CommunityConfiguration extension is not loaded' );
		}
	}

	public function testProviderIsRegistered(): void {
		$factory = $this->getServiceContainer()->getService( 'CommunityConfiguration.ProviderFactory' );
		$provider = $factory->newProvider( 'AbstractWikiSuggestedWikifunctions' );
		$this->assertNotNull( $provider );
		$this->assertSame( 'AbstractWikiSuggestedWikifunctions', $provider->getId() );
	}

	public function testDefaultValueWhenWikipageMissing(): void {
		$factory = $this->getServiceContainer()->getService( 'CommunityConfiguration.ProviderFactory' );
		$provider = $factory->newProvider( 'AbstractWikiSuggestedWikifunctions' );

		$status = $provider->loadValidConfiguration();
		$this->assertTrue(
			$status->isOK(),
			'loadValidConfiguration on an empty wiki should succeed (got: ' . $status . ')'
		);
		$value = $status->getValue();
		$this->assertObjectHasProperty( 'SuggestedFunctions', $value );
		$this->assertSame(
			[ 'Z31465', 'Z32123', 'Z31331', 'Z31921', 'Z31870' ],
			array_values( (array)$value->SuggestedFunctions ),
			'Schema DEFAULT should expose the live abstract.wikipedia.org seed list '
			. 'when the CC wikipage does not yet exist'
		);
	}
}
