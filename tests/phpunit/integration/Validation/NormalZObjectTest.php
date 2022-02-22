<?php

namespace MediaWiki\Extension\WikiLambda\Validation\Tests;

use MediaWiki\Extension\WikiLambda\Validation\SchemaFactory;
use MediaWiki\Extension\WikiLambda\Validation\SchemataUtils;

final class NormalZObjectTest extends ValidationTest {
	/**
	 * @coversNothing
	 * @dataProvider provideZIDs
	 */
	public function testNormalizedZObject( $ZID ): void {
		$validator = ( SchemaFactory::getNormalFormFactory() )->create( $ZID );
		$normalFile = SchemataUtils::joinPath(
			SchemataUtils::testDataDirectory(), "normal_zobject", $ZID . ".yaml"
		);
		$testDescriptor = json_decode( SchemataUtils::readYamlAsSecretJson( $normalFile ) );
		$this->testValidation( $validator, $testDescriptor->test_objects );
	}

	public function provideZIDs() {
		// Keep in lock-step with CanonicalZObjectTest::provideZIDs()
		// TODO: Enable test for Z7.
		return [
			[ "LIST" ],
			[ "Z1" ], [ "Z2" ],
			// [ "Z6" ],
			[ "Z14" ], [ "Z17" ], [ "Z18" ], [ "Z22" ], [ "Z39" ], [ "Z40" ],
			[ "Z61" ], [ "Z80" ], [ "Z86" ], [ "Z99" ]
		];
	}
}
