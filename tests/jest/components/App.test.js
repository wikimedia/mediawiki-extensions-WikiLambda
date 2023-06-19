/*!
 * WikiLambda unit test suite for the App component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	getters = require( '../../../resources/ext.wikilambda.edit/store/getters.js' );

describe( 'App.vue', function () {
	var actions,
		mockGetZObjectInitializedValue;

	beforeAll( function () {
		actions = {
			initializeView: jest.fn(),
			prefetchZids: jest.fn()
		};

		global.store.hotUpdate( {
			actions: actions,
			getters: $.extend( getters, {
				getZObjectInitialized: function () {
					return mockGetZObjectInitializedValue;
				}
			} )
		} );

		global.store.registerModule( 'router', {
			namespaced: true,
			getters: {
				getCurrentView: jest.fn().mockReturnValue( 'function-editor' ),
				getQueryParams: jest.fn( function () {
					return jest.fn();
				} )
			},
			actions: {
				evaluateUri: jest.fn()
			}
		} );

	} );

	it( 'Renders loading when getZObjectInitialized and `isAppSetup`(data property) is false', function () {
		var wrapper;

		mockGetZObjectInitializedValue = false;

		wrapper = shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		expect( wrapper.componentVM.isAppSetup ).toBe( false );
		expect( wrapper.findComponent( { name: 'wl-function-editor' } ).exists() ).toBe( false );
		expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-loading' );
	} );

	it( 'Does not render the router view when getZObjectInitialized is true but initializeView has not yet completed', async () => {
		jest.clearAllMocks();

		var wrapper;

		mockGetZObjectInitializedValue = true;

		wrapper = shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		expect( wrapper.componentVM.isAppSetup ).toBe( false );
		expect( wrapper.findComponent( { name: 'wl-function-editor' } ).exists() ).toBe( false );
	} );

	it( 'Renders the router view when getZObjectInitialized is true and initializeView has completed', async () => {
		jest.clearAllMocks();

		var wrapper;

		mockGetZObjectInitializedValue = true;

		wrapper = shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();

		expect( wrapper.componentVM.isAppSetup ).toBe( true );
		expect( wrapper.findComponent( { name: 'wl-function-editor' } ).exists() ).toBe( true );
	} );

	it( 'Initializes the app on load', function () {
		jest.clearAllMocks();

		mockGetZObjectInitializedValue = true;

		shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		expect( actions.initializeView ).toHaveBeenCalled();
	} );
} );
