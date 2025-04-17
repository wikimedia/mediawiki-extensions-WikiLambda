<?php

/**
 * WikiLambda integration test suite for the ZMultiLingualString class
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
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\StringForLanguageBuilder
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @group Database
 */
class ZMultiLingualStringTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testCreation() {
		$this->registerLangs( [ 'es', 'de', 'fr' ] );

		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$testObject = new ZMultiLingualString( [
			new ZMonoLingualString(
				new ZReference( self::ZLANG['en'] ), new ZString( 'Demonstration item' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['es'] ), new ZString( 'Elemento para demostración' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['de'] ), new ZString( 'Gegenstand zur Demonstration' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['fr'] ), new ZString( 'Article pour démonstration' )
			),
		] );

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z12', $testObject->getZType() );
		$this->assertArrayHasKey( self::ZLANG['en'], $testObject->getZValue() );
		$this->assertArrayNotHasKey( self::ZLANG['ru'], $testObject->getZValue() );
		$this->assertArrayEquals(
			[
				self::ZLANG['en'] => 'Demonstration item',
				self::ZLANG['es'] => 'Elemento para demostración',
				self::ZLANG['de'] => 'Gegenstand zur Demonstration',
				self::ZLANG['fr'] => 'Article pour démonstration'
			],
			$testObject->getValueAsList()
		);

		$serialisedForm = $testObject->getSerialized();

		$this->assertSame( 'Z12', $serialisedForm->Z1K1 );

		$this->assertSame( 'Z11', $serialisedForm->Z12K1[0] );

		$this->assertArrayEquals( [
				"Z1K1" => "Z11",
				"Z11K1" => self::ZLANG['en'],
				"Z11K2" => 'Demonstration item'
			],
			(array)$serialisedForm->Z12K1[1]
		);

		$serialisedNormalForm = $testObject->getSerialized( ZObject::FORM_NORMAL );
		$this->assertSame( 'Z12', $serialisedNormalForm->Z1K1->Z9K1 );

		$this->assertSame( 'Z7', $serialisedNormalForm->Z12K1->Z1K1->Z1K1->Z9K1 );
		$this->assertSame( 'Z881', $serialisedNormalForm->Z12K1->Z1K1->Z7K1->Z9K1 );
		$this->assertSame( 'Z11', $serialisedNormalForm->Z12K1->Z1K1->Z881K1->Z9K1 );

		$this->assertSame( 'Z11', $serialisedNormalForm->Z12K1->K1->Z1K1->Z9K1 );
		$this->assertSame( self::ZLANG['en'], $serialisedNormalForm->Z12K1->K1->Z11K1->Z9K1 );
		$this->assertSame( 'Demonstration item', $serialisedNormalForm->Z12K1->K1->Z11K2->Z6K1 );

		$this->assertTrue(
			$testObject->isLanguageProvidedValue( 'en' )
		);
		$this->assertFalse(
			$testObject->isLanguageProvidedValue( 'nonsense' )
		);

		$this->assertSame(
			'Demonstration item',
			$testObject->getStringForLanguage( $this->makeLanguage( 'en' ) )
		);
		$this->assertSame(
			'Demonstration item',
			$testObject->getStringForLanguageCode( 'en' )
		);
		$this->assertSame(
			'',
			$testObject->getStringForLanguageCode( '123' )
		);

		$this->assertSame(
			'Elemento para demostración',
			$testObject->getStringForLanguage( $this->makeLanguage( 'es' ) )
		);
		$this->assertSame(
			'Gegenstand zur Demonstration',
			$testObject->getStringForLanguage( $this->makeLanguage( 'de' ) )
		);
		$this->assertSame(
			'Article pour démonstration',
			$testObject->getStringForLanguage( $this->makeLanguage( 'fr' ) )
		);

		// Test direct fall-back.
		$this->assertSame(
			'Article pour démonstration',
			$testObject->getStringForLanguage( $this->makeLanguage( 'atj' ) )
		);

		// Test indirect fall-back.
		$this->assertSame(
			'Gegenstand zur Demonstration',
			$testObject->getStringForLanguage( $this->makeLanguage( 'dsb' ) )
		);

		// Test non-fall-back when not title.
		$chineseLang = $this->makeLanguage( 'zh' );
		$this->assertSame(
			wfMessage( 'wikilambda-multilingualstring-nofallback' )->inLanguage( $chineseLang )->text(),
			$testObject->getStringForLanguage( $chineseLang )
		);

