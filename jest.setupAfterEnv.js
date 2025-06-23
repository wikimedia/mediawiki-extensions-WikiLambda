/*!
 * Setup file that runs after the test environment is set up.
 * This file has access to; beforeEach, expect, etc. which are available globally.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

/* global beforeEach, afterEach */
const { mockWindowLocation, restoreWindowLocation } = require( './tests/jest/fixtures/location.js' );
const { mockAbortController, restoreAbortController } = require( './tests/jest/fixtures/abortController.js' );

beforeEach( () => {
	mockWindowLocation( 'http://localhost/' );
	mockAbortController();
} );

afterEach( () => {
	restoreWindowLocation();
	restoreAbortController();
} );
