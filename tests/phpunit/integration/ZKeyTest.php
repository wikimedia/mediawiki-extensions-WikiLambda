<?php

/**
 * WikiLambda integration test suite for the ZKey class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZKey;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZKey
 */
class ZKeyTest extends \MediaWikiIntegrationTestCase {

	private const EN = 'Z1002';
	private const FR = 'Z1004';
	private const DE = 'Z1430';
	private const IT = 'Z1787';

	protected function setUp() : void {
		parent::setUp();

		$langs = ZLangRegistry::singleton();
		$langs->registerLang( 'en', self::EN );
		$langs->registerLang( 'fr', self::FR );
		$langs->registerLang( 'de', self::DE );
		$langs->registerLang( 'it', self::IT );
	}

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
		$testString = new ZMonoLingualString( self::EN, 'Demonstration item' );
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
	public function testIsValid( $inputType, $inputIdentity, $inputLabel, $expected ) {
		$testObject = new ZKey( $inputType, $inputIdentity, $inputLabel );
		$this->assertSame( $expected, $testObject->isValid() );
	}

	public function provideIsValid() {
		$testString1 = new ZMonoLingualString( self::EN, 'Demonstration item' );
		$testString2 = new ZMonoLingualString( self::FR, 'Demonstration item' );

		$emptyLabelSet = new ZMultiLingualString( [] );

		$testLabelSet = new ZMultiLingualString( [
			new ZMonoLingualString( self::EN, 'Demonstration item' ),
			new ZMonoLingualString( self::IT, 'oggetto per dimostrazione' ),
			new ZMonoLingualString( self::DE, 'Gegenstand zur Demonstration' ),
			new ZMonoLingualString( self::FR, 'article pour démonstration' )
		] );

		return [
			'wholly null' => [ null, null, null, false ],

			'null type' => [ null, 'Z0K1', [], false ],
			'unknown type' => [ 'Z0', 'Z0K1', [], false ],
			'invalid type' => [ 'Test value?', 'Z0K1', [], false ],
			'known type' => [ 'Z6', 'Z4K1', [], true ],

			'null identity' => [ 'Z6', null, [], false ],
			'invalid identity' => [ 'Z6', 'Test value!', [], false ],
			'local identity' => [ 'Z6', 'K1', [], false ],
			'unknown identity' => [ 'Z6', 'Z0K1', [], false ],

			'null label' => [ 'Z6', 'Z6K1', null, false ],
			'empty label' => [ 'Z6', 'Z6K1', [], true ],
			'invalid label' => [ 'Z6', 'Z6K1', [ 'Test value:' ], false ],
			'singleton label' => [ 'Z6', 'Z6K1', [ $testString1 ], true ],
			'multiple label' => [ 'Z6', 'Z6K1', [ $testString1, $testString2 ], true ],

			'singleton labelset' => [ 'Z6', 'Z6K1', $emptyLabelSet, true ],
			'multiple labelset' => [ 'Z6', 'Z6K1', $testLabelSet, true ],
		];
	}
}
