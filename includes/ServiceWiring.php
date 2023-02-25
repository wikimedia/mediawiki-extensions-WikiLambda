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

use ConfigException;
use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MainConfigNames;
use MediaWiki\MediaWikiServices;
use ObjectCache;

/**
 * @codeCoverageIgnore
 */
return [
	'WikiLambdaZObjectStore' => static function ( MediaWikiServices $services ) {
		return new ZObjectStore(
			$services->getDBLoadBalancer(),
			$services->getTitleFactory(),
			$services->getWikiPageFactory(),
			$services->getRevisionStore(),
			LoggerFactory::getInstance( 'WikiLambda' )
		);
	},

	'WikiLambdaZObjectAuthorization' => static function ( MediaWikiServices $services ) {
		return new ZObjectAuthorization(
			$services->getPermissionManager(),
			LoggerFactory::getInstance( 'WikiLambda' )
		);
	},

	'WikiLambdaZObjectStash' => static function ( MediaWikiServices $services ) {
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

		$store = ObjectCache::newFromParams( $cacheParameters, $services );
		return $store;
	},
];
