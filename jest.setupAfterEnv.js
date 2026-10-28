/*!
 * Setup file that runs after the test environment is set up.
 * This file has access to; beforeEach, expect, etc. which are available globally.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

/* global beforeEach, afterEach, jest */
const { configure } = require( '@testing-library/dom' );
const { mockWindowLocation, restoreWindowLocation } = require( './tests/jest/fixtures/location.js' );
const { mockAbortController, restoreAbortController } = require( './tests/jest/fixtures/abortController.js' );

// With fake timers, each waitFor() step lets only a few promise steps run.
// Wait for a real macrotask, so that all pending promises complete.
configure( {
	// eslint-disable-next-line camelcase
	unstable_advanceTimersWrapper: async ( callback ) => {
		callback();
		await new Promise( ( resolve ) => {
			jest.requireActual( 'timers' ).setImmediate( resolve );
		} );
	}
} );

beforeEach( () => {
	mockWindowLocation( 'http://localhost/' );
	mockAbortController();
} );

afterEach( () => {
	restoreWindowLocation();
	restoreAbortController();
} );
