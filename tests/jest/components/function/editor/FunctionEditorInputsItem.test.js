/*!
 * WikiLambda unit test suite for the Function Editor input item component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../../helpers/getterHelpers.js' );
const FunctionEditorInputsItem = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorInputsItem.vue' );
const LabelData = require( '../../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

const langLabelData = new LabelData( 'Z1002', 'English', 'Z1002', 'en', 'ltr' );

describe( 'FunctionEditorInputsItem', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock( { Z1002: 'English' } );
		store.getRowByKeyPath = createGettersWithFunctionsMock();
		store.getZArgumentLabelForLanguage = createGettersWithFunctionsMock();
		store.getZArgumentTypeRowId = createGettersWithFunctionsMock( 5 );
		store.getUserLangCode = 'en';
		store.getZMonolingualTextValue = createGettersWithFunctionsMock( '' );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionEditorInputsItem, { props: {
			rowId: 1,
			index: 0,
			isMainLanguageBlock: true,
			canEditType: true,
			zLanguage: 'Z1002',
			langLabelData
		} } );

		expect( wrapper.find( '.ext-wikilambda-app-function-editor-inputs-item' ).exists() ).toBeTruthy();
	} );

	it( 'has an input element ', () => {
		const wrapper = shallowMount( FunctionEditorInputsItem, {
			props: {
				rowId: 1,
				index: 0,
				isMainLanguageBlock: true,
				canEditType: true,
				zLanguage: 'Z1002',
				langLabelData
			},
			global: { stubs: { CdxField: false } }
		} );

		expect( wrapper.findComponent( { name: 'cdx-text-input' } ).exists() ).toBeTruthy();
	} );

	it( 'has an type selector if is main language block ', () => {
		const wrapper = shallowMount( FunctionEditorInputsItem, {
			props: {
				rowId: 1,
				index: 0,
				isMainLanguageBlock: true,
				canEditType: true,
				zLanguage: 'Z1002',
				langLabelData
			},
			global: { stubs: { CdxField: false } }
		} );

		expect( wrapper.findComponent( { name: 'wl-type-selector' } ).exists() ).toBeTruthy();
	} );

	it( 'does not have a type selector if is a secondary language block ', () => {
		const wrapper = shallowMount( FunctionEditorInputsItem, {
			props: {
				rowId: 1,
				index: 0,
				isMainLanguageBlock: false,
				canEditType: true,
				zLanguage: 'Z1002',
				langLabelData
			},
			global: { stubs: { CdxField: false } }
		} );

		expect( wrapper.findComponent( { name: 'wl-z-object-selector' } ).exists() ).toBeFalsy();
	} );

	it( 'has one delete button if it is editable', () => {
		const wrapper = shallowMount( FunctionEditorInputsItem, {
			props: {
				rowId: 1,
				index: 0,
				isMainLanguageBlock: true,
				canEditType: true,
				zLanguage: 'Z1002',
				langLabelData
			},
			global: { stubs: { CdxButton: false } }
		} );

		expect( wrapper.findAll( '.ext-wikilambda-app-function-editor-inputs-item__action-delete' ).length ).toBe( 1 );
	} );

	describe( 'on argument label change', () => {
		it( 'removes the input label object if new value is empty string', async () => {
			store.getZArgumentLabelForLanguage = createGettersWithFunctionsMock( { id: 2 } );

			const wrapper = shallowMount( FunctionEditorInputsItem, {
				props: {
					rowId: 1,
					index: 0,
					isMainLanguageBlock: true,
					canEditType: true,
					zLanguage: 'Z1002',
					langLabelData
				},
				global: { stubs: { CdxField: false } }
			} );

			// ACT: Change value of label
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: '' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: removeItemFromTypedList action runs correctly
			expect( store.removeItemFromTypedList ).toHaveBeenCalledWith( {
				rowId: 2
			} );

			// ASSERT: emits argument-label-updated
			expect( wrapper.emitted( 'argument-label-updated' ) ).toBeTruthy();
		} );

		it( 'changes the label of an input if the language already exists', async () => {
			store.getZArgumentLabelForLanguage = createGettersWithFunctionsMock( { id: 2 } );

			const wrapper = shallowMount( FunctionEditorInputsItem, {
				props: {
					rowId: 1,
					index: 0,
					isMainLanguageBlock: true,
					canEditType: true,
					zLanguage: 'Z1002',
					langLabelData
				},
				global: { stubs: { CdxField: false } }
			} );

			// ACT: Change value of label
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'new input label' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: setValueByRowIdAndPath action runs correctly
			expect( store.setValueByRowIdAndPath ).toHaveBeenCalledWith( {
				rowId: 2,
				keyPath: [ 'Z11K2', 'Z6K1' ],
				value: 'new input label'
			} );

			// ASSERT: emits argument-label-updated
			expect( wrapper.emitted( 'argument-label-updated' ) ).toBeTruthy();
		} );

		it( 'adds a new monolingual string if there is no label object for this language', async () => {
			store.getZArgumentLabelForLanguage = createGettersWithFunctionsMock( undefined );
			store.getRowByKeyPath = createGettersWithFunctionsMock( { id: 1 } );

			const wrapper = shallowMount( FunctionEditorInputsItem, {
				props: {
					rowId: 1,
					index: 0,
					isMainLanguageBlock: true,
					canEditType: true,
					zLanguage: 'Z1002',
					langLabelData
				},
				global: { stubs: { CdxField: false } }
			} );

			// ACT: Change value of label
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'new input label' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: changeType action runs correctly
			expect( store.changeType ).toHaveBeenCalledWith( {
				id: 1,
				type: 'Z11',
				lang: 'Z1002',
				value: 'new input label',
				append: true
			} );

			// ASSERT: emits argument-label-updated
			expect( wrapper.emitted( 'argument-label-updated' ) ).toBeTruthy();
		} );
	} );
} );
