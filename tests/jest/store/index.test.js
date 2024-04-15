/*!
 * WikiLambda unit test suite for the Vuex store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const Vuex = require( 'vuex' );

const store = require( '../../../resources/ext.wikilambda.edit/store/index.js' );

describe( 'Vuex store (index.js)', function () {
	it( 'should export a function', function () {
		expect( store ).toBeInstanceOf( Vuex.Store );
	} );
}
);
