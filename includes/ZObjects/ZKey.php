<?php
/**
 * WikiLambda ZKey
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\ZTypeRegistry;

class ZKey extends ZObject {

	public static function getDefinition() : array {
		return [
			'type' => ZTypeRegistry::Z_KEY,
			'keys' => [
				ZTypeRegistry::Z_KEY_TYPE => [
					'type' => ZTypeRegistry::HACK_REFERENCE_TYPE,
				],
				ZTypeRegistry::Z_KEY_ID => [
					// TODO: Per the model, we used to dereference this ZReference into the string
					// of its ZType, but creates recursion issues when evaluating ZKeys of ZTypes
					// that are being created (T262097). For now, just store the string ZReference.
					'type' => ZTypeRegistry::Z_TYPE_IDENTITY,
				],
				ZTypeRegistry::Z_KEY_LABEL => [
					'type' => ZTypeRegistry::Z_MULTILINGUALSTRING,
				],
			],
		];
	}

	public function __construct( $type, $identity, $label ) {
		$this->data[ ZTypeRegistry::Z_KEY_TYPE ] = $type;
		$this->data[ ZTypeRegistry::Z_KEY_ID ] = $identity;
		$this->data[ ZTypeRegistry::Z_KEY_LABEL ] = $label;
	}

	public function getZValue() {
		return $this->data;
	}

	public function getKeyType() {
		return $this->data[ ZTypeRegistry::Z_KEY_TYPE ];
	}

	public function getKeyId() {
		return $this->data[ ZTypeRegistry::Z_KEY_ID ];
	}

	public function getKeyLabel() {
		$label = $this->data[ ZTypeRegistry::Z_KEY_LABEL ];

		if ( $label instanceof ZMultiLingualString ) {
			return $label;
		} elseif ( $label === null ) {
			return new ZMultiLingualString( [] );
		} elseif ( $label instanceof ZList || is_array( $label ) ) {
			return new ZMultiLingualString( $label );
		}
		return null;
	}

	public function isValid() : bool {
		// Type must be set to a valid ZKey reference which is itself a ZType
		if ( !isset( $this->data[ ZTypeRegistry::Z_KEY_TYPE ] ) ) {
			return false;
		}
		$type = $this->data[ ZTypeRegistry::Z_KEY_TYPE ];
		if ( !self::isValidZObjectReference( $type ) ) {
			return false;
		}
		// TODO: Per the model, we used to dereference this ZReference into the string of its ZType,
		// but creates recursion issues when evaluating ZKeys of ZTypes that are being created (T262097).
		// For now, just store the string ZReference.
		/*
		if ( !ZTypeRegistry::singleton()->isZObjectKeyKnown( $type ) ) {
			// The ZTypeRegistry will refuse to register unknown types.
			return false;
		}
		*/

		// Identity must be a global reference (LATER: or a built instance of global references)
		if ( !isset( $this->data[ ZTypeRegistry::Z_KEY_ID ] ) ) {
			return false;
		}
		$identity = $this->data[ ZTypeRegistry::Z_KEY_ID ];
		if ( !self::isValidZObjectGlobalKey( $identity ) ) {
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
	 * A ZObject reference key (e.g. Z1 or Z12345)
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidZObjectReference( string $input ) : bool {
		return preg_match( "/^\s*Z[1-9]\d*\s*$/", $input );
	}

	/**
	 * A valid possible identifier across WMF projects
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidId( string $input ) : bool {
		return preg_match( "/^[A-Z][1-9]\d*$/", $input );
	}

	/**
	 * A ZObject reference key (e.g. Z1K1 or K12345)
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidZObjectKey( string $input ) : bool {
		return preg_match( "/^\s*(Z[1-9]\d*)?K\d+\s*$/", $input );
	}

	/**
	 * A global ZObject reference key (e.g. Z1K1)
	 *
	 * @param string $input
	 * @return bool
	 */
	public static function isValidZObjectGlobalKey( string $input ) : bool {
		return preg_match( "/^\s*Z[1-9]\d*K\d+\s*$/", $input );
	}

	/**
	 * The ZObject reference from a given global reference key (e.g. 'Z1' from 'Z1K1')
	 *
	 * @param string $input
	 * @return string
	 */
	public static function getZObjectReferenceFromKey( string $input ) : string {
		preg_match( "/^\s*(Z[1-9]\d*)?(K\d+)\s*$/", $input, $matches );
		return $matches[1];
	}

}
