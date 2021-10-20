<?php
/**
 * WikiLambda class wrapping a schema validator
 *
 * @file
 * @copyright 2020–2021 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Validation;

use Opis\JsonSchema\ISchema;
use Opis\JsonSchema\ValidationResult;
use Opis\JsonSchema\Validator;

class SchemaWrapper {
	/**
	 * @var ISchema
	 */
	private $schema;

	/**
	 * @var Validator
	 */
	private $validator;

	/**
	 * @param ISchema $schema
	 * @param Validator $validator
	 */
	public function __construct( ISchema $schema, Validator $validator ) {
		$this->schema = $schema;
		$this->validator = $validator;
	}

	/**
	 * @param mixed $maybeValid JSON array-like object to validate
	 * @param int $maxErrors
	 * @return ValidationResult
	 */
	public function validate( $maybeValid, $maxErrors = 1 ): ValidationResult {
		return $this->validator->schemaValidation(
			$maybeValid,
			$this->schema,
			$maxErrors
		);
	}
}
