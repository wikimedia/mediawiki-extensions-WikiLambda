<?php

/**
 * WikiLambda integration test suite for the ZKey class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZKey;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZKey
 */
class ZKeyTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getKeyType
	 * @covers ::getKeyId
	 * @covers ::getKeyLabel
	 * @covers ::getZValue
	 * @covers ::isValid
	 */
	public function testCreation() {
		$testString = new ZMonoLingualString( self::ZLANG['en'], 'Demonstration item' );
		$testLabelSet = new ZMultiLingualString( [ $testString ] );
		$testObject = new ZKey( 'Z6', 'Z6K1', $testLabelSet );

		$this->assertSame( 'Z3', $testObject->getZType() );
		$this->assertSame( 'Z6', $testObject->getKeyType() );
		$this->assertSame( 'Z6K1', $testObject->getKeyId() );

		$this->assertSame( $testString->getString(), $testObject->getKeyLabel()->getStringForLanguageCode( 'en' ) );
		$this->assertSame( [ 'Z3K1' => 'Z6', 'Z3K2' => 'Z6K1', 'Z3K3' => $testLabelSet ], $testObject->getZValue() );
		$this->assertTrue( $testObject->isValid() );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getInnerZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getInnerZObject
	 * @covers ::isValid
	 * @covers ::getKeyType
	 * @covers ::getKeyId
	 * @covers ::getKeyLabel
	 */
	public function testPersistentCreation() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent( <<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": "Z0",
	"Z2K2": {
		"Z1K1": "Z3",
		"Z3K1": "Z6",
		"Z3K2": "Z6K1",
		"Z3K3": {
			"Z1K1": "Z12",
			"Z12K1": [
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
			{
				"Z1K1": "Z11",
				"Z11K1": "Z1002",
				"Z11K2": "Key object label"
			}
		]
	},
	"Z2K4": {
		"Z1K1": "Z32",
		"Z32K1": []
	}
}
EOT
		);
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z3', $testObject->getZType() );

		$innerKey = $testObject->getInnerZObject();

		$this->assertSame( 'Z6', $innerKey->getKeyType() );
		$this->assertSame( 'Z6K1', $innerKey->getKeyId() );
		$this->assertSame( 'Key label', $innerKey->getKeyLabel()->getStringForLanguageCode( 'en' ) );
	}

	/**
	 * @dataProvider provideIsValid
	 * @covers ::isValid
	 */
	public function testIsValid( $inputType, $inputIdentity, $inputLabel, $inputLangs, $expected ) {
		if ( $inputLangs ) {
			$this->registerLangs( $inputLangs );
		}
		$testObject = new ZKey( $inputType, $inputIdentity, $inputLabel );
		$this->assertSame( $expected, $testObject->isValid() );
	}

	public function provideIsValid() {
		$testString1 = new ZMonoLingualString( self::ZLANG['en'], 'Demonstration item' );
		$testString2 = new ZMonoLingualString( self::ZLANG['fr'], 'Demonstration item' );

		$emptyLabelSet = new ZMultiLingualString( [] );

		$testLabelSet = new ZMultiLingualString( [
			new ZMonoLingualString( self::ZLANG['en'], 'Demonstration item' ),
			new ZMonoLingualString( self::ZLANG['it'], 'oggetto per dimostrazione' ),
			new ZMonoLingualString( self::ZLANG['de'], 'Gegenstand zur Demonstration' ),
			new ZMonoLingualString( self::ZLANG['fr'], 'article pour démonstration' )
		] );

		return [
			'wholly null' => [ null, null, null, null, false ],

			'null type' => [ null, 'Z0K1', [], null, false ],
			'unknown type' => [ 'Z0', 'Z0K1', [], null, false ],
			'invalid type' => [ 'Test value?', 'Z0K1', [], null, false ],
			'known type' => [ 'Z6', 'Z4K1', [], null, true ],

			'null identity' => [ 'Z6', null, [], null, false ],
			'invalid identity' => [ 'Z6', 'Test value!', [], null, false ],
			'local identity' => [ 'Z6', 'K1', [], null, false ],
			'unknown identity' => [ 'Z6', 'Z0K1', [], null, false ],

			'null label' => [ 'Z6', 'Z6K1', null, null, false ],
			'empty label' => [ 'Z6', 'Z6K1', [], null, true ],
			'invalid label' => [ 'Z6', 'Z6K1', [ 'Test value:' ], null, false ],
			'singleton label' => [ 'Z6', 'Z6K1', [ $testString1 ], null, true ],
			'multiple label' => [ 'Z6', 'Z6K1', [ $testString1, $testString2 ], [ 'fr' ], true ],

			'singleton labelset' => [ 'Z6', 'Z6K1', $emptyLabelSet, null, true ],
			'multiple labelset' => [ 'Z6', 'Z6K1', $testLabelSet, [ 'it', 'de', 'fr' ], true ],
		];
	}
}
