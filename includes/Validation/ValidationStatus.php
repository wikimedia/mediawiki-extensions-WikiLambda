<?php
/**
 * WikiLambda interface for validation status
 *
 * @file
 * @copyright 2020–2021 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Validation;

use MediaWiki\Extension\WikiLambda\ZErrorFactory;
use MediaWiki\Extension\WikiLambda\ZObjects\ZError;
use Opis\JsonSchema\ValidationError;
use Opis\JsonSchema\ValidationResult;

class ValidationStatus {

	/**
	 * @var bool
	 */
	private $isValid;

	/**
	 * @var ZError|null
	 */
	private $errors = null;

	/**
	 * @var ValidationError[]
	 */
	private $parserErrors = []; // @phan-suppress-current-line PhanUndeclaredTypeProperty

	/**
	 * @param ValidationResult $validationResult
	 */
	// @phan-suppress-next-line PhanUndeclaredTypeParameter
	public function __construct( $validationResult ) {
		// @phan-suppress-next-line PhanUndeclaredClassMethod opis currently not available
		$this->isValid = $validationResult->isValid();

		// @phan-suppress-next-line PhanUndeclaredClassMethod opis currently not available
		if ( $validationResult->hasErrors() ) {
			// @phan-suppress-next-line PhanUndeclaredClassMethod opis currently not available
			$this->parserErrors = $validationResult->getErrors();
			$errors = ZErrorFactory::buildStructureValidationZError( $this->parserErrors );
			if ( $errors !== false ) {
				$this->errors = $errors;
			} else {
				$this->errors = ZErrorFactory::createUnknownValidationError( 'Unidentified error' );
			}
		}
	}

	/**
	 * @return bool
	 */
	public function isValid(): bool {
		return $this->isValid;
	}

	/**
	 * @return ZError|null
	 */
	public function getErrors() {
		return $this->errors;
	}
}
