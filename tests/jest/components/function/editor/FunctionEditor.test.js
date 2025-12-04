/*!
 * WikiLambda unit test suite for the Function Editor definition component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );
const FunctionEditor = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditor.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'FunctionEditor', () => {
	let store;

	function renderFunctionEditor( props = {}, options = {} ) {
		const defaultOptions = {
			global: {
				stubs: {
					...options?.stubs
				}
			}
		};
		return shallowMount( FunctionEditor, {
			props,
			...defaultOptions
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getCurrentZObjectId = 'Z0';
		store.getUserLangZid = 'Z1002';
		store.getConnectedImplementations = [];
		store.getConnectedTests = [];
		store.getMultilingualDataLanguages = { all: [ 'Z1002', 'Z1004' ] };
		store.getZFunctionInputs = [
			{ Z1K1: { Z1K1: 'Z9', Z9K1: 'Z17' }, Z17K1: { Z1K1: 'Z9', Z9K1: 'Z6' } },
			{ Z1K1: { Z1K1: 'Z9', Z9K1: 'Z17' }, Z17K1: { Z1K1: 'Z9', Z9K1: 'Z6' } }
		];
		store.getZFunctionOutput = { Z1K1: 'Z9', Z9K1: 'Z6' };
		store.isCreateNewPage = true;
	} );

	describe( 'function editor with initial data', () => {
		it( 'renders without errors', () => {
			const wrapper = renderFunctionEditor();
			expect( wrapper.find( '.ext-wikilambda-app-function-editor' ).exists() ).toBe( true );
		} );

		it( 'loads language blocks', async () => {
			const wrapper = renderFunctionEditor();

			await waitFor( () => {
				expect( wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } ).length ).toEqual( 2 );
			} );
			expect( wrapper.findComponent( { name: 'wl-publish-widget' } ).exists() ).toBe( true );
		} );

		it( 'creates new form inputs for another language on add button click', async () => {
			const wrapper = renderFunctionEditor( {}, {
				stubs: { CdxButton: false }
			} );

			// ACTION: Click "Add labels in another language" button
			const button = wrapper.findComponent( { name: 'cdx-button' } );
			button.trigger( 'click' );

			await waitFor( () => {
				// ASSERT: One more language block has been added
				expect( wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } ).length ).toEqual( 3 );
			} );
		} );
	} );

	describe( 'function editor to create new function', () => {
		beforeEach( () => {
			store.getZFunctionInputs = [];
			store.getZFunctionOutput = { Z1K1: 'Z9', Z9K1: '' };
			store.getMultilingualDataLanguages = { all: [] };
			store.isCreateNewPage = true;
		} );

		it( 'initializes language block with user language', async () => {
			const wrapper = renderFunctionEditor();

			await waitFor( () => {
				expect( wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } ).length ).toEqual( 1 );
			} );
			expect( wrapper.findComponent( { name: 'wl-function-editor-language-block' } ).props( 'zLanguage' ) ).toEqual( 'Z1002' );
		} );
	} );

	describe( 'language switching', () => {
		it( 'allows user to select a language for an empty block', async () => {
			const wrapper = renderFunctionEditor();

			// Add a new empty language block
			const button = wrapper.findComponent( { name: 'cdx-button' } );
			button.trigger( 'click' );

			await waitFor( () => {
				expect( wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } ).length ).toEqual( 3 );
			} );

			// Get the newly added language block (index 2)
			const newBlock = wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } )[ 2 ];
			expect( newBlock.props( 'zLanguage' ) ).toBe( '' );

			// User selects a language - emit language-changed event from the language block
			newBlock.vm.$emit( 'language-changed', { index: 2, language: 'Z1001' } );

			// Language block should update with the selected language
			await waitFor( () => {
				expect( newBlock.props( 'zLanguage' ) ).toBe( 'Z1001' );
			} );
		} );

		it( 'allows user to change language from one to another', async () => {
			const wrapper = renderFunctionEditor();

			await waitFor( () => {
				expect( wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } ).length ).toEqual( 2 );
			} );

			// Get the first language block
			const block0 = wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } )[ 0 ];
			expect( block0.props( 'zLanguage' ) ).toBe( 'Z1002' );

			// User selects a different language - emit language-changed event
			block0.vm.$emit( 'language-changed', { index: 0, language: 'Z1001' } );

			// Language block should update with the new language
			await waitFor( () => {
				expect( block0.props( 'zLanguage' ) ).toBe( 'Z1001' );
			} );
		} );

		it( 'updates function languages exclusion list when user changes a language', async () => {
			const wrapper = renderFunctionEditor();

			await waitFor( () => {
				expect( wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } ).length ).toEqual( 2 );
			} );

			// Get both language blocks
			const block0 = wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } )[ 0 ];
			const block1 = wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } )[ 1 ];

			// Initially: block 0 has Z1002, block 1 has Z1004
			expect( block0.props( 'zLanguage' ) ).toBe( 'Z1002' );
			expect( block1.props( 'zLanguage' ) ).toBe( 'Z1004' );

			// User changes block 0 from Z1002 to Z1001
			block0.vm.$emit( 'language-changed', { index: 0, language: 'Z1001' } );

			await waitFor( () => {
				expect( block0.props( 'zLanguage' ) ).toBe( 'Z1001' );
			} );

			// Block 1 should now receive updated functionLanguages prop
			await waitFor( () => {
				expect( block1.props( 'functionLanguages' ) ).toContain( 'Z1001' );
				expect( block1.props( 'functionLanguages' ) ).not.toContain( 'Z1002' );
			} );
		} );

		it( 'allows user to switch languages in multiple blocks independently', async () => {
			const wrapper = renderFunctionEditor();

			await waitFor( () => {
				expect( wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } ).length ).toEqual( 2 );
			} );

			// Get both language blocks
			const block0 = wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } )[ 0 ];
			const block1 = wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } )[ 1 ];

			// Initially: block 0 has Z1002, block 1 has Z1004
			expect( block0.props( 'zLanguage' ) ).toBe( 'Z1002' );
			expect( block1.props( 'zLanguage' ) ).toBe( 'Z1004' );

			// User switches block 0 to Z1001
			block0.vm.$emit( 'language-changed', { index: 0, language: 'Z1001' } );

			await waitFor( () => {
				expect( block0.props( 'zLanguage' ) ).toBe( 'Z1001' );
				expect( block1.props( 'zLanguage' ) ).toBe( 'Z1004' );
			} );

			// User switches block 1 to Z1002
			block1.vm.$emit( 'language-changed', { index: 1, language: 'Z1002' } );

			await waitFor( () => {
				expect( block0.props( 'zLanguage' ) ).toBe( 'Z1001' );
				expect( block1.props( 'zLanguage' ) ).toBe( 'Z1002' );
			} );
		} );

		it( 'prevents user from switching language when content is filled', async () => {
			// Mock content for Z1002 (name has content)
			// The mock function should return content when called with Z1002
			store.getZPersistentName = jest.fn().mockImplementation( ( langZid ) => {
				if ( langZid === 'Z1002' ) {
					return { value: 'Test Function Name' };
				}
				return null;
			} );
			store.getZPersistentDescription = createGettersWithFunctionsMock( null );
			store.getZPersistentAlias = createGettersWithFunctionsMock( null );
			store.getZFunctionInputLabels = createGettersWithFunctionsMock( [] );

			// Unstub components so we can access the nested language selector
			const wrapper = renderFunctionEditor( {}, {
				stubs: {
					WlFunctionEditorLanguageBlock: false,
					WlFunctionEditorLanguage: false,
					WlZObjectSelector: false,
					WlFunctionEditorField: false
				}
			} );

			await waitFor( () => {
				expect( wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } ).length ).toEqual( 2 );
			} );

			// Get the first language block which has Z1002 with content
			const block0 = wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } )[ 0 ];
			expect( block0.props( 'zLanguage' ) ).toBe( 'Z1002' );

			// Access the language selector component
			const languageComponent = block0.findComponent( { name: 'wl-function-editor-language' } );
			expect( languageComponent.exists() ).toBe( true );

			const selector = languageComponent.findComponent( { name: 'wl-z-object-selector' } );
			expect( selector.exists() ).toBe( true );

			// Verify that the selector is disabled when content is filled
			expect( selector.props( 'disabled' ) ).toBe( true );
		} );
	} );
} );
