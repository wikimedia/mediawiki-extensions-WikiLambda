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
use MediaWiki\Extension\WikiLambda\Metrics\StoreOpsMetrics;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use Memcached;
use Psr\Log\LoggerInterface;
use Wikimedia\ObjectCache\BagOStuff;
use Wikimedia\Stats\StatsFactory;

class MemcachedWrapper implements \Wikimedia\LightweightObjectStore\ExpirationAwareness {

	private const TOMBSTONE = '__WIKILAMBDA_TOMBSTONE__';

	/** @var array<string,array{0:Memcached|BagOStuff,1:string}> */
	private array $services = [];

	private string $broadcastRoute = '';

	private LoggerInterface $logger;

	private readonly StoreOpsMetrics $metrics;

	/**
	 * This is a simple direct wrapper around Memcached that allows us to use multiple configured memcached services,
	 * with different assumptions to those that MediaWiki's BagO'Stuff (and especially WANObjectCache) make. It will
	 * check each service in order for a key, and return the first value it finds, later, but for now it only will go
	 * to the local service. When setting or deleting a key, it will set/delete it via the broadcast route. Deletion
	 * is implemented by setting a tombstone value with a short TTL instead of actually deleting the key, to prevent
	 * cache penetration while allowing the key to eventually be fully removed from the cache.
	 *
	 * @param Config $config
	 * @param ?StatsFactory $statsFactory
	 */
	public function __construct( private readonly Config $config, ?StatsFactory $statsFactory = null ) {
		// Non-injected items
		$this->logger = LoggerFactory::getInstance( 'WikiLambdaCache' );
		$this->metrics = new StoreOpsMetrics( 'memcached', $statsFactory );

		$configuredCaches = $this->config->get( 'WikiLambdaObjectCaches' );

		foreach ( $configuredCaches as $serviceName => $serviceConfig ) {
			$prefix = $serviceConfig['prefix'] ?? "/$serviceName/";
			$this->logger->debug(
				'Constructing a cache {serviceName} with prefix {prefix}',
				[ 'serviceName' => $serviceName, 'prefix' => $prefix ]
			);

			$memcached = new Memcached();
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
	 * Records a store operation's outcome and latency for observability.
	 *
	 * Unlabelled calls (empty $storeLabel) are skipped.
	 *
	 * @param string $storeLabel Identifies the calling store, e.g. 'aw_fragment'
	 * @param string $op One of 'get', 'set', 'delete'
	 * @param string $outcome One of 'hit', 'miss', 'success', 'failure'
	 * @param int $startTimeNs As returned by hrtime( true ) at the start of the operation
	 */
	private function recordOp( string $storeLabel, string $op, string $outcome, int $startTimeNs ): void {
		if ( $storeLabel === '' ) {
			return;
		}
		$this->metrics->recordOp( $storeLabel, $op, $outcome, $startTimeNs );
	}

	/**
	 * Checks the local memcached service and returns the value for the given key.
	 *
	 * @param string $key The key to retrieve
	 * @param string $storeLabel Identifies the calling store, for observability (e.g. 'aw_fragment')
	 * @return mixed The value associated with the key from the DC-local memcached service, or false if the key
	 *   is not found.
	 */
	public function get( string $key, string $storeLabel = '' ): mixed {
		$this->logger->debug( __METHOD__ . ': cache check for {key}', [ 'key' => $key ] );
		$startTime = hrtime( true );

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
				$this->recordOp( $storeLabel, 'get', 'miss', $startTime );
				return false;
			}
			$this->logger->debug(
				__METHOD__ . ': cache hit for prefixed {key} from {service}',
				[ 'key' => $targetKey, 'service' => $localServiceName ]
			);
			$this->recordOp( $storeLabel, 'get', 'hit', $startTime );
			return $value;
		}
		$this->logger->debug(
			__METHOD__ . ': cache miss for prefixed {key} from {service}',
			[ 'key' => $targetKey, 'service' => $localServiceName ]
		);
		$this->recordOp( $storeLabel, 'get', 'miss', $startTime );
		return false;
	}

	/**
	 * Attempt to set the given key via the broadcast route. We use mcrouter to convey this across service(s).
	 *
	 * @param string $key The key to set
	 * @param mixed $value The value to set
	 * @param int $ttl Time to live in seconds (default 60*60*24*30 seconds = 30 days)
	 * @param string $storeLabel Identifies the calling store, for observability (e.g. 'aw_fragment')
	 * @return bool Whether the set operation succeeded
	 */
	public function set( string $key, mixed $value, int $ttl = self::TTL_MONTH, string $storeLabel = '' ): bool {
		$startTime = hrtime( true );

		if ( $this->broadcastRoute === '' ) {
			$this->logger->warning( __METHOD__ . ': no broadcast cache configured!' );
			$this->recordOp( $storeLabel, 'set', 'failure', $startTime );
			return false;
		}

		$localServiceName = array_keys( $this->services )[0];

		// Note: We ignore the local prefix, as we're using the broadcast route instead.
		$localService = $this->services[$localServiceName][0];

		// TODO (T432217) We can demote to debug once this issue is fixed
		$this->logger->info(
			__METHOD__ . ': setting {memcached-key} on local server {memcached-server}'
			. ' with broadcast cache route {route}',
			[
				'memcached-key' => $this->broadcastRoute . $key,
				'memcached-server' => $localServiceName,
				'route' => $this->broadcastRoute
			]
		);

		$success = $localService->set( $this->broadcastRoute . $key, $value, $ttl );

		if ( !$success ) {
			$this->logger->warning(
				__METHOD__ . ': failed to set broadcast prefixed {memcached-key} on {memcached-server}'
				. ' with error {error_class}: {error}',
				[
					'memcached-key' => $this->broadcastRoute . $key,
					'memcached-server' => $localServiceName,
					'error_class' => ( $localService instanceof Memcached ? $localService->getResultCode() : '?' ),
					'error' => ( $localService instanceof Memcached ? $localService->getResultMessage() : '?' ),
					// TODO (T432217) Temporarily log stats in case of Memcached::set failure to diagnose the problem.
					// We should remove this in the future, although it's not a very large object:
					// https://www.php.net/manual/en/memcached.getstats.php
					'status' => ( $localService instanceof Memcached ? $this->getStats( $localService, $value ) : '?' ),
				]
			);
		} else {
			// TODO (T432217) We can demote to debug once this issue is fixed
			$this->logger->info(
				__METHOD__ . ': successfully set broadcast prefixed {memcached-key} on {memcached-server}',
				[
					'memcached-key' => $this->broadcastRoute . $key,
					'memcached-server' => $localServiceName
				]
			);
		}

		$this->recordOp( $storeLabel, 'set', $success ? 'success' : 'failure', $startTime );

		return $success;
	}

