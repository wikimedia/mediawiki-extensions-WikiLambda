/*!
 * WikiLambda unit test suite for the FunctionViewer component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/dom' );
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
		// Clear sessionStorage before each test
		sessionStorage.clear();
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

	it( 'displays success message if publish success flag is set in store', async () => {
		// Set the publish success flag in sessionStorage (simulating a publish action)
		sessionStorage.setItem( `wikilambda-publish-success-${ functionZid }`, 'true' );
		// We need to mock the checkPublishSuccess method from the store
		store.checkPublishSuccess = jest.fn().mockImplementation( () => {
			store.getShowPublishSuccess = true;
			sessionStorage.removeItem( `wikilambda-publish-success-${ functionZid }` );
		} );
		const wrapper = renderFunctionViewer();

		expect( wrapper.find( '.ext-wikilambda-app-toast-message' ).exists() ).toBe( false );

		// Wait for the success message to appear
		await waitFor( () => {
			expect( wrapper.find( '.ext-wikilambda-app-toast-message' ).exists() ).toBe( true );
		} );

		// Verify the store state was updated
		expect( store.getShowPublishSuccess ).toBe( true );
	} );
} );
