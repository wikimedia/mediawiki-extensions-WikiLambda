<?php

/**
 * WikiLambda unit test suite for the ZObject.php and related files
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZFunctionCall;
use MediaWiki\Extension\WikiLambda\ZObjects\ZKey;
use MediaWiki\Extension\WikiLambda\ZObjects\ZKeyReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualStringSet;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualStringSet;
use MediaWiki\Extension\WikiLambda\ZObjects\ZObject;
use MediaWiki\Extension\WikiLambda\ZObjects\ZQuote;
use MediaWiki\Extension\WikiLambda\ZObjects\ZReference;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZType;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedError;
use MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjects\ZObject
 */
class ZObjectTypesTest extends \MediaWikiUnitTestCase {

	/**
	 * @dataProvider provideZObjectTypes
	 */
	public function testIsCorrectZType( $input, $expectedType, $isBuiltin, $isTypeReference ) {
		$this->assertSame( $isBuiltin, $input->isBuiltin() );
		$this->assertSame( $isTypeReference, $input->isTypeReference() );
		$this->assertSame( !$isTypeReference, $input->isTypeFunctionCall() );
		$this->assertSame( $expectedType, $input->getZType() );
		if ( $isTypeReference ) {
			$this->assertInstanceOf( ZReference::class, $input->getZTypeObject() );
			$this->assertSame( 'Z9', $input->getZTypeObject()->getZType() );
			$this->assertSame( $expectedType, $input->getZTypeObject()->getZValue() );
		} else {
			$this->assertInstanceOf( ZFunctionCall::class, $input->getZTypeObject() );
			$this->assertSame( 'Z7', $input->getZTypeObject()->getZType() );
			$this->assertSame( $expectedType, $input->getZTypeObject()->getZValue() );
		}
	}

	public static function provideZObjectTypes() {
		$zReference = new ZReference( "Z111" );
		$zString = new ZString( "Z111K1" );
		$zMonoLingualString = new ZMonoLingualString( new ZReference( "Z1002" ), new ZString( "text" ) );
		$zMultiLingualString = new ZMultiLingualString();
		$zMonoLingualStringSet = new ZMonoLingualStringSet( new ZReference( 'Z1002' ), [] );
		$zMultiLingualStringSet = new ZMultiLingualStringSet();

		$zKey = new ZKey( $zReference, $zString, $zMultiLingualString );
		$zType = new ZType( $zReference, [ $zKey ], $zReference );
		$zError = new ZError( $zReference, $zString );

		$zQuote = new ZQuote();
		$zKeyReference = new ZKeyReference( 'K1' );
		$zFunctionCall = new ZFunctionCall( new ZReference( 'Z999' ) );

		$typedList = new ZTypedList(
			new ZFunctionCall( new ZReference( 'Z881' ),
			[ 'Z881K1' => new ZReference( 'Z6' ) ] )
		);
		$typedError = new ZTypedError(
			new ZFunctionCall( new ZReference( 'Z885' ),
			[ 'Z885K1' => new ZReference( 'Z500' ) ] )
		);

		$zObjectR = new ZObject( $zReference );
		$zObjectF = new ZObject( $zFunctionCall );

		$zContent = new ZObjectContent(
			'{'
				. '"Z1K1": "Z2", '
				. '"Z2K1": {"Z1K1": "Z6", "Z6K1": "Z0"}, '
				. '"Z2K2": "test", '
				. '"Z2K3": {"Z1K1": "Z12", "Z12K1": ["Z11"]}, '
				. '"Z2K4": {"Z1K1": "Z32", "Z32K1": ["Z31"]}, '
				. '"Z2K5": {"Z1K1": "Z12", "Z12K1": ["Z11"]}'
			. '}'
		);
		$zPersistentObject = $zContent->getInnerZObject();

		return [
			'object' => [ $zObjectR, 'Z111', false, true ],
			'object' => [ $zObjectF, 'Z999', false, false ],
			'persistent object' => [ $zPersistentObject, 'Z6', true, true ],
			'key' => [ $zKey, 'Z3', true, true ],
			'type' => [ $zType, 'Z4', true, true ],
			'error' => [ $zError, 'Z5', true, true ],
			'string' => [ $zString, 'Z6', true, true ],
			'reference' => [ $zReference, 'Z9', true, true ],
			'monolingual' => [ $zMonoLingualString, 'Z11', true, true ],
			'multilingual' => [ $zMultiLingualString, 'Z12', true, true ],
			'monolingual set' => [ $zMonoLingualStringSet, 'Z31', true, true ],
			'multilingual set' => [ $zMultiLingualStringSet, 'Z32', true, true ],
			'quote' => [ $zQuote, 'Z99', true, true ],
			'key reference' => [ $zKeyReference, 'Z39', true, true ],
			'function call' => [ $zFunctionCall, 'Z7', true, true ],
			'typed list' => [ $typedList, 'Z881', true, false ],
			'typed error' => [ $typedError, 'Z885', true, false ],
		];
	}
}
