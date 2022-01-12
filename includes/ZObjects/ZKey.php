<?php
/**
 * WikiLambda ZKey
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZObjectUtils;

class ZKey extends ZObject {

	/**
	 * Construct a new ZKey instance
	 *
	 * @param ZObject $type ZReference to the type for this key value
	 * @param ZObject $identity ZString with the key ID
	 * @param ZObject $label ZMultiLingualString that contains the label of this key
	 */
	public function __construct( $type, $identity, $label ) {
		$this->data[ ZTypeRegistry::Z_KEY_TYPE ] = $type;
		$this->data[ ZTypeRegistry::Z_KEY_ID ] = $identity;
		$this->data[ ZTypeRegistry::Z_KEY_LABEL ] = $label;
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_KEY,
			],
			'keys' => [
				ZTypeRegistry::Z_KEY_TYPE => [
					'type' => ZTypeRegistry::HACK_REFERENCE_TYPE,
					'required' => true,
				],
				ZTypeRegistry::Z_KEY_ID => [
					// TODO: Per the model, we used to dereference this ZReference into the string
					// of its ZType, but creates recursion issues when evaluating ZKeys of ZTypes
					// that are being created (T262097). For now, just store the string ZReference.
					'type' => ZTypeRegistry::Z_TYPE_IDENTITY,
					'required' => true,
				],
				ZTypeRegistry::Z_KEY_LABEL => [
					'type' => ZTypeRegistry::Z_MULTILINGUALSTRING,
				],
			],
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		if ( !isset( $this->data[ ZTypeRegistry::Z_KEY_TYPE ] ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_KEY_TYPE ] instanceof ZReference ) ) {
			return false;
		}
		$type = $this->data[ ZTypeRegistry::Z_KEY_TYPE ]->getZValue();
		if ( !ZObjectUtils::isValidZObjectReference( $type ) ) {
			return false;
		}

		// Identity must be a global reference (LATER: or a built instance of global references)
		if ( !isset( $this->data[ ZTypeRegistry::Z_KEY_ID ] ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_KEY_ID ] instanceof ZString ) ) {
			return false;
		}
		$identity = $this->data[ ZTypeRegistry::Z_KEY_ID ]->getZValue();
		if ( !ZObjectUtils::isValidZObjectGlobalKey( $identity ) ) {
			return false;
		}

		// Label must be an array of valid ZMonoLingualStrings or a valid ZMultiLingualString
		if ( !isset( $this->data[ ZTypeRegistry::Z_KEY_LABEL ] ) ) {
			return false;
		}
		$labels = $this->data[ ZTypeRegistry::Z_KEY_LABEL ];
		if ( $labels instanceof ZMultiLingualString ) {
			return $labels->isValid();
		}
		if ( !is_array( $labels ) ) {
			return false;
		}
		foreach ( $labels as $label ) {
			if ( !( $label instanceof ZMonoLingualString ) ) {
				return false;
			}
			if ( !$label->isValid() ) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Get all the data (type, ID and labels) that describe this ZKey.
	 *
	 * @return mixed The key definition
	 */
	public function getZValue() {
		return $this->data;
	}

	/**
	 * Get the Zid for the type that describes the value of this key.
	 *
	 * @return string
	 */
	public function getKeyType() {
		return $this->data[ ZTypeRegistry::Z_KEY_TYPE ]->getZValue();
	}

	/**
	 * Get the ZKey Id
	 *
	 * @return string
	 */
	public function getKeyId() {
		return $this->data[ ZTypeRegistry::Z_KEY_ID ]->getZValue();
	}

	/**
	 * Get the ZMultilingualString that contains the label for this key
	 *
	 * @return ZMultiLingualString
	 */
	public function getKeyLabel() {
		return $this->data[ ZTypeRegistry::Z_KEY_LABEL ];
	}
}
