<?php

/**
 * WikiLambda unit test suite for the ZObject.php and related files
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\ZObjectContent;
use MediaWiki\Extension\WikiLambda\ZObjects\ZKey;
use MediaWiki\Extension\WikiLambda\ZObjects\ZList;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMonoLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZMultiLingualString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZString;
use MediaWiki\Extension\WikiLambda\ZObjects\ZType;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZObjects\ZObject
 */
class ZObjectTypesTest extends \MediaWikiUnitTestCase {

	/**
	 * @dataProvider provideZObjectTypes
	 * @covers ::getZType
	 */
	public function testIsCorrectZType( $input, $expected ) {
		$this->assertSame( $input->getZType(), $expected );
	}

	public function provideZObjectTypes() {
		// Note this will return the inner object's type, string, not Z2
		$zPersistentObject = new ZObjectContent(
			'{"Z1K1":"Z2", "Z2K1": "Z0", "Z2K2": "test", "Z2K3": {"Z1K1": "Z12", "Z12K1": []}}'
		);

		$zKey = new ZKey( 'Z6', 'Z999K1', 'test' );
		$zType = new ZType( 'Z999', [ 'Z999K1' ], 'Z9999' );
		$zString = new ZString( 'test' );
		$zList = new ZList();
		$zMonoLingualString = new ZMonoLingualString();
		$zMultiLingualString = new ZMultiLingualString();
		return [
			'persistent object' => [ $zPersistentObject, 'Z6' ],
			'key' => [ $zKey, 'Z3' ],
			'type' => [ $zType, 'Z4' ],
			'string' => [ $zString, 'Z6' ],
			'list' => [ $zList, 'Z10' ],
			'monolingual' => [ $zMonoLingualString, 'Z11' ],
			'multilingual' => [ $zMultiLingualString, 'Z12' ],
		];
	}
}
