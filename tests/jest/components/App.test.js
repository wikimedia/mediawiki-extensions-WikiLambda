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
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' );

describe( 'App.vue', () => {
	let actions,
		getters;

	beforeEach( () => {
		actions = {
			initializeView: jest.fn( () => {
				return {
					then: ( callback ) => callback()
				};
			} ),
			prefetchZids: jest.fn( () => {
				return {
					then: ( callback ) => callback()
				};
			} ),
			evaluateUri: jest.fn(),
			fetchUserRights: jest.fn()
		};

		getters = {
			isInitialized: createGetterMock( true ),
			getCurrentView: createGetterMock( 'function-editor' ),
			isCreateNewPage: createGetterMock( false )
		};

		global.store.hotUpdate( {
			actions: actions,
			getters: getters
		} );
	} );

	it( 'Initializes the app on load', async () => {
		shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		await waitFor( () => expect( actions.initializeView ).toHaveBeenCalled() );
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
		expect( wrapper.findComponent( { name: 'wl-function-editor' } ).exists() ).toBe( false );
		expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-loading' );
	} );

	it( 'Does not render the router view when isInitialized is true but initializeView has not yet completed', () => {
		const wrapper = shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		expect( wrapper.componentVM.isAppSetup ).toBe( false );
		expect( wrapper.findComponent( { name: 'wl-function-editor' } ).exists() ).toBe( false );
	} );

	it( 'Renders the router view when isInitialized is true and initializeView has completed', async () => {
		const wrapper = shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		await waitFor( () => {
			expect( wrapper.componentVM.isAppSetup ).toBe( true );
			expect( wrapper.findComponent( { name: 'wl-function-editor' } ).exists() ).toBe( true );
		} );
	} );
} );
