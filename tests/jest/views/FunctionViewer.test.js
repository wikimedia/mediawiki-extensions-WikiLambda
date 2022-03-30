/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	FunctionViewer = require( '../../../resources/ext.wikilambda.edit/views/FunctionViewer.vue' );

describe( 'FunctionViewer', function () {
	var getters;

	beforeEach( function () {
		getters = {
		};

		global.store.hotUpdate( {
			getters: getters
		} );

		VueTestUtils.config.global.mocks.$i18n = jest.fn().mockImplementation( function () {
			return {
				text: jest.fn()
			};
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewer );

		expect( wrapper.find( '.ext-wikilambda-function-viewer' ) ).toBeTruthy();
	} );
} );
