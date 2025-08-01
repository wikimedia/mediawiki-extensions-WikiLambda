<?php
/**
 * WikiLambda Services
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Config\ConfigException;
use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MainConfigNames;
use MediaWiki\MediaWikiServices;
use Wikimedia\ObjectCache\BagOStuff;

/**
 * @codeCoverageIgnore
 */
class WikiLambdaServices {

	/**
	 * @return ZObjectStore
	 */
	public static function getZObjectStore(): ZObjectStore {
		return MediaWikiServices::getInstance()->getService( 'WikiLambdaZObjectStore' );
	}

	/**
	 * Note: Not explicitly typed, as this service is mocked in tests
	 *
	 * @return WikifunctionsClientStore
	 */
	public static function getWikifunctionsClientStore() {
		return MediaWikiServices::getInstance()->getService( 'WikifunctionsClientStore' );
	}

	/**
	 * @return ZObjectAuthorization
	 */
	public static function getZObjectAuthorization(): ZObjectAuthorization {
		return MediaWikiServices::getInstance()->getService( 'WikiLambdaZObjectAuthorization' );
	}

	/**
	 * @return BagOStuff
	 */
	public static function getZObjectStash(): BagOStuff {
		return MediaWikiServices::getInstance()->getService( 'WikiLambdaZObjectStash' );
	}

	/**
	 * Constructs a new instance of ZObjectStore.
	 * Reused by service wiring and installer bootstrapping.
	 *
	 * @internal For use in Service Wiring and early setup on RepoHooks
	 */
	public static function buildZObjectStore( MediaWikiServices $services ): ZObjectStore {
		return new ZObjectStore(
			$services->getDBLoadBalancerFactory(),
			$services->getTitleFactory(),
			$services->getWikiPageFactory(),
			$services->getRevisionStore(),
			$services->getUserGroupManager(),
			LoggerFactory::getInstance( 'WikiLambda' ),
			$services->getMainConfig()
		);
	}

	/**
	 * Constructs a new instance of the ZObject BagOStuff
	 * Reused by service wiring and installer bootstrapping.
	 *
	 * @internal For use in Service Wiring and early setup on RepoHooks
	 * @throws ConfigException
	 */
	public static function buildZObjectStash( MediaWikiServices $services ): BagOStuff {
		$extensionConfig = $services->getConfigFactory()->makeConfig( 'WikiLambda' );
		$requestedCache = $extensionConfig->get( 'WikiLambdaObjectCache' );

		if ( !$requestedCache ) {
			// Just short-cut to the existing Stash in this case
			return $services->getMainObjectStash();
		}

		$mainConfig = $services->getMainConfig();
		$cacheParameters = $mainConfig->get( MainConfigNames::ObjectCaches )[$requestedCache] ?? null;
		if ( !$cacheParameters ) {
			throw new ConfigException(
				"\$wgObjectCaches must have \"$requestedCache\" set (via WikiLambdaObjectCache)"
			);
		}

		return $services->getObjectCacheFactory()->newFromParams( $cacheParameters );
	}
}
