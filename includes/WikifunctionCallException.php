<?php
/**
 * WikiLambda extension specialised Exception wrapper for a remote call issue.
 *
 * This exception is designed to be used in Client settings, for example:
 * * On a Client wiki that runs embedded fragments, or
 * * On Abstract Wiki, who uses ZObjects from Wikifunctions
 *
 * While this Exception might contain Z5/Error objects returned by Wikifunctions,
 * it must not use ZObjectFactory::create methods, as ZObjectFactory is currently
 * tightly coupled with the assumption that referred objects are stored locally.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Exception;
use MediaWiki\Message\Message;
use stdClass;

class WikifunctionCallException extends Exception {

	// Http status code (if applicable)
	private int $httpStatusCode;

	// Error message code and parameters
	private string $msg;
	private array $params;

	// ZError data (if applicable)
	private ?stdClass $errorData;

	/**
	 * @param string $msg
	 * @param int $httpStatusCode
	 * @param ?stdClass $errorData
	 * @param array $params
	 */
	public function __construct(
		string $msg,
		int $httpStatusCode = HttpStatus::BAD_REQUEST,
		?stdClass $errorData = null,
		array $params = []
	) {
		$this->msg = $msg;
		$this->params = $params;

		$this->httpStatusCode = $httpStatusCode;
		$this->errorData = $errorData;

		parent::__construct( $this->getMessageObject()->text() );
	}

	public function getMessageObject(): Message {
		return wfMessage( $this->msg, $this->params );
	}

	public function getMessageKey(): string {
		return $this->msg;
	}

	public function getHttpStatusCode(): int {
		return $this->httpStatusCode;
	}

	/**
	 * If this exception contains a ZError, return 'wikilambda-zerror',
	 * else, return the message key.
	 *
	 * @return bool
	 */
	public function hasZError(): bool {
		return is_object( $this->errorData ) && property_exists( $this->errorData, 'zerror' );
	}

	/**
	 * If this exception contains a ZError, return 'wikilambda-zerror',
	 * else, return the message key.
	 *
	 * @return string
	 */
	public function getErrorCode(): string {
		return $this->hasZError() ? 'wikilambda-zerror' : $this->msg;
	}

	/**
	 * @return stdClass|null
	 */
	public function getZError() {
		return $this->hasZError() ? $this->errorData->zerror : null;
	}

	/**
	 * @return string|null
	 */
	public function getZErrorType() {
		return $this->hasZError() ? $this->errorData->zerror->Z5K1 : null;
	}

	/**
	 * @return array
	 */
	public function getErrorData() {
		return [
			'msg' => $this->msg,
			'params' => $this->params,
			'zerror' => $this->getZError(),
			'zerrorType' => $this->getZErrorType()
		];
	}
}
