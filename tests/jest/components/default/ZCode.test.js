/*!
 * WikiLambda unit test suite for the default ZCode component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	{ waitFor } = require( '@testing-library/vue' ),
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	createLabelDataMock = require( '../../helpers/getterHelpers.js' ).createLabelDataMock,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	ZCode = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZCode.vue' ),
	CodeEditor = require( '../../../../resources/ext.wikilambda.app/components/base/CodeEditor.vue' );

describe( 'ZCode', () => {
	let getters,
		actions;
	beforeEach( () => {
		getters = {
			getErrors: createGettersWithFunctionsMock( [] ),
			getRowByKeyPath: createGettersWithFunctionsMock( 1 ),
			getLabelData: createLabelDataMock(),
			getAllProgrammingLangs: createGetterMock(
				[
					{
						Z1K1: Constants.Z_PERSISTENTOBJECT,
						Z2K1: Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT,
						Z2K2: {
							Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
							Z61K1: 'javascript',
							Z61K2: 'JavaScript'
						}
					},
					{
						Z1K1: Constants.Z_PERSISTENTOBJECT,
						Z2K1: Constants.Z_PROGRAMMING_LANGUAGES.PYTHON,
						Z2K2: {
							Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
							Z61K1: 'python',
							Z61K2: 'Python'
						}
					}
				]
			),
			getZCodeProgrammingLanguageRow: createGettersWithFunctionsMock( { id: 1 } ),
			getZCodeString: createGettersWithFunctionsMock( 'def Z10001(Z10001K1, Z10001K2):' ),
			getZImplementationFunctionZid: createGettersWithFunctionsMock( 'Z10001' ),
			getInputsOfFunctionZid: createGettersWithFunctionsMock( [
				{ Z17K2: 'Z10001K1' },
				{ Z17K2: 'Z10001K2' }
			] ),
			getZObjectTypeByRowId: () => ( rowId ) => rowId === 10 ? 'Z14' : 'Z9',
			getZReferenceTerminalValue: createGettersWithFunctionsMock( 'Z610' )
		};
		actions = {
			fetchAllZProgrammingLanguages: jest.fn(),
			fetchZids: jest.fn(),
			clearErrors: jest.fn(),
			setError: jest.fn(),
			changeType: jest.fn()
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZCode, {
				props: {
					parentId: 10,
					edit: false
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays the ace editor', () => {
			const wrapper = shallowMount( ZCode, {
				props: {
					parentId: 10,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-code__code-editor' ).exists() ).toBe( true );
		} );

		it( 'editor is in read only mode', () => {
			const wrapper = shallowMount( ZCode, {
				props: {
					parentId: 10,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'readOnly' ) ).toBe( true );
		} );

		it( 'should not show a warning message when clicking the code editor', () => {
			const wrapper = shallowMount( ZCode, {
				props: {
					parentId: 10,
					edit: false
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );
			wrapper.findComponent( { name: 'code-editor' } ).trigger( 'click' );
			expect( wrapper.find( '.cdx-message--warning.ext-wikilambda-app-code__inline-error' ).exists() ).toBe( false );
		} );

		describe( 'when current programming language is a reference', () => {
			beforeEach( () => {
				getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z610' );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );
			} );

			it( 'computes the programming language values', () => {
				const wrapper = shallowMount( ZCode, {
					props: {
						parentId: 10,
						edit: true
					}
				} );
				expect( wrapper.vm.programmingLanguageRowId ).toBe( 1 );
				expect( wrapper.vm.programmingLanguageType ).toBe( Constants.Z_REFERENCE );
				expect( wrapper.vm.programmingLanguageZid ).toBe( Constants.Z_PROGRAMMING_LANGUAGES.PYTHON );
				expect( wrapper.vm.programmingLanguageLiteral ).toBe( 'python' );
			} );
		} );

		describe( 'when current programming language is a literal', () => {
			beforeEach( () => {
				getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( undefined );
				getters.getZObjectTypeByRowId = () => ( rowId ) => rowId === 10 ? 'Z14' : 'Z61';
				getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2, value: 'python' } );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );
			} );

			it( 'computes the programming language values', () => {
				const wrapper = shallowMount( ZCode, {
					props: {
						parentId: 10,
						edit: true
					}
				} );
				expect( wrapper.vm.programmingLanguageRowId ).toBe( 1 );
				expect( wrapper.vm.programmingLanguageType ).toBe( Constants.Z_PROGRAMMING_LANGUAGE );
				expect( wrapper.vm.programmingLanguageZid ).toBe( Constants.Z_PROGRAMMING_LANGUAGES.PYTHON );
				expect( wrapper.vm.programmingLanguageLiteral ).toBe( 'python' );
			} );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'enables programming language selector and code editor when not in read-only or view mode', () => {
			const wrapper = shallowMount( ZCode, {
				props: {
					parentId: 10,
					edit: true
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-code__language-selector' ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'readOnly' ) ).toBe( false );
		} );

		it( 'disables the code editor when no programming language is set on load', () => {
			// Set initial value to undefined
			getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( undefined );
			global.store.hotUpdate( {
				getters: getters,
				actions: actions
			} );
			const wrapper = shallowMount( ZCode, {
				props: {
					parentId: 10,
					edit: true
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-code__language-selector' ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'disabled' ) ).toBe( true );
		} );

		it( 'should show a warning message when clicking the code editor and no programming language is set', async () => {
			// Set initial value to undefined
			getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( undefined );
			getters.getErrors = createGettersWithFunctionsMock( [ { message: 'Select programming language', type: 'warning' } ] );
			global.store.hotUpdate( {
				getters: getters,
				actions: actions
			} );
			const wrapper = shallowMount( ZCode, {
				props: {
					parentId: 10,
					edit: true
				},
				global: {
					stubs: {
						WlKeyValueBlock: false
					}
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-code__language-selector' ).exists() ).toBe( true );

			wrapper.findComponent( { name: 'code-editor' } ).trigger( 'click' );

			await wrapper.vm.$nextTick();
			await waitFor( () => expect( actions.setError ).toHaveBeenCalledWith( expect.anything(), {
				errorMessage: 'Select programming language',
				errorType: 'warning',
				rowId: 1
			} ) );
			expect( global.$i18n ).toHaveBeenCalledWith( 'wikilambda-editor-label-select-programming-language-empty' );

			await waitFor( () => {
				expect( wrapper.findComponent( { name: 'cdx-message' } ).exists() ).toBe( true );
			} );

			wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected',
				Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT );
			await wrapper.vm.$nextTick();
			expect( wrapper.find( '.cdx-message--warning.ext-wikilambda-app-code__inline-error' ).exists() ).toBe( false );
		} );

		describe( 'when current programming language is a reference', () => {
			it( 'updates programming language and initializes box for javascript', async () => {
				// Set initial value to something other than javascript
				getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z610' );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );

				const wrapper = shallowMount( ZCode, {
					props: {
						parentId: 10,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false
						}
					}
				} );
				wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected',
					Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT );
				await wrapper.vm.$nextTick();
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_LANGUAGE, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT
				} ],
				[ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'function Z10001( Z10001K1, Z10001K2 ) {\n\n}'
				} ] ] );
			} );

			it( 'updates programming language and initializes box for python', async () => {
				// Set initial value to something other than python
				getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z600' );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );

				const wrapper = shallowMount( ZCode, {
					props: {
						parentId: 10,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false
						}
					}
				} );
				wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected',
					Constants.Z_PROGRAMMING_LANGUAGES.PYTHON );
				await wrapper.vm.$nextTick();
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_LANGUAGE, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_PROGRAMMING_LANGUAGES.PYTHON
				} ],
				[ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'def Z10001(Z10001K1, Z10001K2):\n\t'
				} ] ] );
			} );

			it( 'updates code for valid strings', async () => {
				const wrapper = shallowMount( ZCode, {
					props: {
						parentId: 10,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false
						}
					}
				} );
				wrapper.getComponent( CodeEditor ).vm.$emit( 'change', 'def() {}' );
				await wrapper.vm.$nextTick();
				expect( wrapper.emitted( 'set-value' ) ).toBeTruthy();
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'def() {}'
				} ] ] );
			} );
		} );

		// TODO: Remove when we get rid of literal programming language compatibility
		describe( 'when current programming language is a literal', () => {
			beforeEach( () => {
				getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( undefined );
				getters.getZObjectTypeByRowId = () => ( rowId ) => rowId === 10 ? 'Z14' : 'Z61';
				getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2, value: 'python' } );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );
			} );

			it( 'updates programming language and initializes box for javascript', async () => {
				// Set initial value to something other than javascript
				getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2, value: 'python' } );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );

				const wrapper = shallowMount( ZCode, {
					props: {
						parentId: 10,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false
						}
					}
				} );
				wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected',
					Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT );
				await wrapper.vm.$nextTick();

				// First, changeType must be called
				expect( actions.changeType ).toHaveBeenCalledWith( expect.anything(), { id: 1, type: 'Z9' } );

				// Then, setValue event must be emitted
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_LANGUAGE, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT
				} ],
				[ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'function Z10001( Z10001K1, Z10001K2 ) {\n\n}'
				} ] ] );
			} );

			it( 'updates programming language and initializes box for python', async () => {
				// Set initial value to something other than python
				getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2, value: 'javascript' } );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );

				const wrapper = shallowMount( ZCode, {
					props: {
						parentId: 10,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false
						}
					}
				} );
				wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected',
					Constants.Z_PROGRAMMING_LANGUAGES.PYTHON );
				await wrapper.vm.$nextTick();

				// First, changeType must be called
				expect( actions.changeType ).toHaveBeenCalledWith( expect.anything(), { id: 1, type: 'Z9' } );

				// Then, setValue event must be emitted
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_LANGUAGE, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_PROGRAMMING_LANGUAGES.PYTHON
				} ],
				[ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'def Z10001(Z10001K1, Z10001K2):\n\t'
				} ] ] );
			} );
		} );

		describe( 'when parent of code is a converter', () => {
			beforeEach( () => {
				getters.getZObjectTypeByRowId = () => ( rowId ) => rowId === 10 ? 'Z64' : 'Z9';
				getters.getConverterIdentity = createGettersWithFunctionsMock( 'Z12345' );
			} );

			it( 'initializes code box with the right function name and arguments', async () => {
				// Set initial value to something other than javascript
				getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z610' );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );

				const wrapper = shallowMount( ZCode, {
					props: {
						parentId: 10,
						edit: true
					},
					global: {
						stubs: {
							WlKeyValueBlock: false
						}
					}
				} );
				wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected',
					Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT );
				await wrapper.vm.$nextTick();
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_LANGUAGE, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT
				} ],
				[ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'function Z12345( Z12345K1 ) {\n\n}'
				} ] ] );
			} );
		} );
	} );
} );
