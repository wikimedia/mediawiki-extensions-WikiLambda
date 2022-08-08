/*!
 * WikiLambda unit test suite for the ZObject component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	ZObjectJson = require( '../../../resources/ext.wikilambda.edit/components/ZObjectJson.vue' ),
	canonicalize = require( '../../../resources/ext.wikilambda.edit/mixins/schemata.js' ).methods.canonicalizeZObject;

describe( 'ZObjectJson', function () {
	var getters;

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

		global.store.hotUpdate( {
			getters: getters
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObjectJson );

		expect( wrapper.find( 'div' ).exists() ).toBe( true );
	} );

	it( 'correctly sends provided JSON to the editor in a canonical form', function () {
		var json = { Z1K1: 'Z6', Z6K1: 'Hello, Test!' },
			wrapper = shallowMount( ZObjectJson, {
				props: {
					zobjectRaw: json
				}
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

		global.store.hotUpdate( {
			getters: getters
		} );

		wrapper = shallowMount( ZObjectJson, {
			props: {
				zobjectId: -1
			}
		} );

		expect( JSON.parse( wrapper.vm.initialJson ) ).toEqual( canonicalize( json ) );
	} );
} );
