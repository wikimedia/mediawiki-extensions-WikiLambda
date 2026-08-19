<?php
/**
 * WikiLambda Wikifunctions Client - Abstract service class for Wikifunctions fragment storage.
 *
 * This store provides access to the stored results of `{{#function:…}}` parser function
 * calls made on client wikis, whether they are held in ephemeral storage or durable.
 *
 * Fragments are:
 * * Written by WikifunctionsClientRequestJob, once the orchestrator has responded.
 * * Read by WikifunctionsPFragmentHandler, on every parse of a page using the parser function.
 *
 * NOTE:
 * This class isolates the storage layer from its callers, so that the backend store can
 * be changed (Memcached, MainStash) without touching the parser function code paths.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\ClientStorage;

use Psr\Log\LoggerInterface;

abstract class WikifunctionsFragmentStore {

	public const CLIENT_FUNCTIONCALL_CACHE_KEY_PREFIX = 'WikiLambdaClientFunctionCall';

	protected LoggerInterface $logger;

	public function __construct( LoggerInterface $logger ) {
		$this->logger = $logger;
	}

	/**
	 * Builds the client storage key for a given function call.
	 *
	 * Note that we can't use ZObjectUtils::makeCacheKeyFromZObject here, as
	 * that's repo-mode only. This means that this cache key doesn't have the
	 * revision IDs of the referenced ZObjects.
	 *
	 * @param array $functionCall
	 * @return string
	 */
	abstract public function makeFragmentKey( array $functionCall ): string;

	/**
	 * Read a raw value from the backend storage layer.
	 * Returns array on a hit and null on a miss.
	 *
	 * @param string $key
	 * @return mixed
	 */
	abstract protected function get( string $key ): mixed;

	/**
	 * Write a raw value to the backend.
	 *
	 * @param string $key
	 * @param array $value
	 * @param int $ttl Expiry in seconds. Must be a positive integer: MainStash
	 *   does not evict, so an unbounded TTL would accumulate rows indefinitely.
	 * @return bool
	 */
	abstract protected function set( string $key, array $value, int $ttl ): bool;

	/**
	 * Delete a value from the backend.
	 *
	 * @param string $key
	 * @return bool
	 */
	abstract protected function delete( string $key ): bool;

	/**
	 * Returns the appropriate TTL depending on the rendered value and http
	 * response code from Wikifunctions orchestrator service.
	 *
	 * Different TTLs might be more or less appropriate depending on the backend
	 * storage layer, so this method should be implemented by the inheriting class
	 *
	 * @param array $value
	 * @param int $httpStatusCode
	 * @return int
	 */
	abstract protected function getFragmentTTL( array $value, int $httpStatusCode ): int;

	/**
	 * Returns the rendered and stored fragment result of running a Wikifunctions
	 * parser function `{{#function:zid|...}}` from a client wiki, given its key.
	 * This getter is called from the WikifunctionsPFragmentHandler::sourceToFragment.
	 *
	 * Uses the implementation of the nuclear operations get and delete provided
	 * by each of the different storage backends.
	 *
	 * When miss, it returns null.
	 *
	 * When there's a hit, it performs a superficial validation of the stored fragment;
	 * if malformed, returns null and the stored value is deleted.
	 *
	 * A valid stored fragment can be decoded into an array with a 'success' key, which
	 * determines whether the fragment was successfully rendered or returned an error.
	 * In the case of a successfully rendered fragment, the array contains the keys
	 * 'value' and 'type', with the output and the output format (Z6 for plain text or
	 * Z89 for html):
	 *
	 * E.g.: [
	 *   'success' => true,
	 *   'value' => '<b>fragment result</b>',
	 *   'type' => 'Z89'
	 * ]
	 *
	 * When the fragment failed, it contains the key 'errorMessageKey'
	 *
	 * E.g.: [
	 *   'success' => false,
	 *   'errorMessageKey' => 'error-message-key'
	 * ]
	 *
	 * @param string $key
	 * @return ?array
	 */
	public function getRenderedFragment( string $key ): ?array {
		$storedValue = $this->get( $key );

		// If value is false, that's a miss
		if ( $storedValue === false ) {
			$this->logger->info( __METHOD__ . ' miss while fetching {key}', [ 'key' => $key ] );
			return null;
		}

		// Check for corrupted/invalid cache entries and delete them rather than returning them
		if ( !is_array( $storedValue ) ) {
			return $this->warnDeleteAndExit( $key,
				'WikiLambda client fragment for {key} is mal-formed, deleting it',
			);
		}

		if ( !array_key_exists( 'success', $storedValue ) || !is_bool( $storedValue['success'] ) ) {
			return $this->warnDeleteAndExit( $key,
				'WikiLambda client fragment for {key} is missing success boolean, deleting it',
			);
		}

		// Check value and type keys for successful fragment
		if ( $storedValue['success'] && (
			!array_key_exists( 'value', $storedValue ) ||
			!array_key_exists( 'type', $storedValue ) ||
			!is_string( $storedValue['value'] ) ||
			!is_string( $storedValue['type'] )
		) ) {
			return $this->warnDeleteAndExit( $key,
				'WikiLambda client fragment for {key} is missing value or type, deleting it',
			);
		}

		// Check errorMessageKey for failed fragment
		if ( !$storedValue['success'] && (
			!array_key_exists( 'errorMessageKey', $storedValue ) ||
			!is_string( $storedValue['errorMessageKey'] )
		) ) {
			return $this->warnDeleteAndExit( $key,
				'WikiLambda client fragment for {key} is missing error message key string, deleting it',
			);
		}

		// Stored fragment has the right format
		return $storedValue;
	}

	/**
	 * Store a rendered fragment.
	 *
	 * $value is either a successful render:
	 *   [ 'success' => true, 'value' => '…', 'type' => 'Z89' ]
	 * or a failure:
	 *   [ 'success' => false, 'errorMessageKey' => 'some-error-msg-code' ]
	 *
	 * @param string $key
	 * @param array $value
	 * @param int $httpStatusCode
	 * @return bool
	 */
	public function setRenderedFragment( string $key, array $value, int $httpStatusCode ): bool {
		return $this->set(
		   $key,
		   $value,
		   $this->getFragmentTTL( $value, $httpStatusCode )
		);
	}

	/**
	 * Helper that handles exit sequence when corrupted or malformed fragments are stored:
	 * Logs a warning, deletes the entry and exits with null.
	 *
	 * @param string $key
	 * @param string $message
	 * @return null
	 */
	private function warnDeleteAndExit( string $key, string $message ): null {
		$this->logger->warning( $message, [ 'key' => $key ] );
		$this->delete( $key );
		return null;
	}
}
