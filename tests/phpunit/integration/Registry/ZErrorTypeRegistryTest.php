<?php

/**
 * WikiLambda integration test suite for the ZErrorTypeRegistry class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Registry;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Title\Title;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry
 * @covers \MediaWiki\Extension\WikiLambda\Registry\ZObjectRegistry
 * @group Database
 */
class ZErrorTypeRegistryTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testSingleton() {
		$registry = ZErrorTypeRegistry::singleton();
		$this->assertEquals( ZErrorTypeRegistry::class, get_class( $registry ) );
		$this->assertEquals( $registry, ZErrorTypeRegistry::singleton() );
	}

	public function testCacheZErrorType() {
		$builtinErrorType = 'Z501';
		$customErrorType = 'Z450';
		$customErrorEnLabel = $customErrorType . ':en';

		$registry = ZErrorTypeRegistry::singleton();

		$this->runPrivateMethod( $registry, 'register', [ $customErrorEnLabel, 'error type' ] );
		$this->assertTrue( $registry->isZErrorTypeKnown( $customErrorType ) );

		$registry->unregister( 'Z505' );
		$this->assertTrue(
			$registry->isZErrorTypeKnown( $customErrorType ),
			'Unregistering a non-cached error type should not throw errors.'
		);

		$registry->unregister( $builtinErrorType );
		$registry->unregister( $customErrorType );

		$this->assertTrue(
			$registry->isZErrorTypeKnown( $builtinErrorType ),
			'Unregistering a builtin error type should not make it not known'
		);

		$this->assertFalse(
			$registry->isZErrorTypeKnown( $customErrorType ),
			'Unregistering a custom error type should make it not known'
		);
	}

	public function testIsZErrorTypeKnown_typeNotFound() {
		$registry = ZErrorTypeRegistry::singleton();
		$errorType = 'Z450';

		$this->assertFalse(
			$registry->isZErrorTypeKnown( $errorType ),
			"No ZObject with Zid $errorType was found in the database"
		);
	}

	public function testIsZErrorTypeKnown_typeNotValid() {
		$registry = ZErrorTypeRegistry::singleton();
		$invalidErrorType = 'Z6';
		$this->insertZids( [ $invalidErrorType ] );

		$this->assertFalse(
			$registry->isZErrorTypeKnown( $invalidErrorType ),
			"ZObject with Zid $invalidErrorType is not a ZErrorType object"
		);
	}

	public function testIsZErrorTypeKnown_valid() {
		$errorType = 'Z450';
		$errorContent = <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z450" },
	"Z2K2": {
		"Z1K1": "Z50",
		"Z50K1": [
			"Z3",
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z450K1",
				"Z3K3": {
					"Z1K1": "Z12",
					"Z12K1": [
						"Z11",
						{
							"Z1K1": "Z11",
							"Z11K1": "Z1002",
							"Z11K2": "Custom error parameter"
						}
					]
				}
			}
		]
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1002",
				"Z11K2": "Custom error"
			},
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1004",
				"Z11K2": "erreur personnalisée"
			}
		]
	}
}
EOT;

		$registry = ZErrorTypeRegistry::singleton();

		$this->assertFalse(
			$registry->isZErrorTypeKnown( $errorType ),
			"The ununregistered ZErrorType isn't found."
		);

		$this->assertSame(
			"Unknown error $errorType",
			$registry->getZErrorTypeLabel( $errorType ),
			"The unregistered ZErrorType doesn't have a label returned."
		);

		// Ensure that we can insert error types (Z50)
		$this->insertZids( [ 'Z50' ] );
		$title = Title::newFromText( $errorType, NS_MAIN );
		$this->editPage( $title, $errorContent, "Test creation object", NS_MAIN );

		$this->assertFalse(
			$this->runPrivateMethod( $registry, 'isZErrorTypeCached', [ $errorType ] ),
			'The valid ZErrorType Zid is not yet cached.'
		);

		$this->assertTrue(
			$registry->isZErrorTypeKnown( $errorType ),
			'The valid ZErrorType is found in the database and cached.'
		);

		// Register the languages so that the below works.
		$this->registerLangs( [ 'en', 'fr' ] );

		$this->assertSame(
			'Custom error',
			$registry->getZErrorTypeLabel( $errorType ),
			'The valid English getZErrorTypeLabel is returned, when not specifying the language.'
		);

		$this->assertSame(
			'Custom error',
			$registry->getZErrorTypeLabel( $errorType, 'en' ),
			'The valid English getZErrorTypeLabel is returned, when specifying English.'
		);

		$this->assertSame(
			'erreur personnalisée',
			$registry->getZErrorTypeLabel( $errorType, 'fr' ),
			'The valid French getZErrorTypeLabel is returned, when specifying French.'
		);

		$this->assertSame(
			'Custom error',
			$registry->getZErrorTypeLabel( $errorType, 'unknown' ),
			'The valid English getZErrorTypeLabel is returned, when specifying an unknown language.'
		);

		$this->assertTrue(
			$this->runPrivateMethod( $registry, 'isZErrorTypeCached', [ $errorType ] ),
			'The valid ZErrorType Zid is now cached.'
		);

		$registry->unregister( $errorType );
		$this->assertFalse(
			$this->runPrivateMethod( $registry, 'isZErrorTypeCached', [ $errorType ] ),
			'The valid ZErrorType Zid is not cached after unregistering it.'
		);
	}
}
