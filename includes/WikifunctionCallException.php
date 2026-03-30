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

	/**
	 * @param string $msg
	 * @param int $httpStatusCode
	 * @param ?stdClass $zerror
	 * @param array $params
	 */
	public function __construct(
		private readonly string $msg,
		private readonly int $httpStatusCode = HttpStatus::BAD_REQUEST,
		private readonly ?stdClass $zerror = null,
		private readonly array $params = []
	) {
		parent::__construct( $this->getMessageObject()->text() );
	}

	/**
	 * @return Message
	 */
	public function getMessageObject(): Message {
		return wfMessage( $this->msg, $this->params );
	}

	/**
	 * @return string
	 */
	public function getMessageKey(): string {
		return $this->msg;
	}

	/**
	 * @return int
	 */
	public function getHttpStatusCode(): int {
		return $this->httpStatusCode;
	}

	/**
	 * @return stdClass|null
	 */
	public function getZError() {
		return $this->zerror;
	}

	/**
	 * Whether this exception wraps a ZError.
	 *
	 * @return bool
	 */
	public function hasZError(): bool {
		return is_object( $this->zerror );
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
	 * @return string|null
	 */
	public function getZErrorType() {
		return $this->hasZError() ? $this->zerror->Z5K1 : null;
	}

	/**
	 * Serializes the exception as an associative array.
	 *
	 * @return array
	 */
	public function toArray(): array {
		return [
			'msg' => $this->msg,
			'httpStatusCode' => $this->httpStatusCode,
			'zerror' => $this->zerror,
			'params' => $this->params,
		];
	}

	/**
	 * Static method to build a WikifunctionCallException
	 * instance from a given associative array.
	 *
	 * @param array $data
	 * @return WikifunctionCallException
	 */
	public static function fromArray( $data ): WikifunctionCallException {
		$zerror = null;

		if ( $data[ 'zerror' ] !== null ) {
			// Convert zerror to stdClass
			$zerror = json_decode( json_encode( $data[ 'zerror' ] ) );
		}

		return new self(
			$data[ 'msg' ],
			$data[ 'httpStatusCode' ] ?? HttpStatus::BAD_REQUEST,
			$zerror,
			$data[ 'params' ] ?? []
		);
	}
}
