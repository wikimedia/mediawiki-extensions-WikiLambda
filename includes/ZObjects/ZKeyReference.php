<?php
/**
 * WikiLambda ZKeyReference
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Context\RequestContext;
use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\WikiLambdaServices;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;
use MediaWiki\Title\Title;

class ZKeyReference extends ZObject {

	/**
	 * Construct a ZKeyReference instance, bypassing the internal ZString formally contained.
	 *
	 * @param ZString|string $value
	 */
	public function __construct( $value ) {
		if ( $value instanceof ZString ) {
			$this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ] = $value->getZValue();
			return;
		}

		$this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ] = $value;
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_KEYREFERENCE,
			],
			'keys' => [
				ZTypeRegistry::Z_KEYREFERENCE_VALUE => [
					'type' => ZTypeRegistry::BUILTIN_STRING,
					'default' => ''
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		if ( !is_string( $this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ] ) ) {
			return false;
		}
		return ZObjectUtils::isValidZObjectKey( $this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ] );
	}

	/**
	 * Get string value of the ZKeyReference object
	 *
	 * @return string The identifier of the ZKey referred by this ZObject
	 */
	public function getZValue() {
		return $this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ];
	}

	/**
	 * Returns the label of the current ZKeyReference, if it is
	 * a global key. Else it returns the untranslated key.
	 *
	 * @return string
	 */
	public function getKeyLabel() {
		$key = $this->data[ ZTypeRegistry::Z_KEYREFERENCE_VALUE ];

		if ( ZObjectUtils::isValidZObjectGlobalKey( $key ) ) {
			$typeZid = ZObjectUtils::getZObjectReferenceFromKey( $key );
			$typeTitle = Title::newFromText( $typeZid, NS_MAIN );
			$zObjectStore = WikiLambdaServices::getZObjectStore();
			$content = $zObjectStore->fetchZObjectByTitle( $typeTitle );
			$language = RequestContext::getMain()->getLanguage();
			if ( $content && $content->isValid() ) {
				return ZObjectUtils::getLabelOfGlobalKey( $key, $content->getZObject(), $language );
			}
		}

		return $key;
	}
}
