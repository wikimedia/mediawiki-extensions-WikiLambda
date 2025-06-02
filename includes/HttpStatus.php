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
	public const UNPROCESSABLE_ENTITY = 422;
	public const TOO_MANY_REQUESTS = 429;

	// 5xx Server Errors
	public const INTERNAL_SERVER_ERROR = 500;
	public const NOT_IMPLEMENTED = 501;
	public const BAD_GATEWAY = 502;
	public const SERVICE_UNAVAILABLE = 503;
	public const GATEWAY_TIMEOUT = 504;
}
