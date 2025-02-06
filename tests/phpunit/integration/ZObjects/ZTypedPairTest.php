<?php

/**
 * WikiLambda integration test suite for the ZTypedPair class
 *
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\ZObjects;

use MediaWiki\Extension\WikiLambda\Tests\Integration\WikiLambdaIntegrationTestCase;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedPair;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedPair
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectFactory
 * @group Database
 */
class ZTypedPairTest extends WikiLambdaIntegrationTestCase {

	protected function setUp(): void {
		parent::setUp();
		$this->setUpAsRepoMode();
	}

	public function testCreate_emptyPair_constructor() {
		$testObject = new ZTypedPair(
			ZTypedPair::buildType( 'Z6', 'Z40' )
		);

		$this->assertInstanceOf( ZTypedPair::class, $testObject );

		$this->assertFalse( $testObject->isValid() );

		$firstType = $testObject->getFirstType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );
		$this->assertNull( $testObject->getFirstElement() );

		$secondType = $testObject->getSecondType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );
		$this->assertNull( $testObject->getSecondElement() );
	}

	public function testCreate_emptyPair() {
		$typedPairStdObject = (object)[
			'Z1K1' => (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z882', 'Z882K1' => 'Z6', 'Z882K2' => 'Z40' ],
		];
		$testObject = ZObjectFactory::create( $typedPairStdObject );

		$this->assertInstanceOf( ZTypedPair::class, $testObject );

		$this->assertFalse( $testObject->isValid() );

		$firstType = $testObject->getFirstType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );
		$this->assertNull( $testObject->getFirstElement() );

		$secondType = $testObject->getSecondType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );
		$this->assertNull( $testObject->getSecondElement() );
	}

	public function testCreate_filledPair_constructor() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41' ] );

		$testObject = new ZTypedPair(
			ZTypedPair::buildType( 'Z6', 'Z40' ),
			new ZString( 'Testing' ),
			new ZReference( 'Z41' )
		);

		$this->assertInstanceOf( ZTypedPair::class, $testObject );

		$this->assertTrue( $testObject->isValid() );

		$firstType = $testObject->getFirstType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );
		$firstElement = $testObject->getFirstElement();
		$this->assertInstanceOf( ZString::class, $firstElement );
		$this->assertSame( "Testing", $firstElement->getZValue() );

		$secondType = $testObject->getSecondType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );
		$secondElement = $testObject->getSecondElement();
		$this->assertInstanceOf( ZReference::class, $secondElement );
		$this->assertSame( "Z41", $secondElement->getZValue() );
	}

	public function testElementSetters() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41', 'Z42' ] );

		$testObject = new ZTypedPair(
			ZTypedPair::buildType( 'Z6', 'Z40' ),
			new ZString( 'Testing' ),
			new ZReference( 'Z41' )
		);

		$testObject->setFirstElement( new ZString( 'Still testing' ) );
		$testObject->setSecondElement( new ZReference( 'Z42' ) );

		$this->assertInstanceOf( ZTypedPair::class, $testObject );

		$this->assertTrue( $testObject->isValid() );

		$firstType = $testObject->getFirstType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );
		$firstElement = $testObject->getFirstElement();
		$this->assertInstanceOf( ZString::class, $firstElement );
		$this->assertSame( "Still testing", $firstElement->getZValue() );

		$secondType = $testObject->getSecondType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );
		$secondElement = $testObject->getSecondElement();
		$this->assertInstanceOf( ZReference::class, $secondElement );
		$this->assertSame( "Z42", $secondElement->getZValue() );
	}

	public function testCreate_filledPair() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41' ] );

		$typedPairStdObject = (object)[
			'Z1K1' => (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z882', 'Z882K1' => 'Z6', 'Z882K2' => 'Z40' ],
			'K1' => (object)[ 'Z1K1' => 'Z6', 'Z6K1' => 'Testing' ],
			'K2' => (object)[ 'Z1K1' => 'Z9', 'Z9K1' => 'Z41' ],
		];
		$testObject = ZObjectFactory::create( $typedPairStdObject );

		$this->assertInstanceOf( ZTypedPair::class, $testObject );

		$this->assertTrue( $testObject->isValid() );

		$firstType = $testObject->getFirstType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );
		$firstElement = $testObject->getFirstElement();
		$this->assertInstanceOf( ZString::class, $firstElement );
		$this->assertSame( "Testing", $firstElement->getZValue() );

		$secondType = $testObject->getSecondType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );
		$secondElement = $testObject->getSecondElement();
		$this->assertInstanceOf( ZReference::class, $secondElement );
		$this->assertSame( "Z41", $secondElement->getZValue() );
	}

	public function testCreate_filledPairLocalKeyNames() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41' ] );

		$typedPairStdObject = (object)[
			'Z1K1' => (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z882', 'Z882K1' => 'Z6', 'Z882K2' => 'Z40' ],
			'K1' => (object)[ 'Z1K1' => 'Z6', 'Z6K1' => 'Testing' ],
			'K2' => (object)[ 'Z1K1' => 'Z9', 'Z9K1' => 'Z41' ],
		];
		$testObject = ZObjectFactory::create( $typedPairStdObject );

		$this->assertInstanceOf( ZTypedPair::class, $testObject );

		$this->assertTrue( $testObject->isValid() );

		$firstType = $testObject->getFirstType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );
		$firstElement = $testObject->getFirstElement();
		$this->assertInstanceOf( ZString::class, $firstElement );
		$this->assertSame( "Testing", $firstElement->getZValue() );

		$secondType = $testObject->getSecondType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );
		$secondElement = $testObject->getSecondElement();
		$this->assertInstanceOf( ZReference::class, $secondElement );
		$this->assertSame( "Z41", $secondElement->getZValue() );
	}

	public function testCreate_mismatchedPair_constructor() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41' ] );

		$testObject = new ZTypedPair(
			ZTypedPair::buildType( 'Z6', 'Z40' ),
			new ZReference( '400' ),
			new ZString( 'Failing' )
		);

		$this->assertInstanceOf( ZTypedPair::class, $testObject );

		$this->assertFalse( $testObject->isValid() );

		$firstType = $testObject->getFirstType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );
		$firstElement = $testObject->getFirstElement();
		$this->assertInstanceOf( ZReference::class, $firstElement );
		$this->assertSame( "400", $firstElement->getZValue() );
		$this->assertFalse( $firstElement->isValid() );

		$secondType = $testObject->getSecondType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );
		$secondElement = $testObject->getSecondElement();
		$this->assertInstanceOf( ZString::class, $secondElement );
		$this->assertSame( "Failing", $secondElement->getZValue() );
	}

	public function testCreate_mismatchedPair() {
		// Ensure that Z6/String, Z40/Boolean, and Z41/True instance of Boolean are all available
		$this->insertZids( [ 'Z6', 'Z40', 'Z41' ] );

		$typedPairStdObject = (object)[
			'Z1K1' => (object)[ 'Z1K1' => 'Z7', 'Z7K1' => 'Z882', 'Z882K1' => 'Z6', 'Z882K2' => 'Z40' ],
			'K1' => (object)[ 'Z1K1' => 'Z9', 'Z9K1' => '400' ],
			'K2' => (object)[ 'Z1K1' => 'Z6', 'Z6K1' => 'Failing' ],
		];
		$testObject = ZObjectFactory::create( $typedPairStdObject );

		$this->assertInstanceOf( ZTypedPair::class, $testObject );

		$this->assertFalse( $testObject->isValid() );

		$firstType = $testObject->getFirstType();
		$this->assertInstanceOf( ZReference::class, $firstType );
		$this->assertSame( "Z6", $firstType->getZValue() );
		$firstElement = $testObject->getFirstElement();
		$this->assertInstanceOf( ZReference::class, $firstElement );
		$this->assertSame( "400", $firstElement->getZValue() );
		$this->assertFalse( $firstElement->isValid() );

		$secondType = $testObject->getSecondType();
		$this->assertInstanceOf( ZReference::class, $secondType );
		$this->assertSame( "Z40", $secondType->getZValue() );
		$secondElement = $testObject->getSecondElement();
		$this->assertInstanceOf( ZString::class, $secondElement );
		$this->assertSame( "Failing", $secondElement->getZValue() );
	}
}
