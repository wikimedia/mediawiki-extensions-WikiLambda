/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	Vuex = require( 'vuex' ),
	ZObjectViewer = require( '../../../resources/ext.wikilambda.edit/components/ZObjectViewer.vue' );

describe( 'ZObjectViewer', function () {
	var actions,
		store;

	beforeEach( function () {
		actions = {
			initialize: jest.fn()
		};

		store = Vuex.createStore( {
			actions: actions
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObjectViewer, {
			global: {
				plugins: [
					store
				],
				mocks: {
					$i18n: jest.fn()
				}
			}
		} );

		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );
} );
