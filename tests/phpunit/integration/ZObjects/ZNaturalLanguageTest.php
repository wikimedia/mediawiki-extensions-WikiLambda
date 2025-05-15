<?php

/**
 * WikiLambda integration test suite for the ZNaturalLanguage class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualStringSet;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualStringSet;
use MediaWiki\Extension\WikiLambda\ZObjects\ZNaturalLanguage;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZNaturalLanguage
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectContent
 * @group Database
 */
class ZNaturalLanguageTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testConstructor_simple() {
		$serialized = '{ "Z1K1": "Z60", "Z60K1": "en" }';
		$testObject = new ZNaturalLanguage(
			new ZString( 'en' )
		);

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z60', $testObject->getZType() );
		$this->assertSame( 'en', $testObject->getZValue() );

		$this->assertEquals( json_decode( $serialized ), $testObject->getSerialized() );
	}

	public function testConstructor_withAliasTypedList() {
		$serialized = '{ "Z1K1": "Z60", "Z60K1": "apc", "Z60K2": [ "Z6", "ajc" ] }';
		$testObject = new ZNaturalLanguage(
			new ZString( 'apc' ),
			new ZTypedList(
				ZTypedList::buildType( new ZReference( ZTypeRegistry::Z_STRING ) ),
				[ new ZString( 'ajc' ) ]
			)
		);

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z60', $testObject->getZType() );
		$this->assertSame( 'apc', $testObject->getZValue() );

		$this->assertEquals( json_decode( $serialized ), $testObject->getSerialized() );
	}

	public function testFactory_simple() {
		$serialized = '{ "Z1K1": "Z60", "Z60K1": "en" }';
		$testObject = ZObjectFactory::create( json_decode( $serialized ) );

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z60', $testObject->getZType() );
		$this->assertSame( 'en', $testObject->getZValue() );

		$this->assertEquals( json_decode( $serialized ), $testObject->getSerialized() );
	}

	public function testFactory_withAliasArray() {
		$serialized = '{ "Z1K1": "Z60", "Z60K1": "apc", "Z60K2": [ "Z6", "ajc" ] }';
		$testObject = ZObjectFactory::create( json_decode( $serialized ) );

		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'Z60', $testObject->getZType() );
		$this->assertSame( 'apc', $testObject->getZValue() );

		$this->assertEquals( json_decode( $serialized ), $testObject->getSerialized() );
	}

	public function testLiteralLanguage_monolingualString() {
		$serialized = '{ "Z1K1": "Z11", "Z11K1": { "Z1K1": "Z60", "Z60K1": "en" }, "Z11K2": "text" }';
		$testObject = ZObjectFactory::create( json_decode( $serialized ) );

		$this->assertInstanceOf( ZMonoLingualString::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertEquals( json_decode( $serialized ), $testObject->getSerialized() );
	}

	public function testLiteralLanguage_monolingualStringSet() {
		$serialized = '{ "Z1K1": "Z31", "Z31K1": { "Z1K1": "Z60", "Z60K1": "en" }, "Z31K2": [ "Z6", "text" ] }';
		$testObject = ZObjectFactory::create( json_decode( $serialized ) );

		$this->assertInstanceOf( ZMonoLingualStringSet::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertEquals( json_decode( $serialized ), $testObject->getSerialized() );
	}

	public function testLiteralLanguage_multilingualString() {
		$serialized = '{ "Z1K1": "Z12", "Z12K1": [ "Z11", '
			. '{ "Z1K1": "Z11", "Z11K1": { "Z1K1": "Z60", "Z60K1": "en" }, "Z11K2": "text" }'
			. '] }';
		$testObject = ZObjectFactory::create( json_decode( $serialized ) );

		$this->assertInstanceOf( ZMultiLingualString::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertEquals( json_decode( $serialized ), $testObject->getSerialized() );
	}

	public function testLiteralLanguage_multilingualStringSet() {
		$serialized = '{ "Z1K1": "Z32", "Z32K1": [ "Z31", '
			. '{ "Z1K1": "Z31", "Z31K1": { "Z1K1": "Z60", "Z60K1": "en" }, "Z31K2": [ "Z6", "text" ] }'
			. '] }';
		$testObject = ZObjectFactory::create( json_decode( $serialized ) );

		$this->assertInstanceOf( ZMultiLingualStringSet::class, $testObject );
		$this->assertTrue( $testObject->isValid() );
		$this->assertEquals( json_decode( $serialized ), $testObject->getSerialized() );
	}
}
