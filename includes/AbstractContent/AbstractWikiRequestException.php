<?php
/**
 * WikiLambda extension Exception for an Abstract Wiki Request call
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\AbstractContent;

use Exception;
use MediaWiki\Extension\WikiLambda\HttpStatus;

class AbstractWikiRequestException extends Exception {

	private int $httpStatus;

	private string $msg;
	private array $params;

	public function __construct(
		string $msg,
		int $httpStatus = HttpStatus::BAD_REQUEST,
		array $params = [],
	) {
		$this->httpStatus = $httpStatus;

		$this->msg = $msg;
		$this->params = $params;
		$message = wfMessage( $msg, ...$params )->text();

		parent::__construct( $message );
	}

	public function getErrorMessageKey(): string {
		return $this->msg;
	}

	public function getHttpStatusCode(): int {
		return $this->httpStatus;
	}
}
