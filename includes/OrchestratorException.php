<?php
/**
 * WikiLambda OrchestratorException
 *
 * Wraps any network transport-related exceptions throwhn by the OrchestratorRequest guzzle request.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Exception;
use Throwable;

class OrchestratorException extends Exception {

	/**
	 * @param string $message
	 * @param array $request
	 * @param ?int $code
	 * @param ?Throwable $previous
	 */
	public function __construct(
		string $message,
		private readonly array $request = [],
		?int $code = 0,
		?Throwable $previous = null
	) {
		parent::__construct( $message, $code ?? 0, $previous );
	}

	/**
	 * @return array
	 */
	public function getRequest(): array {
		return $this->request;
	}
}
