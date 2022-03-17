/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	Vuex = require( 'vuex' ),
	FunctionViewer = require( '../../../resources/ext.wikilambda.edit/views/FunctionViewer.vue' );

describe( 'FunctionViewer', function () {
	var getters,
		store;

	beforeEach( function () {
		getters = {
		};

		store = Vuex.createStore( {
			getters: getters
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( FunctionViewer, {
			global: {
				plugins: [
					store
				]
			}
		} );

		expect( wrapper.find( '.ext-wikilambda-function-viewer' ) ).toBeTruthy();
	} );
} );
