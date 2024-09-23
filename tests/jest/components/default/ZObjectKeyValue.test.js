/*!
 * WikiLambda unit test suite for the default ZObjectKeyValue component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	ZObjectKeyValue = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZObjectKeyValue.vue' );

describe( 'ZObjectKeyValue', () => {
	let getters,
		actions;

	beforeEach( () => {
		getters = {
			createObjectByType: createGettersWithFunctionsMock(),
			getCurrentZObjectId: createGetterMock( 'Z0' ),
			getDepthByRowId: createGettersWithFunctionsMock( 1 ),
			getErrors: createGettersWithFunctionsMock( [] ),
			getExpectedTypeOfKey: createGettersWithFunctionsMock( 'Z1' ),
			getLabelData: createLabelDataMock(),
			getParentRowId: createGettersWithFunctionsMock( 0 ),
			getTypedListItemType: createGettersWithFunctionsMock( 'Z6' ),
			getZFunctionCallFunctionId: createGettersWithFunctionsMock(),
			getZKeyIsIdentity: createGettersWithFunctionsMock( false ),
			getZKeyTypeRowId: createGettersWithFunctionsMock( 3 ),
			getZObjectAsJsonById: createGettersWithFunctionsMock(),
			getZObjectKeyByRowId: createGettersWithFunctionsMock( 'Z1K1' ),
			getZObjectTypeByRowId: createGettersWithFunctionsMock( Constants.Z_STRING ),
			getZObjectValueByRowId: createGettersWithFunctionsMock(),
			getZPersistentContentRowId: createGettersWithFunctionsMock( 1 ),
			hasParser: createGettersWithFunctionsMock( false ),
			hasRenderer: createGettersWithFunctionsMock( false ),
			isCreateNewPage: createGetterMock( false ),
			isIdentityKey: createGettersWithFunctionsMock( false ),
			isMainObject: createGettersWithFunctionsMock( true ),
			isWikidataEntity: createGettersWithFunctionsMock( false ),
			isWikidataReference: createGettersWithFunctionsMock( false ),
			// For ZObjectKeyValueSet:
			getChildrenByParentRowId: createGettersWithFunctionsMock( [] )
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: { WlKeyValueBlock: false }
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-z-typed-list' } ).exists() ).toBe( true );
		} );

		it( 'wikidata lexeme component for wikidata entity', () => {
			getters.isWikidataEntity = createGettersWithFunctionsMock( true );
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL );
			getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_FETCH_LEXEME );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-wikidata-lexeme' } ).exists() ).toBe( true );
			expect( wrapper.vm.expanded ).toBe( false );
		} );

		it( 'wikidata lexeme component for wikidata reference', () => {
			getters.isWikidataReference = createGettersWithFunctionsMock( true );
			getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_REFERENCE_LEXEME );
			global.store.hotUpdate( {
				getters: getters
			} );

			const wrapper = shallowMount( ZObjectKeyValue, {
				props: {
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.findComponent( { name: 'wl-wikidata-lexeme' } ).exists() ).toBe( true );
			expect( wrapper.vm.expanded ).toBe( false );
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
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
					rowId: 1,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
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
					},
					global: {
						stubs: {
							WlKeyValueBlock: false,
							WlKeyBlock: false
						}
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
					},
					global: {
						stubs: {
							WlKeyValueBlock: false,
							WlKeyBlock: false
						}
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
					},
					global: {
						stubs: {
							WlKeyValueBlock: false,
							WlKeyBlock: false
						}
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
					},
					global: {
						stubs: {
							WlKeyValueBlock: false,
							WlKeyBlock: false
						}
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
					},
					global: {
						stubs: {
							WlKeyValueBlock: false,
							WlKeyBlock: false
						}
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

		describe( 'disableEdit', () => {
			it( 'disables edit if parent key is disabled', () => {
				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1,
						parentDisableEdit: true
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'disables edit if the key is the identity key of the persistent object', () => {
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z2K2' );
				getters.isIdentityKey = createGettersWithFunctionsMock( true );
				global.store.hotUpdate( { getters: getters } );
				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'disables edit if key is for the Typed List item type and the type is bound', () => {
				getters.getParentRowId = createGettersWithFunctionsMock( 1 );
				getters.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z11' );
				getters.getZObjectKeyByRowId = () => ( id ) => ( id === 10 ) ? '0' :
					( id === 1 ) ? 'Z12K1' :
						undefined;
				global.store.hotUpdate( { getters: getters } );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 10
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'enables edit if key is for the Typed List item type and the type is not bound', () => {
				getters.getParentRowId = createGettersWithFunctionsMock( 1 );
				getters.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z1' );
				getters.getZObjectKeyByRowId = () => ( id ) => ( id === 10 ) ? '0' :
					( id === 1 ) ? 'Z12K1' :
						undefined;
				global.store.hotUpdate( { getters: getters } );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 10
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( false );
			} );

			it( 'disables edit if key is Z3K1/Key type and Z3K4/Is identity is set to true', () => {
				getters.getParentRowId = createGettersWithFunctionsMock( 1 );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z3K1' );
				getters.getZKeyIsIdentity = createGettersWithFunctionsMock( true );
				global.store.hotUpdate( { getters: getters } );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 10
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'enables edit if key is Z3K1/Key type and Z3K4/Is identity is set to false', () => {
				getters.getParentRowId = createGettersWithFunctionsMock( 1 );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z3K1' );
				getters.getZKeyIsIdentity = createGettersWithFunctionsMock( false );
				global.store.hotUpdate( { getters: getters } );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 10
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( false );
			} );

			it( 'disables edit if key is Z1K1/Object type and the type is bound', () => {
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z1K1' );
				getters.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z11' );
				global.store.hotUpdate( { getters: getters } );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 10
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'disables edit if we are editing the type of a stored persistent object', () => {
				getters.getParentRowId = createGettersWithFunctionsMock( 1 );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z1K1' );
				getters.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z1' );
				getters.isCreateNewPage = createGetterMock( false );
				getters.getZObjectKeyByRowId = () => ( id ) => ( id === 10 ) ? 'Z1K1' :
					( id === 1 ) ? 'Z2K2' :
						undefined;
				global.store.hotUpdate( { getters: getters } );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 10
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'enables edit if we are editing the type of a new persistent object', () => {
				getters.getParentRowId = createGettersWithFunctionsMock( 1 );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z1K1' );
				getters.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z1' );
				getters.isCreateNewPage = createGetterMock( true );
				getters.getZObjectKeyByRowId = () => ( id ) => ( id === 10 ) ? 'Z1K1' :
					( id === 1 ) ? 'Z2K2' :
						undefined;
				global.store.hotUpdate( { getters: getters } );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 10
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( false );
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
					},
					global: {
						stubs: { WlKeyValueBlock: false }
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
					},
					global: {
						stubs: { WlKeyValueBlock: false }
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
					},
					global: {
						stubs: { WlKeyValueBlock: false }
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
					},
					global: {
						stubs: { WlKeyValueBlock: false }
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
					},
					global: {
						stubs: { WlKeyValueBlock: false }
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
					},
					global: {
						stubs: { WlKeyValueBlock: false }
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
					},
					global: {
						stubs: { WlKeyValueBlock: false }
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
					},
					global: {
						stubs: { WlKeyValueBlock: false }
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
					},
					global: {
						stubs: { WlKeyValueBlock: false }
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
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion for wikidata entity', () => {
				getters.isWikidataEntity = createGettersWithFunctionsMock( true );
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL );
				getters.getZFunctionCallFunctionId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_FETCH_LEXEME );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						rowId: 1,
						edit: false
					},
					global: {
						stubs: {
							WlKeyValueBlock: false
						}
					}
				} );

				const toggle = wrapper.findComponent( { name: 'wl-expanded-toggle' } );
				expect( toggle.exists() ).toBe( true );
				expect( toggle.vm.hasExpandedMode ).toBe( false );
			} );

			it( 'disables expansion for wikidata reference', () => {
				getters.isWikidataReference = createGettersWithFunctionsMock( true );
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_REFERENCE_LEXEME );
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						rowId: 1,
						edit: false
					},
					global: {
						stubs: {
							WlKeyValueBlock: false
						}
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
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				wrapper.findComponent( { name: 'wl-z-reference' } ).vm.$emit( 'set-value', { keyPath: [], value: 'Z60' } );
				expect( wrapper.emitted() ).toHaveProperty( 'set-type', [ [ { keyPath: [], value: 'Z60' } ] ] );
			} );

			it( 'trigger set-value when type is set to typed list', () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
				getters.getZObjectKeyByRowId = () => ( id ) => ( id === 1 ) ? Constants.Z_FUNCTION_CALL_FUNCTION :
					( id === 0 ) ? Constants.Z_OBJECT_TYPE :
						undefined;
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					},
					global: {
						stubs: { WlKeyValueBlock: false }
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
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				wrapper.findComponent( { name: 'wl-z-reference' } ).vm.$emit( 'set-value', { keyPath: [], value: [ Constants.Z_OBJECT ] } );
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: [ Constants.Z_OBJECT ] } ] ] );
			} );

			it( 'passes up responsibility if the change happens on Z3K4.Z40K1 key', () => {
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
				getters.getZObjectKeyByRowId = () => ( id ) => ( id === 1 ) ? Constants.Z_BOOLEAN_IDENTITY :
					( id === 0 ) ? Constants.Z_KEY_IS_IDENTITY :
						undefined;
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				wrapper.findComponent( { name: 'wl-z-reference' } ).vm.$emit( 'set-value', {
					keyPath: [ Constants.Z_REFERENCE_ID ],
					value: Constants.Z_BOOLEAN_TRUE
				} );
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_BOOLEAN_IDENTITY, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_BOOLEAN_TRUE
				} ] ] );
			} );

			it( 'sets Z3K1 reference to self if Z3K4 is set to true', () => {
				getters.getCurrentZObjectId = createGetterMock( 'Z12345' );
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_IS_IDENTITY );
				getters.getParentRowId = createGettersWithFunctionsMock( 0 );
				getters.getZKeyTypeRowId = createGettersWithFunctionsMock( 2 );
				getters.getZObjectTypeByRowId = () => ( id ) => {
					const types = {
						0: Constants.Z_KEY,
						1: Constants.Z_BOOLEAN,
						2: Constants.Z_REFERENCE
					};
					return types[ id ] || 'Z1';
				};
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				wrapper.findComponent( { name: 'wl-z-boolean' } ).vm.$emit( 'set-value', {
					keyPath: [ Constants.Z_BOOLEAN_IDENTITY, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_BOOLEAN_TRUE
				} );
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_KEY_TYPE, Constants.Z_REFERENCE_ID ],
					value: 'Z12345'
				} ] ] );
			} );

			it( 'sets Z3K1 function call to reference of self if Z3K4 is set to true', () => {
				const refToSelf = { Z1K1: 'Z9', Z9K1: 'Z12345' };
				getters.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_IS_IDENTITY );
				getters.getZKeyTypeRowId = createGettersWithFunctionsMock( 3 );
				getters.createObjectByType = createGettersWithFunctionsMock( refToSelf );
				getters.getZObjectTypeByRowId = () => ( id ) => {
					const types = {
						0: Constants.Z_KEY,
						1: Constants.Z_BOOLEAN,
						2: Constants.Z_REFERENCE
					};
					return types[ id ] || 'Z1';
				};
				global.store.hotUpdate( {
					getters: getters
				} );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				wrapper.findComponent( { name: 'wl-z-boolean' } ).vm.$emit( 'set-value', {
					keyPath: [ Constants.Z_BOOLEAN_IDENTITY, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_BOOLEAN_TRUE
				} );
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_KEY_TYPE ],
					value: refToSelf
				} ] ] );
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
					},
					global: {
						stubs: { WlKeyValueBlock: false }
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
							WlZObjectKeyValueSet: false,
							WlKeyValueBlock: false
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
					literal: true,
					append: false
				} );
			} );
		} );
	} );
} );
