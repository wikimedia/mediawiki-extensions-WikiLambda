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

use DatabaseUpdater;
use Title;

class Hooks implements
	\MediaWiki\Hook\BeforePageDisplayHook,
	\MediaWiki\Installer\Hook\LoadExtensionSchemaUpdatesHook
	{

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

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/BeforePageDisplay
	 *
	 * @param \OutputPage $out
	 * @param \Skin $skin
	 */
	public function onBeforePageDisplay( $out, $skin ) : void {
		$config = $out->getConfig();
		if ( $config->get( 'WikiLambdaEnable' ) ) {
			$out->addModules( 'ext.wikilambda.simplesearch' );
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/LoadExtensionSchemaUpdates
	 *
	 * @param DatabaseUpdater $updater DatabaseUpdater subclass
	 */
	public function onLoadExtensionSchemaUpdates( $updater ) {
		$db = $updater->getDB();
		$type = $db->getType();

		if ( !in_array( $type, [ 'mysql', 'sqlite', 'postgres' ] ) ) {
			wfWarn( "Database type '$type' is not supported by the WikiLambda extension." );
			return;
		}

		$tables = [ 'zobject_labels' ];
		foreach ( $tables as $key => $table ) {
			$updater->addExtensionTable( 'wikilambda_' . $table, __DIR__ . "/sql/table-$table-generated-$type.sql" );
		}
	}
}
