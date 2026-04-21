<?php

/**
 * WikiLambda unit test suite for the MemcachedWrapper class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Unit\Cache {

	use MediaWiki\Config\HashConfig;
	use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
	use MediaWikiUnitTestCase;
	use Memcached;
	use Wikimedia\TestingAccessWrapper;

	class MemcachedWrapperTest extends MediaWikiUnitTestCase {

		/**
		 * @covers \MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper::__construct
		 */
		public function testConstructor_populatesServicesFromConfiguredCaches(): void {
			$config = new HashConfig( [
				'WikiLambdaObjectCaches' => [
					'primary' => [ 'server' => 'cache-primary.local:11211' ],
				],
				'WikiLambdaObjectCacheBroadcast' => null,
			] );

			$wrapper = new MemcachedWrapper( $config );
			$access = TestingAccessWrapper::newFromObject( $wrapper );

			// The configured cache name should appear in $services
			$this->assertArrayHasKey( 'primary', $access->services );
			[ $service, $prefix ] = $access->services['primary'];

			$this->assertInstanceOf( Memcached::class, $service );
			// Default prefix when 'prefix' is not specified is "/$serviceName/"
			$this->assertSame( '/primary/', $prefix );
			// addServer should have been called with the parsed host and port
			$servers = $service->getServerList();
			$this->assertCount( 1, $servers );
			$this->assertSame( 'cache-primary.local', $servers[0]['host'] );
			$this->assertSame( 11211, $servers[0]['port'] );
		}

		/**
		 * @covers \MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper::__construct
		 */
		public function testConstructor_honoursCustomPrefix(): void {
			$config = new HashConfig( [
				'WikiLambdaObjectCaches' => [
					'primary' => [
						'server' => 'cache-primary.local:11211',
						'prefix' => 'custom-prefix:',
					],
				],
				'WikiLambdaObjectCacheBroadcast' => null,
			] );

			$wrapper = new MemcachedWrapper( $config );
			$access = TestingAccessWrapper::newFromObject( $wrapper );

			[ , $prefix ] = $access->services['primary'];
			$this->assertSame( 'custom-prefix:', $prefix );
		}

		/**
		 * @covers \MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper::__construct
		 */
		public function testConstructor_registersMultipleCaches(): void {
			$config = new HashConfig( [
				'WikiLambdaObjectCaches' => [
					'primary' => [ 'server' => 'a.local:11211' ],
					'secondary' => [ 'server' => 'b.local:22122' ],
				],
				'WikiLambdaObjectCacheBroadcast' => null,
			] );

			$wrapper = new MemcachedWrapper( $config );
			$access = TestingAccessWrapper::newFromObject( $wrapper );

			$this->assertCount( 2, $access->services );
			$this->assertArrayHasKey( 'primary', $access->services );
			$this->assertArrayHasKey( 'secondary', $access->services );

			// With no broadcast configured, fallback is the first configured service name
			$this->assertSame( 'primary', $access->broadcastRoute );
		}

		/**
		 * @covers \MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper::__construct
		 */
		public function testConstructor_parsesIpv6ServerAddress(): void {
			$config = new HashConfig( [
				'WikiLambdaObjectCaches' => [
					'primary' => [ 'server' => '[2001:db8::1]:11211' ],
				],
				'WikiLambdaObjectCacheBroadcast' => null,
			] );

			$wrapper = new MemcachedWrapper( $config );
			$access = TestingAccessWrapper::newFromObject( $wrapper );

			[ $service ] = $access->services['primary'];
			$servers = $service->getServerList();
			$this->assertSame( '2001:db8::1', $servers[0]['host'] );
			$this->assertSame( 11211, $servers[0]['port'] );
		}

		/**
		 * @covers \MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper::__construct
		 */
		public function testConstructor_parsesUnixSocketServerAddress(): void {
			$config = new HashConfig( [
				'WikiLambdaObjectCaches' => [
					'primary' => [ 'server' => '/var/run/memcached.sock' ],
				],
				'WikiLambdaObjectCacheBroadcast' => null,
			] );

			$wrapper = new MemcachedWrapper( $config );
			$access = TestingAccessWrapper::newFromObject( $wrapper );

			[ $service ] = $access->services['primary'];
			// Socket paths have no port: production passes false (coerced to int 0);
			// libmemcached may further rewrite 0 to the default port internally,
			// so we only verify that the socket path made it through as the host.
			$servers = $service->getServerList();
			$this->assertSame( '/var/run/memcached.sock', $servers[0]['host'] );
		}

		/**
		 * @covers \MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper::__construct
		 */
		public function testConstructor_supportsDeprecatedHostPortConfig(): void {
			$config = new HashConfig( [
				'WikiLambdaObjectCaches' => [
					'primary' => [
						'host' => 'legacy.local',
						'port' => '11211',
					],
				],
				'WikiLambdaObjectCacheBroadcast' => null,
			] );

			$wrapper = new MemcachedWrapper( $config );
			$access = TestingAccessWrapper::newFromObject( $wrapper );

			[ $service ] = $access->services['primary'];
			// The string port should be cast to int in the deprecated branch
			$servers = $service->getServerList();
			$this->assertSame( 'legacy.local', $servers[0]['host'] );
			$this->assertSame( 11211, $servers[0]['port'] );
		}

		/**
		 * @covers \MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper::__construct
		 */
		public function testConstructor_usesConfiguredBroadcastRoute(): void {
			$config = new HashConfig( [
				'WikiLambdaObjectCaches' => [
					'primary' => [ 'server' => 'cache-primary.local:11211' ],
				],
				'WikiLambdaObjectCacheBroadcast' => '/*/primary/',
			] );

			$wrapper = new MemcachedWrapper( $config );
			$access = TestingAccessWrapper::newFromObject( $wrapper );

			$this->assertSame( '/*/primary/', $access->broadcastRoute );
		}

		/**
		 * @covers \MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper::__construct
		 */
		public function testConstructor_configuredBroadcastOverridesFirstServiceFallback(): void {
			$config = new HashConfig( [
				'WikiLambdaObjectCaches' => [
					'primary' => [ 'server' => 'a.local:11211' ],
					'secondary' => [ 'server' => 'b.local:11211' ],
				],
				'WikiLambdaObjectCacheBroadcast' => '/*/everywhere/',
			] );

			$wrapper = new MemcachedWrapper( $config );
			$access = TestingAccessWrapper::newFromObject( $wrapper );

			// With a broadcast route configured, the first-service fallback is skipped
			$this->assertSame( '/*/everywhere/', $access->broadcastRoute );
		}
	}
}

// Minimal stub of the PECL Memcached class for environments in which
// the extension is not loaded. Mirrors just the two methods MemcachedWrapper's
// constructor touches (addServer/getServerList), so assertions can use the
// same public API whether or not the real extension is loaded in CI.
namespace {
	if ( !class_exists( \Memcached::class, false ) ) {
		// phpcs:ignore MediaWiki.Files.ClassMatchesFilename.NotMatch, Generic.Files.OneObjectStructurePerFile.MultipleFound
		class Memcached {
			/** @var array<int,array{host:string,port:int}> */
			private array $serverList = [];

			public function addServer( string $host, int $port, int $weight = 0 ): bool {
				$this->serverList[] = [ 'host' => $host, 'port' => $port ];
				return true;
			}

			public function getServerList(): array {
				return $this->serverList;
			}
		}
	}
}
