<?php

/**
 * WikiLambda example ZType object for use in the integration suite.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZKey;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZType;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZType
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @group Database
 */
class ZTypeTest extends WikiLambdaIntegrationTestCase {

	public function testPersistentCreation() {
		$this->registerLangs( [ 'fr' ] );

		$english = $this->makeLanguage( 'en' );
		$french = $this->makeLanguage( 'fr' );
		$docLang = $this->makeLanguage( 'qqx' );

		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent( ZTestType::TEST_ENCODING );

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z4', $testObject->getZType() );

		// Note: These are tests of ZObjectContent::getLabel(), which wraps ZPersistentObject::getLabel()
		$this->assertSame( 'Demonstration type', $testObject->getLabel( $english ) );
		$this->assertSame( '(wikilambda-multilingualstring-nofallback)', $testObject->getLabel( $docLang, false ) );
		$this->assertSame( '(wikilambda-multilingualstring-nofallback)', $testObject->getLabel( $docLang, true ) );
		$this->assertSame( 'Type pour démonstration', $testObject->getLabel( $french ) );

		// Note: These are direct tests of ZPersistentObject::getLabel(); note that the fallback behaviour differs!
		$testPObject = $testObject->getZObject();
		$this->assertSame( 'Demonstration type', $testPObject->getLabel( $english ) );
		$this->assertSame( '(wikilambda-multilingualstring-nofallback)', $testPObject->getLabel( $docLang, false ) );
		$this->assertSame( 'Demonstration type', $testPObject->getLabel( $docLang, true ) );
		$this->assertSame( 'Type pour démonstration', $testPObject->getLabel( $french ) );

		$this->assertSame(
			[ 'Demonstration type alias', 'Demonstration type second alias' ],
			$testObject->getAliases()->getAliasesForLanguage( $english )
		);
		$this->assertSame(
			[ 'Alias de type pour démonstration' ],
			$testObject->getAliases()->getAliasesForLanguage( $french )
		);

		$this->assertSame(
			[ 'Z1002' => 'Demonstration type short description' ],
			$testObject->getZObject()->getDescriptions()->getValueAsList()
		);

		$this->assertSame(
			'Demonstration type short description',
			$testObject->getZObject()->getDescription( $english )
		);

		$this->assertSame(
			'(wikilambda-multilingualstring-nofallback)',
			$testObject->getZObject()->getDescription( $docLang )
		);

		$this->assertSame(
			'Demonstration type short description',
			$testObject->getZObject()->getDescription( $french, true )
		);

		$this->assertSame( 'Z111', $testObject->getInnerZObject()->getTypeId()->getZValue() );

		$keys = $testObject->getInnerZObject()->getTypeKeys()->getAsArray();

		$this->assertCount( 2, $keys );
		$this->assertSame( 'Z6', $keys[0]->getKeyType() );
		$this->assertSame( 'Z111K1', $keys[0]->getKeyId() );
		$this->assertSame( 'Demonstration key', $keys[0]->getKeyLabel()->getStringForLanguage( $english ) );
		$this->assertSame( 'Index pour démonstration', $keys[0]->getKeyLabel()->getStringForLanguage( $french ) );

		$this->assertSame( 'Z6', $keys[1]->getKeyType() );
		$this->assertSame( 'Z111K2', $keys[1]->getKeyId() );
		$this->assertSame( 'Other demonstration key', $keys[1]->getKeyLabel()->getStringForLanguage( $english ) );
		$this->assertSame( 'Autre index pour démonstration', $keys[1]->getKeyLabel()->getStringForLanguage( $french ) );

		$this->assertInstanceOf( ZKey::class, $testObject->getInnerZObject()->getZKey( 'Z111K1' ) );
		$this->assertNull( $testObject->getInnerZObject()->getZKey( 'Key does not exist' ) );

		$this->assertSame( 'Z111', $testObject->getInnerZObject()->getTypeValidator() );
		$this->assertSame( 'Z111', $testObject->getInnerZObject()->getEqualityFunction() );
		$this->assertSame( 'Z111', $testObject->getInnerZObject()->getRendererFunction() );
		$this->assertSame( 'Z111', $testObject->getInnerZObject()->getParserFunction() );
		$this->assertInstanceOf( ZTypedList::class, $testObject->getInnerZObject()->getDeserialisers() );
		$this->assertInstanceOf( ZTypedList::class, $testObject->getInnerZObject()->getSerialisers() );
	}

	/**
	 * @dataProvider provideIsValid
	 */
	public function testIsValid( $inputIdentity, $inputKeys, $inputValidator, $expected ) {
		$testObject = new ZType(
			new ZReference( $inputIdentity ),
			$inputKeys,
			new ZReference( $inputValidator )
		);

		$this->assertSame( $expected, $testObject->isValid() );
	}

