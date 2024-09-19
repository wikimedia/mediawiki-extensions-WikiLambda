<?php

/**
 * WikiLambda integration test suite for the ZMonoLingualString class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @group Database
 */
class ZMonoLingualStringTest extends WikiLambdaIntegrationTestCase {

	public function testCreation() {
		$testObject = new ZMonoLingualString(
			new ZReference( 'Z1002' ),
			new ZString( 'Demonstration item' )
		);
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( 'Z1002', $testObject->getLanguage() );
		$this->assertSame( 'Demonstration item', $testObject->getString() );
		$this->assertSame( [ 'Z1002' => 'Demonstration item' ], $testObject->getZValue() );
	}

	public function testCreation_invalidNonReferenceLanguage() {
		$testObject = new ZMonoLingualString(
			new ZString( 'Language' ),
			new ZString( 'Demonstration item' )
		);
		$this->assertFalse( $testObject->isValid() );
		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( 'Language', $testObject->getLanguage() );
		$this->assertSame( 'Demonstration item', $testObject->getString() );
		$this->assertSame( [ 'Language' => 'Demonstration item' ], $testObject->getZValue() );
	}

	public function testCreation_invalidNonStringValue() {
		$testObject = new ZMonoLingualString(
			new ZReference( 'Z1002' ),
			new ZReference( 'Z400' )
		);
		$this->assertFalse( $testObject->isValid() );
		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( 'Z1002', $testObject->getLanguage() );
		$this->assertSame( 'Z400', $testObject->getString() );
		$this->assertSame( [ 'Z1002' => 'Z400' ], $testObject->getZValue() );
	}

	public function testStaticCreation() {
		$testObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRING,
			ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => 'Z1002',
			ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => 'Demonstration item'
		] );
		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( 'Z1002', $testObject->getLanguage() );
		$this->assertSame( 'Demonstration item', $testObject->getString() );
		$this->assertSame( [ 'Z1002' => 'Demonstration item' ], $testObject->getZValue() );
		$this->assertTrue( $testObject->isValid() );
	}

	public function testStaticCreation_invalidNoLanguageKey() {
		$this->expectException( ZErrorException::class );

		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRING,
			ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => 'Demonstration item'
		] );
	}

	public function testStaticCreation_invalidNoValueKey() {
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRING,
			ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => 'Z1002'
		] );
	}

	public function testStaticCreation_invalidLanguageReference() {
		// TODO (T375065): This issue is only detectable with structural validatioon
		$this->markTestSkipped( 'Only detectable with structural validation' );
		$this->expectException( ZErrorException::class );
		$invalidObject = ZObjectFactory::create( (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => ZTypeRegistry::Z_MONOLINGUALSTRING,
			ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => 'en',
			ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => 'Demonstration item'
		] );
	}

	public function testPersistentCreation() {
		$this->hideDeprecated( '::create' );
		$testObject = new ZObjectContent( '{ "Z1K1": "Z11", "Z11K1": "Z1002", "Z11K2": "Demonstration item" }' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( [ 'Z1002' => 'Demonstration item' ], $testObject->getZValue() );

		$testObject = new ZObjectContent(
			<<<EOT
{
	"Z1K1": "Z2",
	"Z2K1": { "Z1K1": "Z6", "Z6K1": "Z0" },
	"Z2K2": {
		"Z1K1": "Z11",
		"Z11K1": "Z1002",
		"Z11K2": "Demonstration item"
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
		$this->assertSame( 'Z11', $testObject->getZType() );
		$this->assertSame( [ 'Z1002' => 'Demonstration item' ], $testObject->getZValue() );
		$this->assertSame( 'Z1002', $testObject->getInnerZObject()->getLanguage() );
		$this->assertSame( 'Demonstration item', $testObject->getInnerZObject()->getString() );
	}
}
