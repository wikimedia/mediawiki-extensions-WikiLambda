/*!
 * WikiLambda unit test suite for the Function Editor definition component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const shallowMount = require( '@vue/test-utils' ).shallowMount,
	createGettersWithFunctionsMock = require( '../../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	createGetterMock = require( '../../../helpers/getterHelpers.js' ).createGetterMock,
	FunctionEditor = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditor.vue' );

describe( 'FunctionEditor', () => {
	let getters;

	beforeEach( () => {
		getters = {
			getCurrentZObjectId: createGetterMock( 'Z0' ),
			getRowByKeyPath: createGettersWithFunctionsMock(),
			getUserLangZid: createGetterMock( 'Z1002' ),
			getZFunctionInputs: createGettersWithFunctionsMock( [] ),
			getMetadataLanguages: createGettersWithFunctionsMock( [ 'Z1002', 'Z1004' ] ),
			getZFunctionOutput: createGettersWithFunctionsMock( { id: 2 } ),
			getZObjectAsJsonById: createGettersWithFunctionsMock( 'Z6' ),
			isCreateNewPage: createGetterMock( true )
		};
		global.store.hotUpdate( {
			getters: getters
		} );
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
			expect( wrapper.findComponent( { name: 'wl-function-editor-footer' } ).exists() ).toBe( true );
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
			getters = {
				getCurrentZObjectId: createGetterMock( 'Z0' ),
				getRowByKeyPath: createGettersWithFunctionsMock(),
				getUserLangZid: createGetterMock( 'Z1002' ),
				getZFunctionInputs: createGettersWithFunctionsMock( [] ),
				getMetadataLanguages: createGettersWithFunctionsMock( [] ),
				getZFunctionOutput: createGettersWithFunctionsMock( undefined ),
				getZObjectAsJsonById: createGettersWithFunctionsMock( 'Z6' ),
				isCreateNewPage: createGetterMock( true )
			};
			global.store.hotUpdate( {
				getters: getters
			} );
		} );

		it( 'initializes language block with user language', async () => {
			const wrapper = shallowMount( FunctionEditor );
			await wrapper.vm.$nextTick();

			expect( wrapper.findAllComponents( { name: 'wl-function-editor-language-block' } ).length ).toEqual( 1 );
			expect( wrapper.findComponent( { name: 'wl-function-editor-language-block' } ).props( 'zLanguage' ) ).toEqual( 'Z1002' );
		} );
	} );
} );
