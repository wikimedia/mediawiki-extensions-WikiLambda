<?php

/**
 * WikiLambda unit test suite for ZPersistentObject.php
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualStringSet;
use MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWikiUnitTestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZPersistentObject
 */
class ZPersistentObjectTest extends MediaWikiUnitTestCase {

	/**
	 * @dataProvider provideIsValid
	 */
	public function testIsValid( $input, $expectedValidity ) {
		$this->assertSame( $expectedValidity, $input->isValid() );
	}

	public static function provideIsValid() {
		$zidZString = new ZString( 'Z400' );
		$contentObject = new ZString( 'Demo content' );

		$emptyMultiLingualString = new ZMultiLingualString( [] );
		$emptyMultiLingualStringSet = new ZMultiLingualStringSet( [] );

		$simpleMonoLingualString = new ZMonoLingualString( new ZReference( 'Z1002' ), 'Test' );

		yield 'Unlabelled is valid' => [
			new ZPersistentObject(
				$zidZString,
				$contentObject,
				$emptyMultiLingualString,
				$emptyMultiLingualStringSet,
				$emptyMultiLingualString
			),
			true
		];

		yield 'Labelled is valid' => [
			new ZPersistentObject(
				$zidZString,
				$contentObject,
				new ZMultiLingualString( [ $simpleMonoLingualString ] ),
				$emptyMultiLingualStringSet,
				$emptyMultiLingualString
			),
			true
		];

		yield 'Reference for ZID is invalid' => [
			new ZPersistentObject(
				new ZReference( 'Z400' ),
				$contentObject,
				$emptyMultiLingualString,
				$emptyMultiLingualStringSet,
				$emptyMultiLingualString
			),
			false
		];

		yield 'Null identifier string for ZID is valid' => [
			new ZPersistentObject(
				new ZString( 'Z0' ),
				$contentObject,
				$emptyMultiLingualString,
				$emptyMultiLingualStringSet,
				$emptyMultiLingualString
			),
			true
		];

		yield 'Actual string reference for ZID is invalid' => [
			new ZPersistentObject(
				'Z1',
				$contentObject,
				$emptyMultiLingualString,
				$emptyMultiLingualStringSet,
				$emptyMultiLingualString
			),
			false
		];

		yield 'ZString reference to a non-ZID is invalid' => [
			new ZPersistentObject(
				new ZString( 'This is not a ZID' ),
				$contentObject,
				$emptyMultiLingualString,
				$emptyMultiLingualStringSet,
				$emptyMultiLingualString
			),
			false
		];

		yield 'Actual string reference for content is invalid' => [
			new ZPersistentObject(
				$zidZString,
				'hello',
				$emptyMultiLingualString,
				$emptyMultiLingualStringSet,
				$emptyMultiLingualString
			),
			false
		];

		yield 'ZString for label is invalid' => [
			new ZPersistentObject(
				$zidZString,
				$contentObject,
				new ZString( 'This is not a ZID' ),
				$emptyMultiLingualStringSet,
				$emptyMultiLingualString
			),
			false
		];

		yield 'ZString for aliases is invalid' => [
			new ZPersistentObject(
				$zidZString,
				$contentObject,
				$emptyMultiLingualString,
				new ZString( 'This is not a ZID' ),
				$emptyMultiLingualString
			),
			false
		];

		yield 'ZString for short description is invalid' => [
			new ZPersistentObject(
				$zidZString,
				$contentObject,
				$emptyMultiLingualString,
				$emptyMultiLingualStringSet,
				new ZString( 'This is not a ZID' ),
			),
			false
		];
	}

	public function getDescription() {
		$englishReference = new ZReference( 'Z1002' );

		$testObject = new ZPersistentObject(
			new ZString( 'Z400' ),
			new ZString( 'Demo content' ),
			new ZMultiLingualString( [] ),
			null,
			null
		);
		$this->assertSame( null, $testObject->getDescription( $englishReference ),
			'ZPO with no descriptions at all should return null'
		);
	}
}
