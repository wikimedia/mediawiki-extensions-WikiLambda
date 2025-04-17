<?php

/**
 * WikiLambda integration test suite for the ZMultiLingualStringSet class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualStringSet;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualStringSet;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualStringSet
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @group Database
 */
class ZMultiLingualStringSetTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testCreation() {
		$this->registerLangs( [ 'es', 'de', 'fr' ] );

		$testObject = new ZMultiLingualStringSet( [] );
		$this->assertTrue( $testObject->isValid() );

		$testObject = new ZMultiLingualStringSet( [
			new ZMonoLingualStringSet(
				new ZReference( self::ZLANG['en'] ),
				[ new ZString( 'Demonstration item' ), new ZString( 'Demonstration second item' ) ]
			),
			new ZMonoLingualStringSet(
				new ZReference( self::ZLANG['es'] ),
				[ new ZString( 'Elemento para demostración' ) ]
			),
			new ZMonoLingualStringSet(
				new ZReference( self::ZLANG['de'] ),
				[ new ZString( 'Gegenstand zur Demonstration' ) ]
			),
			new ZMonoLingualStringSet(
				new ZReference( self::ZLANG['fr'] ),
				[ new ZString( 'Article pour démonstration' ) ]
			)
		] );

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z32', $testObject->getZType() );
		$this->assertArrayHasKey( self::ZLANG['en'], $testObject->getZValue() );
		$this->assertArrayNotHasKey( self::ZLANG['ru'], $testObject->getZValue() );

		$this->assertTrue(
			$testObject->isLanguageProvidedValue( 'en' )
		);
		$this->assertFalse(
			$testObject->isLanguageProvidedValue( 'nonsense' )
		);

		$this->assertSame(
			[ 'Demonstration item', 'Demonstration second item' ],
			$testObject->getAliasesForLanguage( $this->makeLanguage( 'en' ) )
		);
		$this->assertSame(
			[ 'Demonstration item', 'Demonstration second item' ],
			$testObject->getAliasesForLanguageCode( 'en' )
		);

		$this->assertSame(
			[ 'Elemento para demostración' ],
			$testObject->getAliasesForLanguage( $this->makeLanguage( 'es' ) )
		);
		$this->assertSame(
			[ 'Gegenstand zur Demonstration' ],
			$testObject->getAliasesForLanguage( $this->makeLanguage( 'de' ) )
		);
		$this->assertSame(
			[ 'Article pour démonstration' ],
			$testObject->getAliasesForLanguage( $this->makeLanguage( 'fr' ) )
		);

		// Test direct fall-back.
		$this->assertSame(
			[ 'Article pour démonstration' ],
			$testObject->getAliasesForLanguage( $this->makeLanguage( 'atj' ) )
		);

		// Test indirect fall-back.
		$this->assertSame(
			[ 'Gegenstand zur Demonstration' ],
			$testObject->getAliasesForLanguage( $this->makeLanguage( 'dsb' ) )
		);