	public static function provideIsValid() {
		$validZ4Key = new ZKey( new ZReference( 'Z6' ), new ZString( 'Z4K1' ), [] );
		$listOfKeys = ZTypedList::buildType( new ZReference( 'Z3' ) );
		$validZ4KeyList = new ZTypedList( $listOfKeys, [ $validZ4Key ] );
		$validZ1234Key1 = new ZKey( new ZReference( 'Z6' ), new ZString( 'Z1234K1' ), [] );
		$validZ1234Key2 = new ZKey( new ZReference( 'Z6' ), new ZString( 'Z1234K2' ), [] );
		$validZ1234KeyList = new ZTypedList( $listOfKeys, [ $validZ1234Key1, $validZ1234Key2 ] );

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
			'multiple ZKeys keys' => [ 'Z1234', [ $validZ1234Key1, $validZ1234Key2 ], 'Z4', true ],

			'empty typed list of keys' => [ 'Z4', new ZTypedList( $listOfKeys, [] ), 'Z4', true ],
			'non-ZKey typed list of keys' => [ 'Z4', new ZTypedList( $listOfKeys, [ 'String!' ] ), 'Z4', false ],
			'one ZKey typed list of keys keys' => [ 'Z4', $validZ4KeyList, 'Z4', true ],
			'multiple typed list of keys ZKeys keys' => [ 'Z1234', $validZ1234KeyList, 'Z4', true ],

			'null validator' => [ 'Z4', [ $validZ4Key ], null, false ],
			'Z4 validator' => [ 'Z4', [ $validZ4Key ], 'Z4', true ],
			'real validator' => [ 'Z4', [ $validZ4Key ], 'Z1234', true ],
			'broken validator' => [ 'Z4', [ $validZ4Key ], 'Test value!', false ],
		];
	}

	/**
	 * @dataProvider provideIsEnumType
	 */
	public function testIsEnumType( $inputKeys, $expectedIsEnum ) {
		// Ensure that Z40/Boolean is available
		$this->insertZids( [ 'Z40' ] );

		$listOfKeys = ZTypedList::buildType( new ZReference( 'Z3' ) );

		$identity = 'Z1234';
		$validator = 'Z101';
		$testObject = new ZType(
			new ZReference( $identity ),
			new ZTypedList( $listOfKeys, $inputKeys ),
			new ZReference( $validator )
		);

		$this->assertSame( $expectedIsEnum, $testObject->isEnumType() );
	}

	public static function provideIsEnumType() {
		$trueRef = new ZReference( ZTypeRegistry::Z_BOOLEAN_TRUE );
		$falseRef = new ZReference( ZTypeRegistry::Z_BOOLEAN_FALSE );
		$trueLiteral = new ZObject( new ZReference( ZTypeRegistry::Z_BOOLEAN ), [
			'Z40K1' => new ZReference( ZTypeRegistry::Z_BOOLEAN_TRUE )
		] );
		$falseLiteral = new ZObject( new ZReference( ZTypeRegistry::Z_BOOLEAN ), [
			'Z40K1' => new ZReference( ZTypeRegistry::Z_BOOLEAN_FALSE )
		] );

		$noIdentityKey = new ZKey( new ZReference( 'Z1234' ), new ZString( 'Z1234K1' ), [] );
		$identityTrueRef = new ZKey( new ZReference( 'Z1234' ), new ZString( 'Z1234K1' ), [], $trueRef );
		$identityFalseRef = new ZKey( new ZReference( 'Z1234' ), new ZString( 'Z1234K1' ), [], $falseRef );
		$identityTrueLiteral = new ZKey( new ZReference( 'Z1234' ), new ZString( 'Z1234K1' ), [], $trueLiteral );
		$identityFalseLiteral = new ZKey( new ZReference( 'Z1234' ), new ZString( 'Z1234K1' ), [], $falseLiteral );

		return [
			'identity key not set' => [ [ $noIdentityKey ], false ],
			'identity key reference to true' => [ [ $identityTrueRef ], true ],
			'identity key reference to false' => [ [ $identityFalseRef ], false ],
			'identity key literal true' => [ [ $identityTrueLiteral ], true ],
			'identity key literal false' => [ [ $identityFalseLiteral ], false ]
		];
	}

	public function testTypedListOfKeys() {
		$typedListOfKeys = '{ "Z1K1": { "Z1K1": "Z7", "Z7K1": "Z881", "Z881K1": "Z3" } }';
		$typedList = ZObjectFactory::create( json_decode( $typedListOfKeys ) );

		$this->assertInstanceOf( ZTypedList::class, $typedList );
		$this->assertTrue( $typedList->isValid() );
		$this->assertSame( "Z3", $typedList->getElementType()->getZValue() );

		$testObject = new ZType(
			new ZReference( 'Z1234' ),
			$typedList,
			new ZReference( 'Z101' )
		);

		$this->assertTrue( $testObject->isValid() );

		// TODO (T298642): As soon as the canonical validator in function schemata can admit generic lists,
		// the following test should pass:
		// $typeJson = '{"Z1K1":"Z4","Z4K1":"Z1234","Z4K2":{'
		//  . '"Z1K1":{"Z1K1":"Z7","Z7K1":"Z881","Z881K1":"Z3"}},"Z4K3":"Z101"}';
		// $testObject = ZObjectFactory::create( json_decode( $typeJson ) );
		// $this->assertTrue( $testObject->isValid() );
	}

}
