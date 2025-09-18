/*!
 * WikiLambda unit test suite for the Function Definition description component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );
const FunctionEditorDescription = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorDescription.vue' );
const LabelData = require( '../../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

const langLabelData = new LabelData( 'Z1002', 'English', 'Z1002', 'en', 'ltr' );

describe( 'FunctionEditorDescription', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getZPersistentDescription = createGettersWithFunctionsMock( {
			keyPath: 'main.Z2K5.Z12K1.7.Z11K2.Z6K1',
			value: 'Function description'
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionEditorDescription, {
			props: { zLanguage: 'Z1002', langLabelData },
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		expect( wrapper.find( '.ext-wikilambda-app-function-editor-description' ).exists() ).toBeTruthy();
	} );

	it( 'renders an initialized input box', () => {
		const wrapper = shallowMount( FunctionEditorDescription, {
			props: { zLanguage: 'Z1002', langLabelData },
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		const input = wrapper.findComponent( { name: 'cdx-text-area' } );
		expect( input.props( 'modelValue' ) ).toBe( 'Function description' );
	} );

	it( 'renders an input box when there is no description', () => {
		store.getZPersistentDescription = createGettersWithFunctionsMock();
		const wrapper = shallowMount( FunctionEditorDescription, {
			props: { zLanguage: 'Z1002', langLabelData },
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		const input = wrapper.findComponent( { name: 'cdx-text-area' } );
		expect( input.props( 'modelValue' ) ).toBe( '' );
	} );

	describe( 'on input', () => {
		it( 'removes the description object if new value is empty string', async () => {
			const wrapper = shallowMount( FunctionEditorDescription, {
				props: { zLanguage: 'Z1002', langLabelData },
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-area' } );
			input.vm.$emit( 'change', { target: { value: '' } } );

			// ASSERT: setZMonolingualString action runs correctly
			expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K5', 'Z12K1' ],
				itemKeyPath: 'main.Z2K5.Z12K1.7.Z11K2.Z6K1',
				value: '',
				lang: 'Z1002'
			} );

			// ASSERT: emits description-updated
			expect( wrapper.emitted( 'description-updated' ) ).toBeTruthy();
		} );

		it( 'changes the description value if it already has a description object', async () => {
			const wrapper = shallowMount( FunctionEditorDescription, {
				props: { zLanguage: 'Z1002', langLabelData },
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-area' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Description' } } );

			// ASSERT: setZMonolingualString action runs correctly
			expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K5', 'Z12K1' ],
				itemKeyPath: 'main.Z2K5.Z12K1.7.Z11K2.Z6K1',
				value: 'New Function Description',
				lang: 'Z1002'
			} );

			// ASSERT: emits description-updated
			expect( wrapper.emitted( 'description-updated' ) ).toBeTruthy();
		} );

		it( 'adds a new monolingual string if there is no description object', async () => {
			store.getZPersistentDescription = createGettersWithFunctionsMock( undefined );

			const wrapper = shallowMount( FunctionEditorDescription, {
				props: { zLanguage: 'Z1002', langLabelData },
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-area' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Description' } } );

			// ASSERT: setZMonolingualString action runs correctly
			expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K5', 'Z12K1' ],
				value: 'New Function Description',
				lang: 'Z1002'
			} );

			// ASSERT: emits description-updated
			expect( wrapper.emitted( 'description-updated' ) ).toBeTruthy();
		} );
	} );
} );
