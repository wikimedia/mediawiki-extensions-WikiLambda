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
	 * @param ZObject|null $isIdentity optional ZObject that contains the isIdentity flag
	 */
	public function __construct( $type, $identity, $label, $isIdentity = null ) {
		$this->data[ ZTypeRegistry::Z_KEY_TYPE ] = $type;
		$this->data[ ZTypeRegistry::Z_KEY_ID ] = $identity;
		$this->data[ ZTypeRegistry::Z_KEY_LABEL ] = $label;
		if ( $isIdentity ) {
			$this->data[ ZTypeRegistry::Z_KEY_IS_IDENTITY ] = $isIdentity;
		}
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
					'type' => ZTypeRegistry::Z_STRING,
					'required' => true,
				],
				ZTypeRegistry::Z_KEY_LABEL => [
					'type' => ZTypeRegistry::Z_MULTILINGUALSTRING,
				],
				ZTypeRegistry::Z_KEY_IS_IDENTITY => [
					'type' => ZTypeRegistry::Z_BOOLEAN,
					'required' => false,
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

		// Is identity is an optional key, but if present it should be a valid ZBoolean
		if ( isset( $this->data[ ZTypeRegistry::Z_KEY_IS_IDENTITY ] ) ) {
			$isIdentity = $this->data[ ZTypeRegistry::Z_KEY_IS_IDENTITY ];

			if ( $isIdentity instanceof ZReference ) {
				// Either a reference to True or False...
				if ( !$isIdentity->isValid() || (
					( $isIdentity->getZValue() !== ZTypeRegistry::Z_BOOLEAN_TRUE ) &&
					( $isIdentity->getZValue() !== ZTypeRegistry::Z_BOOLEAN_FALSE )
				) ) {
					return false;
				}
			} elseif ( $isIdentity instanceof ZObject ) {
				// ... or a literal Z40 with a valid Z40K1.
				if ( $isIdentity->getZType() !== ZTypeRegistry::Z_BOOLEAN ) {
					return false;
				}
				$booleanValue = $isIdentity->getValueByKey( ZTypeRegistry::Z_BOOLEAN_VALUE );
				if ( !$booleanValue instanceof ZReference ) {
					return false;
				}
				if ( !$booleanValue->isValid() || (
					( $booleanValue->getZValue() !== ZTypeRegistry::Z_BOOLEAN_TRUE ) &&
					( $booleanValue->getZValue() !== ZTypeRegistry::Z_BOOLEAN_FALSE )
				) ) {
					return false;
				}
			} else {
				// Has isIdentity field but the value is invalid
				return false;
			}
		}

		return true;
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

	/**
	 * Returns whether the key is identity or not
	 *
	 * @return bool
	 */
	public function getIsIdentity() {
		if ( isset( $this->data[ ZTypeRegistry::Z_KEY_IS_IDENTITY ] ) ) {
			$isIdentity = $this->data[ ZTypeRegistry::Z_KEY_IS_IDENTITY ];
			if ( $isIdentity->getZType() === ZTypeRegistry::Z_REFERENCE ) {
				// Return true if it references Z41/True
				return ( $isIdentity->getZValue() === ZTypeRegistry::Z_BOOLEAN_TRUE );
			} elseif ( $isIdentity->getZType() === ZTypeRegistry::Z_BOOLEAN ) {
				// Return true if the value of the literal Boolean is Z41/True
				$booleanValue = $isIdentity->getValueByKey( ZTypeRegistry::Z_BOOLEAN_VALUE );
				return $booleanValue && ( $booleanValue->getZValue() === ZTypeRegistry::Z_BOOLEAN_TRUE );
			}
		}
		return false;
	}
}
