/*!
 * Mock icon fixture for Jest tests.
 * Uses a Proxy so any icon key returns a unique, testable SVG string — no manual updates needed when icons are added.
 */
'use strict';

module.exports = new Proxy( {}, {
	get( target, key ) {
		return `<path data-testid="mock-icon-${ key }"/>`;
	}
} );
