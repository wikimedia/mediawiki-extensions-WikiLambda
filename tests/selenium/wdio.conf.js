'use strict';
const { config } = require( 'wdio-mediawiki/wdio-defaults.conf.js' );
exports.config = {
	...config,
	waitforTimeout: 5000, // milliseconds
	before() {
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
