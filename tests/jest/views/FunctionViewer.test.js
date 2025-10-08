/*!
 * WikiLambda unit test suite for the FunctionViewer component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );
const FunctionViewer = require( '../../../resources/ext.wikilambda.app/views/FunctionViewer.vue' );
const { buildUrl } = require( '../helpers/urlHelpers.js' );
const Constants = require( '../../../resources/ext.wikilambda.app/Constants.js' );
const { mockWindowLocation, restoreWindowLocation } = require( '../fixtures/location.js' );

describe( 'FunctionViewer', () => {
	const functionZid = 'Z12345';
	let store;

	function renderFunctionViewer( props = {}, options = {} ) {
		return shallowMount( FunctionViewer, {
			props,
			...options
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getCurrentZObjectId = functionZid;
		store.getUserLangZid = 'Z1002';
		store.isCreateNewPage = false;

		mockWindowLocation( buildUrl( `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ functionZid }` ) );
	} );

	afterEach( () => {
		restoreWindowLocation();
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionViewer();

		expect( wrapper.find( '.ext-wikilambda-app-function-viewer-view' ).exists() ).toBe( true );
	} );

	it( 'does not display success message by default', () => {
		const wrapper = renderFunctionViewer();

		// Test user behavior: success message should not be visible
		expect( wrapper.find( '.ext-wikilambda-app-toast-message' ).exists() ).toBeFalsy();
	} );

	it( 'displays success message if indicated in url', () => {
		mockWindowLocation( buildUrl( `${ Constants.PATHS.ROUTE_FORMAT_TWO }${ functionZid }`, { success: true } ) );
		const wrapper = renderFunctionViewer();

		// Test user behavior: success message should be visible when success=true in URL
		expect( wrapper.find( '.ext-wikilambda-app-toast-message' ).exists() ).toBe( true );
	} );
} );
