/*!
 * WikiLambda unit test suite for the default ZCode component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var shallowMount = require( '@vue/test-utils' ).shallowMount,
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
			getAllProgrammingLangs: createGettersWithFunctionsMock(),
			getZCodeProgrammingLanguage: createGettersWithFunctionsMock( 'python' ),
			getZCodeString: createGettersWithFunctionsMock( 'def Z10001(Z10001K1, Z10001K2):' ),
			getZImplementationFunctionZid: createGettersWithFunctionsMock( 'Z10001' ),
			getInputsOfFunctionZid: createGettersWithFunctionsMock( [
				{ Z17K2: 'Z10001K1' },
				{ Z17K2: 'Z10001K2' }
			] )
		};
		actions = {
			fetchAllZProgrammingLanguages: createGettersWithFunctionsMock(),
			fetchZKeys: jest.fn(),
			clearErrors: jest.fn()
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

		it( 'updates programming language and initializes box for javascript', async () => {
			var wrapper = shallowMount( ZCode, {
				props: {
					edit: true
				}
			} );
			wrapper.findComponent( { name: 'wl-select' } ).vm.$emit( 'update:selected', 'javascript' );
			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				keyPath: [
					Constants.Z_CODE_LANGUAGE,
					Constants.Z_PROGRAMMING_LANGUAGE_CODE,
					Constants.Z_STRING_VALUE
				],
				value: 'javascript'
			} ],
			[ {
				keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
				value: 'function Z10001( Z10001K1, Z10001K2 ) {\n\n}'
			} ] ] );
		} );

		it( 'updates programming language and initializes box for lua', async () => {
			var wrapper = shallowMount( ZCode, {
				props: {
					edit: true
				}
			} );
			wrapper.findComponent( { name: 'wl-select' } ).vm.$emit( 'update:selected', 'lua' );
			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				keyPath: [
					Constants.Z_CODE_LANGUAGE,
					Constants.Z_PROGRAMMING_LANGUAGE_CODE,
					Constants.Z_STRING_VALUE
				],
				value: 'lua'
			} ],
			[ {
				keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
				value: 'function Z10001(Z10001K1, Z10001K2)\n\t\nend'
			} ] ] );
		} );

		it( 'updates programming language and initializes box for python', async () => {
			// Set initial value to something other than python
			getters.getZCodeProgrammingLanguage = createGettersWithFunctionsMock( 'javascript' );
			global.store.hotUpdate( {
				getters: getters,
				actions: actions
			} );

			var wrapper = shallowMount( ZCode, {
				props: {
					edit: true
				}
			} );
			wrapper.findComponent( { name: 'wl-select' } ).vm.$emit( 'update:selected', 'python' );
			await wrapper.vm.$nextTick();
			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
				keyPath: [
					Constants.Z_CODE_LANGUAGE,
					Constants.Z_PROGRAMMING_LANGUAGE_CODE,
					Constants.Z_STRING_VALUE
				],
				value: 'python'
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
} );
