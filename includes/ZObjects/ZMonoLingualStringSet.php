<?php
/**
 * WikiLambda ZMonoLingualStringSet
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;

class ZMonoLingualStringSet extends ZObject {

	public static function getDefinition(): array {
		return [
			'type' => ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
			'keys' => [
				ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE => [
					'type' => ZTypeRegistry::HACK_REFERENCE_LANGUAGE,
					'required' => true,
				],
				ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE => [
					'type' => ZTypeRegistry::Z_LIST,
					'required' => true,
				],
			],
		];
	}

	public function __construct( $langage = '', $value = [] ) {
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ] = $langage;
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ] = $value;
	}

	public function getZValue() {
		return [ $this->getLanguage() => $this->getStringSet() ];
	}

	public function getLanguage() {
		return $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ];
	}

	public function getStringSet() {
		return $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ];
	}

	public function isValid(): bool {
		$langs = ZLangRegistry::singleton();
		// TODO: Do we care about the validity of the values?
		return $langs->isValidLanguageZid( $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ] );
	}
}
