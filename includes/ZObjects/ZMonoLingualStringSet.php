<?php
/**
 * WikiLambda ZMonoLingualStringSet
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZLangRegistry;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ZMonoLingualStringSet extends ZObject {

	/**
	 * Create a ZMonoLingualStringSet instance given a language ZReference and an array
	 * or ZTypedList of ZString instances. Internally this class bypasses ZTypedList
	 * and stores an array.
	 *
	 * @param ZReference $language
	 * @param ZTypedList|array $value
	 */
	public function __construct( $language, $value = [] ) {
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ] = $language;
		$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ] = [];
		foreach ( ZObjectUtils::getIterativeList( $value ) as $index => $element ) {
			$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ][] = $element;
		}
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_MONOLINGUALSTRINGSET,
			],
			'keys' => [
				ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE => [
					'type' => ZTypeRegistry::HACK_REFERENCE_LANGUAGE,
					'required' => true,
				],
				ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE => [
					'type' => ZTypeRegistry::HACK_ARRAY_Z_STRING,
					'required' => true,
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		// Language can be a Reference or a literal Natural Language
		$lang = $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ];
		if ( !( $lang instanceof ZReference ) && !( $lang instanceof ZNaturalLanguage ) ) {
			return false;
		}

		// If ZReference, check it's a valid language Zid
		$langs = ZLangRegistry::singleton();
		if ( ( $lang instanceof ZReference ) && !$langs->isValidLanguageZid( $lang->getZValue() ) ) {
			return false;
		}

		// If ZNaturalLanguage, check it's a valid Z60 object
		if ( ( $lang instanceof ZNaturalLanguage ) && !$lang->isValid() ) {
			return false;
		}

		if ( !is_array( $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ] ) ) {
			return false;
		}

		foreach ( $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ] as $value ) {
			if ( !( $value instanceof ZString ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * @inheritDoc
	 */
	public function getSerialized( $form = self::FORM_CANONICAL ) {
		$listType = new ZReference( ZTypeRegistry::Z_STRING );
		$language = $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ];
		$typedList = new ZTypedList(
			ZTypedList::buildType( $listType ),
			$this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ]
		);
		return (object)[
			ZTypeRegistry::Z_OBJECT_TYPE => $this->getZTypeObject()->getSerialized( $form ),
			ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE => $language->getSerialized( $form ),
			ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE => $typedList->getSerialized( $form )
		];
	}

	/**
	 * Get a map representing this ZMonoLingualString language and string set.
	 *
	 * @return array Language and string set of this ZMonoLingualString
	 */
	public function getZValue() {
		return [ $this->getLanguage() => $this->getStringSet() ];
	}

	/**
	 * Get the Zid that represents the language for this ZMonoLingualStringSet
	 *
	 * @return string Language Zid
	 */
	public function getLanguage() {
		return $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_LANGUAGE ]->getZValue() ?? '';
	}

	/**
	 * Get an array of strings values contained by this ZMonoLingualStringSet
	 *
	 * @return string[] Set of string values
	 */
	public function getStringSet() {
		return array_map( static function ( $zstring ) {
			return $zstring->getZValue();
		}, $this->data[ ZTypeRegistry::Z_MONOLINGUALSTRINGSET_VALUE ]
		);
	}
}
