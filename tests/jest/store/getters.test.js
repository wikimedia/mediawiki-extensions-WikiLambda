/*!
 * WikiLambda unit test suite for the root Vuex getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const getters = require( '../../../resources/ext.wikilambda.edit/store/getters.js' );

describe( 'Vuex root getters', function () {
	it( 'gets current view mode', function () {
		// Jest defaults viewmode to true
		expect( getters.getViewMode() ).toBe( true );
	} );
} );
