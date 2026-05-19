<?php
/**
 * WikiLambda Internationalisation - WikifunctionsLanguageFactory service to build
 * WikfiunctionsLanguage objects, mapped MediaWiki Language objects with their respective
 * Wikifunctions' Language Zid
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Language;

use InvalidArgumentException;
use MediaWiki\Language\LanguageFactory;
use RuntimeException;

class WikifunctionsLanguageFactory {

	public function __construct(
		private readonly LanguageFactory $languageFactory
	) {
	}

	/**
	 * Builds the Language object using MediaWiki LanguageFactory
	 * and returns the mapping between the resulting Language and
	 * Wikifunctions Language codes.
	 *
	 * @see MediaWiki\Language\LanguageFactory::getLanguage
	 * @param string $code
	 * @return WikifunctionsLanguage
	 */
	public function getLanguage( string $code ): WikifunctionsLanguage {
		$mwLanguage = $this->languageFactory->getLanguage( $code );
		$zid = $this->zidForCode( $code );
		return new WikifunctionsLanguage( $mwLanguage, $zid );
	}

	/**
	 * Gets the language code from the Wikifunctions Language static
	 * mapping, builds the Language object using MediaWiki LanguageFactory
	 * and returns the mapping WikifunctionsLanguage object
	 *
	 * @param string $zid
	 * @return WikifunctionsLanguage
	 */
	public function getLanguageFromZid( string $zid ): WikifunctionsLanguage {
		$code = $this->codeForZid( $zid );
		$mwLanguage = $this->languageFactory->getLanguage( $code );
		return new WikifunctionsLanguage( $mwLanguage, $zid );
	}

	/**
	 * Returns whether the given language code is known in the Wikifunctions
	 * language set and hence available in the mappings file.
	 *
	 * @param string $code
	 * @return bool
	 */
	public function isKnownLanguageCode( string $code ): bool {
		try {
			$this->zidForCode( $code );
			return true;
		} catch ( InvalidArgumentException ) {
			return false;
		}
	}

	/**
	 * Returns the BCP-47 code given a Wikifunctions language Zid given as per the
	 * language mappings from the function-schemata naturalLanguages.json file.
	 *
	 * @param string $zid
	 * @return string
	 * @throws InvalidArgumentException
	 */
	private function codeForZid( string $zid ): string {
		$mapping = self::getWikifunctionsLanguageMapping();

		$code = array_search( $zid, $mapping, true );

		if ( $code === false ) {
			throw new InvalidArgumentException( "No BCP-47 language code mapping found for ZID: $zid" );
		}

		return $code;
	}

	/**
	 * Returns the Wikifunctions language Zid given a BCP-47 code as per the
	 * language mappings from the function-schemata naturalLanguages.json file.
	 *
	 * @param string $code
	 * @return string
	 * @throws InvalidArgumentException
	 */
	private function zidForCode( string $code ): string {
		$mapping = self::getWikifunctionsLanguageMapping();

		$zid = $mapping[$code] ?? null;

		if ( $zid === null ) {
			throw new InvalidArgumentException( "No Wikifunctions language mapping found for code: $code" );
		}

		return $zid;
	}

	/**
	 * Returns the content of the function-schemata/data/definitions/naturalLanguages.json
	 * mappings file.
	 *
	 * @return array
	 * @throws RuntimeException
	 */
	private static function getWikifunctionsLanguageMapping(): array {
		$mappingFile = dirname( __DIR__ ) . '/../function-schemata/data/definitions/naturalLanguages.json';
		$mapping = file_get_contents( $mappingFile );
		if ( $mapping === false ) {
			throw new RuntimeException( "Failed to load function-schemata naturalLanguages.json file" );
		}

		$decoded = json_decode( $mapping, true );
		if ( !is_array( $decoded ) ) {
			throw new RuntimeException( "Failed to decode function-schemata naturalLanguages.json file" );
		}

		return $decoded;
	}
}
