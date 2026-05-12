<?php
/**
 * WikiLambda Internationalisation - WikifunctionsLamguage class, extends MediaWiki Language
 * and provides static mapping between MediaWiki and Wikifunctions Language representations
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\Language;

use MediaWiki\Language\Language;

class WikifunctionsLanguage {

	public function __construct(
		private readonly Language $language,
		private readonly string $zid
	) {
	}

	/**
	 * Returns the wrapped MediaWiki Language object
	 *
	 * @return Language
	 */
	public function getLanguage(): Language {
		return $this->language;
	}

	/**
	 * Returns the Wikifunctions language Zid
	 *
	 * @return string
	 */
	public function getZid(): string {
		return $this->zid;
	}

	/**
	 * Returns the language code of the wrapped MediaWiki Language object
	 *
	 * @return string
	 */
	public function getCode(): string {
		return $this->language->getCode();
	}
}
