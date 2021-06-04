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
	ZObject = require( '../../../resources/ext.wikilambda.edit/components/ZObject.vue' ),
	localVue;

localVue = createLocalVue();
localVue.use( Vuex );

describe( 'ZObject', function () {
	var getters,
		actions,
		store;

	beforeEach( function () {
		getters = {
			getZObjectTypeById: function () {
				return jest.fn( function () {
					return 'none';
				} );
			}
		};
		actions = {
			fetchZKeys: jest.fn()
		};
		store = new Vuex.Store( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObject, {
			propsData: {
				zobjectId: 0,
				persistent: false,
				viewmode: false
			},
			store: store,
			localVue: localVue
		} );

		expect( wrapper.find( 'div' ) ).toBeTruthy();
	} );
} );
