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
	ZObjectGeneric = require( '../../../resources/ext.wikilambda.edit/components/ZObjectGeneric.vue' ),
	ZList = require( '../../../resources/ext.wikilambda.edit/components/types/ZList.vue' ),
	ZMultilingualString = require( '../../../resources/ext.wikilambda.edit/components/types/ZMultilingualString.vue' ),
	ZReference = require( '../../../resources/ext.wikilambda.edit/components/types/ZReference.vue' ),
	ZString = require( '../../../resources/ext.wikilambda.edit/components/types/ZString.vue' ),
	ZCode = require( '../../../resources/ext.wikilambda.edit/components/types/ZCode.vue' ),
	ZArgument = require( '../../../resources/ext.wikilambda.edit/components/types/ZArgument.vue' ),
	ZFunctionCall = require( '../../../resources/ext.wikilambda.edit/components/types/ZFunctionCall.vue' ),
	ZFunction = require( '../../../resources/ext.wikilambda.edit/components/types/ZFunction.vue' ),
	ZBoolean = require( '../../../resources/ext.wikilambda.edit/components/types/ZBoolean.vue' ),
	ZImplementation = require( '../../../resources/ext.wikilambda.edit/components/types/ZImplementation.vue' ),
	ZArgumentReference = require( '../../../resources/ext.wikilambda.edit/components/types/ZArgumentReference.vue' ),
	ZType = require( '../../../resources/ext.wikilambda.edit/components/types/ZType.vue' ),
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' ),
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

	function testMountingComponent( componentName, componentCode, component ) {
		it( 'renders ' + componentName + ' component for ' + componentCode, function () {
			getters = {
				getZObjectTypeById: function () {
					return jest.fn( function () {
						return componentCode;
					} );
				}
			};

			store = new Vuex.Store( {
				getters: getters,
				actions: actions
			} );

			var wrapper = shallowMount( ZObject, {
				propsData: {
					zobjectId: 0,
					persistent: false,
					readonly: true
				},
				store: store,
				localVue: localVue
			} );

			expect( wrapper.findComponent( component ).exists() ).toBe( true );
		} );
	}

	testMountingComponent( 'ZObjectGeneric', Constants.Z_NATURAL_LANGUAGE, ZObjectGeneric );
	testMountingComponent( 'ZType', Constants.Z_TYPE, ZType );
	testMountingComponent( 'ZList', Constants.Z_LIST, ZList );
	testMountingComponent( 'ZMultilingualString', Constants.Z_MULTILINGUALSTRING, ZMultilingualString );
	testMountingComponent( 'ZReference', Constants.Z_REFERENCE, ZReference );
	testMountingComponent( 'ZString', Constants.Z_STRING, ZString );
	testMountingComponent( 'ZCode', Constants.Z_CODE, ZCode );
	testMountingComponent( 'ZArgument', Constants.Z_ARGUMENT, ZArgument );
	testMountingComponent( 'ZFunctionCall', Constants.Z_FUNCTION_CALL, ZFunctionCall );
	testMountingComponent( 'ZFunction', Constants.Z_FUNCTION, ZFunction );
	testMountingComponent( 'ZBoolean', Constants.Z_BOOLEAN, ZBoolean );
	testMountingComponent( 'ZImplementation', Constants.Z_IMPLEMENTATION, ZImplementation );
	testMountingComponent( 'ZArgumentReference', Constants.Z_ARGUMENT_REFERENCE, ZArgumentReference );
} );