		// Test english fallback
		$this->assertSame(
			'Demonstration item',
			$testObject->buildStringForLanguage( $chineseLang )->fallbackWithEnglish()->getString()
		);
	}

	public function testGetStringAndLanguageCode() {
		$this->registerLangs( [ 'en' ] );
		$germanLang = $this->makeLanguage( 'de' );
		$englishLang = $this->makeLanguage( 'en' );

		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$testObject = new ZMultiLingualString( [
			new ZMonoLingualString(
				new ZReference( self::ZLANG['en'] ), new ZString( 'Demonstration item' )
			)
		] );

		$this->assertTrue( $testObject->isValid() );

		// returns given language when there is no fallback needed
		$this->assertSame(
			[
				'title' => 'Demonstration item',
				'languageCode' => 'en'
			],
			$testObject->buildStringForLanguage( $englishLang )
				->fallbackWithEnglish()
				->placeholderNoFallback()
				->getStringAndLanguageCode()
		);

		// do not only return the title
		$this->assertNotSame(
			'Demonstration item',
			$testObject->buildStringForLanguage( $germanLang )
			  ->fallbackWithEnglish()
			  ->placeholderNoFallback()
			  ->getStringAndLanguageCode()
		);

		$testObject = new ZMultiLingualString( [
			new ZMonoLingualString(
				new ZReference( self::ZLANG['en'] ), new ZString( 'Demonstration item' )
			)
		] );

		// returns given language if no fallback is used
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			[
				'title' => 'Demonstration item',
				'languageCode' => 'en'
			],
			$testObject->buildStringForLanguage( $englishLang )
				->fallbackWithEnglish()
				->placeholderNoFallback()
				->getStringAndLanguageCode()
		);
	}

	public function testGetStringAndLanguageCode_empty() {
		$this->registerLangs( [ 'en' ] );

		$englishLang = $this->makeLanguage( 'en' );

		$testObject = new ZMultiLingualString( [
			new ZMonoLingualString(
				new ZReference( self::ZLANG['en'] ), new ZString( '' )
			)
		] );

		$this->assertTrue( $testObject->isValid() );

		// returns given language when there is no fallback needed
		$this->assertSame(
			[
				'title' => '⧼test-message⧽',
				'languageCode' => 'en'
			],
			$testObject->buildStringForLanguage( $englishLang )
				->fallbackWithEnglish()
				->placeholderWith( 'test-message' )
				->getStringAndLanguageCode()
		);
	}

	public function testTitleCreation() {
		$englishLang = $this->makeLanguage( 'en' );
		// test title comes back correctly when it exists
		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$testObject = new ZMultiLingualString( [
			new ZMonoLingualString(
				new ZReference( self::ZLANG['en'] ), new ZString( 'English Title' )
			),
		] );

		$this->assertSame(
			'English Title',
			$testObject->buildStringForLanguage( $englishLang )->getString()
		);

		// test 'wikilambda-editor-default-name' comes back when title does not exist
		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$this->assertSame(
			wfMessage( 'wikilambda-editor-default-name' )->inLanguage( $englishLang )->text(),
			$testObject->buildStringForLanguage( $englishLang )->placeholderForTitle()->getString()
		);

		// test returns null if no placeholder is requested
		$this->assertSame(
			null,
			$testObject->buildStringForLanguage( $englishLang )->getString()
		);
	}

	public function testStaticCreation() {
		$testObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MULTILINGUALSTRING,
			ZTypeRegistry::Z_MULTILINGUALSTRING_VALUE => [
				ZTypeRegistry::Z_MONOLINGUALSTRING,
				(object)[
					ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRING,
					ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => 'Z1002',
					ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => 'Demonstration item'
				]
			]
		] );
		$this->assertSame( 'Z12', $testObject->getZType() );
	}

	public function testStaticCreation_invalidNoValueKey() {
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MULTILINGUALSTRING
		] );
	}

	public function testModification() {
		$this->registerLangs( [ 'fr', 'es' ] );

		$testMono = new ZMonoLingualString( new ZReference( self::ZLANG['fr'] ), new ZString( 'Bonjour' ) );
		$testObject = new ZMultiLingualString( [] );
		$this->assertTrue( $testObject->isValid() );

		$french = $this->makeLanguage( 'fr' );
		$this->assertFalse( $testObject->isLanguageProvidedValue( 'fr' ) );
		$testObject->setMonoLingualString( $testMono );
		$this->assertTrue( $testObject->isValid() );
		$this->assertTrue( $testObject->isLanguageProvidedValue( 'fr' ) );
		$this->assertSame(
			'Bonjour',
			$testObject->getStringForLanguage( $french )
		);

		$testObject->setMonoLingualString( $testMono );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			'Bonjour',
			$testObject->getStringForLanguage( $french )
		);

		$testObject->setStringForLanguage( $french, 'Allo!' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			'Allo!',
			$testObject->getStringForLanguage( $french )
		);

		$spanish = $this->makeLanguage( 'es' );
		$testObject->removeValue( $spanish );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame(
			wfMessage( 'wikilambda-multilingualstring-nofallback' )->inLanguage( 'es' )->text(),
			$testObject->getStringForLanguage( $spanish )
		);

		$invalidLang = $this->makeLanguage( 'blargh' );
		$invalidMono = new ZMonoLingualString( new ZReference( 'blargh' ), new ZString( 'Invalid item' ) );
		$testObject->setMonoLingualString( $invalidMono );
		$this->assertFalse( $testObject->isValid() );
		$this->assertSame(
			wfMessage( 'wikilambda-multilingualstring-nofallback' )->text(),
			$testObject->getStringForLanguage( $invalidLang )
		);

		$this->expectException( ZErrorException::class );
		$testObject->removeValue( $invalidLang );
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
		"Z1K1": "Z12",
		"Z12K1": [ "Z11" ]
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [ "Z11" ]
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": [ "Z31" ]
	}
}
EOT
		);

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z12', $testObject->getZType() );
		$this->assertSame( [], $testObject->getZValue() );

		$testObject = new ZObjectContent(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z12",
		"Z12K1": [
			"Z11",
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1002",
				"Z11K2": "Demonstration item"
			},
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1004",
				"Z11K2": "Article pour démonstration"
			}
		]
	},
	"Z2K3": {
		"Z1K1": "Z12",
		"Z12K1": [ "Z11" ]
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": [ "Z11" ]
	}
}
EOT
		);

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z12', $testObject->getZType() );

		$this->assertSame(
			'Demonstration item',
			$testObject->getInnerZObject()->getStringForLanguage( $english )
		);
		$this->assertSame(
			'Article pour démonstration',
			$testObject->getInnerZObject()->getStringForLanguage( $french )
		);
	}

	public function testGetSerialized() {
		$this->registerLangs( [ 'fr', 'pcd', 'zh' ] );
		$testObject = new ZMultiLingualString( [
			new ZMonoLingualString(
				new ZReference( self::ZLANG['en'] ), new ZString( 'twelve' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['fr'] ), new ZString( 'douze' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['pcd'] ), new ZString( 'dousse' )
			),
			new ZMonoLingualString(
				new ZReference( self::ZLANG['zh'] ), new ZString( '十二' )
			),
		] );

		$expectedCanonical = json_decode(
			<<<EOT
{
	"Z1K1": "Z12",
	"Z12K1": [
		"Z11",
		{
			"Z1K1": "Z11",
			"Z11K1": "Z1002",
			"Z11K2": "twelve"
		},
		{
			"Z1K1": "Z11",
			"Z11K1": "Z1004",
			"Z11K2": "douze"
		},
		{
			"Z1K1": "Z11",
			"Z11K1": "Z1829",
			"Z11K2": "dousse"
		},
		{
			"Z1K1": "Z11",
			"Z11K1": "Z1006",
			"Z11K2": "十二"
		}
	]
}
EOT
		);
		$serializedObjectCanonical = $testObject->getSerialized( $testObject::FORM_CANONICAL );
		$this->assertEquals( $expectedCanonical, $serializedObjectCanonical );

		$roundTripped = ZObjectFactory::create( $serializedObjectCanonical );
		$this->assertEquals( $testObject, $roundTripped, 'Round trip through canonical serialization' );

		$serializedObjectDefault = $testObject->getSerialized();
		$this->assertEquals( $expectedCanonical, $serializedObjectDefault );

		$expectedNormal = json_decode(
			<<<EOT
{
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
				"Z6K1": "twelve"
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
					"Z6K1": "douze"
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
						"Z9K1": "Z1829"
					},
					"Z11K2": {
						"Z1K1": "Z6",
						"Z6K1": "dousse"
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
							"Z9K1": "Z1006"
						},
						"Z11K2": {
							"Z1K1": "Z6",
							"Z6K1": "十二"
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
EOT
		);

		$serializedObjectNormal = $testObject->getSerialized( $testObject::FORM_NORMAL );
		$this->assertEquals( $expectedNormal, $serializedObjectNormal );

		$roundTripped = ZObjectFactory::create( ZObjectUtils::canonicalize( $serializedObjectNormal ) );
		$this->assertEquals( $testObject, $roundTripped, 'Round trip through normal serialization' );
	}
}
