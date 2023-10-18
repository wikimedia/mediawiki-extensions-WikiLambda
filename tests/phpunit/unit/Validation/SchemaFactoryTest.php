<?php

/**
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Validation\Tests;

use MediaWiki\Extension\WikiLambda\Validation\SchemaFactory;
use MediaWiki\Extension\WikiLambda\Validation\SchemataUtils;
use MediaWiki\Extension\WikiLambda\Validation\SchemaWrapper;
use MediaWiki\Extension\WikiLambda\Validation\YumYumYamlLoader;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Yaml\Yaml;

/**
 * @covers \MediaWiki\Extension\WikiLambda\Validation\SchemaFactory
 */
final class SchemaFactoryTest extends TestCase {

	public function testNormal(): void {
		$mockLoader = $this->createMock( YumYumYamlLoader::class );
		$mockLoader->expects( $this->once() )->method( 'registerPath' )->with(
			SchemataUtils::joinPath( SchemataUtils::dataDirectory(), "NORMAL" ),
			"NORMAL"
		);
		'@phan-var YumYumYamlLoader $mockLoader';
		$factory = SchemaFactory::getNormalFormFactory( $mockLoader );
		$this->assertInstanceOf( SchemaFactory::class, $factory );
	}

	public function testSchema(): void {
		$factory = SchemaFactory::getNormalFormFactory();
		$schema = $factory->create( "Z3" );
		$this->assertInstanceOf( SchemaWrapper::class, $schema );
	}

	public function testStandAlone(): void {
		$factory = SchemaFactory::getStandAloneFactory();
		$yamlContents = "type: string";
		/*
		$yamlContents = <<<EOYAML
			type: string
		EOYAML;
		*/
		$schema = $factory->parse( Yaml::parse( $yamlContents ) );
		$this->assertInstanceOf( SchemaWrapper::class, $schema );
	}
}
