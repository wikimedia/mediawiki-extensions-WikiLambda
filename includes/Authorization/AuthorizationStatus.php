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
	 * @var string
	 */
	private $failedRight;

	/**
	 * @var ZError|null
	 */
	private $errors = null;

	/**
	 * @param string $right
	 * @param ZError $error
	 */
	public function setUnauthorized( $right, $error ): void {
		$this->isValid = false;
		$this->failedRight = $right;
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
