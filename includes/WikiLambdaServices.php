<?php
/**
 * WikiLambda Services
 *
 * @file
 * @ingroup Extensions
 * @copyright 2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
use MediaWiki\MediaWikiServices;

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
	 * @return ZObjectAuthorization
	 */
	public static function getZObjectAuthorization(): ZObjectAuthorization {
		return MediaWikiServices::getInstance()->getService( 'WikiLambdaZObjectAuthorization' );
	}
}
