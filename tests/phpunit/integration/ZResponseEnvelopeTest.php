<?php

/**
 * WikiLambda integration test suite for the ZResponseEnvelope class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZResponseEnvelope
 */
class ZResponseEnvelopeTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getDefinition
	 * @covers ::getZType
	 * @covers ::getZValue
	 * @covers ::hasErrors
	 * @covers ::isValid
	 */
	public function testCreation_constructor_working() {
		$testResponse = new ZString( 'Hello!' );

		$testObject = new ZResponseEnvelope( $testResponse, null );

		$this->assertSame( 'Z22', $testObject->getZType() );
		$this->assertTrue( $testObject instanceof ZResponseEnvelope );
		$this->assertTrue( $testObject->isValid() );
		$this->assertFalse( $testObject->hasErrors() );
		$this->assertSame( $testResponse->getZValue(), $testObject->getZValue()->getZValue() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getDefinition
	 * @covers ::getErrors
	 * @covers ::getZMetadata
	 * @covers ::getZType
	 * @covers ::hasErrors
	 * @covers ::isValid
	 */
	public function testCreation_constructor_error() {
		$testError = new ZError( 'Z507', new ZString( 'error message' ) );
		$testObject = new ZResponseEnvelope( null, $testError );

		$this->assertSame( 'Z22', $testObject->getZType() );
		$this->assertTrue( $testObject instanceof ZResponseEnvelope );
		$this->assertTrue( $testObject->isValid() );
		$this->assertTrue( $testObject->hasErrors() );

		// Note that this will be a ZMap in future.
		$metadata = $testObject->getZMetadata();
		$this->assertSame( $metadata->getZErrorType(), $testError->getZErrorType() );

		$error = $testObject->getErrors();
		$this->assertSame( $error->getZErrorType(), $testError->getZErrorType() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getDefinition
	 * @covers ::getZType
	 * @covers ::getZValue
	 * @covers ::hasErrors
	 * @covers ::isValid
	 */
	public function testCreation_factory_working() {
		$stringZObject = <<<EOT
{
	"Z1K1": "Z22",
	"Z22K1": { "Z1K1": "Z6", "Z6K1": "Hello!" },
	"Z22K2": { "Z1K1": "Z9", "Z9K1": "Z24" }
}
EOT;
		$testObject = ZObjectFactory::create( json_decode( $stringZObject ) );

		$this->assertSame( 'Z22', $testObject->getZType() );
		$this->assertTrue( $testObject instanceof ZResponseEnvelope );
		$this->assertTrue( $testObject->isValid() );
		$this->assertFalse( $testObject->hasErrors() );
		$this->assertSame( 'Hello!', $testObject->getZValue()->getZValue() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getDefinition
	 * @covers ::getErrors
	 * @covers ::getZMetadata
	 * @covers ::getZType
	 * @covers ::hasErrors
	 * @covers ::isValid
	 */
	public function testCreation_factory_errors() {
		$stringZObject = <<<EOT
{
	"Z1K1": "Z22",
	"Z22K1": { "Z1K1": "Z9", "Z9K1": "Z24" },
	"Z22K2": {
		"Z1K1": "Z5",
		"Z5K1": "Z507",
		"Z5K2": { "Z1K1": "Z6", "Z6K1": "error message" }
	}
}
EOT;

		$testObject = ZObjectFactory::create( json_decode( $stringZObject ) );

		$this->assertSame( 'Z22', $testObject->getZType() );
		$this->assertTrue( $testObject instanceof ZResponseEnvelope );
		$this->assertTrue( $testObject->isValid() );
		$this->assertTrue( $testObject->hasErrors() );

		$error = $testObject->getErrors();
		$this->assertSame( '"Z507"', $error->getZErrorType() );
	}
}
