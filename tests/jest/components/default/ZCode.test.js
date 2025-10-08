/*!
 * WikiLambda unit test suite for the default ZCode component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const ZCode = require( '../../../../resources/ext.wikilambda.app/components/types/ZCode.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const ErrorData = require( '../../../../resources/ext.wikilambda.app/store/classes/ErrorData.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );

// General use
const keyPath = 'main.Z2K2.Z14K3';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z16' },
	Z16K1: { Z1K1: 'Z9', Z9K1: 'Z610' },
	Z16K2: { Z1K1: 'Z6', Z6K1: 'some_code();' }
};

// Empty values
const emptyValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z16' },
	Z16K1: { Z1K1: 'Z9', Z9K1: '' },
	Z16K2: { Z1K1: 'Z6', Z6K1: '' }
};

// Parent is a converter
const converterKeyPath = 'main.Z2K2.Z46K3';

describe( 'ZCode', () => {
	let store;

	/**
	 * Helper function to render ZCode component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderZCode( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false
		};
		const defaultOptions = {
			global: {
				stubs: {
					WlKeyValueBlock: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( ZCode, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.isCreateNewPage = false;
		store.getErrors = createGettersWithFunctionsMock( [] );
		store.getCurrentTargetFunctionZid = 'Z10001';
		store.getCurrentZObjectId = 'Z0';
		store.getLabelData = createLabelDataMock();
		store.hasErrorByCode = createLabelDataMock( false );
		store.getInputsOfFunctionZid = createGettersWithFunctionsMock( [
			{ Z17K2: 'Z10001K1' },
			{ Z17K2: 'Z10001K2' }
		] );
		store.getAllProgrammingLangs = [
			{
				Z1K1: Constants.Z_PERSISTENTOBJECT,
				Z2K1: {
					Z1K1: Constants.Z_STRING,
					Z6K1: Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT
				},
				Z2K2: {
					Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
					Z61K1: 'javascript',
					Z61K2: 'JavaScript'
				}
			},
			{
				Z1K1: Constants.Z_PERSISTENTOBJECT,
				Z2K1: {
					Z1K1: Constants.Z_STRING,
					Z6K1: Constants.Z_PROGRAMMING_LANGUAGES.PYTHON
				},
				Z2K2: {
					Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
					Z61K1: 'python',
					Z61K2: 'Python'
				}
			}
		];
	} );

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderZCode();

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays the ace editor', () => {
			const wrapper = renderZCode();

			expect( wrapper.find( '.ext-wikilambda-app-code__code-editor' ).exists() ).toBe( true );
		} );

		it( 'editor is in read only mode', () => {
			const wrapper = renderZCode();

			expect( wrapper.getComponent( { name: 'code-editor' } ).props( 'readOnly' ) ).toBe( true );
		} );

		it( 'should not show a warning message when clicking the code editor', () => {
			const wrapper = renderZCode();

			wrapper.findComponent( { name: 'code-editor' } ).trigger( 'click' );
			expect( wrapper.find( '.cdx-message--warning.ext-wikilambda-app-code__inline-error' ).exists() ).toBe( false );
		} );

		describe( 'when current programming language is initialized', () => {
			it( 'computes the programming language value', () => {
				const wrapper = renderZCode();

				const languageDisplay = wrapper.get( '[data-testid="language-dropdown"] span' );
				expect( languageDisplay.text() ).toBe( 'python' );
			} );
		} );

	} );

	describe( 'in edit mode', () => {
		it( 'enables programming language selector and code editor when not in read-only or view mode', () => {
			const wrapper = renderZCode( {
				edit: true
			} );

			expect( wrapper.find( '.ext-wikilambda-app-code__language-selector' ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'readOnly' ) ).toBe( false );
		} );

		it( 'disables the code editor when no programming language is set on load', () => {
			const wrapper = renderZCode( {
				objectValue: emptyValue,
				edit: true
			} );

			expect( wrapper.find( '.ext-wikilambda-app-code__language-selector' ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'code-editor' } ).props( 'disabled' ) ).toBe( true );
		} );

		it( 'should show a warning message when clicking the code editor and no programming language is set', async () => {
			store.getErrors = createGettersWithFunctionsMock( [
				new ErrorData( 'wikilambda-editor-label-select-programming-language-empty', [], null, 'warning' )
			] );

			const wrapper = renderZCode( {
				objectValue: emptyValue,
				edit: true
			}, {
				stubs: {
					CdxMessage: false,
					WlSafeMessage: false
				}
			} );

			expect( wrapper.find( '.ext-wikilambda-app-code__language-selector' ).exists() ).toBe( true );

			wrapper.getComponent( { name: 'code-editor' } ).trigger( 'click' );

			await waitFor( () => expect( store.setError ).toHaveBeenCalledWith( {
				errorMessageKey: 'wikilambda-editor-label-select-programming-language-empty',
				errorType: 'warning',
				errorId: `${ keyPath }.${ Constants.Z_CODE_LANGUAGE }`
			} ) );

			expect( wrapper.findComponent( { name: 'cdx-message' } ).exists() ).toBe( true );
			expect( wrapper.findComponent( { name: 'cdx-message' } ).text() ).toContain( 'Select programming language' );
		} );

		describe( 'when current programming language is changed', () => {
			it( 'updates the programming language to JavaScript when selected and initializes the editor with JavaScript boilerplate code', async () => {
				const wrapper = renderZCode( {
					edit: true
				} );

				wrapper.findComponent( { name: 'cdx-select' } )
					.vm.$emit( 'update:selected', Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT );

				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_LANGUAGE, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT
				} ], [ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'function Z10001( Z10001K1, Z10001K2 ) {\n\n}'
				} ] ] );
			} );

			it( 'updates the programming language to Python when selected and initializes the editor with Python boilerplate code', async () => {
				const wrapper = renderZCode( {
					objectValue: emptyValue,
					edit: true
				} );

				wrapper.findComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected',
					Constants.Z_PROGRAMMING_LANGUAGES.PYTHON );
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_LANGUAGE, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_PROGRAMMING_LANGUAGES.PYTHON
				} ],
				[ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'def Z10001(Z10001K1, Z10001K2):\n\t'
				} ] ] );
			} );

			it( 'updates the code in the editor when valid code strings are inputted', async () => {
				const wrapper = renderZCode( {
					edit: true
				} );

				wrapper.findComponent( { name: 'code-editor' } ).vm.$emit( 'change', 'def() {}' );
				expect( wrapper.emitted( 'set-value' ) ).toBeTruthy();
				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'def() {}'
				} ] ] );
			} );
		} );

		describe( 'when parent of code is a converter', () => {
			it( 'initializes code box with the right function name and arguments', async () => {
				store.isCreateNewPage = false;
				store.getCurrentZObjectId = 'Z12345';

				const wrapper = renderZCode( {
					keyPath: converterKeyPath,
					edit: true
				} );

				// No notice message when edit
				const message = wrapper.findComponent( { name: 'cdx-message' } );
				expect( message.exists() ).toBe( false );

				wrapper.findComponent( { name: 'cdx-select' } )
					.vm.$emit( 'update:selected', Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT );

				expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ {
					keyPath: [ Constants.Z_CODE_LANGUAGE, Constants.Z_REFERENCE_ID ],
					value: Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT
				} ], [ {
					keyPath: [ Constants.Z_CODE_CODE, Constants.Z_STRING_VALUE ],
					value: 'function Z12345( Z12345K1 ) {\n\n}'
				} ] ] );
			} );

			it( 'displays notice message when creating a new converter', async () => {
				store.isCreateNewPage = true;

				const wrapper = renderZCode( {
					keyPath: converterKeyPath,
					edit: true
				} );

				const message = wrapper.findComponent( { name: 'cdx-message' } );
				expect( message.exists() ).toBe( true );
				expect( message.props( 'type' ) ).toBe( 'notice' );
			} );
		} );
	} );
} );
