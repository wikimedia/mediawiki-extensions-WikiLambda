/*!
 * WikiLambda unit test suite for the App component and related files.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	mount = require( '@vue/test-utils' ).shallowMount,
	createLocalVue = require( '@vue/test-utils' ).createLocalVue,
	Vuex = require( 'vuex' ),
	App = require( '../../../resources/ext.wikilambda.edit/components/App.vue' ),
	ZObjectEditor = require( '../../../resources/ext.wikilambda.edit/components/ZObjectEditor.vue' ),
	ZObjectViewer = require( '../../../resources/ext.wikilambda.edit/components/ZObjectViewer.vue' ),
	getters = require( '../../../resources/ext.wikilambda.edit/store/getters.js' ),
	localVue;

localVue = createLocalVue();
localVue.use( Vuex );

describe( 'App.vue', function () {
	var actions,
		store;

	beforeEach( function () {
		actions = {
			initializeZObject: jest.fn()
		};
		store = new Vuex.Store( {
			actions: actions,
			getters: getters
		} );
	} );
	it( 'Renders nothing when the viewmode is not returned from mw.config', function () {
		var wrapper;
		mw.config.get = jest.fn( function () {
			return {
				viewmode: null
			};
		} );

		wrapper = shallowMount( App, {
			store: store,
			localVue: localVue,
			computed: {
				zObjectInitialized: jest.fn( function () {
					return true;
				} )
			}
		} );

		expect( wrapper.findComponent( ZObjectEditor ).exists() ).toBe( false );
		expect( wrapper.findComponent( ZObjectViewer ).exists() ).toBe( false );
	} );

	it( 'Renders z-object-editor when viewmode === false', function () {
		var wrapper;
		mw.config.get = jest.fn( function () {
			return {
				viewmode: false
			};
		} );

		wrapper = mount( App, {
			store: store,
			localVue: localVue,
			computed: {
				zObjectInitialized: jest.fn( function () {
					return true;
				} )
			}
		} );

		expect( actions.initializeZObject.mock.calls.length ).toBe( 1 );
		expect( wrapper.findComponent( ZObjectEditor ).exists() ).toBe( true );
		expect( wrapper.findComponent( ZObjectEditor ).isVisible() ).toBe( true );
		expect( wrapper.findComponent( ZObjectViewer ).exists() ).toBe( false );
	} );

	it( 'Renders z-object-viewer when viewmode === true', function () {
		var wrapper;
		mw.config.get = jest.fn( function () {
			return {
				viewmode: true
			};
		} );

		wrapper = shallowMount( App, {
			store: store,
			localVue: localVue,
			computed: {
				zObjectInitialized: jest.fn( function () {
					return true;
				} )
			}
		} );

		expect( actions.initializeZObject.mock.calls.length ).toBe( 1 );
		expect( wrapper.findComponent( ZObjectViewer ).exists() ).toBe( true );
		expect( wrapper.findComponent( ZObjectViewer ).isVisible() ).toBe( true );
		expect( wrapper.findComponent( ZObjectEditor ).exists() ).toBe( false );
	} );

	it( 'Renders loading when zObjectInitialized is false', function () {
		var wrapper,
			$i18n = jest.fn();
		mw.config.get = jest.fn( function () {
			return {
				viewmode: true
			};
		} );

		wrapper = shallowMount( App, {
			store: store,
			localVue: localVue,
			mocks: {
				$i18n: $i18n
			},
			computed: {
				zObjectInitialized: jest.fn( function () {
					return false;
				} )
			}
		} );

		expect( wrapper.findComponent( ZObjectViewer ).exists() ).toBe( false );
		expect( wrapper.findComponent( ZObjectEditor ).exists() ).toBe( false );
		expect( $i18n ).toHaveBeenCalledWith( 'wikilambda-loading' );

	} );
} );
