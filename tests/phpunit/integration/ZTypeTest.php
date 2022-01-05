<?php

/**
 * WikiLambda example ZType object for use in the integration suite.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZGenericList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZKey;
use MediaWiki\Extension\WikiLambda\ZObjects\ZList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZType;
use MediaWiki\MediaWikiServices;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZType
 */
class ZTypeTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent::getInnerZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject::getInnerZObject
	 */
	public function testPersistentCreation() {
		$services = MediaWikiServices::getInstance();
		$this->registerLangs( [ 'fr' ] );

		$english = new \Language(
			'en',
			$services->getLocalisationCache(),
			$services->getLanguageNameUtils(),
			$services->getLanguageFallback(),
			$services->getLanguageConverterFactory(),
			$services->getHookContainer()
		);
		$french = new \Language(
			'fr',
			$services->getLocalisationCache(),
			$services->getLanguageNameUtils(),
			$services->getLanguageFallback(),
			$services->getLanguageConverterFactory(),
			$services->getHookContainer()
		);

		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent( ZTestType::TEST_ENCODING );

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z4', $testObject->getZType() );

		$this->assertSame( 'Demonstration type', $testObject->getLabel( $english ) );
		$this->assertSame( 'Type pour démonstration', $testObject->getLabel( $french ) );

		$this->assertSame(
			[ 'Demonstration type alias', 'Demonstration type second alias' ],
			$testObject->getAliases()->getAliasesForLanguage( $english )
		);
		$this->assertSame(
			[ 'Alias de type pour démonstration' ],
			$testObject->getAliases()->getAliasesForLanguage( $french )
		);

		$this->assertSame( 'Z111', $testObject->getInnerZObject()->getTypeId() );

		$keys = $testObject->getInnerZObject()->getTypeKeys()->getZListAsArray();

		$this->assertCount( 2, $keys );
		$this->assertSame( 'Z6', $keys[0]->getKeyType() );
		$this->assertSame( 'Z111K1', $keys[0]->getKeyId() );
		$this->assertSame( 'Demonstration key', $keys[0]->getKeyLabel()->getStringForLanguage( $english ) );
		$this->assertSame( 'Index pour démonstration', $keys[0]->getKeyLabel()->getStringForLanguage( $french ) );

		$this->assertSame( 'Z6', $keys[1]->getKeyType() );
		$this->assertSame( 'Z111K2', $keys[1]->getKeyId() );
		$this->assertSame( 'Other demonstration key', $keys[1]->getKeyLabel()->getStringForLanguage( $english ) );
		$this->assertSame( 'Autre index pour démonstration', $keys[1]->getKeyLabel()->getStringForLanguage( $french ) );

		// TODO: Nonsense result for now; once we implement Functions, will be one of those.
		$this->assertSame( 'Z111', $testObject->getInnerZObject()->getTypeValidator() );
	}

	/**
	 * @dataProvider provideIsValid
	 * @covers ::isValid
	 */
	public function testIsValid( $inputIdentity, $inputKeys, $inputValidator, $expected ) {
		$testObject = new ZType(
			new ZReference( $inputIdentity ),
			$inputKeys,
			new ZReference( $inputValidator )
		);

		$this->assertSame( $expected, $testObject->isValid() );
	}

	public function provideIsValid() {
		$validZ4Key = new ZKey( new ZReference( 'Z6' ), new ZString( 'Z4K1' ), [] );
		$validZ4KeyList = new ZList( [ $validZ4Key ] );
		$validZ1234Key1 = new ZKey( new ZReference( 'Z6' ), new ZString( 'Z1234K1' ), [] );
		$validZ1234Key2 = new ZKey( new ZReference( 'Z6' ), new ZString( 'Z1234K2' ), [] );
		$validZ1234KeyList = new ZList( [ $validZ1234Key1, $validZ1234Key2 ] );

		return [
			'wholly null' => [ null, null, null, false ],

			'null identity' => [ null, [ $validZ4Key ], 'Z4', false ],
			'Z4 identity' => [ 'Z4', [ $validZ4Key ], 'Z4', true ],
			'real identity' => [ 'Z1234', [ $validZ1234Key1 ], 'Z4', true ],
			'broken identity' => [ 'Test value!', [ $validZ4Key ], 'Z4', false ],

			'null keys' => [ 'Z4', null, 'Z4', false ],
			'empty keys' => [ 'Z4', [], 'Z4', true ],
			'non-ZKey keys' => [ 'Z4', [ 'This is not a ZKey!' ], 'Z4', false ],
			'one ZKey keys' => [ 'Z4', [ $validZ4Key ], 'Z4', true ],
			'multiple ZKeys keys' => [ 'Z1234', [ $validZ1234Key1,$validZ1234Key2 ], 'Z4', true ],

			'empty ZList keys' => [ 'Z4', new ZList( [] ), 'Z4', true ],
			'non-ZKey ZList keys' => [ 'Z4', new ZList( [ 'This is not a ZKey!' ] ), 'Z4', false ],
			'one ZKey ZList keys' => [ 'Z4', $validZ4KeyList, 'Z4', true ],
			'multiple ZList ZKeys keys' => [ 'Z1234', $validZ1234KeyList, 'Z4', true ],

			'null validator' => [ 'Z4', [ $validZ4Key ], null, false ],
			'Z4 validator' => [ 'Z4', [ $validZ4Key ], 'Z4', true ],
			'real validator' => [ 'Z4', [ $validZ4Key ], 'Z1234', true ],
			'broken validator' => [ 'Z4', [ $validZ4Key ], 'Test value!', false ],
		];
	}

	/**
	 * @covers ::isValid
	 */
	public function testGenericListOfKeys() {
		$genericListOfKeys = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z3" } }';
		$genericList = ZObjectFactory::create( json_decode( $genericListOfKeys ) );

		$this->assertInstanceOf( ZGenericList::class, $genericList );
		$this->assertTrue( $genericList->isValid() );
		$this->assertSame( "Z3", $genericList->getElementType() );

		$testObject = new ZType(
			new ZReference( 'Z1234' ),
			$genericList,
			new ZReference( 'Z101' )
		);

		$this->assertTrue( $testObject->isValid() );

		// FIXME (T298642) As soon as the canonical validator in function schemata can admit generic lists,
		// the following test should pass:
		// $typeJson = '{"Z1K1":"Z4","Z4K1":"Z1234","Z4K2":{'
		//  . '"Z1K1":{"Z1K1":"Z7","Z7K1":"Z881","Z881K1":"Z3"}},"Z4K3":"Z101"}';
		// $testObject = ZObjectFactory::create( json_decode( $typeJson ) );
		// $this->assertTrue( $testObject->isValid() );
	}

}
