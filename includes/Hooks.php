<?php
/**
 * WikiLambda extension hooks
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020 WikiLambda team
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda;

use Title;

class Hooks {

	public static function registerExtension() {
		require_once dirname( __DIR__ ) . '/includes/defines.php';
	}

	/**
	 * Declare ZObjects as JSON-dervied, so that (for now) they can be
	 * edited directing using the CodeEditor extension.
	 *
	 * @param Title $title
	 * @param string &$lang
	 * @return bool
	 */
	public static function onCodeEditorGetPageLanguage( Title $title, &$lang ) {
		if (
			$title->hasContentModel( CONTENT_MODEL_ZOBJECT )
			|| $title->inNamespace( NS_ZOBJECT )
		) {
			$lang = 'json';
			return false;
		}
	}

}
