<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZKey;

/**
 * @coversDefaultClass \MediaWiki\Extension\WikiLambda\ZKey
 */
class ZKeyTest extends \MediaWikiIntegrationTestCase {

	/**
	 * @dataProvider provideIsValidZObjectKey
	 * @covers ::isValidZObjectKey
	 */
	public function testIsValidZObjectKey( $input, $expected ) {
		$this->assertSame( ZKey::isValidZObjectKey( $input ), $expected );
	}

	public function provideIsValidZObjectKey() {
		return [
			'empty string' => [ '', false ],

			'Simple global key' => [ 'Z1K1', true ],
			'Big global key' => [ 'Z1234567890K1234567890', true ],

			'Simple local key' => [ 'K1', true ],
			'Big local key' => [ 'K1234567890', true ],

			'Whitespace-beset key' => [ " \tZ1K1  \n ", true ],

			'Invalid global key' => [ 'ZK1', false ],
			'Invalid global-only key' => [ 'Z123', false ],
			'Invalid 0-padded global key' => [ 'Z01K1', false ],

			'Invalid local key' => [ 'ZK1', false ],
		];
	}
}
