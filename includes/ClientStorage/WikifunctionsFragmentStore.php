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

	/*
	 * Builds the client storage key for a given fragment function call.
	 *
	 * Note that we can't use ZObjectUtils::makeCacheKeyFromZObject here, as
	 * that's repo-mode only. This means that this cache key doesn't have the
	 * revision IDs of the referenced ZObjects.
	 *
	 * The input object is an array with the necessary information to identify
	 * the embedded fragment. Different cache implementations can choose to
	 * use these differently. For example, the Memcached implementation uses
	 * dynamic temporal arguments for the key, while the MainStash
	 * implementation uses the original temporal input values to avoid
	 * invalidating the cache entry daily.
	 *
	 * E.g.:
	 * [
	 *	 target: 'Z20744',
	 *	 arguments: [
	 *		 Z20744K1: '17-10-2014',
	 *		 Z20744K2: '25-08-2026',
	 *	 ],
	 *	 parseLang: 'en',
	 *	 renderLang: 'en',
	 *	 temporalArgs: [ 'Z20744K2' ]
	 * ]
	 *
	 * @param array $functionCall
	 * @return string
	 */
	abstract protected function makeFragmentKey( array $functionCall ): string;

	/**
	 * Returns the rendered and stored fragment result of running a Wikifunctions
	 * parser function `{{#function:zid|...}}` from a client wiki.
	 * This getter is called from the WikifunctionsPFragmentHandler::sourceToFragment.
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
	 * Z89 for html). Also contains the date time that this value was rendered:
	 *
	 * E.g.: [
	 *   'success' => true,
	 *   'value' => '<b>fragment result</b>',
	 *   'type' => 'Z89',
	 *   'renderDate' => '20220827050200'
	 * ]
	 *
	 * When the fragment failed, it contains the key 'errorMessageKey'
	 *
	 * E.g.: [
	 *   'success' => false,
	 *   'errorMessageKey' => 'some-error-message-key',
	 *   'renderDate' => '20220827050200'
	 * ]
	 *
	 * Different implementations may handle temporal arguments differently before
	 * fetching from the backend and determine staleness before returning the stored
	 * value.
	 *
	 * @param array $functionCall
	 * @return ?array
	 */
	abstract public function getRenderedFragment( array $functionCall ): ?array;

	/**
	 * Store a rendered fragment, either a successful or a failed one.
	 *
	 * E.g.: [
	 *   'success' => true,
	 *   'value' => '<b>fragment result</b>',
	 *   'type' => 'Z89',
	 *   'renderDate' => '20220827050200'
	 * ]
	 *
	 * E.g.: [
	 *   'success' => false,
	 *   'errorMessageKey' => 'some-error-message-key',
	 *   'renderDate' => '20220827050200'
	 * ]
	 *
	 * Different implementations may apply different TTL strategies or pre-process
	 * the value before writing to the backend.
	 *
	 * @param array $functionCall
	 * @param array $value
	 * @param int $httpStatusCode
	 * @return bool
	 */
	abstract public function setRenderedFragment( array $functionCall, array $value, int $httpStatusCode ): bool;

	/**
	 * Deletes a value from the backend. Different backends might have different
	 * strategies for deletion. E.g. One backend might require the use of a store
	 * deletion operation, while other backends might require setting the value to
	 * a tombstone.
	 *
	 * @param string $key
	 * @return bool
	 */
	abstract protected function delete( string $key ): bool;

	/**
	 * Determines if the stored fragment is stale and should be enqueued for
	 * re-render. By default, fragments are never considered stale. Subclasses
	 * may override this method to implement their own staleness logic.
	 *
	 * Input fragment contains the expanded call, E.g.:
	 * [
	 *	 target: 'Z20744',
	 *	 arguments: [
	 *		 Z20744K1: '17-10-2014',
	 *		 Z20744K2: '25-08-2026',
	 *	 ],
	 *	 parseLang: 'en',
	 *	 renderLang: 'en',
	 *	 temporalArgs: [ 'Z20744K2' ]
	 * ]
	 *
	 * Value contains the stored fragment response (sucessful or failed), E.g.:
	 * [
	 *   'success' => true,
	 *   'value' => '<b>fragment result</b>',
	 *   'type' => 'Z89',
	 *   'renderDate' => '20220827050200'
	 * ]
	 *
	 * @param array $fragment
	 * @param array $value
	 * @return bool
	 */
	public function isStaleFragment( array $fragment, array $value ): bool {
		return false;
	}

	/**
	 * Validates a raw value fetched from the backend.
	 * Returns the fragment array if well-formed, or null on miss or corruption
	 * (deleting corrupted entries as a side effect).
	 *
	 * Shared by all implementations so the structural contract of the stored
	 * fragment is enforced consistently regardless of backend.
	 *
	 * @param string $key
	 * @param mixed $storedValue
	 * @return ?array
	 */
	protected function validateStoredFragment( string $key, mixed $storedValue ): ?array {
		if ( $storedValue === false ) {
			$this->logger->info( __METHOD__ . ' miss while fetching {key}', [ 'key' => $key ] );
			return null;
		}

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

		if ( !$storedValue['success'] && (
			!array_key_exists( 'errorMessageKey', $storedValue ) ||
			!is_string( $storedValue['errorMessageKey'] )
		) ) {
			return $this->warnDeleteAndExit( $key,
				'WikiLambda client fragment for {key} is missing error message key string, deleting it',
			);
		}

		return $storedValue;
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
