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

use MediaWiki\Extension\WikiLambda\AbstractContent\AbstractWikiRequest;
use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
use MediaWiki\Extension\WikiLambda\AWStorage\AWArticleStore;
use MediaWiki\Extension\WikiLambda\AWStorage\DBAWArticleStore;
use MediaWiki\Extension\WikiLambda\Cache\MemcachedWrapper;
use MediaWiki\Extension\WikiLambda\ParserFunction\WikifunctionsPFragmentRenderer;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;

/**
 * @codeCoverageIgnore
 */
return [
	// For repo wikis

	'WikiLambdaZObjectStore' => static function ( MediaWikiServices $services ): ZObjectStore {
		return WikiLambdaServices::buildZObjectStore( $services );
	},

	'WikiLambdaZObjectAuthorization' => static function ( MediaWikiServices $services ): ZObjectAuthorization {
		return new ZObjectAuthorization(
			LoggerFactory::getInstance( 'WikiLambda' )
		);
	},

	// For both repo and client wikis

	'WikiLambdaMemcachedWrapper' => static function ( MediaWikiServices $services ): MemcachedWrapper {
		return WikiLambdaServices::buildMemcachedWrapper( $services );
	},

	'WikiLambdaPFragmentRenderer' => static function ( MediaWikiServices $services ): WikifunctionsPFragmentRenderer {
		return new WikifunctionsPFragmentRenderer(
			LoggerFactory::getInstance( 'WikiLambda' ),
			$services->getUserFactory(),
			$services->getMainConfig()
		);
	},

	// For client wikis

	'WikifunctionsClientStore' => static function ( MediaWikiServices $services ): WikifunctionsClientStore {
		return new WikifunctionsClientStore(
			$services->getConnectionProvider()
		);
	},

	// For abstract mode

	'AbstractWikiRequest' => static function ( MediaWikiServices $services ): AbstractWikiRequest {
		return new AbstractWikiRequest(
			$services->getMainConfig(),
			$services->getHttpRequestFactory(),
			$services->get( 'WikiLambdaPFragmentRenderer' )
		);
	},

	// For abstract and abstract client mode

	'AbstractWikiArticleStore' => static function ( MediaWikiServices $services ): AWArticleStore {
		// TODO: in the future, we could configure this and build additional implementations if
		// we wanted to have alternative storage backends in different environments. If the final
		// infrastracture is MariaDB we won't need to do this, we can depend on RDBMS to be an
		// available backend, so we would only need to handle configuration for virtual host.
		return new DBAWArticleStore(
			$services->getConnectionProvider()
		);
	}
];
