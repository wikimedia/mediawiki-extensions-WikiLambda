<?php
/**
 * WikiLambda interface for structural validation
 *
 * @file
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Validation;

use MediaWiki\Extension\WikiLambda\Registry\ZErrorTypeRegistry;
use MediaWiki\Extension\WikiLambda\ZErrorException;
use MediaWiki\Extension\WikiLambda\ZErrorFactory;

class ZObjectStructureValidator {

	/**
	 * @var SchemaWrapper
	 */
	private $validator = null;

	/**
	 * @param SchemaWrapper $validator
	 */
	private function __construct( $validator ) {
		$this->validator = $validator;
	}

	/**
	 * Uses function-schemata SchemaFactory to create a canonical validator for
	 * a given type, and wraps the SchemaWrapper validate function with other utilities
	 * to read and parse Opis errors and convert them to system ZErrors
	 *
	 * @param string $type
	 * @return ZObjectStructureValidator
	 * @throws ZErrorException
	 */
	public static function createCanonicalValidator( $type ) {
		$validator = ( SchemaFactory::getCanonicalFormFactory() )->create( $type );
		if ( $validator === null ) {
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
	 * a given type, and wraps the SchemaWrapper validate function with other utilities
	 * to read and parse Opis errors and convert them to system ZErrors
	 *
	 * @param string $type
	 * @return ZObjectStructureValidator
	 * @throws ZErrorException
	 */
	public static function createNormalValidator( $type ) {
		$validator = ( SchemaFactory::getNormalFormFactory() )->create( $type );
		if ( $validator === null ) {
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
		return new ValidationStatus( $this->validator->validate( $input ) );
	}
}
