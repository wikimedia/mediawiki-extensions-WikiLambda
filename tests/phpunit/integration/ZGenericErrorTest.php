<?php

/**
 * WikiLambda integration test suite for the ZGenericError class
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use FormatJson;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZGenericError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZGenericError
 * @group Database
 */
class ZGenericErrorTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getErrorType
	 */
	public function testCreate_objectFactory_empty() {
		$genericError = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z502" } }';
		$testObject = ZObjectFactory::create( json_decode( $genericError ) );

		$this->assertInstanceOf( ZGenericError::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( "Z502", $testObject->getErrorType() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory::create
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getErrorType
	 */
	public function testCreate_objectFactory_twoKeys() {
		$genericError = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z502" },'
			. ' "K1": "value 1",'
			. ' "K2": "value 2" }';
		$testObject = ZObjectFactory::create( json_decode( $genericError ) );

		$this->assertInstanceOf( ZGenericError::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( "Z502", $testObject->getErrorType() );
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $genericError ) ),
			FormatJson::encode( $testObject->getSerialized() )
		);
	}

	/**
	 * @covers ::getZType
	 * @covers ::getDefinition
	 * @covers ::isBuiltin
	 */
	public function testGetZType() {
		$genericError = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z502" } }';
		$testObject = ZObjectFactory::create( json_decode( $genericError ) );

		$this->assertSame( 'Z885', $testObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getErrorType
	 */
	public function testCreate_constructor() {
		$functionCallJson = '{ "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z502" }';

		$functionCall = ZObjectFactory::create( json_decode( $functionCallJson ) );
		$testObject = new ZGenericError(
			$functionCall,
			[ new ZString( "value 1" ), new ZString( "value 2" ) ]
		);

		$expectedError = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z885", "Z885K1": "Z502" },'
			. ' "K1": "value 1",'
			. ' "K2": "value 2" }';

		$this->assertInstanceOf( ZGenericError::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( "Z502", $testObject->getErrorType() );
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( $expectedError ) ),
			FormatJson::encode( $testObject->getSerialized() )
		);
	}

	/**
	 * TODO (T309798): This is now broken because Z882 is built-in. Changing this to Z885 makes
	 * it pass, but that's also built-in, and this test doesn't justify its existence or raise
	 * code coverage(?), so leaving it as `@group Broken` for now.
	 *
	 * @covers ::__construct
	 * @covers ::isValid
	 * @covers ::getErrorType
	 * @group Broken
	 */
	public function testCreate_nobuiltin() {
		$this->insertZids( [ 'Z17', 'Z882' ] );
		$genericError = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z882", "Z882K1": "Z6", "Z882K2": "Z9" },'
			. ' "K1": "string value",'
			. ' "K2": "Z111" }';
		$testObject = ZObjectFactory::create( json_decode( $genericError ) );
		$this->assertTrue( $testObject->isValid() );
	}

}
