<?php
/**
 * WikiLambda memcached access wrapper
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Cache;

use InvalidArgumentException;
use MediaWiki\Config\Config;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use Memcached;
use Psr\Log\LoggerInterface;
use Wikimedia\ObjectCache\BagOStuff;

class MemcachedWrapper implements \Wikimedia\LightweightObjectStore\ExpirationAwareness {

	private const TOMBSTONE = '__WIKILAMBDA_TOMBSTONE__';

	/** @var array<string,array{0:Memcached|BagOStuff,1:string}> */
	private array $services = [];

	private string $broadcastRoute = '';

	private LoggerInterface $logger;

	/**
	 * This is a simple direct wrapper around Memcached that allows us to use multiple configured memcached services,
	 * with different assumptions to those that MediaWiki's BagO'Stuff (and especially WANObjectCache) make. It will
	 * check each service in order for a key, and return the first value it finds, later, but for now it only will go
	 * to the local service. When setting or deleting a key, it will set/delete it via the broadcast route. Deletion
	 * is implemented by setting a tombstone value with a short TTL instead of actually deleting the key, to prevent
	 * cache penetration while allowing the key to eventually be fully removed from the cache.
	 *
	 * @param Config $config
	 */
	public function __construct( private readonly Config $config ) {
		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaCache' );

		$configuredCaches = $this->config->get( 'WikiLambdaObjectCaches' );

		foreach ( $configuredCaches as $serviceName => $serviceConfig ) {
			$prefix = $serviceConfig['prefix'] ?? "/$serviceName/";
			$this->logger->debug(
				'Constructing a cache {serviceName} with prefix {prefix}',
				[ 'serviceName' => $serviceName, 'prefix' => $prefix ]
			);

			$memcached = new Memcached();
			if ( isset( $serviceConfig['server'] ) ) {
				// Parse the server address (host:port or UDS path) using the same logic as
				// MemcachedPeclBagOStuff, to ensure config compatibility.
				if ( preg_match( '/^\[(.+)\]:(\d+)$/', $serviceConfig['server'], $m ) ) {
					// (ipv6, port)
					$host = $m[1];
					$port = (int)$m[2];
				} elseif ( preg_match( '/^([^:]+):(\d+)$/', $serviceConfig['server'], $m ) ) {
					// (ipv4 or domain name, port)
					$host = $m[1];
					$port = (int)$m[2];
				} else {
					// (socket path, no port)
					$host = $serviceConfig['server'];
					$port = false;
				}
			} else {
				// Deprecated: use 'server' instead of 'host' and 'port'.
				$host = $serviceConfig['host'];
				$port = (int)$serviceConfig['port'];
			}
			$memcached->addServer( $host, $port );

			$this->services[$serviceName] = [ $memcached, $prefix ];
		}

		if ( count( $this->services ) === 0 ) {
			$this->logger->info( 'No memcached services configured, falling back to MW\'s main BagOStuff' );

			$this->services['main'] = [ MediaWikiServices::getInstance()->getMainObjectStash(), 'wikilambda:' ];
			$this->broadcastRoute = 'wikilambda:';
			return;
		}

		$configuredBroadcast = $this->config->get( 'WikiLambdaObjectCacheBroadcast' );
		if ( $configuredBroadcast !== null ) {
			$this->logger->debug( 'Setting broadcast cache route as {bcast}', [ 'bcast' => $configuredBroadcast ] );
			$this->broadcastRoute = $configuredBroadcast;
		}

		if ( $this->broadcastRoute === '' ) {
			$this->logger->warning( 'No broadcast cache route configured, falling back to first known cache' );
			$this->broadcastRoute = array_key_first( $this->services );
		}

		$this->logger->debug( 'Finished constructing {count} caches', [ 'count' => count( $this->services ) ] );
	}

	/**
	 * Checks the local memcached service and returns the value for the given key.
	 *
	 * @param string $key The key to retrieve
	 * @return mixed The value associated with the key from the DC-local memcached service, or false if the key
	 *   is not found.
	 */
	public function get( string $key ): mixed {
		$this->logger->debug( __METHOD__ . ': cache check for {key}', [ 'key' => $key ] );

		// Get only our DC local service.
		$localServiceName = array_key_first( $this->services );
		[ $localService, $localPrefix ] = $this->services[ $localServiceName ];

		// TODO: Consider checking the remote service(s) too.

		$targetKey = $localPrefix . $key;

		$value = $localService->get( $targetKey );
		if (
			( $localService instanceof Memcached && $localService->getResultCode() === Memcached::RES_SUCCESS ) ||
			( $localService instanceof BagOStuff && $value !== false )
		) {
			if ( $value === self::TOMBSTONE ) {
				$this->logger->debug(
					__METHOD__ . ': cache tombstone found for prefixed {key} from {service}, setting as cache miss',
					[ 'key' => $targetKey, 'service' => $localServiceName ]
				);
				return false;
			}
			$this->logger->debug(
				__METHOD__ . ': cache hit for prefixed {key} from {service}',
				[ 'key' => $targetKey, 'service' => $localServiceName ]
			);
			return $value;
		}
		$this->logger->debug(
			__METHOD__ . ': cache miss for prefixed {key} from {service}',
			[ 'key' => $targetKey, 'service' => $localServiceName ]
		);
		return false;
	}

	/**
	 * Attempt to set the given key via the broadcast route. We use mcrouter to convey this across service(s).
	 *
	 * @param string $key The key to set
	 * @param mixed $value The value to set
	 * @param int $ttl Time to live in seconds (default 60*60*24*30 seconds = 30 days)
	 * @return bool Whether the set operation succeeded
	 */
	public function set( string $key, mixed $value, int $ttl = self::TTL_MONTH ): bool {
		if ( $this->broadcastRoute === '' ) {
			$this->logger->warning( __METHOD__ . ': no broadcast cache configured!' );
			return false;
		}

		$localServiceName = array_keys( $this->services )[0];

		// Note: We ignore the local prefix, as we're using the broadcast route instead.
		$localService = $this->services[$localServiceName][0];

		$this->logger->debug(
			__METHOD__ . ': setting {key} on local server {localService} with broadcast cache route {route}',
			[ 'key' => $key, 'localService' => $localServiceName, 'route' => $this->broadcastRoute ]
		);

		$success = $localService->set( $this->broadcastRoute . $key, $value, $ttl );

		if ( !$success ) {
			$this->logger->warning(
				__METHOD__ . ': failed to set broadcast prefixed {key} on {service} with error {code}: {err}',
				[
					'key' => $this->broadcastRoute . $key,
					'service' => $localServiceName,
					'code' => ( $localService instanceof Memcached ? $localService->getResultCode() : '?' ),
					'err' => ( $localService instanceof Memcached ? $localService->getResultMessage() : '?' ),
				]
			);
		} else {
			$this->logger->debug(
				__METHOD__ . ': successfully set broadcast prefixed {key} on {service}',
				[ 'key' => $this->broadcastRoute . $key, 'service' => $localServiceName ]
			);

		}

		return $success;
	}

	/**
	 * Attempt to delete the given key via the broadcast route (setting a tombstone value)
	 *
	 * @param string $key The key to delete
	 * @return bool Whether the delete operation succeeded on the broadcast cache.
	 */
	public function delete( string $key ): bool {
		$this->logger->debug( __METHOD__ . ': deleting {key} by setting a tombstone value', [ 'key' => $key ] );
		return $this->set( $key, self::TOMBSTONE, self::TTL_MINUTE );
	}

	/**
	 * Utility method to create a cache key by concatenating parts with a colon.
	 * This is used to ensure consistent cache key formatting across the codebase.
	 *
	 * If the cache service is BagOStuff, fallback to its makeKey method to ensure
	 * that the constraints for each implementation of BagOStuff are followed.
	 *
	 * If the cache service is Memcached, implement its own logic for correct ASCII
	 * encoding and limited key size (250 characters max)
	 *
	 * @see MemcachedBagOStuff::makeKeyInternal
	 * @param string $prefix A prefix to identify the type of cache entry (e.g. 'functioncall')
	 * @param string ...$parts The parts to concatenate into a cache key
	 * @throws InvalidArgumentException If no parts are provided
	 * @return string The generated cache key
	 */
	public function makeKey( string $prefix, string ...$parts ): string {
		// Get only our DC local service.
		$localServiceName = array_key_first( $this->services );
		[ $localService, $localPrefix ] = $this->services[ $localServiceName ];

		// Fallback to their own makeKey logic when the service is BagOStuff
		// E.g. SqlBagOStuff keys have a maximum length of 250 characters
		if ( $localService instanceof BagOStuff ) {
			return $localService->makeKey( $prefix, ...$parts );
		}

		return $this->makeMemcachedKey( $prefix, ...$parts );
	}

	/**
	 * Utility method to create a cache key for a Memcached backed cache service.
	 * Concatenates all string parts and, if the result exceeds 205 characters
	 * (250 max, minus 45 for prefixes) hashes the parts and prepends the prefix.
	 *
	 * @param string $prefix A prefix to identify the type of cache entry (e.g. 'functioncall')
	 * @param string ...$parts The parts to concatenate into a cache key
	 * @return string The generated cache key
	 */
	protected function makeMemcachedKey( string $prefix, string ...$parts ): string {
		// Keep 45 characters for prefixes (e.g. 'wikilambda:WikiLambdaClientFunctionCall')
		$maxLength = 205;

		// Add the prefix as the last step, just in case we need to hash the parts
		$key = '';
		foreach ( $parts as $part ) {
			$part = strtr( $part ?? '', ' ', '_' );

			// Make sure %, #, and non-ASCII chars are escaped
			$part = preg_replace_callback(
				'/[^\x21-\x22\x24\x26-\x39\x3b-\x7e]+/',
				static fn ( $m ) => rawurlencode( $m[0] ),
				$part
			);

			$key .= ':' . $part;
		}

		// If the joint and encoded parts is larger than maxLength, hash it
		if ( strlen( $key ) > $maxLength ) {
			$key = '#' . hash( 'sha256', $key );
		}

		// Add the prefix; the result should not be longer than 250 characters
		return $prefix . ':' . $key;
	}
}
