/*!
 * WikiLambda unit test suite for the default ZObjectKeyValue component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { waitFor } = require( '@testing-library/vue' );
const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ZObjectKeyValue = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZObjectKeyValue.vue' );

describe( 'ZObjectKeyValue', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.createObjectByType = createGettersWithFunctionsMock();
		store.getCurrentZObjectId = 'Z0';
		store.getDepthByRowId = createGettersWithFunctionsMock( 1 );
		store.getErrors = createGettersWithFunctionsMock( [] );
		store.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z1' );
		store.getLabelData = createLabelDataMock();
		store.getParentRowId = createGettersWithFunctionsMock( 0 );
		store.getTypedListItemType = createGettersWithFunctionsMock( 'Z6' );
		store.getZFunctionCallFunctionId = createGettersWithFunctionsMock();
		store.getZKeyIsIdentity = createGettersWithFunctionsMock( false );
		store.getZKeyTypeRowId = createGettersWithFunctionsMock( 3 );
		store.getZObjectAsJsonById = createGettersWithFunctionsMock();
		store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z1K1' );
		store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
		store.getZObjectValueByRowId = createGettersWithFunctionsMock();
		store.getZPersistentContentRowId = createGettersWithFunctionsMock( 1 );
		store.hasParser = createGettersWithFunctionsMock( false );
		store.hasRenderer = createGettersWithFunctionsMock( false );
		store.isCreateNewPage = false;
		store.isIdentityKey = createGettersWithFunctionsMock( false );
		store.isMainObject = createGettersWithFunctionsMock( true );
		store.isWikidataLiteral = createGettersWithFunctionsMock( false );
		store.isWikidataFetch = createGettersWithFunctionsMock( false );
		store.isWikidataReference = createGettersWithFunctionsMock( false );
		store.getChildrenByParentRowId = createGettersWithFunctionsMock( [] );
		store.setValueByRowIdAndPath.mockResolvedValue();
	} );

	describe( 'it renders the correct component for type or key', () => {
		it( 'z monolingual string', () => {
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_MONOLINGUALSTRING );

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
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );

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
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );

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
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_CODE );

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
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_BOOLEAN );

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
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL );

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
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_IMPLEMENTATION );

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
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_TESTER );

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

		it( 'z argument reference with type', () => {
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_ARGUMENT_REFERENCE );

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
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
			store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_ARGUMENT_REFERENCE_KEY );

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
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( {
				Z1K1: Constants.Z_FUNCTION_CALL,
				Z7K1: Constants.Z_TYPED_LIST,
				Z881K1: Constants.Z_OBJECT
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

		it( 'fallback with renderer and parser', () => {
			store.hasRenderer = createGettersWithFunctionsMock( true );
			store.hasParser = createGettersWithFunctionsMock( true );
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z12345' );

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
			store.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z12345' );

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

		describe( 'wikidata components', () => {
			describe( 'lexeme', () => {
				it( 'renders lexeme component for wikidata literal lexeme', () => {
					store.isWikidataLiteral = createGettersWithFunctionsMock( true );
					store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_LEXEME );

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

				it( 'renders lexeme component for function call to fetch wikidata lexeme', () => {
					store.isWikidataFetch = createGettersWithFunctionsMock( true );
					store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL );
					store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_FETCH_LEXEME );

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

				it( 'renders lexeme component for wikidata lexeme reference', () => {
					store.isWikidataReference = createGettersWithFunctionsMock( true );
					store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_REFERENCE_LEXEME );

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
			} );

			describe( 'lexeme form', () => {
				it( 'renders lexeme form component for wikidata literal lexeme form', () => {
					store.isWikidataLiteral = createGettersWithFunctionsMock( true );
					store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_LEXEME_FORM );

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

					expect( wrapper.findComponent( { name: 'wl-wikidata-lexeme-form' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );

				it( 'renders lexeme form component for function call to fetch wikidata lexeme form', () => {
					store.isWikidataFetch = createGettersWithFunctionsMock( true );
					store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL );
					store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_FETCH_LEXEME_FORM );

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

					expect( wrapper.findComponent( { name: 'wl-wikidata-lexeme-form' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );

				it( 'renders lexeme form component for wikidata lexeme form reference', () => {
					store.isWikidataReference = createGettersWithFunctionsMock( true );
					store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM );

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

					expect( wrapper.findComponent( { name: 'wl-wikidata-lexeme-form' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );
			} );

			describe( 'wikidata item', () => {
				it( 'renders wikidata item component for wikidata literal item', () => {
					store.isWikidataLiteral = createGettersWithFunctionsMock( true );
					store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_ITEM );

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

					expect( wrapper.findComponent( { name: 'wl-wikidata-item' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );

				it( 'renders wikidata item component for function call to fetch wikidata item', () => {
					store.isWikidataFetch = createGettersWithFunctionsMock( true );
					store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_FUNCTION_CALL );
					store.getZFunctionCallFunctionId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_FETCH_ITEM );

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

					expect( wrapper.findComponent( { name: 'wl-wikidata-item' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );

				it( 'renders wikidata item component for wikidata item reference', () => {
					store.isWikidataReference = createGettersWithFunctionsMock( true );
					store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_WIKIDATA_REFERENCE_ITEM );

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

					expect( wrapper.findComponent( { name: 'wl-wikidata-item' } ).exists() ).toBe( true );
					expect( wrapper.vm.expanded ).toBe( false );
				} );
			} );
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
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( Constants.Z_TYPE );
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_TYPE );
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );

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
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( Constants.Z_TYPE );
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_TYPE );
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );

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
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( '2' );

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

				expect( store.setDirty ).toHaveBeenCalled();
				expect( store.removeItemFromTypedList ).toHaveBeenCalledWith( {
					rowId: 1
				} );
			} );

			it( 'moves a list item one position earlier in the list if mode selector emits move-before', () => {
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( '2' );
				store.getParentRowId = createGettersWithFunctionsMock( 10 );

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

				expect( store.setDirty ).toHaveBeenCalled();
				expect( store.moveItemInTypedList ).toHaveBeenCalledWith( {
					parentRowId: 10,
					key: '2',
					offset: -1
				} );
			} );

			it( 'moves a list item one position later in the list if mode selector emits move-after', () => {
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( '2' );
				store.getParentRowId = createGettersWithFunctionsMock( 10 );

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

				expect( store.setDirty ).toHaveBeenCalled();
				expect( store.moveItemInTypedList ).toHaveBeenCalledWith( {
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
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z2K2' );
				store.isIdentityKey = createGettersWithFunctionsMock( true );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'disables edit if key is for the Typed List item type and the type is bound', () => {
				store.getParentRowId = createGettersWithFunctionsMock( 1 );
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z11' );
				store.getZObjectKeyByRowId = jest.fn( ( id ) => ( id === 10 ) ? '0' :
					( id === 1 ) ? 'Z12K1' :
						undefined );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 10
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'enables edit if key is for the Typed List item type and the type is not bound', () => {
				store.getParentRowId = createGettersWithFunctionsMock( 1 );
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z1' );
				store.getZObjectKeyByRowId = jest.fn( ( id ) => ( id === 10 ) ? '0' :
					( id === 1 ) ? 'Z12K1' :
						undefined );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 10
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( false );
			} );

			it( 'disables edit if key is Z3K1/Key type and Z3K4/Is identity is set to true', () => {
				store.getParentRowId = createGettersWithFunctionsMock( 1 );
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z3K1' );
				store.getZKeyIsIdentity = createGettersWithFunctionsMock( true );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 10
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'enables edit if key is Z3K1/Key type and Z3K4/Is identity is set to false', () => {
				store.getParentRowId = createGettersWithFunctionsMock( 1 );
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z3K1' );
				store.getZKeyIsIdentity = createGettersWithFunctionsMock( false );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 10
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( false );
			} );

			it( 'disables edit if key is Z1K1/Object type and the type is bound', () => {
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z1K1' );
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z11' );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 10
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'disables edit if we are editing the type of a stored persistent object', () => {
				store.getParentRowId = createGettersWithFunctionsMock( 1 );
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z1K1' );
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z1' );
				store.isCreateNewPage = false;
				store.getZObjectKeyByRowId = jest.fn( ( id ) => ( id === 10 ) ? 'Z1K1' :
					( id === 1 ) ? 'Z2K2' :
						undefined );

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 10
					}
				} );

				expect( wrapper.vm.disableEdit ).toBe( true );
			} );

			it( 'enables edit if we are editing the type of a new persistent object', () => {
				store.getParentRowId = createGettersWithFunctionsMock( 1 );
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z1K1' );
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( 'Z1' );
				store.isCreateNewPage = true;
				store.getZObjectKeyByRowId = jest.fn( ( id ) => ( id === 10 ) ? 'Z1K1' :
					( id === 1 ) ? 'Z2K2' :
						undefined );

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
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( Constants.Z_TYPE );
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_TYPE );
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );

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
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( Constants.Z_TYPE );
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_TYPE );
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );

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
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_TYPE );
				store.getExpectedTypeOfKey = createGettersWithFunctionsMock( Constants.Z_TYPE );

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
				store.hasRenderer = createGettersWithFunctionsMock( true );
				store.hasParser = createGettersWithFunctionsMock( true );
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z60' );

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
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );

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
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );

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
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_IMPLEMENTATION );

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
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_IMPLEMENTATION_CODE );

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
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_IMPLEMENTATION_FUNCTION );

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
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_TESTER );

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
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_TESTER_FUNCTION );

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
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( 'Z60' );

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
		} );
	} );

	describe( 'state modification', () => {

		describe( 'redirect state changes', () => {

			it( 'trigger set-type if the key is an object type', () => {
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_OBJECT_TYPE );
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );

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
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
				store.getZObjectKeyByRowId = jest.fn( ( id ) => ( id === 1 ) ? Constants.Z_FUNCTION_CALL_FUNCTION :
					( id === 0 ) ? Constants.Z_OBJECT_TYPE :
						undefined );

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
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_OBJECT_TYPE );

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
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_REFERENCE );
				store.getZObjectKeyByRowId = jest.fn( ( id ) => ( id === 1 ) ? Constants.Z_BOOLEAN_IDENTITY :
					( id === 0 ) ? Constants.Z_KEY_IS_IDENTITY :
						undefined );

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
				store.getCurrentZObjectId = 'Z12345';
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_IS_IDENTITY );
				store.getParentRowId = createGettersWithFunctionsMock( 0 );
				store.getZKeyTypeRowId = createGettersWithFunctionsMock( 2 );
				store.getZObjectTypeByRowId = jest.fn( ( id ) => {
					const types = {
						0: Constants.Z_KEY,
						1: Constants.Z_BOOLEAN,
						2: Constants.Z_REFERENCE
					};
					return types[ id ] || 'Z1';
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
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_KEY_IS_IDENTITY );
				store.getZKeyTypeRowId = createGettersWithFunctionsMock( 3 );
				store.createObjectByType = createGettersWithFunctionsMock( refToSelf );
				store.getZObjectTypeByRowId = jest.fn( ( id ) => {
					const types = {
						0: Constants.Z_KEY,
						1: Constants.Z_BOOLEAN,
						2: Constants.Z_REFERENCE
					};
					return types[ id ] || 'Z1';
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
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_PERSISTENTOBJECT_VALUE );
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );

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
				expect( store.setValueByRowIdAndPath ).toHaveBeenCalledWith( { keyPath: [ ], rowId: 1, value: 'my string value' } );
			} );

			it( 'triggers a callback when send in payload', async () => {
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_PERSISTENTOBJECT_VALUE );
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_STRING );
				store.setValueByRowIdAndPath.mockResolvedValue();
				const callbackFn = jest.fn();

				const wrapper = shallowMount( ZObjectKeyValue, {
					props: {
						edit: true,
						rowId: 1
					},
					global: {
						stubs: { WlKeyValueBlock: false }
					}
				} );

				wrapper.getComponent( { name: 'wl-z-string' } ).vm.$emit( 'set-value', { keyPath: [], value: 'my string value', callback: callbackFn } );
				expect( store.setValueByRowIdAndPath ).toHaveBeenCalled();
				await waitFor( () => expect( callbackFn ).toHaveBeenCalled() );
			} );
		} );

		describe( 'page redirections', () => {
			it( 'navigates into function editor when content type is set to function', () => {
				const mockNavigate = jest.fn();
				store.getZObjectKeyByRowId = createGettersWithFunctionsMock( Constants.Z_PERSISTENTOBJECT_VALUE );
				store.getZObjectTypeByRowId = createGettersWithFunctionsMock( Constants.Z_OBJECT );
				store.navigate = mockNavigate;

				// Create mock title element
				const title = document.createElement( 'h1' );
				title.setAttribute( 'id', 'firstHeading' );
				document.body.appendChild( title );

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
				expect( mockNavigate ).toHaveBeenCalledWith( { to: Constants.VIEWS.FUNCTION_EDITOR } );
				expect( store.changeType ).toHaveBeenCalledTimes( 1 );
				expect( store.changeType ).toHaveBeenCalledWith( {
					id: 1,
					type: Constants.Z_FUNCTION,
					literal: true,
					append: false
				} );
			} );
		} );
	} );
} );
