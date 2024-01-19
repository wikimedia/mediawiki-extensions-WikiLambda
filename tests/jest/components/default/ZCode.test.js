/*!
 * WikiLambda unit test suite for the default ZCode component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGetterMock = require( '../../helpers/getterHelpers.js' ).createGetterMock,
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	ZCode = require( '../../../../resources/ext.wikilambda.edit/components/default-view-types/ZCode.vue' ),
	CodeEditor = require( '../../../../resources/ext.wikilambda.edit/components/base/CodeEditor.vue' );

describe( 'ZCode', () => {
	var getters,
		actions;
	beforeEach( () => {
		getters = {
			getErrors: createGettersWithFunctionsMock( [] ),
			getRowByKeyPath: createGettersWithFunctionsMock( 1 ),
			getLabel: createGettersWithFunctionsMock( 'label' ),
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
			getZObjectTypeByRowId: createGettersWithFunctionsMock( 'Z9' ),
			getZReferenceTerminalValue: createGettersWithFunctionsMock( 'Z610' )
		};
		actions = {
			fetchAllZProgrammingLanguages: jest.fn(),
			fetchZids: jest.fn(),
			clearErrors: jest.fn(),
			changeType: jest.fn()
		};
		global.store.hotUpdate( {
			getters: getters,
			actions: actions
		} );
	} );
	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			var wrapper = shallowMount( ZCode, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays the ace editor', () => {
			var wrapper = shallowMount( ZCode, {
				props: {
					edit: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-code__code-editor' ).exists() ).toBe( true );
		} );

		it( 'editor is in read only mode', () => {
			var wrapper = shallowMount( ZCode, {
				props: {
					edit: false
				}
			} );
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'readOnly' ) ).toBe( true );
		} );

		describe( 'when current programming language is a reference', () => {
			beforeEach( () => {
				getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z610' );
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z9' );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );
			} );

			it( 'computes the programming language values', () => {
				const wrapper = shallowMount( ZCode, {
					props: {
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
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z61' );
				getters.getRowByKeyPath = createGettersWithFunctionsMock( { id: 2, value: 'python' } );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );
			} );

			it( 'computes the programming language values', () => {
				const wrapper = shallowMount( ZCode, {
					props: {
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
			var wrapper = shallowMount( ZCode, {
				props: {
					edit: true
				}
			} );

			expect( wrapper.findComponent( '.ext-wikilambda-code__language-selector' ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'readOnly' ) ).toBe( false );
		} );

		describe( 'when current programming language is a reference', () => {
			it( 'updates programming language and initializes box for javascript', async () => {
				// Set initial value to something other than javascript
				getters.getZReferenceTerminalValue = createGettersWithFunctionsMock( 'Z610' );
				global.store.hotUpdate( {
					getters: getters,
					actions: actions
				} );

				var wrapper = shallowMount( ZCode, {
					props: {
						edit: true
					}
				} );
				wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected',
					Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT );
				await wrapper.vm.$nextTick();
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [
						Constants.Z_CODE_LANGUAGE,
						Constants.Z_REFERENCE_ID
					],
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

				var wrapper = shallowMount( ZCode, {
					props: {
						edit: true
					}
				} );
				wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected',
					Constants.Z_PROGRAMMING_LANGUAGES.PYTHON );
				await wrapper.vm.$nextTick();
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [
						Constants.Z_CODE_LANGUAGE,
						Constants.Z_REFERENCE_ID
					],
					value: Constants.Z_PROGRAMMING_LANGUAGES.PYTHON
				} ],
				[ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'def Z10001(Z10001K1, Z10001K2):\n\t'
				} ] ] );
			} );

			it( 'updates code for valid strings', async () => {
				var wrapper = shallowMount( ZCode, {
					props: {
						edit: true
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
				getters.getZObjectTypeByRowId = createGettersWithFunctionsMock( 'Z61' );
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

				var wrapper = shallowMount( ZCode, {
					props: {
						edit: true
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

				var wrapper = shallowMount( ZCode, {
					props: {
						edit: true
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
	} );
} );
