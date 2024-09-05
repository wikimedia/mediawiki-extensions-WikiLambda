<?php
/**
 * WikiLambda Service Wiring
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
return [
	// For repo wikis

	'WikiLambdaZObjectStore' => static function ( MediaWikiServices $services ): ZObjectStore {
		return new ZObjectStore(
			$services->getDBLoadBalancerFactory(),
			$services->getTitleFactory(),
			$services->getWikiPageFactory(),
			$services->getRevisionStore(),
			$services->getUserGroupManager(),
			LoggerFactory::getInstance( 'WikiLambda' )
		);
	},

	'WikiLambdaZObjectAuthorization' => static function ( MediaWikiServices $services ): ZObjectAuthorization {
		return new ZObjectAuthorization(
			LoggerFactory::getInstance( 'WikiLambda' )
		);
	},

	'WikiLambdaZObjectStash' => static function ( MediaWikiServices $services ): BagOStuff {
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
	},

	// For client wikis

	'WikifunctionsClientStore' => static function ( MediaWikiServices $services ): WikifunctionsClientStore {
		return new WikifunctionsClientStore( $services->getDBLoadBalancerFactory() );
	},
];
