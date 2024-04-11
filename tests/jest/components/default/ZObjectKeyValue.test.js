/*!
 * WikiLambda unit test suite for the default ZObjectKeyValue component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ZObjectKeyValue = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZObjectKeyValue.vue' );

describe( 'ZObjectKeyValue', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			isCreateNewPage: createGetterMock( false ),
			isMainObject: createGettersWithFunctionsMock( true ),
			getLabelData: createGettersWithFunctionsMock( { zid: Constants.Z_PERSISTENTOBJECT_ID, label: 'id', lang: Constants.Z_NATURAL_LANGUAGE_ENGLISH } ),
			getZObjectKeyByRowId: createGettersWithFunctionsMock( 'Z1K1' ),
			getExpectedTypeOfKey: createGettersWithFunctionsMock(),
			getZObjectValueByRowId: createGettersWithFunctionsMock(),
			getZObjectTypeByRowId: createGettersWithFunctionsMock( Constants.Z_STRING ),
			getUserLangZid: createGettersWithFunctionsMock( 'Z1002' ),
			getZObjectAsJsonById: createGettersWithFunctionsMock(),
			getZPersistentContentRowId: createGettersWithFunctionsMock( 1 ),
			getTypedListItemType: createGettersWithFunctionsMock( 'Z6' ),
			getErrors: createGettersWithFunctionsMock( [] ),
			getDepthByRowId: createGettersWithFunctionsMock( 1 ),
			getParentRowId: createGettersWithFunctionsMock( 0 ),
			getChildrenByParentRowId: createGettersWithFunctionsMock( [] ),
			hasRenderer: createGettersWithFunctionsMock( false ),
			hasParser: createGettersWithFunctionsMock( false )
		};
		actions = {
			changeType: jest.fn(),
			clearErrors: jest.fn(),
			clearType: jest.fn(),
			setDirty: jest.fn(),
			setValueByRowIdAndPath: jest.fn(),
			setZFunctionCallArguments: jest.fn(),
			setZImplementationContentType: jest.fn(),
			removeItemFromTypedList: jest.fn(),
			moveItemInTypedList: jest.fn()
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	describe( 'it renders the correct component for type or key', () => {
		it( 'z monolingual string', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-monolingual-string' } ).exists() ).toBe( true );
		} );

		it( 'z reference', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-reference' } ).exists() ).toBe( true );
		} );

		it( 'z string', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-string' } ).exists() ).toBe( true );
		} );

		it( 'z code', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_CODE );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-code' } ).exists() ).toBe( true );
		} );

		it( 'z boolean', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_BOOLEAN );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-boolean' } ).exists() ).toBe( true );
		} );

		it( 'z function call', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-function-call' } ).exists() ).toBe( true );
		} );

		it( 'z implementation', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_IMPLEMENTATION );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-implementation' } ).exists() ).toBe( true );
		} );

		it( 'z tester', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_TESTER );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-tester' } ).exists() ).toBe( true );
		} );

		it( 'z evaluation result', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_RESPONSEENVELOPE );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-evaluation-result' } ).exists() ).toBe( true );
		} );

		it( 'z argument reference with type', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_ARGUMENT_REFERENCE );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-argument-reference' } ).exists() ).toBe( true );
		} );

		it( 'z argument reference with key', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
			getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_ARGUMENT_REFERENCE_KEY );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-argument-reference' } ).exists() ).toBe( true );
		} );

		it( 'z typed list', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( {
				Z1K1: Constants.Z_FUNCTION_CALL,
				Z7K1: Constants.Z_TYPED_LIST,
				Z881K1: Constants.Z_OBJECT
			} );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-typed-list' } ).exists() ).toBe( true );
		} );

		it( 'fallback with renderer and parser', () => {
			getters.hasRenderer = createGettersWithFunctionsMock( true );
			getters.hasParser = createGettersWithFunctionsMock( true );
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z12345' );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-object-string-renderer' } ).exists() ).toBe( true );
		} );

		it( 'fallback z-object-key-value-set', () => {
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z12345' );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-object-key-value-set' } ).exists() ).toBe( true );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'it renders without errors', () => {
			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					edit: true,
					rowId: 1
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		describe( 'mode selector', () => {
			it( 'it loads the mode selector if key is visible', () => {
				getters.getExpectedTypeOfKey = createGettersWithFunctionsMock( Constants.Z_TYPE );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_TYPE );
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				expect( wrapper.findComponent( { name: 'wl-mode-selector' } ).exists() ).toBe( true );
			} );

			it( 'it does not load the mode selector if key is skipped', () => {
				getters.getExpectedTypeOfKey = createGettersWithFunctionsMock( Constants.Z_TYPE );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_TYPE );
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1,
						skipKey: true
					}
				} );

				expect( wrapper.findComponent( { name: 'wl-mode-selector' } ).exists() ).toBe( false );
			} );

			it( 'deletes an item list if mode selector emits delete-list-item', () => {
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( '2' );
				global.store.hotUpdate( { getters: getters } );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				const modeSelector = wrapper.findComponent( { name: 'wl-mode-selector' } );
				modeSelector.vm.$emit( 'delete-list-item' );

				expect( actions.setDirty ).toHaveBeenCalled();
				expect( actions.removeItemFromTypedList ).toHaveBeenCalledWith( expect.anything(), {
					rowId: 1
				} );
			} );

			it( 'moves a list item one position earlier in the list if mode selector emits move-before', () => {
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( '2' );
				getters.getParentRowId = createGettersWithFunctionsMock( 10 );
				global.store.hotUpdate( { getters: getters } );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 11
					}
				} );

				const modeSelector = wrapper.findComponent( { name: 'wl-mode-selector' } );
				modeSelector.vm.$emit( 'move-before' );

				expect( actions.setDirty ).toHaveBeenCalled();
				expect( actions.moveItemInTypedList ).toHaveBeenCalledWith( expect.anything(), {
					parentRowId: 10,
					key: '2',
					offset: -1
				} );
			} );

			it( 'moves a list item one position later in the list if mode selector emits move-after', () => {
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( '2' );
				getters.getParentRowId = createGettersWithFunctionsMock( 10 );
				global.store.hotUpdate( { getters: getters } );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 11
					}
				} );

				const modeSelector = wrapper.findComponent( { name: 'wl-mode-selector' } );
				modeSelector.vm.$emit( 'move-after' );

				expect( actions.setDirty ).toHaveBeenCalled();
				expect( actions.moveItemInTypedList ).toHaveBeenCalledWith( expect.anything(), {
					parentRowId: 10,
					key: '2',
					offset: 1
				} );
			} );
		} );
	} );

	describe( 'in view mode', () => {
		it( 'it renders without errors', () => {
			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					edit: false,
					rowId: 1
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		describe( 'mode selector', () => {
			it( 'it does not load the mode selector even when key is visible', () => {
				getters.getExpectedTypeOfKey = createGettersWithFunctionsMock( Constants.Z_TYPE );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_TYPE );
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: false,
						rowId: 1,
						skipKey: false
					}
				} );

				expect( wrapper.findComponent( { name: 'wl-mode-selector' } ).exists() ).toBe( false );
			} );

			it( 'it does not load the mode selector if key is skipped', () => {
				getters.getExpectedTypeOfKey = createGettersWithFunctionsMock( Constants.Z_TYPE );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_TYPE );
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: false,
						rowId: 1,
						skipKey: true
					}
				} );

				expect( wrapper.findComponent( { name: 'wl-mode-selector' } ).exists() ).toBe( false );
			} );
		} );
	} );

	describe( 'in either view or edit mode', () => {

		describe( 'expanded toggle', () => {
			it( 'shows expansion toggle if it is not a special terminal case', () => {
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_TYPE );
				getters.getExpectedTypeOfKey = createGettersWithFunctionsMock( Constants.Z_TYPE );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				expect( wrapper.findComponent( { name: 'wl-expanded-toggle' } ).exists() ).toBe( true );
			} );

			it( 'shows expansion for non built-in types with renderer and parser', () => {
				getters.hasRenderer = createGettersWithFunctionsMock( true );
				getters.hasParser = createGettersWithFunctionsMock( true );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z60' );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion when string', () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );
				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );

				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion when reference', () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion when implementation', () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_IMPLEMENTATION );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion when implementation code', () => {
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_IMPLEMENTATION_CODE );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion when implementation function', () => {
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_IMPLEMENTATION_FUNCTION );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion when tester', () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_TESTER );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion when tester function', () => {
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_TESTER_FUNCTION );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion for non built-in types', () => {
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z60' );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );
		} );
	} );

	describe( 'state modification', () => {

		describe( 'redirect state changes', () => {

			it( 'trigger set-type if the key is an object type', () => {
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_OBJECT_TYPE );
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				wrapper.findComponent( { name: 'wl-z-reference' } ).vm.$emit( 'set-value', { keyPath: [], value: 'Z60' } );
				expect( wrapper.emitted() ).toHaveProperty( 'set-type', [ [ { keyPath: [], value: 'Z60' } ] ] );
			} );

			it( 'trigger set-value when type is set to typed list', () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
				getters.getZObjectKeyByRowId = () => ( id ) => {
					return ( id === 1 ) ? Constants.Z_FUNCTION_CALL_FUNCTION :
						( id === 0 ) ? Constants.Z_OBJECT_TYPE :
							undefined;
				};
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				wrapper.findComponent( { name: 'wl-z-reference' } ).vm.$emit( 'set-value', { keyPath: [], value: 'Z881' } );
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: [ Constants.Z_OBJECT ] } ] ] );
			} );

			it( 'passes up responsibility if value is an array and key is Z1K1', () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_OBJECT_TYPE );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				wrapper.findComponent( { name: 'wl-z-reference' } ).vm.$emit( 'set-value', { keyPath: [], value: [ Constants.Z_OBJECT ] } );
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: [ Constants.Z_OBJECT ] } ] ] );
			} );
		} );

		describe( 'perform simple changes', () => {
			it( 'persists the change when occurs to the key-value pair', () => {
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_PERSISTENTOBJECT_VALUE );
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				wrapper.getComponent( { name: 'wl-z-string' } ).vm.$emit( 'set-value', { keyPath: [], value: 'my string value' } );
				expect( actions.setValueByRowIdAndPath ).toHaveBeenCalledWith( expect.anything(), { keyPath: [ ], rowId: 1, value: 'my string value' } );
			} );
		} );

		describe( 'page redirections', () => {
			it( 'navigates into function editor when content type is set to function', () => {
				const mockNavigate = jest.fn();
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_PERSISTENTOBJECT_VALUE );
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_OBJECT );
				actions.changeType = jest.fn();
				actions.navigate = mockNavigate;

				// Create mock title element
				const title = document.createElement( 'h1' );
				title.setAttribute( 'id', 'firstHeading' );
				document.body.appendChild( title );

				global.store.hotUpdate( { getters: getters, actions: actions } );
				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					},
					global: {
						stubs: {
							WlZObjectKeyValueSet: false
						}
					}
				} );

				const keyValueSet = wrapper.findComponent( { name: 'wl-z-object-key-value-set' } );
				keyValueSet.vm.$emit( 'set-type', { value: Constants.Z_FUNCTION } );
				expect( mockNavigate ).toHaveBeenCalledWith( expect.anything(), { to: Constants.VIEWS.FUNCTION_EDITOR } );
				expect( actions.changeType ).toHaveBeenCalledTimes( 1 );
				expect( actions.changeType ).toHaveBeenCalledWith( expect.anything(), {
					id: 1,
					type: Constants.Z_FUNCTION,
					append: false
				} );
			} );
		} );
	} );
} );
