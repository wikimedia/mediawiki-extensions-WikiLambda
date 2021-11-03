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
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

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

	/**
	 * @param ZReference|string|null $language
	 * @param ZList|array $value
	 */
	public function __construct( $language = null, $value = [] ) {
		$langRegistry = ZLangRegistry::singleton();
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ] = ZObjectFactory::createChild(
			// @phan-suppress-next-line PhanTypeMismatchArgumentNullable get language zid for 'en' will never be null
			$language ?? $langRegistry->getLanguageZidFromCode( 'en' )
		);
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ] = [];
		foreach ( ZObjectUtils::getIterativeList( $value ) as $index => $element ) {
			$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ][] = ZObjectFactory::createChild( $element );
		}
	}

	public function getZValue() {
		return [ $this->getLanguage() => $this->getStringSet() ];
	}

	public function getLanguage() {
		return $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ]->getZValue();
	}

	public function getStringSet() {
		return array_map( static function ( $zstring ) {
			return $zstring->getZValue();
		}, $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ]
		);
	}

	public function isValid(): bool {
		$langs = ZLangRegistry::singleton();
		return $langs->isValidLanguageZid( $this->getLanguage() );
	}
}
