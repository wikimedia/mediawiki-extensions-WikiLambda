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

	/**
	 * @param ZError $error
	 * @param string $errorMessageKey
	 */
	public function __construct( ZError $error, string $errorMessageKey ) {
		parent::__construct( $error );

		$this->errorMessageKey = $errorMessageKey;
	}

	public function getErrorMessageKey(): string {
		return $this->errorMessageKey;
	}
}
