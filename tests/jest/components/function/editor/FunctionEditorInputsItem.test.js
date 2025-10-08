/*!
 * WikiLambda unit test suite for the Function Editor input item component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const FunctionEditorInputsItem = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorInputsItem.vue' );
const LabelData = require( '../../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

const langLabelData = new LabelData( 'Z1002', 'English', 'Z1002', 'en', 'ltr' );

const input = {
	keyPath: 'main.Z2K2.Z8K1.1.Z17K3.Z12K1.1.Z11K2',
	value: 'first string',
	key: 'Z10000K1',
	type: { Z1K1: 'Z9', Z9K1: 'Z6' },
	typeKeyPath: 'main.Z2K2.Z8K1.1.Z17K1'
};

const blankInput = {
	keyPath: undefined,
	value: '',
	key: 'Z10000K1',
	type: { Z1K1: 'Z9', Z9K1: 'Z6' },
	typeKeyPath: 'main.Z2K2.Z8K1.1.Z17K1'
};

describe( 'FunctionEditorInputsItem', () => {
	let store;

	/**
	 * Helper function to render FunctionEditorInputsItem component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderFunctionEditorInputsItem( props = {}, options = {} ) {
		const defaultProps = {
			input,
			index: 0,
			isMainLanguageBlock: true,
			canEditType: true,
			zLanguage: 'Z1002',
			langLabelData
		};
		const defaultOptions = {
			global: {
				stubs: {
					CdxField: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( FunctionEditorInputsItem, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	}

	beforeEach( () => {
		store = useMainStore();
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionEditorInputsItem();

		expect( wrapper.find( '.ext-wikilambda-app-function-editor-inputs-item' ).exists() ).toBe( true );
	} );

	it( 'has an input element ', () => {
		const wrapper = renderFunctionEditorInputsItem();

		expect( wrapper.findComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
	} );

	it( 'has an type selector if is main language block ', () => {
		const wrapper = renderFunctionEditorInputsItem();

		expect( wrapper.findComponent( { name: 'wl-type-selector' } ).exists() ).toBe( true );
	} );

	it( 'does not have a type selector if is a secondary language block ', () => {
		const wrapper = renderFunctionEditorInputsItem( { isMainLanguageBlock: false } );

		expect( wrapper.findComponent( { name: 'wl-z-object-selector' } ).exists() ).toBeFalsy();
	} );

	it( 'has one delete button if it is editable', () => {
		const wrapper = renderFunctionEditorInputsItem( {}, {
			stubs: { CdxButton: false }
		} );

		expect( wrapper.findAll( '.ext-wikilambda-app-function-editor-inputs-item__action-delete' ).length ).toBe( 1 );
	} );

	describe( 'on argument label change', () => {
		it( 'removes the input label object if new value is empty string', async () => {
			const wrapper = renderFunctionEditorInputsItem();

			// ACT: Change value of label
			const inputField = wrapper.findComponent( { name: 'cdx-text-input' } );
			inputField.vm.$emit( 'change', { target: { value: '' } } );

			// ASSERT: setZMonolingualString action runs correctly
			expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K2', 'Z8K1', '1', 'Z17K3', 'Z12K1' ],
				itemKeyPath: 'main.Z2K2.Z8K1.1.Z17K3.Z12K1.1.Z11K2',
				value: '',
				lang: 'Z1002'
			} );

			// ASSERT: emits argument-label-updated
			expect( wrapper.emitted( 'argument-label-updated' ) ).toBeTruthy();
		} );

		it( 'changes the label of an input if the language already exists', async () => {
			const wrapper = renderFunctionEditorInputsItem();

			// ACT: Change value of label
			const inputField = wrapper.findComponent( { name: 'cdx-text-input' } );
			inputField.vm.$emit( 'change', { target: { value: 'new input label' } } );

			// ASSERT: setZMonolingualString action runs correctly
			expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K2', 'Z8K1', '1', 'Z17K3', 'Z12K1' ],
				itemKeyPath: 'main.Z2K2.Z8K1.1.Z17K3.Z12K1.1.Z11K2',
				value: 'new input label',
				lang: 'Z1002'
			} );

			// ASSERT: emits argument-label-updated
			expect( wrapper.emitted( 'argument-label-updated' ) ).toBeTruthy();
		} );

		it( 'adds a new monolingual string if there is no label object for this language', async () => {
			const wrapper = renderFunctionEditorInputsItem( { input: blankInput } );

			// ACT: Change value of label
			const inputField = wrapper.findComponent( { name: 'cdx-text-input' } );
			inputField.vm.$emit( 'change', { target: { value: 'new input label' } } );

			// ASSERT: setZMonolingualString action runs correctly
			expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K2', 'Z8K1', '1', 'Z17K3', 'Z12K1' ],
				value: 'new input label',
				lang: 'Z1002'
			} );

			// ASSERT: emits argument-label-updated
			expect( wrapper.emitted( 'argument-label-updated' ) ).toBeTruthy();
		} );
	} );
} );
