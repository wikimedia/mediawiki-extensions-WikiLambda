/*!
 * WikiLambda unit test suite for the App component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createLocalVue = require( '@vue/test-utils' ).createLocalVue,
	Vuex = require( 'vuex' ),
	VueRouter = require( '../../../resources/lib/vue-router/vue-router.common.js' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	getters = require( '../../../resources/ext.wikilambda.edit/store/getters.js' ),
	localVue;

localVue = createLocalVue();
localVue.use( Vuex );
localVue.use( VueRouter );

describe( 'App.vue', function () {
	var actions,
		store,
		mockIsInitialized;

	beforeEach( function () {
		actions = {
			initializeZObject: jest.fn(),
			initialize: jest.fn()
		};
		store = new Vuex.Store( {
			actions: actions,
			getters: $.extend( getters, {
				getZObjectInitialized: function () {
					return mockIsInitialized;
				}
			} )
		} );
	} );

	it( 'Renders loading when getZObjectInitialized is false', function () {
		var wrapper,
			$i18n = jest.fn();

		mockIsInitialized = false;

		wrapper = shallowMount( App, {
			store: store,
			localVue: localVue,
			mocks: {
				$i18n: $i18n
			},
			provide: {
				viewmode: true
			}
		} );

		expect( wrapper.findComponent( { name: 'RouterView' } ).exists() ).toBe( false );
		expect( $i18n ).toHaveBeenCalledWith( 'wikilambda-loading' );
	} );

	it( 'Renders the router view when getZObjectInitialized is true', function () {
		var wrapper,
			$i18n = jest.fn();

		mockIsInitialized = true;

		wrapper = shallowMount( App, {
			store: store,
			localVue: localVue,
			mocks: {
				$i18n: $i18n
			},
			provide: {
				viewmode: true
			}
		} );

		expect( wrapper.findComponent( { name: 'RouterView' } ).exists() ).toBe( true );
		expect( $i18n ).not.toHaveBeenCalled();
	} );

	it( 'Initializes the app on load', function () {
		var $i18n = jest.fn();

		mockIsInitialized = true;

		shallowMount( App, {
			store: store,
			localVue: localVue,
			mocks: {
				$i18n: $i18n
			},
			provide: {
				viewmode: true
			}
		} );

		expect( actions.initializeZObject ).toHaveBeenCalled();
	} );
} );
