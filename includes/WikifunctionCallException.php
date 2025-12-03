<?php
/**
 * WikiLambda extension specialised Exception wrapper for a remote call issue
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Extension\WikiLambda\ZObjects\ZError;

class WikifunctionCallException extends ZErrorException {

	private string $errorMessageKey;
	private int $httpStatusCode;

	/**
	 * @param ZError $error
	 * @param string $errorMessageKey
	 * @param int $httpStatusCode
	 */
	public function __construct( ZError $error, string $errorMessageKey, int $httpStatusCode = HttpStatus::OK ) {
		parent::__construct( $error );

		$this->errorMessageKey = $errorMessageKey;
		$this->httpStatusCode = $httpStatusCode;
	}

	public function getErrorMessageKey(): string {
		return $this->errorMessageKey;
	}

	public function getHttpStatusCode(): int {
		return $this->httpStatusCode;
	}
}
