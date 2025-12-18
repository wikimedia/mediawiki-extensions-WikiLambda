<?php
/**
 * WikiLambda Mock SiteMatrix Interface.
 * Returns the language and special domains:
 *
 * * https://es.wikipedia.mock
 * * https://es.wiktionary.mock
 * * https://dag.wikipedia.mock
 * * https://dag.wiktionary.mock
 * * https://test.wikimedia.mock
 * * https://meta.wikimedia.mock
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Tests\Integration;

use MediaWiki\Extension\SiteMatrix\SiteMatrix;

/**
 * @codeCoverageIgnore
 */
class MockSiteMatrix extends SiteMatrix {

	/**
	 * Empty constructor to load the SiteMatrix mock when
	 * 1) SiteMatrix is loaded, and
	 * 2) we are running phpunit tests
	 */
	public function __construct() {
	}

	/**
	 * Returns some fake languages
	 *
	 * @return array
	 */
	public function getLangList() {
		return [ 'es', 'dag' ];
	}

	/**
	 * Returns some fake wiki families
	 *
	 * @return array
	 */
	public function getSites() {
		return [ 'wikipedia', 'wiktionary' ];
	}

	/**
	 * Returns true so that all combinations exist
	 *
	 * @param string $lang
	 * @param string $family
	 * @return bool
	 */
	public function exist( $lang, $family ) {
		return true;
	}

	/**
	 * Returns protocol-relative URLs
	 *
	 * @param string $lang
	 * @param string $family
	 * @param bool $canonical
	 * @return string
	 */
	public function getUrl( $lang, $family, $canonical = false ) {
		return "https://{$lang}.{$family}.mock";
	}

	/**
	 * Returns some special sites
	 *
	 * @return array
	 */
	public function getSpecials() {
		return [
			[ 'test', 'wikimedia' ],
			[ 'meta', 'wikimedia' ],
		];
	}
}
