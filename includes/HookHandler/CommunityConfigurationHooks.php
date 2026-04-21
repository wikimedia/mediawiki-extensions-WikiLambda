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
	 * Hide each of our CC providers on wikis where its feature mode is off,
	 * so the Special:CommunityConfiguration dashboard only shows providers
	 * whose data is actually consumed on this wiki.
	 *
	 * @param array &$providers
	 * @return void
	 */
	public function onCommunityConfigurationProvider_initList( array &$providers ): void {
		if ( !$this->config->get( 'WikiLambdaEnableClientMode' ) ) {
			unset( $providers['WikifunctionsSuggestions'] );
		}
		if ( !$this->config->get( 'WikiLambdaEnableAbstractMode' ) ) {
			unset( $providers['AbstractWikiSuggestedWikifunctions'] );
		}
	}
}
