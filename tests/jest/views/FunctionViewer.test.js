/*!
 * WikiLambda unit test suite for the ZKeyModeSelector component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const VueTestUtils = require( '@vue/test-utils' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );
const FunctionViewer = require( '../../../resources/ext.wikilambda.app/views/FunctionViewer.vue' );

describe( 'FunctionViewer', () => {
	const functionZid = 'Z12345';
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getCurrentZObjectId = functionZid;
		store.getUserLangZid = 'Z1002';
		store.isCreateNewPage = false;

		window.mw.Uri.mockImplementation( () => ( {
			path: '/wiki/' + functionZid
		} ) );

		VueTestUtils.config.global.mocks.$i18n = jest.fn().mockImplementation( () => ( {
			text: jest.fn()
		} ) );
	} );

	it( 'renders without errors', () => {
		const wrapper = VueTestUtils.shallowMount( FunctionViewer );

		expect( wrapper.find( '.ext-wikilambda-app-function-viewer-view' ).exists() ).toBeTruthy();
	} );

	it( 'does not display success message by default', () => {
		const wrapper = VueTestUtils.shallowMount( FunctionViewer );
		expect( wrapper.find( '.ext-wikilambda-app-toast-message' ).exists() ).toBeFalsy();
		expect( FunctionViewer.computed.displaySuccessMessage() ).toBe( false );
	} );

	it( 'displays success message if indicated in url', () => {
		window.mw.Uri.mockImplementation( () => ( {
			path: '/wiki/' + functionZid,
			query: {
				success: 'true'
			}
		} ) );
		const wrapper = VueTestUtils.shallowMount( FunctionViewer );

		expect( wrapper.find( '.ext-wikilambda-app-toast-message' ).exists() ).toBeTruthy();
		expect( FunctionViewer.computed.displaySuccessMessage() ).toBe( true );
	} );
} );
