<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Validation;

use MediaWiki\Extension\WikiLambda\Validation\SchemaFactory;
use MediaWiki\Extension\WikiLambda\Validation\SchemataUtils;

final class CanonicalZObjectTest extends ValidationTestCase {
	/**
	 * @coversNothing
	 * @dataProvider provideZIDs
	 */
	public function testCanonicalizedZObject( $ZID ): void {
		$validator = ( SchemaFactory::getCanonicalFormFactory() )->create( $ZID );
		$canonalFile = SchemataUtils::joinPath(
			SchemataUtils::testDataDirectory(), "canonical_zobject", $ZID . ".yaml"
		);
		$testDescriptor = json_decode( SchemataUtils::readYamlAsSecretJson( $canonalFile ) );
		$this->testValidation( $validator, $testDescriptor->test_objects );
	}

	public function provideZIDs() {
		// Keep in lock-step with NormalZObjectTest::provideZIDs()
		return [
			// FIXME (T309386): Opis doesn't detect failures that Ajv does with
			// current schemata implementation of typed lists
			[ "Z1" ],
			// [ "Z2" ],
			[ "Z3" ],
			// [ "Z4" ],
			[ "Z6" ], [ "Z7" ],
			// [ "Z8" ],
			[ "Z9" ],
			// [ "Z12" ],
			[ "Z14" ], [ "Z17" ], [ "Z18" ], [ "Z22" ],
			// [ "Z32" ],
			[ "Z39" ], [ "Z40" ],
			// [ "Z60" ],
			[ "Z61" ], [ "Z80" ], [ "Z86" ], [ "Z99" ]
		];
	}
}
