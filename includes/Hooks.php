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

class Hooks implements
	\MediaWiki\Hook\BeforePageDisplayHook,
	\MediaWiki\Hook\MakeGlobalVariablesScriptHook
	{

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/BeforePageDisplay
	 * @param \OutputPage $out
	 * @param \Skin $skin
	 */
	public function onBeforePageDisplay( $out, $skin ) : void {
		$config = $out->getConfig();
		if ( $config->get( 'WikiLambdaEnable' ) ) {
			$out->addModules( 'ext.wikilambda' );
		}
	}

	/**
	 * @see https://www.mediawiki.org/wiki/Manual:Hooks/MakeGlobalVariablesScriptHook
	 * @param array &$vars `[ variable name => value ]`
	 * @param \OutputPage $out
	 */
	public function onMakeGlobalVariablesScript( &$vars, $out ) : void {
		$config = $out->getConfig();
		if ( $config->get( 'WikiLambdaEnable' ) ) {
			$vars['wgWikiLambdaDemonstrationValue'] = true;
		}
	}

}
