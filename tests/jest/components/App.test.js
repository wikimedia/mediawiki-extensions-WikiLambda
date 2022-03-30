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
		mockIsInitialized;

	beforeAll( function () {
		actions = {
			initializeZObject: jest.fn(),
			initialize: jest.fn()
		};

		global.store.hotUpdate( {
			actions: actions,
			getters: $.extend( getters, {
				getZObjectInitialized: function () {
					return mockIsInitialized;
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

	it( 'Renders loading when getZObjectInitialized is false', function () {
		var wrapper;

		mockIsInitialized = false;

		wrapper = shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		expect( wrapper.findComponent( { name: 'function-editor' } ).exists() ).toBe( false );
		expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-loading' );
	} );

	it( 'Renders the router view when getZObjectInitialized is true', function () {
		jest.clearAllMocks();

		var wrapper;

		mockIsInitialized = true;

		wrapper = shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		expect( wrapper.findComponent( { name: 'function-editor' } ).exists() ).toBe( true );
		expect( global.$i18n ).not.toHaveBeenCalled();
	} );

	it( 'Initializes the app on load', function () {
		mockIsInitialized = true;

		shallowMount( App, {
			provide: {
				viewmode: true
			}
		} );

		expect( actions.initializeZObject ).toHaveBeenCalled();
	} );
} );
