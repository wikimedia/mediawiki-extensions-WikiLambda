/*!
 * WikiLambda unit test suite for the Vuex store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const Vuex = require( 'vuex' ),
	store = require( '../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'Vuex store (index.js)', () => {
	it( 'should export a function', () => {
		expect( store ).toBeInstanceOf( Vuex.Store );
	} );
} );
