/*!
 * WikiLambda unit test suite for the ZObject component and related files.
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createLocalVue = require( '@vue/test-utils' ).createLocalVue,
	Vuex = require( 'vuex' ),
	ZObjectJson = require( '../../../resources/ext.wikilambda.edit/components/ZObjectJson.vue' ),
	canonicalize = require( '../../../resources/ext.wikilambda.edit/mixins/schemata.js' ).methods.canonicalizeZObject,
	localVue;

localVue = createLocalVue();
localVue.use( Vuex );

describe( 'ZObjectJson', function () {
	var getters,
		store;

	beforeEach( function () {
		getters = {
			getZObjectAsJsonById: function () {
				return jest.fn( function () {
					return {};
				} );
			},
			getZObjectById: function () {
				return jest.fn( function () {
					return [];
				} );
			},
			getViewMode: jest.fn( function () {
				return false;
			} )
		};
		store = new Vuex.Store( {
			getters: getters
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObjectJson, {
			store: store,
			localVue: localVue
		} );

		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );

	it( 'correctly sends provided JSON to the editor in a canonical form', function () {
		var json = { Z1K1: 'Z6', Z6K1: 'Hello, Test!' },
			wrapper = shallowMount( ZObjectJson, {
				propsData: {
					zobjectRaw: json
				},
				store: store,
				localVue: localVue
			} );

		expect( JSON.parse( wrapper.vm.initialJson ) ).toEqual( canonicalize( json ) );
	} );

	it( 'correctly sends JSON from Vuex to the editor in a canonical form', function () {
		var json = { Z1K1: 'Z6', Z6K1: 'Hello, Test!' },
			wrapper;

		getters.getZObjectAsJsonById = function () {
			return function () {
				return json;
			};
		};

		store = new Vuex.Store( {
			getters: getters
		} );

		wrapper = shallowMount( ZObjectJson, {
			propsData: {
				zobjectId: -1
			},
			store: store,
			localVue: localVue
		} );

		expect( JSON.parse( wrapper.vm.initialJson ) ).toEqual( canonicalize( json ) );
	} );
} );
