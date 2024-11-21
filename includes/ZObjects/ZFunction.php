<?php
/**
 * WikiLambda ZFunction
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ZObjects;

use MediaWiki\Extension\WikiLambda\Registry\ZTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZObjectFactory;
use MediaWiki\Json\FormatJson;

class ZFunction extends ZObject {

	/**
	 * Construct a ZFunction instance
	 *
	 * @param ZTypedList $arguments
	 * @param ZObject $returnType
	 * @param ZTypedList $testers
	 * @param ZTypedList $implementations
	 * @param ZReference $identity
	 */
	public function __construct( $arguments, $returnType, $testers, $implementations, $identity ) {
		$this->data[ ZTypeRegistry::Z_FUNCTION_ARGUMENTS ] = $arguments;
		$this->data[ ZTypeRegistry::Z_FUNCTION_RETURN_TYPE ] = $returnType;
		$this->data[ ZTypeRegistry::Z_FUNCTION_TESTERS ] = $testers;
		$this->data[ ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS ] = $implementations;
		$this->data[ ZTypeRegistry::Z_FUNCTION_IDENTITY ] = $identity;
	}

	/**
	 * @inheritDoc
	 */
	public static function getDefinition(): array {
		return [
			'type' => [
				'type' => ZTypeRegistry::Z_REFERENCE,
				'value' => ZTypeRegistry::Z_FUNCTION,
			],
			'keys' => [
				ZTypeRegistry::Z_FUNCTION_ARGUMENTS => [
					'type' => ZTypeRegistry::Z_FUNCTION_TYPED_LIST,
					'required' => true
				],
				ZTypeRegistry::Z_FUNCTION_RETURN_TYPE => [
					'type' => ZTypeRegistry::Z_REFERENCE,
					'required' => true
				],
				ZTypeRegistry::Z_FUNCTION_TESTERS => [
					'type' => ZTypeRegistry::Z_FUNCTION_TYPED_LIST,
					'required' => true
				],
				ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS => [
					'type' => ZTypeRegistry::Z_FUNCTION_TYPED_LIST,
					'required' => true
				],
				ZTypeRegistry::Z_FUNCTION_IDENTITY => [
					'type' => ZTypeRegistry::Z_REFERENCE,
					'required' => true
				],
			]
		];
	}

	/**
	 * @inheritDoc
	 */
	public function isValid(): bool {
		// Check Z8K1 is a list of argument declarations
		if ( !( $this->data[ ZTypeRegistry::Z_FUNCTION_ARGUMENTS ] instanceof ZTypedList ) ) {
			return false;
		}
		$list = $this->data[ ZTypeRegistry::Z_FUNCTION_ARGUMENTS ];
		if ( !$list->isEmpty() && ( $list->getElementType()->getZValue() !== ZTypeRegistry::Z_ARGUMENTDECLARATION ) ) {
			return false;
		}

		// Check Z8K2 is either a valid reference or a valid function call
		if (
			!( $this->data[ ZTypeRegistry::Z_FUNCTION_RETURN_TYPE ] instanceof ZReference ) &&
			!( $this->data[ ZTypeRegistry::Z_FUNCTION_RETURN_TYPE ] instanceof ZFunctionCall ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_FUNCTION_RETURN_TYPE ]->isValid() ) ) {
			return false;
		}

		// Check Z8K3 is a list of testers
		if ( !( $this->data[ ZTypeRegistry::Z_FUNCTION_TESTERS ] instanceof ZTypedList ) ) {
			return false;
		}
		$list = $this->data[ ZTypeRegistry::Z_FUNCTION_TESTERS ];
		if ( !$list->isEmpty() && ( $list->getElementType()->getZValue() !== ZTypeRegistry::Z_TESTER ) ) {
			return false;
		}

		// Check Z8K4 is a list of implementations
		if ( !( $this->data[ ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS ] instanceof ZTypedList ) ) {
			return false;
		}
		$list = $this->data[ ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS ];
		if ( !$list->isEmpty() && ( $list->getElementType()->getZValue() !== ZTypeRegistry::Z_IMPLEMENTATION ) ) {
			return false;
		}

		// Check Z8K5 is a reference
		if ( !( $this->data[ ZTypeRegistry::Z_FUNCTION_IDENTITY ] instanceof ZReference ) ) {
			return false;
		}
		if ( !( $this->data[ ZTypeRegistry::Z_FUNCTION_IDENTITY ]->isValid() ) ) {
			return false;
		}

		return true;
	}

	/**
	 * Expected return type of this ZFunction.
	 *
	 * @return string|null
	 */
	public function getReturnType() {
		if ( $this->data[ ZTypeRegistry::Z_FUNCTION_RETURN_TYPE ] instanceof ZReference ) {
			return $this->data[ ZTypeRegistry::Z_FUNCTION_RETURN_TYPE ]->getZValue();
		}

		if ( $this->data[ ZTypeRegistry::Z_FUNCTION_RETURN_TYPE ] instanceof ZFunctionCall ) {
			return $this->data[ ZTypeRegistry::Z_FUNCTION_RETURN_TYPE ]->getReturnType();
		}

		return null;
	}

	/**
	 * Return the string value of its identity.
	 *
	 * @return string|null
	 */
	public function getIdentity() {
		$functionId = $this->data[ ZTypeRegistry::Z_FUNCTION_IDENTITY ];
		return ( $functionId instanceof ZReference )
			? $functionId->getZValue()
			: null;
	}

	/**
	 * Return an array with the argument declarations, or empty array if undefined
	 *
	 * @return array
	 */
	public function getArgumentDeclarations(): array {
		if ( !( $this->data[ ZTypeRegistry::Z_FUNCTION_ARGUMENTS ] instanceof ZTypedList ) ) {
			return [];
		}
		return $this->data[ ZTypeRegistry::Z_FUNCTION_ARGUMENTS ]->getAsArray();
	}

	/**
	 * Get the Z8K3/Testers and return a list of ZIDs for them.
	 *
	 * @return string[]
	 * @throws ZErrorException from ZObjectFactory::create
	 */
	public function getTesterZids() {
		return $this->getAssociatedZids( ZTypeRegistry::Z_FUNCTION_TESTERS );
	}

	/**
	 * Get the Z8K4/Implementations and return a list of ZIDs for them.
	 *
	 * @return string[]
	 * @throws ZErrorException from ZObjectFactory::create
	 */
	public function getImplementationZids() {
		return $this->getAssociatedZids( ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS );
	}

	/**
	 * @param string $key One of ZTypeRegistry::Z_FUNCTION_IMPLEMENTATIONS or ZTypeRegistry::Z_FUNCTION_TESTERS
	 * @return string[]
	 * @throws ZErrorException from ZObjectFactory::create
	 */
	private function getAssociatedZids( $key ) {
		$zids = [];
		$associatedList = $this->getValueByKey( $key );

		if ( !$associatedList ) {
			return [];
		}

		'@phan-var \MediaWiki\Extension\WikiLambda\ZObjects\ZTypedList $associatedList';
		$associatedArray = $associatedList->getAsArray();

		foreach ( $associatedArray as $item ) {
			if ( is_string( $item ) ) {
				$decodedJson = FormatJson::decode( $item );
				// If not JSON, assume we have received a ZID.
				if ( $decodedJson ) {
					$item = ZObjectFactory::create( $decodedJson );
				} else {
					$item = new ZReference( $item );
				}
			}

			switch ( $item->getZType() ) {
				case ZTypeRegistry::Z_REFERENCE:
					'@phan-var ZReference $item';
					$zids[] = $item->getZValue();
					break;
				case ZTypeRegistry::Z_PERSISTENTOBJECT:
					'@phan-var ZPersistentObject $item';
					$zids[] = $item->getZid();
					break;
				default:
					$zids[] = ZTypeRegistry::Z_NULL_REFERENCE;
			}
		}
		return $zids;
	}
}
