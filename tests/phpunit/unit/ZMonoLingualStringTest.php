<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZMonoLingualString;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZMonoLingualString
 */
class ZMonoLingualStringTest extends \MediaWikiUnitTestCase {

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
}
