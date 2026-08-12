<?php
/**
 * WikiLambda utility file for error codes
 *
 * @file
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

class HttpStatus {
	// 2xx Success
	public const OK = 200;
	public const CREATED = 201;
	public const ACCEPTED = 202;
	public const NO_CONTENT = 204;

	// 4xx Client Errors
	public const BAD_REQUEST = 400;
	public const UNAUTHORIZED = 401;
	public const FORBIDDEN = 403;
	public const NOT_FOUND = 404;
	public const REQUEST_TIMEOUT = 408;
	public const CONFLICT = 409;
	public const UNPROCESSABLE_ENTITY = 422;
	public const TOO_MANY_REQUESTS = 429;

	// 5xx Server Errors
	public const INTERNAL_SERVER_ERROR = 500;
	public const NOT_IMPLEMENTED = 501;
	public const BAD_GATEWAY = 502;
	public const SERVICE_UNAVAILABLE = 503;
	public const GATEWAY_TIMEOUT = 504;

	/**
	 * Status codes for a function call that failed because the content is wrong: either the
	 * request itself, or one of the ZObjects that it uses. The same call keeps giving the same
	 * error until an editor changes the content, because nothing else can make it succeed.
	 *
	 * This is the only property that this list gives you. Callers decide what to do with it;
	 * e.g. they can cache the failure for longer, or log it more quietly than a failure that
	 * a retry can clear. This list says nothing about the other status codes: a code that is
	 * not here can be a temporary failure, but it can also be a different permanent one.
	 *
	 * The orchestrator sets its status codes from the Z5/Error type; see the mappings in
	 * function-schemata's `test_data/errors/http_status_mappings.yaml`.
	 */
	public const CONTENT_ERROR_CODES = [
		// e.g. Z518/ZObject type mismatch
		self::BAD_REQUEST,
		// e.g. Z504/ZID not found
		self::NOT_FOUND,
		// e.g. Z513/Resolved object without Z2K2
		self::CONFLICT,
		// e.g. Z500/Unspecified error
		self::UNPROCESSABLE_ENTITY,
	];
}