		// Test non-fall-back.
		$chineseLang = $this->makeLanguage( 'zh' );
		$this->assertSame(
			[],
			$testObject->getAliasesForLanguage( $chineseLang )
		);
	}

	public function testStaticCreation() {
		$testObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MULTILINGUALSTRINGSET,
			ZTypeRegistry::Z_MULTILINGUALSTRINGSET_VALUE => [
				ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
				(object)[
					ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
					ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE => 'Z1002',
					ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE => [
						ZTypeRegistry::Z_STRING,
						'Demonstration item'
					]
				]
			]
		] );
		$this->assertSame( 'Z32', $testObject->getZType() );
	}

	public function testStaticCreation_invalidNoValueKey() {
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MULTILINGUALSTRINGSET
		] );
	}

	public function testModification() {
		$this->registerLangs( [ 'fr', 'es' ] );

		$testObject = new ZMultiLingualStringSet( [] );
		$this->assertTrue( $testObject->isValid() );

		$french = $this->makeLanguage( 'fr' );
		$this->assertFalse( $testObject->isLanguageProvidedValue( 'fr' ) );
		$testMono = new ZMonoLingualStringSet( new ZReference( self::ZLANG['fr'] ), [ new ZString( 'Bonjour' ) ] );
		$testObject->setMonoLingualStringSet( $testMono );
		$this->assertTrue( $testObject->isValid() );
		$this->assertTrue( $testObject->isLanguageProvidedValue( 'fr' ) );
		$this->assertSame(
			[ 'Bonjour' ],
			$testObject->getAliasesForLanguage( $french )
		);

		$testObject->setMonoLingualStringSet( $testMono );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			[ 'Bonjour' ],
			$testObject->getAliasesForLanguage( $french )
		);

		$spanish = $this->makeLanguage( 'es' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			[],
			$testObject->getAliasesForLanguage( $spanish )
		);

		$invalidLang = $this->makeLanguage( 'blargh' );
		$invalidMono = new ZMonoLingualStringSet( new ZReference( 'blargh' ), [ new ZString( 'Invalid item' ) ] );
		$testObject->setMonoLingualStringSet( $invalidMono );
		$this->assertFalse( $testObject->isValid() );
		$this->assertSame(
			[],
			$testObject->getAliasesForLanguage( $invalidLang )
		);
	}

	public function testInvalidCreation_empty() {
		$testObject = new ZMultiLingualStringSet( [] );
		$this->expectException( ZErrorException::class );
		$testObject->setMonoLingualStringSet(
			new ZMonoLingualStringSet( new ZReference( '' ), [ new ZString( 'Test' ) ] )
		);
	}

	public function testInvalidCreation_non_string() {
		$testObject = new ZMultiLingualStringSet( [] );
		$this->expectException( ZErrorException::class );
		$testObject->setMonoLingualStringSet(
			new ZMonoLingualStringSet( new ZReference( 1 ), [ new ZString( 'Test' ) ] )
		);
	}

	public function testPersistentCreation() {
		$this->registerLangs( [ 'fr' ] );

		$english = $this->makeLanguage( 'en' );
		$french = $this->makeLanguage( 'fr' );

		$testObject = new ZObjectContent(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z32",
		"Z32K1": [ "Z31" ]
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [ "Z11" ]
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": [ "Z31" ]
	},
	"Z2K5": {
		"Z1K1": "Z12",
		"Z12K1": [ "Z11" ]
	}
}
EOT
		);

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z32', $testObject->getZType() );
		$this->assertSame( [], $testObject->getZValue() );

		$testObject = new ZObjectContent(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z32",
		"Z32K1": [
			"Z31",
			{
				"Z1K1": "Z31",
				"Z31K1": "Z1002",
				"Z31K2": [ "Z6", "Demonstration item"]
			},
			{
				"Z1K1": "Z31",
				"Z31K1": "Z1004",
				"Z31K2": [ "Z6", "Article pour démonstration"]
			}
		]
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [ "Z11" ]
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": [ "Z31" ]
	},
	"Z2K5": {
		"Z1K1": "Z12",
		"Z12K1": [ "Z11" ]
	}
}
EOT
		);

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z32', $testObject->getZType() );

		$this->assertSame(
			[ 'Demonstration item' ],
			$testObject->getInnerZObject()->getAliasesForLanguage( $english )
		);
		$this->assertSame(
			[ 'Article pour démonstration' ],
			$testObject->getInnerZObject()->getAliasesForLanguage( $french )
		);
	}

	public function testGetSerialized() {
		$this->registerLangs( [ 'fr', 'es' ] );

		$testObject = new ZMultiLingualStringSet( [
			new ZMonoLingualStringSet(
				new ZReference( self::ZLANG['en'] ),
				[ new ZString( 'Demonstration item' ), new ZString( 'Another demonstration item' ) ]
			),
			new ZMonoLingualStringSet(
				new ZReference( self::ZLANG['es'] ),
				[ new ZString( 'Artículo para demostración' ), new ZString( 'Otro artículo para demostración' ) ]
			),
			new ZMonoLingualStringSet(
				new ZReference( self::ZLANG['fr'] ),
				[ new ZString( 'Article pour démonstration' ), new ZString( 'Un autre article pour démonstration' ) ]
			)
		] );

		$expectedCanonical = json_decode(
			<<<EOT
{
	"Z1K1": "Z32",
	"Z32K1": [
		"Z31",
		{
			"Z1K1": "Z31",
			"Z31K1": "Z1002",
			"Z31K2": [
				"Z6",
				"Demonstration item",
				"Another demonstration item"
			]
		},
		{
			"Z1K1": "Z31",
			"Z31K1": "Z1003",
			"Z31K2": [
				"Z6",
				"Artículo para demostración",
				"Otro artículo para demostración"
			]
		},
		{
			"Z1K1": "Z31",
			"Z31K1": "Z1004",
			"Z31K2": [
				"Z6",
				"Article pour démonstration",
				"Un autre article pour démonstration"
			]
		}
	]
}
EOT
		);

		$serializedObjectCanonical = $testObject->getSerialized( $testObject::FORM_CANONICAL );
		$this->assertEquals( $expectedCanonical, $serializedObjectCanonical, 'Canonical serialization' );

		$roundTripped = ZObjectFactory::create( $serializedObjectCanonical );
		$this->assertEquals( $testObject, $roundTripped, 'Round trip through canonical serialization' );

		$serializedObjectDefault = $testObject->getSerialized();
		$this->assertEquals( $expectedCanonical, $serializedObjectDefault, 'Default serialization' );

		$expectedNormal = json_decode(
			<<<EOT
{
	"Z1K1": {
		"Z1K1": "Z9",
		"Z9K1": "Z32"
	},
	"Z32K1": {
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
				"Z9K1": "Z31"
			}
		},
		"K1": {
			"Z1K1": {
				"Z1K1": "Z9",
				"Z9K1": "Z31"
			},
			"Z31K1": {
				"Z1K1": "Z9",
				"Z9K1": "Z1002"
			},
			"Z31K2": {
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
						"Z9K1": "Z6"
					}
				},
				"K1": {
					"Z1K1": "Z6",
					"Z6K1": "Demonstration item"
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
							"Z9K1": "Z6"
						}
					},
					"K1": {
						"Z1K1": "Z6",
						"Z6K1": "Another demonstration item"
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
								"Z9K1": "Z6"
							}
						}
					}
				}
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
					"Z9K1": "Z31"
				}
			},
			"K1": {
				"Z1K1": {
					"Z1K1": "Z9",
					"Z9K1": "Z31"
				},
				"Z31K1": {
					"Z1K1": "Z9",
					"Z9K1": "Z1003"
				},
				"Z31K2": {
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
							"Z9K1": "Z6"
						}
					},
					"K1": {
						"Z1K1": "Z6",
						"Z6K1": "Artículo para demostración"
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
								"Z9K1": "Z6"
							}
						},
						"K1": {
							"Z1K1": "Z6",
							"Z6K1": "Otro artículo para demostración"
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
									"Z9K1": "Z6"
								}
							}
						}
					}
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
						"Z9K1": "Z31"
					}
				},
				"K1": {
					"Z1K1": {
						"Z1K1": "Z9",
						"Z9K1": "Z31"
					},
					"Z31K1": {
						"Z1K1": "Z9",
						"Z9K1": "Z1004"
					},
					"Z31K2": {
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
								"Z9K1": "Z6"
							}
						},
						"K1": {
							"Z1K1": "Z6",
							"Z6K1": "Article pour démonstration"
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
									"Z9K1": "Z6"
								}
							},
							"K1": {
								"Z1K1": "Z6",
								"Z6K1": "Un autre article pour démonstration"
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
										"Z9K1": "Z6"
									}
								}
							}
						}
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
							"Z9K1": "Z31"
						}
					}
				}
			}
		}
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
