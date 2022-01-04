<?php
/**
 * WikiLambda SchemaFactory class for generating Open API validators
 *
 * @file
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Validation;

use Opis\JsonSchema\ISchemaLoader;
use Opis\JsonSchema\Schema;
use Opis\JsonSchema\Validator;

class SchemaFactory {
	/**
	 * @var ISchemaLoader
	 */
	private $loader;

	/**
	 * @param ISchemaLoader|null $loader Which loader to use
	 */
	private function __construct( $loader = null ) {
		$this->loader = $loader;
	}

	/**
	 * Creates a SchemaFactory for normal-form ZObjects.
	 *
	 * @param ISchemaLoader|null $loader Which loader to use
	 * @return SchemaFactory
	 */
	public static function getNormalFormFactory( $loader = null ): SchemaFactory {
		if ( $loader == null ) {
			$loader = new YumYumYamlLoader();
		}
		$normalDirectory = SchemataUtils::joinPath( SchemataUtils::dataDirectory(), 'NORMAL' );
		$loader->registerPath( $normalDirectory, 'NORMAL' );
		return new SchemaFactory( $loader );
	}

	/**
	 * Creates a SchemaFactory for canonical-form ZObjects.
	 *
	 * @param string|null $loader Which loader to use
	 * @return SchemaFactory
	 */
	public static function getCanonicalFormFactory( $loader = null ): SchemaFactory {
		if ( $loader == null ) {
			$loader = new YumYumYamlLoader();
		}
		$canonicalDirectory = SchemataUtils::joinPath( SchemataUtils::dataDirectory(), 'CANONICAL' );
		$loader->registerPath( $canonicalDirectory, 'CANONICAL' );
		return new SchemaFactory( $loader );
	}

	/**
	 * Creates a SchemaFactory for parsing standalone schemata (no external refs).
	 *
	 * @return SchemaFactory
	 */
	public static function getStandAloneFactory(): SchemaFactory {
		return new SchemaFactory();
	}

	/**
	 * @param mixed $schemaSpec
	 * @return SchemaWrapper
	 */
	public function parse( $schemaSpec ) {
		$validator = new Validator();
		$jsonEncoded = json_encode( $schemaSpec );
		$schema = Schema::fromJsonString( $jsonEncoded );
		return new SchemaWrapper( $schema, $validator );
	}

	/**
	 * Creates a SchemaWrapper that validates the normalized form of the provided
	 * type.
	 * TODO: Assert that this->loader is not null.
	 *
	 * @param string $ZID
	 * @return SchemaWrapper|null
	 */
	public function create( $ZID ) {
		if ( $ZID == "Z13" ) {
			$ZID = "Z10";
		} elseif ( $ZID == "Z41" || $ZID == "Z42" ) {
			$ZID = "Z10";
		}
		$schema = $this->loader->loadSchema( $ZID );
		if ( $schema == null ) {
			return null;
		}
		$validator = new Validator();
		$validator->setLoader( $this->loader );
		return new SchemaWrapper( $schema, $validator );
	}
}
