<?php
/**
 * WikiLambda ZMonoLingualString
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;

class ZMonoLingualString extends ZObject {

	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_MONOLINGUALSTRING,
			'keys' => [
				ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE => [
					'type' => ZTypeRegistry::HACK_REFERENCE_LANGUAGE,
					'required' => true,
				],
				ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE => [
					'type' => ZTypeRegistry::BUILTIN_STRING,
					'required' => true,
				],
			],
		];
	}

	public function __construct( $language = null, $value = '' ) {
		// FIXME catch and throw key-value exceptions
		// FIXME should we check that $language is valid during creation?
		$langRegistry = ZLangRegistry::singleton();
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ] = ZObjectFactory::createChild(
			$language ?? $langRegistry->getLanguageZidFromCode( 'en' )
		);
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ] = ZObjectFactory::createChild( $value );
	}

	public function getZValue() {
		return [ $this->getLanguage() => $this->getString() ];
	}

	public function getLanguage() {
		return $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_LANGUAGE ]->getZValue();
	}

	public function getString() {
		return $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRING_VALUE ]->getZValue();
	}

	public function isValid(): bool {
		$langs = ZLangRegistry::singleton();
		return $langs->isValidLanguageZid( $this->getLanguage() );
	}
}
