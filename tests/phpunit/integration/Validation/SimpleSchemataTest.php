<?php

namespace MediaWiki\Extension\WikiLambda\Tests\Integration\Validation;

use MediaWiki\Extension\WikiLambda\Validation\SchemaFactory;
use MediaWiki\Extension\WikiLambda\Validation\SchemataUtils;
use MediaWiki\Extension\WikiLambda\Validation\SchemaWrapper;

final class SimpleSchemataTest extends ValidationTestCase {

	/**
	 * @coversNothing
	 * @dataProvider provideValidSchemata
	 * @param SchemaWrapper $validator
	 * @param \stdClass $testObjects
	 */
	public function testSimpleSchemata( SchemaWrapper $validator, $testObjects ): void {
		$this->testValidation( $validator, $testObjects );
	}

	public function provideValidSchemata() {
		$directoryGlob = SchemataUtils::joinPath( SchemataUtils::testDataDirectory(), "simple_schemata", "*" );
		$fileNames = glob( $directoryGlob );
		$factory = SchemaFactory::getStandAloneFactory();
		foreach ( $fileNames as $fileName ) {
			$testDescriptor = json_decode( SchemataUtils::readYamlAsSecretJson( $fileName ) );
			$validator = $factory->parse( $testDescriptor->test_schema->validator );
			if ( !$testDescriptor->test_information->parse_error ) {
				yield [ $validator, $testDescriptor->test_objects ];
			}
		}
	}

	/**
	 * @coversNothing
	 * @dataProvider provideParseFailures
	 * @param SchemaWrapper $validator
	 */
	public function testParseFailures( $validator ): void {
		$this->markTestSkipped( 'Not yet working.' );

		// $this->assertIsNull( $validator );
	}

	public function provideParseFailures() {
		$directoryGlob = SchemataUtils::joinPath( SchemataUtils::testDataDirectory(), "simple_schemata", "*" );
		$fileNames = glob( $directoryGlob );
		$factory = SchemaFactory::getStandAloneFactory();
		foreach ( $fileNames as $fileName ) {
			$testDescriptor = json_decode( SchemataUtils::readYamlAsSecretJson( $fileName ) );
			$validator = $factory->parse( $testDescriptor->test_schema->validator );
			if ( $testDescriptor->test_information->parse_error ) {
				yield [ $validator ];
			}
		}
	}
}
