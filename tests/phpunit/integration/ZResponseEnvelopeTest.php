<?php

/**
 * WikiLambda integration test suite for the ZResponseEnvelope class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
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

		$this->assertSame( ZTypeRegistry::Z_RESPONSEENVELOPE, $testObject->getZType() );
		$this->assertTrue( $testObject instanceof ZResponseEnvelope );
		$this->assertTrue( $testObject->isValid() );
		$this->assertFalse( $testObject->hasErrors() );
		$this->assertSame( $testResponse->getZValue(), $testObject->getZValue()->getZValue() );
		$this->assertSame( ZTypeRegistry::Z_UNIT, $testObject->getZMetadata()->{ ZTypeRegistry::Z_OBJECT_TYPE } );
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

		$this->assertSame( ZTypeRegistry::Z_RESPONSEENVELOPE, $testObject->getZType() );
		$this->assertTrue( $testObject instanceof ZResponseEnvelope );
		$this->assertTrue( $testObject->isValid() );
		$this->assertTrue( $testObject->hasErrors() );
		$this->assertSame( ZTypeRegistry::Z_UNIT, $testObject->getZValue()->{ ZTypeRegistry::Z_OBJECT_TYPE } );

		// Note that this will be a ZMap in future.
		$metadata = $testObject->getZMetadata();
		$this->assertSame( $metadata->getZErrorType(), $testError->getZErrorType() );

		$error = $testObject->getErrors();
		$this->assertTrue( $error instanceof ZError );
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

		$this->assertSame( ZTypeRegistry::Z_RESPONSEENVELOPE, $testObject->getZType() );
		$this->assertTrue( $testObject instanceof ZResponseEnvelope );
		$this->assertTrue( $testObject->isValid() );
		$this->assertFalse( $testObject->hasErrors() );
		$this->assertSame( 'Hello!', $testObject->getZValue()->getZValue() );
		$this->assertTrue( $testObject->getZMetadata() instanceof ZReference );
		$this->assertSame( ZTypeRegistry::Z_VOID, $testObject->getZMetadata()->getZValue() );
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

		$this->assertSame( ZTypeRegistry::Z_RESPONSEENVELOPE, $testObject->getZType() );
		$this->assertTrue( $testObject instanceof ZResponseEnvelope );
		$this->assertTrue( $testObject->isValid() );
		$this->assertTrue( $testObject->hasErrors() );
		$this->assertTrue( $testObject->getZValue() instanceof ZReference );
		$this->assertSame( ZTypeRegistry::Z_VOID, $testObject->getZValue()->getZValue() );

		$error = $testObject->getErrors();
		$this->assertTrue( $error instanceof ZError );
		$this->assertSame( '"Z507"', $error->getZErrorType() );
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
	public function testCreation_factory_mapped_errors() {
		$stringZObject = <<<EOT
{
	"Z1K1": "Z22",
	"Z22K1": "Z24",
	"Z22K2": {
		"K1": {
			"K1": {
				"Z882K1": "errors",
				"Z882K2": {
					"Z1K1": "Z5",
					"Z5K1": "Z507",
					"Z5K2": "Executor returned an empty response."
				},
				"Z1K1": {
					"Z1K1": "Z7",
					"Z7K1": "Z882",
					"Z882K1": "Z6",
					"Z882K2": "Z1"
				}
			},
			"K2": {
				"K1": {
					"Z882K1": "startTime",
					"Z882K2": "2022-05-24T20:16:39.688Z",
					"Z1K1": {
						"Z1K1": "Z7",
						"Z7K1": "Z882",
						"Z882K1": "Z6",
						"Z882K2": "Z1"
					}
				},
				"K2": {
					"K1": {
						"Z882K1": "endTime",
						"Z882K2": "2022-05-24T20:16:39.757Z",
						"Z1K1": {
							"Z1K1": "Z7",
							"Z7K1": "Z882",
							"Z882K1": "Z6",
							"Z882K2": "Z1"
						}
					},
					"K2": {
						"K1": {
							"Z882K1": "duration",
							"Z882K2": "69ms",
							"Z1K1": {
								"Z1K1": "Z7",
								"Z7K1": "Z882",
								"Z882K1": "Z6",
								"Z882K2": "Z1"
							}
						},
						"K2": {
							"Z1K1": {
								"Z1K1": "Z7",
								"Z7K1": "Z881",
								"Z881K1": {
									"Z1K1": "Z7",
									"Z7K1": "Z882",
									"Z882K1": "Z6",
									"Z882K2": "Z1"
								}
							}
						},
						"Z1K1": {
							"Z1K1": "Z7",
							"Z7K1": "Z881",
							"Z881K1": {
								"Z1K1": "Z7",
								"Z7K1": "Z882",
								"Z882K1": "Z6",
								"Z882K2": "Z1"
							}
						}
					},
					"Z1K1": {
						"Z1K1": "Z7",
						"Z7K1": "Z881",
						"Z881K1": {
							"Z1K1": "Z7",
							"Z7K1": "Z882",
							"Z882K1": "Z6",
							"Z882K2": "Z1"
						}
					}
				},
				"Z1K1": {
					"Z1K1": "Z7",
					"Z7K1": "Z881",
					"Z881K1": {
						"Z1K1": "Z7",
						"Z7K1": "Z882",
						"Z882K1": "Z6",
						"Z882K2": "Z1"
					}
				}
			},
			"Z1K1": {
				"Z1K1": "Z7",
				"Z7K1": "Z881",
				"Z881K1": {
					"Z1K1": "Z7",
					"Z7K1": "Z882",
					"Z882K1": "Z6",
					"Z882K2": "Z1"
				}
			}
		},
		"Z1K1": {
			"Z1K1": "Z7",
			"Z7K1": "Z883",
			"Z883K1": "Z6",
			"Z883K2": "Z1"
		}
	}
}
EOT;

		$testObject = ZObjectFactory::create( json_decode( $stringZObject ) );

		$this->assertSame( 'Z22', $testObject->getZType() );
		$this->assertTrue( $testObject instanceof ZResponseEnvelope );
		$this->assertTrue( $testObject->isValid() );
		$this->assertTrue( $testObject->hasErrors() );

		$error = $testObject->getErrors();
		$this->assertTrue( $error instanceof ZError );
		$this->assertSame( '"Z507"', $error->getZErrorType() );
	}
}
