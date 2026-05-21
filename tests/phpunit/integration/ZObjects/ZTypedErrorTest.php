<?php

/**
 * WikiLambda integration test suite for the ZTypedError class
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaRepoModeIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedError;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Json\FormatJson;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedError
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @group Database
 */
class ZTypedErrorTest extends WikiLambdaRepoModeIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
	}

	public function testCreate_objectFactory_empty() {
		$genericError = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z502" } }';
		$testObject = ZObjectFactory::create( json_decode( $genericError ) );

		$this->assertInstanceOf( ZTypedError::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( "Z502", $testObject->getErrorType() );
	}

	public function testCreate_objectFactory_twoKeys() {
		$genericError = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z502" },'
			. ' "K1": "value 1",'
			. ' "K2": "value 2" }';
		$testObject = ZObjectFactory::create( json_decode( $genericError ) );

		$this->assertInstanceOf( ZTypedError::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( "Z502", $testObject->getErrorType() );
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $genericError ) ),
			FormatJson::encode( $testObject->getSerialized() )
		);
	}

	public function testGetZType() {
		$genericError = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z502" } }';
		$testObject = ZObjectFactory::create( json_decode( $genericError ) );

		$this->assertSame( 'Z885', $testObject->getZType() );
	}

	public function testCreate_constructor() {
		$functionCallJson = '{ "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z502" }';

		$functionCall = ZObjectFactory::create( json_decode( $functionCallJson ) );
		$testObject = new ZTypedError(
			$functionCall,
			[ new ZString( "value 1" ), new ZString( "value 2" ) ]
		);

		$expectedError = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z502" },'
			. ' "K1": "value 1",'
			. ' "K2": "value 2" }';

		$this->assertInstanceOf( ZTypedError::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( "Z502", $testObject->getErrorType() );
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $expectedError ) ),
			FormatJson::encode( $testObject->getSerialized() )
		);
	}

	public function testGetSerialized() {
		$functionCallJson = '{ "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z502" }';

		$functionCall = ZObjectFactory::create( json_decode( $functionCallJson ) );
		$testObject = new ZTypedError(
			$functionCall,
			[ new ZString( "value 1" ), new ZString( "value 2" ) ]
		);

		$expectedCanonical = json_decode( '{"Z1K1": { "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z502" },'
			. '"K1": "value 1", "K2": "value 2" }' );

		$serializedObjectCanonical = $testObject->getSerialized( $testObject::FORM_CANONICAL );
		$this->assertEquals( $expectedCanonical, $serializedObjectCanonical, 'Canonical serialization' );

		$roundTripped = ZObjectFactory::create( $serializedObjectCanonical );
		$this->assertEquals( $testObject, $roundTripped, 'Round trip through canonical serialization' );

		$this->assertEquals( $expectedCanonical, $testObject->getSerialized(), 'Default serialization' );

		$expectedNormal = json_decode(
			<<<EOT
{
	"Z1K1": {
		"Z1K1": {
			"Z1K1": "Z9",
			"Z9K1": "Z7"
		},
		"Z7K1": {
			"Z1K1": "Z9",
			"Z9K1": "Z885"
		},
		"Z885K1": {
			"Z1K1": "Z9",
			"Z9K1": "Z502"
		}
	},
	"K1": {
		"Z1K1": "Z6",
		"Z6K1": "value 1"
	},
	"K2": {
		"Z1K1": "Z6",
		"Z6K1": "value 2"
	}
}
EOT
		);

		$serializedObjectNormal = $testObject->getSerialized( $testObject::FORM_NORMAL );
		$this->assertEquals( $expectedNormal, $serializedObjectNormal, 'Normal serialization' );

		$roundTripped = ZObjectFactory::create( ZObjectUtils::canonicalize( $serializedObjectNormal ) );
		$this->assertEquals( $testObject, $roundTripped, 'Round trip through normal serialization' );
	}
}
