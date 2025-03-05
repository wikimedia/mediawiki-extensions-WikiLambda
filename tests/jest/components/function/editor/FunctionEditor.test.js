/*!
 * WikiLambda unit test suite for the Function Editor definition component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const FunctionEditor = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditor.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'FunctionEditor', () => {
	let store;

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
			const wrapper = shallowMount( FunctionEditor );
			expect( wrapper.find( '.ext-wikilambda-app-function-editor' ).exists() ).toBe( true );
		} );

		it( 'loads language blocks', async () => {
			const wrapper = shallowMount( FunctionEditor );
			await wrapper.vm.$nextTick();

			expect( wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } ).length ).toEqual( 2 );
			expect( wrapper.findComponent( { name: 'wl-publish-widget' } ).exists() ).toBe( true );
		} );

		it( 'creates new form inputs for another language on add button click', async () => {
			const wrapper = shallowMount( FunctionEditor, {
				global: { stubs: { CdxButton: false } }
			} );

			// ACTION: Click "Add labels in another language" button
			const button = wrapper.findComponent( { name: 'cdx-button' } );
			button.trigger( 'click' );
			await wrapper.vm.$nextTick();

			// ASSERT: One more language block has been added
			expect( wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } ).length ).toEqual( 3 );
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
			const wrapper = shallowMount( FunctionEditor );
			await wrapper.vm.$nextTick();

			expect( wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } ).length ).toEqual( 1 );
			expect( wrapper.findComponent( { name: 'wl-function-editor-language-block' } ).props( 'zLanguage' ) ).toEqual( 'Z1002' );
		} );
	} );
} );
