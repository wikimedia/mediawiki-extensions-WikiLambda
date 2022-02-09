<?php

/**
 * WikiLambda integration test suite for the ZObject class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use FormatJson;
use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\ZTestType;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZType;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use Title;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZObject
 * @group Database
 */
class ZObjectTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @covers ::getValueByKey
	 */
	public function testGetValueByKey_stringValue() {
		$testObject = ZObjectFactory::create( 'foo' );
		$testObject = $testObject->getValueByKey( 'Z6K1' );
		$this->assertSame( 'Z6', $testObject->getZType() );
		$this->assertSame( 'foo', $testObject->getZValue() );
	}

	/**
	 * @covers ::getValueByKey
	 */
	public function testGetValueByKey_undefinedKey() {
		$testObject = ZObjectFactory::create( 'foo' );
		$testObject = $testObject->getValueByKey( 'Z1K999' );
		$this->assertNull( $testObject );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getDefinition
	 * @covers ::isBuiltin
	 */
	public function testConstruct_builtinType() {
		$testObject = (object)[
			"Z1K1" => "Z6",
			"Z6K1" => "builtin zobject"
		];
		$testZObject = ZObjectFactory::create( $testObject );
		$this->assertInstanceOf( ZObject::class, $testZObject );
		$this->assertInstanceOf( ZString::class, $testZObject );
		$this->assertSame( 'Z6', $testZObject->getZType() );
	}

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 */
	public function testConstruct_customType() {
		// Create type Z111
		$this->registerLangs( ZTestType::TEST_LANGS );
		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );
		$this->editPage( $title, ZTestType::TEST_ENCODING, "Test creation object", NS_MAIN );

		// Create instance of type Z111
		$testObject = (object)[
			"Z1K1" => "Z111",
			"Z111K1" => "first demonstration key",
			"Z111K2" => "second demonstration key"
		];

		// User-defined type validation can't be tested here, hence
		// using the method createChild instead of create, as the
		// former does not request function-schemata validator
		$testZObject = ZObjectFactory::createChild( $testObject );
		$this->assertInstanceOf( ZObject::class, $testZObject );
		$this->assertSame( 'Z111', $testZObject->getZType() );
	}

	/**
	 * @covers ::getLinkedZObjects()
	 */
	public function test_getLinkedZObjects() {
		// Create type Z111
		$this->registerLangs( ZTestType::TEST_LANGS );
		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );
		$this->editPage( $title, ZTestType::TEST_ENCODING, "Test creation object", NS_MAIN );

		// Create instance of type Z111
		$testObject = (object)[
			"Z1K1" => "Z111",
			"Z111K1" => "first demonstration key",
			"Z111K2" => "second demonstration key"
		];
		$testZObject = ZObjectFactory::createChild( $testObject );
		$this->assertContains( "Z111", $testZObject->getLinkedZObjects() );
	}

	/**
	 * @covers ::__toString()
	 */
	public function test__toString() {
		// Create type Z111
		$this->registerLangs( ZTestType::TEST_LANGS );
		$title = Title::newFromText( ZTestType::TEST_ZID, NS_MAIN );
		$this->editPage( $title, ZTestType::TEST_ENCODING, "Test creation object", NS_MAIN );

		// Create instance of type Z111
		$testObject = (object)[
			"Z1K1" => "Z111",
			"Z111K1" => "first demonstration key",
			"Z111K2" => "second demonstration key"
		];
		$testZObject = ZObjectFactory::createChild( $testObject );

		$toStringValue = $testZObject->__toString();

		$this->assertTrue( is_string( $toStringValue ) );
		$this->assertStringStartsWith( '{', $toStringValue );

		$parseStatus = FormatJson::parse( $toStringValue );
		$this->assertTrue( $parseStatus->isGood() );

		$reserialisedObject = $parseStatus->getValue();
		$this->assertTrue( ZObjectUtils::isValidZObject( $reserialisedObject ) );
		$this->assertTrue( property_exists( $reserialisedObject, 'Z1K1' ) );
		$this->assertSame( 'Z111', $reserialisedObject->Z1K1 );
		$this->assertTrue( property_exists( $reserialisedObject, 'Z111K1' ) );
		$this->assertSame( 'first demonstration key', $reserialisedObject->Z111K1 );
		$this->assertTrue( property_exists( $reserialisedObject, 'Z111K2' ) );
		$this->assertSame( 'second demonstration key', $reserialisedObject->Z111K2 );
	}

	/**
	 * @covers ::getHumanReadable()
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getRequiredZids
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::extractHumanReadableZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfReference
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfGlobalKey
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfTypeKey
	 */
	public function test_getHumanReadable() {
		// Insert all the ZIDs that we need in the DB to get their labels
		$this->insertZids( [ "Z1", "Z11", "Z60", "Z1003" ] );

		$zref = ZObjectFactory::create( "Z11" );
		$labelizedRef = $zref->getHumanReadable( $this->makeLanguage( 'en' ) );
		$this->assertSame( 'Monolingual text', $labelizedRef );

		$zlist = ZObjectFactory::create( [ "Z11", "Z1003", "Z404" ] );
		$labelizedList = $zlist->getHumanReadable( $this->makeLanguage( 'en' ) );
		$this->assertSame( [ 'Monolingual text', 'Spanish', 'Z404' ], $labelizedList );

		$ztext = ZObjectFactory::create( (object)[ "Z1K1" => "Z11", "Z11K1" => "Z1003", "Z11K2" => "ejemplo" ] );
		$labelizedText = $ztext->getHumanReadable( $this->makeLanguage( 'en' ) );
		$this->assertSame(
			FormatJson::encode( [ 'type' => 'Monolingual text', 'language' => 'Spanish', 'text' => 'ejemplo' ] ),
			FormatJson::encode( $labelizedText )
		);
	}

	/**
	 * @covers ::getHumanReadable()
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getRequiredZids
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::extractHumanReadableZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfReference
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfGlobalKey
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfTypeKey
	 */
	public function test_getHumanReadable_testType() {
		// Insert all the ZIDs that we need in the DB to get their labels and key labels and translate Z111
		$this->insertZids( [
			"Z1",
			"Z2",
			"Z3",
			"Z4",
			"Z6",
			"Z7",
			"Z8",
			"Z11",
			"Z12",
			"Z17",
			"Z31",
			"Z32",
			"Z60",
			"Z1002",
			"Z1003",
			"Z1004"
		] );

		// Assert that ZTestType is labelized correctly
		$zobject = ZObjectFactory::create( json_decode( ZTestType::TEST_ENCODING ) );
		$labelized = $zobject->getHumanReadable( $this->makeLanguage( 'en' ) );
		$this->assertSame(
			FormatJson::encode( FormatJson::decode( ZTestType::TEST_LABELIZED ), true, FormatJson::UTF8_OK ),
			FormatJson::encode( $labelized, true, FormatJson::UTF8_OK )
		);
	}

	/**
	 * @covers ::getHumanReadable()
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::extractHumanReadableZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfReference
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfGlobalKey
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfTypeKey
	 */
	public function test_getHumanReadable_languages() {
		// Insert all the ZIDs that we need in the DB to get their labels
		$this->insertZids( [ "Z1", "Z11", "Z60", "Z1003" ] );

		// Update Z1 and Z11 with labels in English and Spanish
		$z1Path = dirname( __DIR__, 1 ) . '/test_data/Z1_expanded_labels.json';
		$data = file_get_contents( $z1Path );
		$this->editPage( 'Z1', $data, 'Z1 update with labels in Spanish', NS_MAIN );

		$z11Path = dirname( __DIR__, 1 ) . '/test_data/Z11_expanded_labels.json';
		$data = file_get_contents( $z11Path );
		$status = $this->editPage( 'Z11', $data, 'Z11 update with labels in Spanish', NS_MAIN );

		$ztext = ZObjectFactory::create( (object)[ "Z1K1" => "Z11", "Z11K1" => "Z1003", "Z11K2" => "ejemplo" ] );
		$labelizedTextEs = $ztext->getHumanReadable( $this->makeLanguage( 'es' ) );
		$this->assertSame(
			FormatJson::encode( [ 'tipo' => 'Texto monolingüe', 'lenguaje' => 'español', 'texto' => 'ejemplo' ] ),
			FormatJson::encode( $labelizedTextEs )
		);
	}

	/**
	 * @covers ::getHumanReadable()
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::extractHumanReadableZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfReference
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfGlobalKey
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfTypeKey
	 */
	public function test_getHumanReadable_nonTranslatableKeys() {
		// Insert all the ZIDs that we need in the DB to get their labels and key labels and translate Z111
		$this->insertZids(
			[ "Z1", "Z3", "Z4", "Z6", "Z11", "Z12", "Z1002" ]
		);

		// Labelize ZObjects with non-translatable keys (Z4K1, Z3K2, Z4K3)
		$ztypeJson = <<<EOT
{
    "Z1K1": "Z4",
    "Z4K1": "Z6",
    "Z4K2": [
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
                        "Z11K2": "value"
                    }
                ]
            }
        }
    ],
    "Z4K3": "Z106"
}
EOT;

		$ztypeLabelized = <<<EOT
{
    "type": "Type",
    "identity": "Z6",
    "keys": [
        {
            "type": "Key",
            "value type": "String",
            "key id": "Z6K1",
            "label": {
                "type": "Multilingual text",
                "texts": [
                    {
                        "type": "Monolingual text",
                        "language": "English",
                        "text": "value"
                    }
                ]
            }
        }
    ],
    "validator": "Z106"
}
EOT;

		$ztype = ZObjectFactory::create( FormatJson::decode( $ztypeJson ) );
		$this->assertInstanceOf( ZType::class, $ztype );
		$this->assertSame(
			$ztypeLabelized,
			FormatJson::encode( $ztype->getHumanReadable(), true, FormatJson::UTF8_OK )
		);
	}

	/**
	 * @covers ::getHumanReadable()
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::extractHumanReadableZObject
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfReference
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfGlobalKey
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfLocalKey
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfTypeKey
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfFunctionArgument
	 * @covers \MediaWiki\Extension\WikiLambda\ZObjectUtils::getLabelOfErrorTypeKey
	 */
	public function test_getHumanReadable_errors() {
		// Insert all the ZIDs that we need in the DB to get their labels
		$this->insertZids(
			[ "Z1", "Z5", "Z6", "Z7", "Z8", "Z17", "Z50", "Z504", "Z885" ]
		);

		// Human-readable Errors
		$zerror = ZErrorFactory::createZErrorInstance(
			ZErrorTypeRegistry::Z_ERROR_ZID_NOT_FOUND,
			[ 'data' => 'Z404' ]
		);
		$validationZerror = ZErrorFactory::createValidationZError( $zerror );
		$zerrorLabelized = <<<EOT
{
    "type": "Error",
    "error type": "ZID not found",
    "error value": {
        "type": {
            "type": "Function call",
            "function": "Errortype to type",
            "errortype": "ZID not found"
        },
        "ZID": {
            "type": "String",
            "value": "Z404"
        }
    }
}
EOT;

		$this->assertInstanceOf( ZError::class, $zerror );
		$this->assertInstanceOf( ZError::class, $validationZerror );
		$this->assertSame(
			$zerrorLabelized,
			FormatJson::encode( $zerror->getHumanReadable(), true, FormatJson::UTF8_OK )
		);
	}
}
