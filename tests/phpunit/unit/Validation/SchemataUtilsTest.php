<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Validation\Tests;

use MediaWiki\Extension\WikiLambda\Validation\SchemataUtils;
use PHPUnit\Framework\TestCase;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Validation\SchemataUtils
 */
final class SchemataUtilsTest extends TestCase {
	public function testJoinPath(): void {
		$this->assertEquals(
			"top" . DIRECTORY_SEPARATOR . "middle" . DIRECTORY_SEPARATOR . "bottom",
			SchemataUtils::joinPath(
				// Supererogatory separator will be omitted.
				"top" . DIRECTORY_SEPARATOR,
				"middle", "bottom"
			)
		);
	}

	public function testDataDirectory(): void {
		$dataDirectory = SchemataUtils::dataDirectory();
		$this->assertTrue( is_dir( $dataDirectory ) );
		$components = explode( DIRECTORY_SEPARATOR, $dataDirectory );
		$this->assertEquals( "data", end( $components ) );
	}

	public function testTestDataDirectory(): void {
		$testDataDirectory = SchemataUtils::testDataDirectory();
		$this->assertTrue( is_dir( $testDataDirectory ) );
		$components = explode( DIRECTORY_SEPARATOR, $testDataDirectory );
		$this->assertEquals( "test_data", end( $components ) );
	}

	public function testReadYaml(): void {
		$yamlContents = (
			"key: value\n" .
			"also:\n" .
			"- a\n" .
			"- dang\n" .
			"- list" );
		$tempFile = tmpfile();
		fwrite( $tempFile, $yamlContents );
		fseek( $tempFile, 0 );
		$yamlVersion = SchemataUtils::readYaml( stream_get_meta_data( $tempFile )["uri"] );
		fclose( $tempFile );
		$this->assertEquals(
			[
				"key" => "value",
				"also" => [ "a", "dang", "list" ] ],
			$yamlVersion
		);
	}

	public function testReadYamlAsSecretJson(): void {
		$yamlContents = (
			"key: value\n" .
			"also:\n" .
			"- a\n" .
			"- dang\n" .
			"- list" );
		$tempFile = tmpfile();
		fwrite( $tempFile, $yamlContents );
		fseek( $tempFile, 0 );
		$actual = SchemataUtils::readYamlAsSecretJson( stream_get_meta_data( $tempFile )["uri"] );
		fclose( $tempFile );
		$expected = "{\"key\":\"value\",\"also\":[\"a\",\"dang\",\"list\"]}";
		$this->assertEquals( $expected, $actual );
	}
}
