<?php

/**
 * WikiLambda RepoHooks mock with overriden insertContentObject method.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks;

class HooksDataPathMock extends RepoHooks {

	/**
	 * @inheritDoc
	 */
	protected static function getDataPath() {
		return dirname( __DIR__ ) . '/tests/phpunit/test_data/test_definitions/';
	}
}
