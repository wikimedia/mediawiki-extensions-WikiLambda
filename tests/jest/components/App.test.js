/*!
 * WikiLambda unit test suite for the App component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' ),
	shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGetterMock = require( '../helpers/getterHelpers.js' ).createGetterMock,
	App = require( '../../../resources/ext.wikilambda.app/components/App.vue' );

describe( 'App.vue', () => {
	let actions,
		getters,
		originalLocation,
		originalReplaceState;

	beforeEach( () => {
		actions = {
			initializeView: jest.fn( () => ( {
				then: ( callback ) => callback()
			} ) ),
			prefetchZids: jest.fn( () => ( {
				then: ( callback ) => callback()
			} ) ),
			evaluateUri: jest.fn(),
			fetchUserRights: jest.fn()
		};

		getters = {
			isInitialized: createGetterMock( true ),
			getCurrentView: createGetterMock( 'function-editor-view' ),
			isCreateNewPage: createGetterMock( false )
		};

		global.store.hotUpdate( {
			actions: actions,
			getters: getters
		} );

		// Save the original location object and history.replaceState function
		originalLocation = window.location;
		originalReplaceState = window.history.replaceState;

		// Mock window.location
		delete window.location;
		window.location = {
			...originalLocation,
			hash: '',
			href: '',
			assign: jest.fn()
		};

		// Mock history.replaceState to prevent a SecurityError
		window.history.replaceState = jest.fn();
	} );

	afterEach( () => {
		// Restore the original window.location and window.history.replaceState
		window.location = originalLocation;
		window.history.replaceState = originalReplaceState;
	} );

	it( 'Initializes the app on load', async () => {
		shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		await waitFor( () => expect( actions.initializeView ).toHaveBeenCalled() );
	} );

	it( 'Handles popstate event correctly when there is a hash in the URL', () => {
		window.location.href = 'http://example.com#some-hash';
		window.location.hash = '#some-hash';

		const wrapper = shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );
		jest.spyOn( wrapper.vm, 'removeHashFromURL' );

		const popstateEvent = new PopStateEvent( 'popstate', { state: null } );
		window.dispatchEvent( popstateEvent );

		expect( actions.initializeView ).not.toHaveBeenCalled();
		expect( actions.evaluateUri ).not.toHaveBeenCalled();
		expect( wrapper.vm.removeHashFromURL ).toHaveBeenCalled();
	} );

	it( 'Reinitializes view when isCreateNewPage is true and popstate event is triggered', async () => {
		window.location.href = 'http://example.com';

		getters.isCreateNewPage = createGetterMock( true );
		global.store.hotUpdate( {
			getters: getters
		} );

		shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		const popstateEvent = new PopStateEvent( 'popstate' );
		window.dispatchEvent( popstateEvent );

		await waitFor( () => {
			expect( actions.initializeView ).toHaveBeenCalled();
			expect( actions.evaluateUri ).toHaveBeenCalled();
		} );
	} );

	it( 'Calls evaluateUri when popstate event is triggered and no hash is present', () => {
		shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		const popstateEvent = new PopStateEvent( 'popstate' );
		window.dispatchEvent( popstateEvent );

		expect( actions.evaluateUri ).toHaveBeenCalled();
	} );

	it( 'Renders loading when isInitialized and `isAppSetup`(data property) is false', () => {
		getters.isInitialized = createGetterMock( false );
		global.store.hotUpdate( {
			getters: getters
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
