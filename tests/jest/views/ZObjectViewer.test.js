/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	ZObjectViewer = require( '../../../resources/ext.wikilambda.edit/views/ZObjectViewer.vue' );

describe( 'ZObjectViewer', function () {
	var actions;
	const zid = 'Z12345';

	beforeEach( function () {
		actions = {
			initialize: jest.fn()
		};

		global.store.hotUpdate( {
			actions: actions
		} );

		window.mw.Uri.mockImplementation( () => {
			return {
				path: '/wiki/' + zid
			};
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObjectViewer );

		expect( wrapper.find( '#ext-wikilambda-view' ).exists() ).toBeTruthy();
	} );

	it( 'does not display success message by default', function () {
		var wrapper = shallowMount( ZObjectViewer );

		expect( wrapper.find( '.ext-wikilambda-view__message' ).exists() ).toBeFalsy();
	} );

	it( 'displays success message if indicated in url', function () {
		window.mw.Uri.mockImplementation( () => {
			return {
				path: '/wiki/' + zid,
				query: {
					success: 'true'
				}
			};
		} );
		var wrapper = shallowMount( ZObjectViewer );

		expect( wrapper.find( '.ext-wikilambda-view__message' ).exists() ).toBeTruthy();
	} );
} );