	/**
	 * Get selected service stats to show in the MemcachedWrapper::set failure logs
	 * See: https://github.com/memcached/memcached/blob/master/doc/protocol.txt
	 *
	 * Recording the following stats:
	 * * limit_maxbytes: Number of bytes this server is allowed to use for storage
	 * * bytes: Current number of bytes used to store items
	 * * store_too_large: Number of rejected storage requests caused by attempting
	 *   to write a value larget than the -I limit
	 * * store_no_memory: Number of rejected storage requests caused by exhaustion
	 *   of the -m memory limit (relevant when -M is used)
	 * * max_connections: Max number of simultaneous connections
	 * * curr_connections: Number of open connections
	 * * rejected_connections: Conns rejected in maxconns_fast mode
	 * * listen_disabled_num: Number of times server has stopped accepting new
	 *   connections (maxconns)
	 * * accepting_conns: Whether or not server is accepting conns
	 * * evictions: Number of valid items removed from cache to free memory for new items
	 * * cmd_set: Cumulative number of storage reqs
	 * * auth_errors: Number of failed authentications.
	 * * idle_kicks: Number of connections closed due to reaching their idle timeout.
	 * * response_obj_oom: Connections closed by lack of memory
	 * * read_buf_oom: Connections closed by lack of memory
	 * * proxy_conn_oom: Number of out of memory errors while serving proxy requests
	 *
	 * Also compiling the following information:
	 * * size_serialized and size_json: the size of the value after different serializations
	 * * serializer: Serializer used before compression
	 * * compression: Whether payload compression is enabled.
	 * * compression_type: Algorithm used for compression (zlib, zstd, fastlz)
	 *
	 *
	 * @param Memcached $localService
	 * @param mixed $value
	 * @return string
	 */
	private function getStats( Memcached $localService, mixed $value ): string {
		$relevantStats = [];
		$relevantKeys = [
			// Size/memory
			'limit_maxbytes',
			'bytes',
			'store_too_large',
			'store_no_memory',
			// Server load
			'max_connections',
			'curr_connections',
			'rejected_connections',
			'listen_disabled_num',
			'accepting_conns',
			// Operations
			'evictions',
			'cmd_set',
			'auth_errors',
			'idle_kicks',
			'response_obj_oom',
			'read_buf_oom',
			'proxy_conn_oom'
		];

		// Value size diagnostics
		$relevantStats['size_serialized'] = strlen( serialize( $value ) );
		$relevantStats['size_json'] = strlen( json_encode( $value ) );
		$relevantStats['compression_enabled'] = $localService->getOption( Memcached::OPT_COMPRESSION );
		$relevantStats['compression_type'] = $localService->getOption( Memcached::OPT_COMPRESSION_TYPE );
		$relevantStats['serializer'] = $localService->getOption( Memcached::OPT_SERIALIZER );

		// If no stats, log status as unavailable
		$stats = $localService->getStats();
		if ( !$stats ) {
			$relevantStats['server'] = 'unavailable';
			return json_encode( $relevantStats );
		}

		// Log keys of all available memcached servers (should only be one, the local,
		// but let's make sure that the stats being logged belong to the right service)
		$relevantStats[ 'server' ] = array_keys( $stats );
		$server = array_key_first( $stats );

		// Log only the relevant keys, if available
		foreach ( $relevantKeys as $statKey ) {
			$relevantStats[ $statKey ] = $stats[ $server ][ $statKey ] ?? '?';
		}

		return json_encode( $relevantStats );
	}

	/**
	 * Attempt to delete the given key via the broadcast route (setting a tombstone value)
	 *
	 * @param string $key The key to delete
	 * @param string $storeLabel Identifies the calling store, for observability (e.g. 'aw_fragment')
	 * @return bool Whether the delete operation succeeded on the broadcast cache.
	 */
	public function delete( string $key, string $storeLabel = '' ): bool {
		$this->logger->debug( __METHOD__ . ': deleting {key} by setting a tombstone value', [ 'key' => $key ] );
		$startTime = hrtime( true );
		$success = $this->set( $key, self::TOMBSTONE, self::TTL_MINUTE, $storeLabel );
		$this->recordOp( $storeLabel, 'delete', $success ? 'success' : 'failure', $startTime );
		return $success;
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
