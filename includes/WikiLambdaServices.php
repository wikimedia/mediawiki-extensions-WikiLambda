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

use MediaWiki\MediaWikiServices;

class WikiLambdaServices {

	/**
	 * @return ZObjectStore
	 */
	public static function getZObjectStore() : ZObjectStore {
		return MediaWikiServices::getInstance()->getService( 'WikiLambdaZObjectStore' );
	}

}
