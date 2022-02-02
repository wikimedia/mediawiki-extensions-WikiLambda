<?php

/**
 * WikiLambda integration test suite for the ZKey class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZKey;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZKey
 */
class ZKeyTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::getZType
	 * @covers ::getKeyType
	 * @covers ::getKeyId
	 * @covers ::getKeyLabel
	 * @covers ::getZValue
	 * @covers ::isValid
	 * @covers ::getDefinition
	 */
	public function testCreation_constructors() {
		$testRef = new ZReference( 'Z6' );
		$testKey = new ZString( 'Z6K1' );
		$testString = new ZMonoLingualString(
			new ZReference( self::ZLANG['en'] ),
			new ZString( 'Demonstration item' )
		);
		$testLabelSet = new ZMultiLingualString( [ $testString ] );
		$testObject = new ZKey( $testRef, $testKey, $testLabelSet );

		$this->assertSame( 'Z3', $testObject->getZType() );
		$this->assertSame( 'Z6', $testObject->getKeyType() );
		$this->assertSame( 'Z6K1', $testObject->getKeyId() );
		$this->assertSame( $testString->getString(), $testObject->getKeyLabel()->getStringForLanguageCode( 'en' ) );
		$this->assertTrue( $testObject->isValid() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getKeyType
	 * @covers ::getKeyId
	 * @covers ::getKeyLabel
	 * @covers ::getZValue
	 * @covers ::isValid
	 * @covers ::getDefinition
	 */
	public function testCreation_factory() {
		$stringZObject = <<<EOT
{
	"Z1K1": "Z3",
	"Z3K1": "Z6",
	"Z3K2": "Z6K1",
	"Z3K3": {
		"Z1K1": "Z12",
		"Z12K1": [
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
	public function testPersistentCreation_disallowed() {
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
		$this->assertFalse( $testObject->isValid() );
		$this->assertStringContainsString(
			ZErrorTypeRegistry::Z_ERROR_DISALLOWED_ROOT_ZOBJECT,
			(string)$testObject->getErrors()
		);
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
		$testRef = new ZReference( 'Z6' );
		$testId = new ZString( 'Z6K1' );
		$testString1 = new ZMonoLingualString(
			new ZReference( self::ZLANG['en'] ), new ZString( 'Demonstration item' )
		);
		$testString2 = new ZMonoLingualString(
			new ZReference( self::ZLANG['fr'] ), new ZString( 'Demonstration item' )
		);
		$emptyLabelSet = new ZMultiLingualString( [] );
		$testLabelSet = new ZMultiLingualString( [
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
			'wholly null' => [ null, null, null, null, false ],

			'null type' => [ null, $testId, [], null, false ],
			'unknown type' => [ 'Z0', $testId, [], null, false ],
			'invalid type' => [ 'Test value?', $testId, [], null, false ],
			'incorrect type' => [ 'Z6', $testId, [], null, false ],

			'null identity' => [ $testRef, null, [], null, false ],
			'invalid identity' => [ $testRef, 'Test value!', [], null, false ],
			'local identity' => [ $testRef, 'K1', [], null, false ],
			'unknown identity' => [ $testRef, 'Z0K1', [], null, false ],

			'null label' => [ $testRef, $testId, null, null, false ],
			'empty label' => [ $testRef, $testId, [], null, true ],
			'invalid label' => [ $testRef, $testId, [ 'Test value:' ], null, false ],
			'singleton label' => [ $testRef, $testId, [ $testString1 ], null, true ],
			'multiple label' => [ $testRef, $testId, [ $testString1, $testString2 ], [ 'fr' ], true ],

			'singleton labelset' => [ $testRef, $testId, $emptyLabelSet, null, true ],
			'multiple labelset' => [ $testRef, $testId, $testLabelSet, [ 'it', 'de', 'fr' ], true ],
		];
	}
}
