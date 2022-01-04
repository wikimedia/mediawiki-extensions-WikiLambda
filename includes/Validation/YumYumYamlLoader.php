<?php
/**
 * @file
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Validation;

use Opis\JsonSchema\ISchemaLoader;
use Opis\JsonSchema\Schema;

/**
 * Loads Yaml files from registered directory/ies.
 */
class YumYumYamlLoader implements ISchemaLoader {
	/**
	 * @var string[]
	 */
	protected $prefixToDirectory = [];

	/**
	 * @var (Schema|string)[]
	 */
	protected $schemaCache = [];

	/**
	 * @var string not null and not a Schema
	 */
	private static $sentinel = "__SENTINEL__";

	/**
	 * Populates cache with Schema for the provided ZID; places a sentinel value
	 * in the cache if the schema spec for the ZID is not found.
	 *
	 * @param string $ZID ZID to create schema for
	 */
	private function populateCache( string $ZID ): void {
		foreach ( $this->prefixToDirectory as $prefix => $directory ) {
			$path = SchemataUtils::joinPath( $directory, $ZID . '.yaml' );
			if ( file_exists( $path ) ) {
				$jsonEncoded = SchemataUtils::readYamlAsSecretJson( $path );
				$schema = Schema::fromJsonString( $jsonEncoded );
				$this->schemaCache[$ZID] = $schema;
				return;
			}
		}
		$this->schemaCache[$ZID] = self::$sentinel;
	}

	/**
	 * @inheritDoc
	 */
	public function loadSchema( string $ZID ) {
		if ( !isset( $this->schemaCache[$ZID] ) ) {
			$this->populateCache( $ZID );
		}

		$result = $this->schemaCache[$ZID];
		if ( $result == self::$sentinel ) {
			return null;
		}
		return $result;
	}

	/**
	 * @param string $directory
	 * @param string $uri_prefix
	 * @return bool
	 */
	public function registerPath( string $directory, string $uri_prefix ): bool {
		if ( !is_dir( $directory ) ) {
			return false;
		}

		$uri_prefix = rtrim( $uri_prefix, DIRECTORY_SEPARATOR );
		$directory = rtrim( $directory, DIRECTORY_SEPARATOR );

		$this->prefixToDirectory[$uri_prefix] = $directory;

		return true;
	}
}
