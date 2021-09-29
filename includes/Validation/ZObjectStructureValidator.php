<?php
/**
 * WikiLambda interface for structural validation
 *
 * @file
 * @copyright 2020–2021 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Validation;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use Mediawiki\Services\Wikilambda\FunctionSchemata\ISchema;
use Mediawiki\Services\Wikilambda\FunctionSchemata\SchemaFactory;

class ZObjectStructureValidator {

	/**
	 * @var ISchema
	 */
	private $validator = null; // @phan-suppress-current-line PhanUndeclaredTypeProperty function-schemata

	/**
	 * @param ISchema $validator
	 */
	// @phan-suppress-next-line PhanUndeclaredTypeParameter function-schemata
	private function __construct( $validator ) {
		$this->validator = $validator;
	}

	/**
	 * Uses function-schemata SchemaFactory to create a canonical validator for
	 * a given type, and wraps the ISchema validate function with other utilities
	 * to read and parse Opis errors and convert them to system ZErrors
	 *
	 * @param string $type
	 * @return ZObjectStructureValidator
	 * @throws ZErrorException
	 */
	public static function createCanonicalValidator( $type ) {
		// @phan-suppress-next-line PhanUndeclaredClassMethod SchemaFactory in function-schemata
		$validator = ( SchemaFactory::getCanonicalFormFactory() )->create( $type );
		if ( $validator == null ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZTYPE_NOT_FOUND,
					[ 'type' => $type ]
				)
			);
		}
		return new ZObjectStructureValidator( $validator );
	}

	/**
	 * Uses function-schemata SchemaFactory to create a normal validator for
	 * a given type, and wraps the ISchema validate function with other utilities
	 * to read and parse Opis errors and convert them to system ZErrors
	 *
	 * @param string $type
	 * @return ZObjectStructureValidator
	 * @throws ZErrorException
	 */
	public static function createNormalValidator( $type ) {
		// @phan-suppress-next-line PhanUndeclaredClassMethod SchemaFactory in function-schemata
		$validator = ( SchemaFactory::getNormalFormFactory() )->create( $type );
		if ( $validator == null ) {
			throw new ZErrorException(
				ZErrorFactory::createZErrorInstance(
					ZErrorTypeRegistry::Z_ERROR_ZTYPE_NOT_FOUND,
					[ 'type' => $type ]
				)
			);
		}
		return new ZObjectStructureValidator( $validator );
	}

	/**
	 * @param \stdClass $input
	 * @return ValidationStatus
	 */
	public function validate( $input ): ValidationStatus {
		// @phan-suppress-next-line PhanUndeclaredClassMethod ISchema in function-schemata
		return new ValidationStatus( $this->validator->validate( $input ) );
	}
}
