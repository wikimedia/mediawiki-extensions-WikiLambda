<?php

/**
 * WikiLambda unit test suite for the ZObjectRepoUtils file
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\WikiLambda\ZObjectRepoUtils;

/**
 * @covers \MediaWiki\Extension\WikiLambda\ZObjectRepoUtils
 * @group Database
 */
class ZObjectRepoUtilsTest extends WikiLambdaIntegrationTestCase {

	/**
	 * @dataProvider provideGetLanguageCodeFromString
	 */
	public function testGetLanguageCodeFromString( $input, $expected ) {
		$this->setUpAsRepoMode();
		$this->registerLangs( [ 'en', 'es', 'fr' ] );
		$this->insertZids( [ 'Z1002', 'Z1003', 'Z1004' ] );
		$this->assertSame( $expected, ZObjectRepoUtils::getLanguageFromString( ...$input )->getCode() );
	}

	public static function provideGetLanguageCodeFromString() {
		yield 'Z1002 returns en' => [ [ 'Z1002' ], 'en' ];
		yield 'Z1003 returns es' => [ [ 'Z1003' ], 'es' ];
		yield 'Z1004 returns fr even with a fallback' => [ [ 'Z1004', 'es' ], 'fr' ];

		yield 'valid non-language ZID without fallback returns en' => [ [ 'Z41' ], 'en' ];
		yield 'valid non-language ZID with fallback returns fallback' => [ [ 'Z42', 'es' ], 'es' ];

		yield 'invalid ZID without fallback returns en' => [ [ 'Z400' ], 'en' ];
		yield 'invalid ZID with fallback returns fallback' => [ [ 'Z401', 'es' ], 'es' ];

		yield 'en returns en' => [ [ 'en' ], 'en' ];
		yield 'es returns es' => [ [ 'es' ], 'es' ];
		yield 'fr returns fr even with a fallback' => [ [ 'fr', 'es' ], 'fr' ];

		yield 'invalid language code without fallback returns en' => [ [ ' yo' ], 'en' ];
		yield 'invalid language code with fallback returns fallback' => [ [ ' yo?', 'es' ], 'es' ];
	}
}
