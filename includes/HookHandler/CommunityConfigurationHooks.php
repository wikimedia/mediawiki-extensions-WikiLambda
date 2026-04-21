<?php

/**
 * WikiLambda CommunityConfiguration integration hooks.
 *
 * Kept as a separate class (rather than extending ClientHooks) so the
 * CommunityConfigurationProvider_initListHook interface is only autoloaded
 * when the CommunityConfiguration extension is present. This preserves
 * CommunityConfiguration as a soft dependency.
 *
 * @file
 * @ingroup Extensions
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

namespace MediaWiki\Extension\WikiLambda\HookHandler;

use MediaWiki\Config\Config;
use MediaWiki\Extension\CommunityConfiguration\Hooks\CommunityConfigurationProvider_initListHook;

class CommunityConfigurationHooks implements CommunityConfigurationProvider_initListHook {

	public function __construct(
		private readonly Config $config
	) {
	}

	/**
	 * Hide the WikifunctionsSuggestions provider on wikis not running in
	 * client mode; its data only matters where the {{#function:…}} parser
	 * function is active.
	 *
	 * @param array &$providers
	 * @return void
	 */
	public function onCommunityConfigurationProvider_initList( array &$providers ): void {
		if ( !$this->config->get( 'WikiLambdaEnableClientMode' ) ) {
			unset( $providers['WikifunctionsSuggestions'] );
		}
	}
}
