/*!
 * Configuration for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

import { config as wdioDefaults } from 'wdio-mediawiki/wdio-defaults.conf.js';

// Hack: wdio-mediawiki only adds these in Docker (via /.dockerenv), not K8s pods.
// This can be removed when the fix is added into wdio-mediawiki
wdioDefaults.capabilities[ 0 ][ 'goog:chromeOptions' ].args.unshift( '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage' );

export const config = {
	...wdioDefaults,
	waitforTimeout: 5000, // milliseconds
	async before( ...args ) {
		// Bringing in the default args from the wdio.conf.js in wdio-mediawiki package
		await wdioDefaults.before?.( ...args );

		// WikiLambda-specific setup
		browser.addLocatorStrategy( 'ancestor', ( selector, root ) => {
			const result = root && root.closest( selector );
			return result ? [ result ] : [];
		} );
	}
	// Override, or add to, the setting from wdio-mediawiki.
	// Learn more at https://webdriver.io/docs/configurationfile/
	//
	// Example:
	// logLevel: 'info',
};
