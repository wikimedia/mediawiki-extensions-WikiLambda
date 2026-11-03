<?php
/**
 * WikiLambda wrapper for authorization status
 *
 * @file
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Authorization;

use MediaWiki\Extension\WikiLambda\ZObjects\ZError;

class AuthorizationStatus {

	/**
	 * @var bool
	 */
	private $isValid = true;

	/**
	 * @var ZError|null
	 */
	private $errors = null;

	/**
	 * @param ZError $error
	 */
	public function setUnauthorized( $error ): void {
		$this->isValid = false;
		$this->errors = $error;
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
