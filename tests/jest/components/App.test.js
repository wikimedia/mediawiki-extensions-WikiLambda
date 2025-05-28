/*!
 * WikiLambda unit test suite for the App component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const useMainStore = require( '../../../resources/ext.wikilambda.app/store/index.js' );
const App = require( '../../../resources/ext.wikilambda.app/components/App.vue' );
const { mockWindowLocation } = require( '../fixtures/location.js' );

describe( 'App.vue', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.initializeView.mockResolvedValue();
		store.prefetchZids.mockResolvedValue();
		store.isInitialized = true;
		store.isCreateNewPage = false;
		store.getCurrentView = 'function-editor-view';
	} );

	it( 'Initializes the app on load', async () => {
		shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		await waitFor( () => expect( store.initializeView ).toHaveBeenCalled() );
	} );

	it( 'Handles popstate event correctly when there is a hash in the URL', async () => {
		mockWindowLocation( 'http://example.com#some-hash' );

		shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		const popstateEvent = new PopStateEvent( 'popstate', { state: null } );
		window.dispatchEvent( popstateEvent );

		expect( store.initializeView ).not.toHaveBeenCalled();
		expect( store.evaluateUri ).not.toHaveBeenCalled();
		expect( window.history.replaceState ).toHaveBeenCalled();
	} );

	it( 'Reinitializes view when isCreateNewPage is true and popstate event is triggered', async () => {
		mockWindowLocation( 'http://example.com' );

		store.isCreateNewPage = true;

		shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		const popstateEvent = new PopStateEvent( 'popstate' );
		window.dispatchEvent( popstateEvent );

		expect( store.initializeView ).toHaveBeenCalled();
		await waitFor( () => expect( store.evaluateUri ).toHaveBeenCalled() );
	} );

	it( 'Calls evaluateUri when popstate event is triggered and no hash is present', () => {
		shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		const popstateEvent = new PopStateEvent( 'popstate' );
		window.dispatchEvent( popstateEvent );

		expect( store.evaluateUri ).toHaveBeenCalled();
	} );

	it( 'Renders loading when isInitialized and `isAppSetup`(data property) is false', () => {
		store.$patch( {
			isInitialized: false
		} );

		const wrapper = shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		expect( wrapper.componentVM.isAppSetup ).toBe( false );
		expect( wrapper.findComponent( { name: 'wl-function-editor-view' } ).exists() ).toBe( false );
		expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-loading' );
	} );

	it( 'Does not render the router view when isInitialized is true but initializeView has not yet completed', () => {
		store.$patch( {
			isInitialized: false
		} );
		const wrapper = shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		expect( wrapper.componentVM.isAppSetup ).toBe( false );
		expect( wrapper.findComponent( { name: 'wl-function-editor-view' } ).exists() ).toBe( false );
	} );

	it( 'Renders the router view when isInitialized is true and initializeView has completed', async () => {
		const wrapper = shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		await waitFor( () => {
			expect( wrapper.componentVM.isAppSetup ).toBe( true );
			expect( wrapper.findComponent( { name: 'wl-function-editor-view' } ).exists() ).toBe( true );
		} );
	} );
} );
