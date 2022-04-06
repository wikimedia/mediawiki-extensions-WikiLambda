/*!
 * WikiLambda unit test suite for the ZObject component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	Vuex = require( 'vuex' ),
	ZObject = require( '../../../resources/ext.wikilambda.edit/components/ZObject.vue' ),
	ZObjectGeneric = require( '../../../resources/ext.wikilambda.edit/components/ZObjectGeneric.vue' ),
	ZArgument = require( '../../../resources/ext.wikilambda.edit/components/types/ZArgument.vue' ),
	ZArgumentReference = require( '../../../resources/ext.wikilambda.edit/components/types/ZArgumentReference.vue' ),
	ZBoolean = require( '../../../resources/ext.wikilambda.edit/components/types/ZBoolean.vue' ),
	ZCharacter = require( '../../../resources/ext.wikilambda.edit/components/types/ZCharacter.vue' ),
	ZCode = require( '../../../resources/ext.wikilambda.edit/components/types/ZCode.vue' ),
	ZFunction = require( '../../../resources/ext.wikilambda.edit/components/types/ZFunction.vue' ),
	ZFunctionCall = require( '../../../resources/ext.wikilambda.edit/components/types/ZFunctionCall.vue' ),
	ZFunctionCallToType = require( '../../../resources/ext.wikilambda.edit/components/types/ZFunctionCallToType.vue' ),
	ZImplementation = require( '../../../resources/ext.wikilambda.edit/components/types/ZImplementation.vue' ),
	ZKey = require( '../../../resources/ext.wikilambda.edit/components/types/ZKey.vue' ),
	ZList = require( '../../../resources/ext.wikilambda.edit/components/types/ZList.vue' ),
	ZMultilingualString = require( '../../../resources/ext.wikilambda.edit/components/types/ZMultilingualString.vue' ),
	ZReference = require( '../../../resources/ext.wikilambda.edit/components/types/ZReference.vue' ),
	ZResponseEnvelope = require( '../../../resources/ext.wikilambda.edit/components/types/ZResponseEnvelope.vue' ),
	ZString = require( '../../../resources/ext.wikilambda.edit/components/types/ZString.vue' ),
	ZTester = require( '../../../resources/ext.wikilambda.edit/components/types/ZTester.vue' ),
	ZType = require( '../../../resources/ext.wikilambda.edit/components/types/ZType.vue' ),
	ZTypedList = require( '../../../resources/ext.wikilambda.edit/components/types/ZTypedList.vue' ),
	ZTypedMap = require( '../../../resources/ext.wikilambda.edit/components/types/ZTypedMap.vue' ),
	ZTypedPair = require( '../../../resources/ext.wikilambda.edit/components/types/ZTypedPair.vue' ),
	Constants = require( '../../../resources/ext.wikilambda.edit/Constants.js' );

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
		store = Vuex.createStore( {
			getters: getters,
			actions: actions
		} );
	} );

	it( 'renders without errors', function () {
		var wrapper = shallowMount( ZObject, {
			global: {
				plugins: [
					store
				]
			},
			props: {
				zobjectId: 0,
				persistent: false,
				viewmode: false
			}
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

			store = Vuex.createStore( {
				getters: getters,
				actions: actions
			} );

			var wrapper = shallowMount( ZObject, {
				global: {
					plugins: [
						store
					]
				},
				props: {
					zobjectId: 0,
					persistent: false,
					readonly: true,
					parentType: Constants.Z_PERSISTENTOBJECT
				}
			} );

			expect( wrapper.findComponent( component ).exists() ).toBe( true );
		} );
	}

	// All types with components should be tested here.
	// Types not tested: ZPersistentObject (not allowed), ZMonolingualString (doesn't work?)
	// Non-type components not tested: ZArgumentList, ZListItem, ZMetadata
	testMountingComponent( 'ZObjectGeneric', Constants.Z_NATURAL_LANGUAGE, ZObjectGeneric );
	testMountingComponent( 'ZArgument', Constants.Z_ARGUMENT, ZArgument );
	testMountingComponent( 'ZArgumentReference', Constants.Z_ARGUMENT_REFERENCE, ZArgumentReference );
	testMountingComponent( 'ZBoolean', Constants.Z_BOOLEAN, ZBoolean );
	testMountingComponent( 'ZCharacter', Constants.Z_CHARACTER, ZCharacter );
	testMountingComponent( 'ZCode', Constants.Z_CODE, ZCode );
	testMountingComponent( 'ZFunction', Constants.Z_FUNCTION, ZFunction );
	testMountingComponent( 'ZFunctionCall', Constants.Z_FUNCTION_CALL, ZFunctionCall );
	testMountingComponent( 'ZFunctionCallToType', Constants.Z_FUNCTION_CALL_TO_TYPE, ZFunctionCallToType );
	testMountingComponent( 'ZImplementation', Constants.Z_IMPLEMENTATION, ZImplementation );
	testMountingComponent( 'ZKey', Constants.Z_KEY, ZKey );
	testMountingComponent( 'ZList', Constants.Z_LIST, ZList );
	testMountingComponent( 'ZMultilingualString', Constants.Z_MULTILINGUALSTRING, ZMultilingualString );
	testMountingComponent( 'ZReference', Constants.Z_REFERENCE, ZReference );
	testMountingComponent( 'ZResponseEnvelope', Constants.Z_RESPONSEENVELOPE, ZResponseEnvelope );
	testMountingComponent( 'ZString', Constants.Z_STRING, ZString );
	testMountingComponent( 'ZTester', Constants.Z_TESTER, ZTester );
	testMountingComponent( 'ZType', Constants.Z_TYPE, ZType );
	testMountingComponent( 'ZTypedList', Constants.Z_TYPED_LIST, ZTypedList );
	testMountingComponent( 'ZTypedMap', Constants.Z_TYPED_MAP, ZTypedMap );
	testMountingComponent( 'ZTypedPair', Constants.Z_TYPED_PAIR, ZTypedPair );
} );
