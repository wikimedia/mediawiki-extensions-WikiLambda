<?php

/**
 * WikiLambda integration test suite for the ZKey class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZKeyReference;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZKeyReference
 *
 * @group Database
 */
class ZKeyReferenceTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testConstructor() {
		$testObject = new ZKeyReference( 'K1' );
		$this->assertTrue( $testObject->isValid() );
		$this->assertSame( 'K1', $testObject->getZValue() );
	}

	public function testIsValid() {
		$testObject = new ZKeyReference( 'K1' );
		$this->assertTrue( $testObject->isValid() );

		$testObject = new ZKeyReference( 100 );
		$this->assertFalse( $testObject->isValid() );

		$$testObject = new ZKeyReference( 'this is not a ZString' );
		$this->assertFalse( $testObject->isValid() );
	}

	public function testGetZType() {
		$testObject = new ZKeyReference( 'K1' );

		$this->assertSame( 'Z39', $testObject->getZType() );
	}

	public function testGetSerialized() {
		$testObject = new ZKeyReference( 'K1' );

		$canonical = json_decode( '{"Z1K1":"Z39","Z39K1":"K1"}' );
		$normal = json_decode( '{"Z1K1":{"Z1K1":"Z9","Z9K1":"Z39"},"Z39K1":"K1"}' );
		$serializedObjectCanonical = $testObject->getSerialized(
			$testObject::FORM_CANONICAL,
		);
		$this->assertEquals( $canonical, $serializedObjectCanonical, 'Canonical serialization' );

		$roundTripped = ZObjectFactory::create( $serializedObjectCanonical );
		$this->assertEquals( $testObject, $roundTripped, 'Round trip through canonical serialization' );

		$this->assertEquals( $canonical, $testObject->getSerialized(), 'Default serialization' );

		$serializedObjectNormal = $testObject->getSerialized( $testObject::FORM_NORMAL );
		$this->assertEquals(
			$normal,
			$serializedObjectNormal,
			'Normal serialization'
		);

		$roundTripped = ZObjectFactory::create( ZObjectUtils::canonicalize( $serializedObjectNormal ) );
		$this->assertEquals( $testObject, $roundTripped, 'Round trip through normal serialization' );
	}
}
