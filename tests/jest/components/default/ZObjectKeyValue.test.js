/*!
 * WikiLambda unit test suite for the default ZObjectKeyValue component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	mount = require( '@vue/test-utils' ).mount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ExpandedToggle = require( '../../../../resources/ext.wikilambda.edit/components/base/ExpandedToggle' ),
	ZObjectKeyValue = require( '../../../../resources/ext.wikilambda.edit/components/default/ZObjectKeyValue.vue' ),
	ZMonolingualString = require( '../../../../resources/ext.wikilambda.edit/components/default/ZMonolingualString.vue' ),
	ZString = require( '../../../../resources/ext.wikilambda.edit/components/default/ZString.vue' ),
	ZReference = require( '../../../../resources/ext.wikilambda.edit/components/default/ZReference.vue' ),
	ZObjectType = require( '../../../../resources/ext.wikilambda.edit/components/default/ZObjectType.vue' ),
	ZObjectKeyValueSet = require( '../../../../resources/ext.wikilambda.edit/components/default/ZObjectKeyValueSet.vue' );

const parentRowId = 1;
const rowId = 2;
const keyId = 3;

function createFunctionsMockForId( expectedId, value ) {
	return () => ( id ) => {
		if ( id === expectedId ) {
			return value;
		} else if ( id === parentRowId ) {
			return Constants.Z_REFERENCE_ID;
		} else {
			throw new Error( `Id ${id} not supported` );
		}
	};
}

describe( 'ZObjectKeyValue', () => {
	var getters,
		actions;
	beforeEach( () => {
		getters = {
			getLabel: createGettersWithFunctionsMock( { zid: Constants.Z_PERSISTENTOBJECT_ID, label: 'id', lang: Constants.Z_NATURAL_LANGUAGE_ENGLISH } ),
			getZReferenceTerminalValue: jest.fn(),
			getZObjectKeyByRowId: createGettersWithFunctionsMock( keyId ),
			getExpectedTypeOfKey: createGettersWithFunctionsMock(),
			getDepthByRowId: () => ( id ) => {
				if ( id === rowId ) {
					return 1;
				} else {
					throw new Error( `rowId ${id} not supported` );
				}
			},
			getParentRowId: () => ( id ) => {
				if ( id === rowId ) {
					return parentRowId;
				} else {
					throw new Error( `rowId ${id} not supported` );
				}
			},
			getZObjectValueByRowId: createGettersWithFunctionsMock(),
			getZObjectTypeByRowId: createGettersWithFunctionsMock( Constants.Z_STRING ),
			getZStringTerminalValue: createGettersWithFunctionsMock( 'string terminal value' )
		};
		actions = {
			setValueByRowIdAndPath: jest.fn(),
			changeType: jest.fn()
		};
		global.store.hotUpdate( {
			actions: actions
		} );

	} );

	describe( 'it renders the correct component type for', () => {
		it( 'z monolingual string', () => {
			getters.getZObjectTypeByRowId = createFunctionsMockForId( rowId, Constants.Z_MONOLINGUALSTRING );

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: rowId
				}
			} );

			expect( wrapper.findComponent( ZMonolingualString ).exists() ).toBe( true );
		} );

		it( 'z reference', () => {
			getters.getZObjectTypeByRowId = createFunctionsMockForId( rowId, Constants.Z_REFERENCE );

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: rowId
				}
			} );

			expect( wrapper.findComponent( ZReference ).exists() ).toBe( true );
		} );

		it( 'z string', () => {
			getters.getZObjectTypeByRowId = createFunctionsMockForId( rowId, Constants.Z_STRING );

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: rowId
				}
			} );

			expect( wrapper.findComponent( ZString ).exists() ).toBe( true );
		} );

		it( 'z object type', () => {
			getters.getZObjectKeyByRowId = createFunctionsMockForId( rowId, Constants.Z_OBJECT_TYPE );

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: rowId
				}
			} );

			expect( wrapper.findComponent( ZObjectType ).exists() ).toBe( true );
		} );

		it( 'fallback z-object-key-value-set', () => {
			getters.getZObjectTypeByRowId = createFunctionsMockForId( rowId, null );

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: rowId
				}
			} );

			expect( wrapper.findComponent( ZObjectKeyValueSet ).exists() ).toBe( true );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'it renders without errors', () => {
			var wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					edit: true,
					rowId: rowId
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'it shows expansion toggle if it is not a special terminal case', () => {
			getters.getZObjectKeyByRowId = createFunctionsMockForId( rowId, Constants.Z_KEY_TYPE );
			getters.getExpectedTypeOfKey = createFunctionsMockForId( Constants.Z_KEY_TYPE, Constants.Z_TYPE );

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					edit: true,
					rowId: rowId
				}
			} );

			expect( wrapper.findComponent( ExpandedToggle ).exists() ).toBe( true );
		} );

		describe( 'does not show expansion toggle if the key is a terminal', () => {
			it( 'Z6K1, string value', () => {
				getters.getZObjectKeyByRowId = createFunctionsMockForId( rowId, Constants.Z_STRING_VALUE );

				global.store.hotUpdate( {
					getters: getters
				} );

				var wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: rowId
					}
				} );

				expect( wrapper.findComponent( ExpandedToggle ).exists() ).toBe( false );
			} );

			it( 'Z9K1, reference', () => {
				getters.getZObjectKeyByRowId = createFunctionsMockForId( rowId, Constants.Z_REFERENCE_ID );

				global.store.hotUpdate( {
					getters: getters
				} );

				var wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: rowId
					}
				} );

				expect( wrapper.findComponent( ExpandedToggle ).exists() ).toBe( false );
			} );
		} );
	} );

	describe( 'in view mode', () => {
		it( 'it renders without errors', () => {
			var wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					edit: false,
					rowId: rowId
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'it shows expansion toggle if it is not a special terminal case', async () => {
			getters.getZObjectTypeByRowId = createFunctionsMockForId( rowId, Constants.Z_MONOLINGUALSTRING );
			getters.getZObjectValueByRowId = createFunctionsMockForId( rowId, 0 );
			getters.getExpectedTypeOfKey = createFunctionsMockForId( keyId, Constants.Z_OBJECT );

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					edit: false,
					rowId: rowId
				}
			} );
			expect( wrapper.findComponent( ExpandedToggle ).exists() ).toBe( true );
		} );

		describe( 'does not show expansion toggle if the key is a terminal', () => {
			it( 'Z6, string type', () => {
				getters.getZObjectTypeByRowId = createFunctionsMockForId( rowId, Constants.Z_STRING );

				global.store.hotUpdate( {
					getters: getters
				} );

				var wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: false,
						rowId: rowId
					}
				} );

				expect( wrapper.findComponent( ExpandedToggle ).exists() ).toBe( false );
			} );

			it( 'Z9, reference type', () => {
				getters.getZObjectTypeByRowId = createFunctionsMockForId( rowId, Constants.Z_REFERENCE );

				global.store.hotUpdate( {
					getters: getters
				} );

				var wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: false,
						rowId: rowId
					}
				} );

				expect( wrapper.findComponent( ExpandedToggle ).exists() ).toBe( false );
			} );
		} );
	} );

	describe( 'in either view or edit mode', () => {
		describe( 'does not show expansion toggle if the key is a terminal', () => {
			it( 'Z1K1, with a bound parent type', () => {
				getters.getZObjectKeyByRowId = () => ( id ) => {
					if ( id === parentRowId ) {
						return Constants.Z_OBJECT_TYPE;
					} else if ( id === rowId ) {
						return Constants.Z_REFERENCE;
					} else {
						throw new Error( `rowId ${id}  not supported` );
					}
				};

				getters.getExpectedTypeOfKey =
					createFunctionsMockForId( Constants.Z_REFERENCE, Constants.Z_MULTILINGUALSTRING );

				global.store.hotUpdate( {
					getters: getters
				} );

				var wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						rowId: rowId
					}
				} );

				expect( wrapper.findComponent( ExpandedToggle ).exists() ).toBe( false );
			} );

			it( 'resolver type value Z Reference', () => {
				getters.getZObjectValueByRowId = createFunctionsMockForId( rowId, Constants.Z_REFERENCE );
				getters.getZObjectKeyByRowId = createFunctionsMockForId( rowId, Constants.Z_OBJECT_TYPE );

				global.store.hotUpdate( {
					getters: getters
				} );

				var wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						rowId: rowId
					}
				} );

				expect( wrapper.findComponent( ExpandedToggle ).exists() ).toBe( false );
			} );

			it( 'resolver type value Z Function Call', () => {
				getters.getZObjectValueByRowId = createFunctionsMockForId( rowId, Constants.Z_FUNCTION_CALL );
				getters.getZObjectKeyByRowId = createFunctionsMockForId( rowId, Constants.Z_OBJECT_TYPE );

				global.store.hotUpdate( {
					getters: getters
				} );

				var wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						rowId: rowId
					}
				} );

				expect( wrapper.findComponent( ExpandedToggle ).exists() ).toBe( false );
			} );

			it( 'resolver type value Z Argument Reference', () => {
				getters.getZObjectValueByRowId = createFunctionsMockForId( rowId, Constants.Z_ARGUMENT_REFERENCE );
				getters.getZObjectKeyByRowId = createFunctionsMockForId( rowId, Constants.Z_OBJECT_TYPE );

				global.store.hotUpdate( {
					getters: getters
				} );

				var wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						rowId: rowId
					}
				} );

				expect( wrapper.findComponent( ExpandedToggle ).exists() ).toBe( false );
			} );

			it( 'non built-in type', () => {
				getters.getZObjectKeyByRowId = () => ( id ) => {
					if ( id === parentRowId ) {
						return Constants.Z_OBJECT_TYPE;
					} else if ( id === rowId ) {
						return Constants.Z_REFERENCE;
					} else {
						throw new Error( `rowId ${id}  not supported` );
					}
				};
				getters.getZObjectKeyByRowId( parentRowId, Constants.Z_OBJECT_TYPE );
				getters.getExpectedTypeOfKey =
					createFunctionsMockForId( Constants.Z_REFERENCE, Constants.Z_MULTILINGUALSTRING );

				global.store.hotUpdate( {
					getters: getters
				} );

				var wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						rowId: rowId
					}
				} );

				expect( wrapper.findComponent( ExpandedToggle ).exists() ).toBe( false );
			} );
		} );
	} );

	describe( 'handles the modification of the state for the key-value represented in the component', () => {
		it( 'if the value of Z1K1 changes', () => {
			getters.getZObjectKeyByRowId = createFunctionsMockForId( rowId, Constants.Z_OBJECT_TYPE );
			getters.getZReferenceTerminalValue = createFunctionsMockForId( rowId, Constants.Z_ARGUMENT );
			getters.isInsideComposition = createGettersWithFunctionsMock( false );

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = mount( ZObjectKeyValue, {
				props: {
					edit: true,
					rowId: rowId
				}
			} );

			wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected', 'Function call' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-type', [ [ { keyPath: [], value: 'Function call' } ] ] );
		} );

		it( 'if the value of the Z1K1.Z9K1 changes', async () => {
			getters.getZObjectKeyByRowId = () => ( id ) => {
				if ( id === rowId ) {
					return Constants.Z_REFERENCE_ID;
				} else if ( id === parentRowId ) {
					return Constants.Z_OBJECT_TYPE;
				}
			};
			getters.getParentRowId = createFunctionsMockForId( rowId, parentRowId );

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = mount( ZObjectKeyValue, {
				props: {
					edit: true,
					rowId: rowId
				}
			} );

			const input = wrapper.find( 'input' );
			await input.setValue( 'my string value' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ Constants.Z_STRING_VALUE ], value: 'my string value' } ] ] );
		} );

		// TODO(T326007): Implement these tests.
		it( 'if the value of the Z7K1 changes', () => {

		} );

		it( 'when the changed key-value is a type', () => {

		} );

		it( 'for a simple change that is isolated to the key-value pair', async () => {
			getters.getZObjectTypeByRowId = createFunctionsMockForId( rowId, Constants.Z_STRING );

			global.store.hotUpdate( {
				getters: getters
			} );

			var wrapper = mount( ZObjectKeyValue, {
				props: {
					edit: true,
					rowId: rowId
				}
			} );

			const input = wrapper.find( 'input' );
			await input.setValue( 'my string value' );

			expect( actions.setValueByRowIdAndPath ).toHaveBeenCalledWith( expect.anything(), { keyPath: [ Constants.Z_STRING_VALUE ], rowId: 2, value: 'my string value' } );
		} );
	} );
} );