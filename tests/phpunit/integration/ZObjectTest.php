<?php

/**
 * WikiLambda integration test suite for the ZObject class
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjectFactory;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZObject
 * @group Database
 */
class ZObjectTest extends \MediaWikiIntegrationTestCase {
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
}
