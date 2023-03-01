<?php
/**
 * WikiLambda Service Wiring
 *
 * @file
 * @ingroup Extensions
 * @copyright 2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
use MediaWiki\Logger\LoggerFactory;
use MediaWiki\MediaWikiServices;

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
			$services->getPermissionManager()
		);
	},
];
