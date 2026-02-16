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
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;
use Wikimedia\ObjectCache\BagOStuff;

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

	'WikiLambdaZObjectStash' => static function ( MediaWikiServices $services ): BagOStuff {
		return WikiLambdaServices::buildZObjectStash( $services );
	},

	// For client wikis

	'WikifunctionsClientStore' => static function ( MediaWikiServices $services ): WikifunctionsClientStore {
		return new WikifunctionsClientStore(
			$services->getDBLoadBalancerFactory()
		);
	},

	// For abstract mode

	'AbstractWikiRequest' => static function ( MediaWikiServices $services ): AbstractWikiRequest {
		return new AbstractWikiRequest(
			$services->getMainConfig(),
			$services->getHttpRequestFactory()
		);
	},
];
