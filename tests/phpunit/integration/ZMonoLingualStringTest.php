<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZPersistentObject;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZMonoLingualString
 */
class ZMonoLingualStringTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @covers ::__construct
	 * @covers ::getZType
	 * @covers ::getLanguage
	 * @covers ::getString
	 * @covers ::getZValue
	 */
	public function testCreation() {
		$testObject = new ZMonoLingualString( 'en', 'Demonstration item' );
		$this->assertSame( $testObject->getZType(), 'ZMonoLingualString' );
		$this->assertSame( $testObject->getLanguage(), 'en' );
		$this->assertSame( $testObject->getString(), 'Demonstration item' );
		$this->assertSame( $testObject->getZValue(), [ 'en' => 'Demonstration item' ] );
	}

	/**
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::__construct
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::isValid
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getZType
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getZValue
	 * @covers \MediaWiki\Extension\WikiLambda\ZPersistentObject::getInnerZObject
	 */
	public function testPersistentCreation() {
		$testObject = new ZPersistentObject( '{ "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "Demonstration item" }' );

		$this->assertSame( $testObject->getZType(), 'ZMonoLingualString' );
		$this->assertSame( $testObject->getZValue(), [ 'en' => 'Demonstration item' ] );

		$testObject = new ZPersistentObject( '{ "Z1K1": "Z2", "Z2K1": "Z0", "Z2K2": { "Z1K1": "Z11", "Z11K1": "en", "Z11K2": "Demonstration item" }, "Z2K3": [] }' );
		$this->assertSame( $testObject->getZType(), 'ZMonoLingualString' );
		$this->assertSame( $testObject->getZValue(), [ 'en' => 'Demonstration item' ] );
		$this->assertSame( $testObject->getInnerZObject()->getLanguage(), 'en' );
		$this->assertSame( $testObject->getInnerZObject()->getString(), 'Demonstration item' );
	}
}
