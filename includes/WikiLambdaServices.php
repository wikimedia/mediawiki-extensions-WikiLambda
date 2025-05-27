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

use MediaWiki\Extension\WikiLambda\Authorization\ZObjectAuthorization;
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
}
