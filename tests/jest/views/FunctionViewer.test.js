/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2022– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var VueTestUtils = require( '@vue/test-utils' ),
	FunctionViewer = require( '../../../resources/ext.wikilambda.edit/views/FunctionViewer.vue' );

describe( 'FunctionViewer', function () {
	var getters;
	const functionZid = 'Z12345';

	beforeEach( function () {
		getters = {
		};

		global.store.hotUpdate( {
			getters: getters
		} );

		window.mw.Uri.mockImplementation( () => {
			return {
				path: '/wiki/' + functionZid
			};
		} );

		VueTestUtils.config.global.mocks.$i18n = jest.fn().mockImplementation( function () {
			return {
				text: jest.fn()
			};
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewer );

		expect( wrapper.find( '.ext-wikilambda-function-viewer' ).exists() ).toBeTruthy();
	} );

	it( 'does not display success message by default', function () {
		var wrapper = VueTestUtils.shallowMount( FunctionViewer );

		expect( wrapper.find( '.ext-wikilambda-function-viewer__message' ).exists() ).toBeFalsy();
	} );

	it( 'displays success message if indicated in url', function () {
		window.mw.Uri.mockImplementation( () => {
			return {
				path: '/wiki/' + functionZid,
				query: {
					success: 'true'
				}
			};
		} );
		var wrapper = VueTestUtils.shallowMount( FunctionViewer );

		expect( wrapper.find( '.ext-wikilambda-function-viewer__message' ).exists() ).toBeTruthy();
	} );
} );
