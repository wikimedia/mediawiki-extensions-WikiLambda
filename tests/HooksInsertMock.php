<?php

/**
 * WikiLambda RepoHooks mock with overriden insertContentObject method.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests;

use MediaWiki\Extension\WikiLambda\HookHandler\RepoHooks;

class HooksInsertMock extends RepoHooks {

	/** @var string[] */
	public static $filenames = [];

	/**
	 * @inheritDoc
	 */
	protected static function insertContentObject(
		$updater, $filename, $dependencies, $user, $comment, $overwrite = false, &$inserted = [], $track = []
	) {
		static::$filenames[] = $filename;
		return true;
	}

	/**
	 * Returns array of filenames that have been inserted
	 *
	 * @return array
	 */
	public static function getFilenames(): array {
		return static::$filenames;
	}
}
