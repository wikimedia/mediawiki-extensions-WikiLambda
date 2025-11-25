/*!
 * Configuration for the WikiLambda browser test suite
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const { config } = require( 'wdio-mediawiki/wdio-defaults.conf.js' );
exports.config = {
	...config,
	waitforTimeout: 5000, // milliseconds
	before() {
		browser.addLocatorStrategy( 'ancestor', ( selector, root ) => {
			const result = root && root.closest( selector );
			return result ? [ result ] : [];
		} );
		browser.setWindowSize( 1280, 1024 );
	}
	// Override, or add to, the setting from wdio-mediawiki.
	// Learn more at https://webdriver.io/docs/configurationfile/
	//
	// Example:
	// logLevel: 'info',
};
