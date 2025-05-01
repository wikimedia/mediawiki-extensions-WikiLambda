<?php

/**
 * WikiLambda integration test suite for the ZKey class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZKey;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZKey
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @group Database
 */
class ZKeyTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testCreation_constructors() {
		$testRef = new ZReference( 'Z6' );
		$testKey = new ZString( 'Z6K1' );
		$testString = new ZMonoLingualString(
			new ZReference( self::ZLANG['en'] ),
			new ZString( 'Demonstration item' )
		);
		$multipleLabelSet = new ZMultiLingualString( [ $testString ] );
		$testObject = new ZKey( $testRef, $testKey, $multipleLabelSet );

		$this->assertSame( 'Z3', $testObject->getZType() );
		$this->assertSame( 'Z6', $testObject->getKeyType() );
		$this->assertSame( 'Z6K1', $testObject->getKeyId() );
		$this->assertSame( $testString->getString(), $testObject->getKeyLabel()->getStringForLanguageCode( 'en' ) );
		$this->assertArrayEquals( [ $testKey, $testRef, $multipleLabelSet ], $testObject->getZValue() );
		$this->assertTrue( $testObject->isValid() );
	}

	public function testCreation_factory() {
		$stringZObject = <<<EOT
{
	"Z1K1": "Z3",
	"Z3K1": "Z6",
	"Z3K2": "Z6K1",
	"Z3K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1002",
				"Z11K2": "Demonstration item"
			}
		]
	}
}
EOT;
		$testObject = ZObjectFactory::create( json_decode( $stringZObject ) );

		$this->assertSame( 'Z3', $testObject->getZType() );
		$this->assertSame( 'Z6', $testObject->getKeyType() );
		$this->assertSame( 'Z6K1', $testObject->getKeyId() );
		$this->assertFalse( $testObject->getIsIdentity() );
		$this->assertTrue( $testObject->isValid() );
	}

	public function testCreation_factory_withIsIdentityReference() {
		$stringZObject = <<<EOT
{
	"Z1K1": "Z3",
	"Z3K1": "Z6",
	"Z3K2": "Z6K1",
	"Z3K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1002",
				"Z11K2": "Demonstration item"
			}
		]
	},
	"Z3K4": "Z41"
}
EOT;
		$testObject = ZObjectFactory::create( json_decode( $stringZObject ) );

		$this->assertSame( 'Z3', $testObject->getZType() );
		$this->assertSame( 'Z6', $testObject->getKeyType() );
		$this->assertSame( 'Z6K1', $testObject->getKeyId() );
		$this->assertTrue( $testObject->getIsIdentity() );
		$this->assertTrue( $testObject->isValid() );
	}

	public function testCreation_factory_withIsIdentityLiteral() {
		// Ensure that Z40/Boolean is available
		$this->insertZids( [ 'Z40' ] );

		$stringZObject = <<<EOT
{
	"Z1K1": "Z3",
	"Z3K1": "Z6",
	"Z3K2": "Z6K1",
	"Z3K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1002",
				"Z11K2": "Demonstration item"
			}
		]
	},
	"Z3K4": {
		"Z1K1": "Z40",
		"Z40K1": "Z42"
	}
}
EOT;
		$testObject = ZObjectFactory::create( json_decode( $stringZObject ) );

		$this->assertSame( 'Z3', $testObject->getZType() );
		$this->assertSame( 'Z6', $testObject->getKeyType() );
		$this->assertSame( 'Z6K1', $testObject->getKeyId() );
		$this->assertFalse( $testObject->getIsIdentity() );
		$this->assertTrue( $testObject->isValid() );
	}

	public function testPersistentCreation_disallowed() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent( <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z3",
		"Z3K1": "Z6",
		"Z3K2": "Z6K1",
		"Z3K3": {
			"Z1K1": "Z12",
			"Z12K1": [
				"Z11",
				{
					"Z1K1": "Z11",
					"Z11K1": "Z1002",
					"Z11K2": "Key label"
				}
			]
		}
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1002",
				"Z11K2": "Key object label"
			}
		]
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": [ "Z31" ]
	}
}
EOT
		);
		$this->assertFalse( $testObject->isValid() );
		$this->assertStringContainsString(
			ZErrorTypeRegistry::Z_ERROR_DISALLOWED_ROOT_ZOBJECT,
			(string)$testObject->getErrors()
		);
	}

	/**
	 * @dataProvider provideIsValid
	 */
	public function testIsValid( $inputType, $inputIdentity, $inputLabel, $inputIsIdentity, $inputLangs, $expected ) {
		if ( $inputLangs ) {
			$this->registerLangs( $inputLangs );
		}
		$testObject = new ZKey( $inputType, $inputIdentity, $inputLabel, $inputIsIdentity );
		$this->assertSame( $expected, $testObject->isValid() );
	}

	public static function provideIsValid() {
		$testRef = new ZReference( 'Z6' );
		$testId = new ZString( 'Z6K1' );
		$testString1 = new ZMonoLingualString(
			new ZReference( self::ZLANG['en'] ), new ZString( 'Demonstration item' )
		);
		$testString2 = new ZMonoLingualString(
			new ZReference( self::ZLANG['fr'] ), new ZString( 'Demonstration item' )
		);
		$emptyLabelSet = new ZMultiLingualString( [] );
		$multipleLabelSet = new ZMultiLingualString( [
			new ZMonoLingualString(
				new ZReference( self::ZLANG['en'] ), new ZString( 'Demonstration item' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['it'] ), new ZString( 'oggetto per dimostrazione' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['de'] ), new ZString( 'Gegenstand zur Demonstration' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['fr'] ), new ZString( 'article pour démonstration' )
			)
		] );

		$trueRef = new ZReference( ZTypeRegistry::Z_BOOLEAN_TRUE );
		$falseRef = new ZReference( ZTypeRegistry::Z_BOOLEAN_FALSE );
		$trueLiteral = new ZObject( new ZReference( ZTypeRegistry::Z_BOOLEAN ), [
			'Z40K1' => new ZReference( ZTypeRegistry::Z_BOOLEAN_TRUE )
		] );

		return [
			'wholly null' => [ null, null, null, null, null, false ],

			'null type' => [ null, $testId, [], null, null, false ],
			'unknown type' => [ 'Z0', $testId, [], null, null, false ],
			'invalid type' => [ 'Test value?', $testId, [], null, null, false ],
			'incorrect type' => [ 'Z6', $testId, [], null, null, false ],
			'type reference to non-ZObject' => [ new ZReference( 'Q1' ), $testId, [ $testString1 ], null, null, false ],

			'null identity' => [ $testRef, null, [], null, null, false ],
			'invalid identity' => [ $testRef, 'Test value!', [], null, null, false ],
			'local identity' => [ $testRef, 'K1', [], null, null, false ],
			'unknown identity' => [ $testRef, 'Z0K1', [], null, null, false ],
			'idendity reference to non-ZObject' => [
				$testRef, new ZString( 'Q1K1' ), [ $testString1 ], null, null, false ],

			'null label' => [ $testRef, $testId, null, null, null, false ],
			'empty label' => [ $testRef, $testId, [], null, null, true ],
			'invalid label' => [ $testRef, $testId, [ 'Test value:' ], null, null, false ],
			'singleton label' => [ $testRef, $testId, [ $testString1 ], null, null, true ],
			'multiple label' => [ $testRef, $testId, [ $testString1, $testString2 ], null, [ 'fr' ], true ],
			'non-array labels' => [ $testRef, $testId, $testString1, null, null, false ],
			'non-valid ZMonoLingualString label' => [ $testRef, $testId, [ new ZMonoLingualString(
				new ZString( 'Language' ),
				new ZString( 'Demonstration item' )
			) ], null, null, false ],

			'singleton labelset' => [ $testRef, $testId, $emptyLabelSet, null, null, true ],
			'multiple labelset' => [ $testRef, $testId, $multipleLabelSet, null, [ 'it', 'de', 'fr' ], true ],

			'invalid is identity (string)' => [ $testRef, $testId, [], 'true', null, false ],
			'invalid is identity (bool)' => [ $testRef, $testId, [], true, null, false ],
			'invalid is identity Ref(String)' => [ $testRef, $testId, [], $testRef, null, false ],
			'valid is identity Ref(true)' => [ $testRef, $testId, [], $trueRef, null, true ],
			'valid is identity Ref(false)' => [ $testRef, $testId, [], $falseRef, null, true ],
			'valid is identity Literal(true)' => [ $testRef, $testId, [], $trueLiteral, null, true ],
		];
	}

	/**
	 * @dataProvider provideGetSerialized
	 */
	public function testGetSerialized(
		$inputType, $inputIdentity, $inputLabel, $inputLangs, $canonicalString, $normalString
	) {
		if ( $inputLangs ) {
			$this->registerLangs( $inputLangs );
		}

		$expectedCanonical = json_decode( $canonicalString );
		$expectedNormal = json_decode( $normalString );
		$testObject = new ZKey( $inputType, $inputIdentity, $inputLabel );

		$serializedObjectCanonical = $testObject->getSerialized( $testObject::FORM_CANONICAL );
		$this->assertEquals( $expectedCanonical, $serializedObjectCanonical, 'Canonical serialization' );

		$roundTripped = ZObjectFactory::create( $serializedObjectCanonical );
		$this->assertEquals( $testObject, $roundTripped, 'Round trip through canonical serialization' );

		$serializedObjectDefault = $testObject->getSerialized();
		$this->assertEquals( $expectedCanonical, $serializedObjectDefault, 'Default serialization' );

		$serializedObjectNormal = $testObject->getSerialized( $testObject::FORM_NORMAL );
		$this->assertEquals( $expectedNormal, $serializedObjectNormal, 'Normal serialization' );

		$roundTripped = ZObjectFactory::create( ZObjectUtils::canonicalize( $serializedObjectNormal ) );
		$this->assertEquals( $testObject, $roundTripped, 'Round trip through normal serialization' );
	}

	public static function provideGetSerialized() {
		$testRef = new ZReference( 'Z6' );
		$testId = new ZString( 'Z6K1' );
		$emptyLabelSet = new ZMultiLingualString( [] );
		$multipleLabelSet = new ZMultiLingualString( [
			new ZMonoLingualString(
				new ZReference( self::ZLANG['en'] ), new ZString( 'Demonstration item' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['it'] ), new ZString( 'oggetto per dimostrazione' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['de'] ), new ZString( 'Gegenstand zur Demonstration' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['fr'] ), new ZString( 'article pour démonstration' )
			)
		] );

		return [
			'empty labelset' => [ $testRef, $testId, $emptyLabelSet, null,
			<<<EOT
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z6K1",
				"Z3K3": {
					"Z1K1": "Z12",
					"Z12K1": ["Z11"]
				}
			}
			EOT,
			<<<EOT
			{
				"Z1K1": {
					"Z1K1": "Z9",
					"Z9K1": "Z3"
				},
				"Z3K1": {
					"Z1K1": "Z9",
					"Z9K1": "Z6"
				},
				"Z3K2": {
					"Z1K1": "Z6",
					"Z6K1": "Z6K1"
				},
				"Z3K3": {
					"Z1K1": {
						"Z1K1": "Z9",
						"Z9K1": "Z12"
					},
					"Z12K1": {
						"Z1K1": {
							"Z1K1": {
								"Z1K1": "Z9",
								"Z9K1": "Z7"
							},
							"Z7K1": {
								"Z1K1": "Z9",
								"Z9K1": "Z881"
							},
							"Z881K1": {
								"Z1K1": "Z9",
								"Z9K1": "Z11"
							}
						}
					}
				}
			}
			EOT ],
			'multiple labelset' => [ $testRef, $testId, $multipleLabelSet, [ 'it', 'de', 'fr' ],
			<<<EOT
			{
				"Z1K1": "Z3",
				"Z3K1": "Z6",
				"Z3K2": "Z6K1",
				"Z3K3": {
					"Z1K1": "Z12",
					"Z12K1": ["Z11", {
						"Z1K1": "Z11",
						"Z11K1": "Z1002",
						"Z11K2": "Demonstration item"
					}, {
						"Z1K1": "Z11",
						"Z11K1": "Z1787",
						"Z11K2": "oggetto per dimostrazione"
					}, {
						"Z1K1": "Z11",
						"Z11K1": "Z1430",
						"Z11K2": "Gegenstand zur Demonstration"
					}, {
						"Z1K1": "Z11",
						"Z11K1": "Z1004",
						"Z11K2": "article pour démonstration"
					}]
				}
			}
			EOT,
			<<<EOT
			{
				"Z1K1": {
					"Z1K1": "Z9",
					"Z9K1": "Z3"
				},
				"Z3K1": {
					"Z1K1": "Z9",
					"Z9K1": "Z6"
				},
				"Z3K2": {
					"Z1K1": "Z6",
					"Z6K1": "Z6K1"
				},
				"Z3K3": {
					"Z1K1": {
						"Z1K1": "Z9",
						"Z9K1": "Z12"
					},
					"Z12K1": {
						"Z1K1": {
							"Z1K1": {
								"Z1K1": "Z9",
								"Z9K1": "Z7"
							},
							"Z7K1": {
								"Z1K1": "Z9",
								"Z9K1": "Z881"
							},
							"Z881K1": {
								"Z1K1": "Z9",
								"Z9K1": "Z11"
							}
						},
						"K1": {
							"Z1K1": {
								"Z1K1": "Z9",
								"Z9K1": "Z11"
							},
							"Z11K1": {
								"Z1K1": "Z9",
								"Z9K1": "Z1002"
							},
							"Z11K2": {
								"Z1K1": "Z6",
								"Z6K1": "Demonstration item"
							}
						},
						"K2": {
							"Z1K1": {
								"Z1K1": {
									"Z1K1": "Z9",
									"Z9K1": "Z7"
								},
								"Z7K1": {
									"Z1K1": "Z9",
									"Z9K1": "Z881"
								},
								"Z881K1": {
									"Z1K1": "Z9",
									"Z9K1": "Z11"
								}
							},
							"K1": {
								"Z1K1": {
									"Z1K1": "Z9",
									"Z9K1": "Z11"
								},
								"Z11K1": {
									"Z1K1": "Z9",
									"Z9K1": "Z1787"
								},
								"Z11K2": {
									"Z1K1": "Z6",
									"Z6K1": "oggetto per dimostrazione"
								}
							},
							"K2": {
								"Z1K1": {
									"Z1K1": {
										"Z1K1": "Z9",
										"Z9K1": "Z7"
									},
									"Z7K1": {
										"Z1K1": "Z9",
										"Z9K1": "Z881"
									},
									"Z881K1": {
										"Z1K1": "Z9",
										"Z9K1": "Z11"
									}
								},
								"K1": {
									"Z1K1": {
										"Z1K1": "Z9",
										"Z9K1": "Z11"
									},
									"Z11K1": {
										"Z1K1": "Z9",
										"Z9K1": "Z1430"
									},
									"Z11K2": {
										"Z1K1": "Z6",
										"Z6K1": "Gegenstand zur Demonstration"
									}
								},
								"K2": {
									"Z1K1": {
										"Z1K1": {
											"Z1K1": "Z9",
											"Z9K1": "Z7"
										},
										"Z7K1": {
											"Z1K1": "Z9",
											"Z9K1": "Z881"
										},
										"Z881K1": {
											"Z1K1": "Z9",
											"Z9K1": "Z11"
										}
									},
									"K1": {
										"Z1K1": {
											"Z1K1": "Z9",
											"Z9K1": "Z11"
										},
										"Z11K1": {
											"Z1K1": "Z9",
											"Z9K1": "Z1004"
										},
										"Z11K2": {
											"Z1K1": "Z6",
											"Z6K1": "article pour démonstration"
										}
									},
									"K2": {
										"Z1K1": {
											"Z1K1": {
												"Z1K1": "Z9",
												"Z9K1": "Z7"
											},
											"Z7K1": {
												"Z1K1": "Z9",
												"Z9K1": "Z881"
											},
											"Z881K1": {
												"Z1K1": "Z9",
												"Z9K1": "Z11"
											}
										}
									}
								}
							}
						}
					}
				}
			}
			EOT ],
		];
	}
}
