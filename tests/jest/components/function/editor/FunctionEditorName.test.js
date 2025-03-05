/*!
 * WikiLambda unit test suite for the Function Definition name component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { createGettersWithFunctionsMock } = require( '../../../helpers/getterHelpers.js' );
const FunctionEditorName = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorName.vue' );
const LabelData = require( '../../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

const langLabelData = new LabelData( 'Z1002', 'English', 'Z1002', 'en', 'ltr' );

describe( 'FunctionEditorName', () => {
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getZPersistentName = createGettersWithFunctionsMock( {
			keyPath: 'main.Z2K3.Z12K1.3.Z11K2.Z6K1',
			value: 'Function name'
		} );
		store.setZMonolingualString = jest.fn();
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionEditorName, {
			props: {
				zLanguage: 'Z1002',
				langLabelData
			},
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		expect( wrapper.find( '.ext-wikilambda-app-function-editor-name' ).exists() ).toBeTruthy();
	} );

	it( 'renders an initialized input box', () => {
		const wrapper = shallowMount( FunctionEditorName, {
			props: {
				zLanguage: 'Z1002',
				langLabelData
			},
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		const input = wrapper.findComponent( { name: 'cdx-text-input' } );
		expect( input.props( 'modelValue' ) ).toBe( 'Function name' );
	} );

	it( 'renders an input box when there is no name', () => {
		store.getZPersistentName = createGettersWithFunctionsMock();
		const wrapper = shallowMount( FunctionEditorName, {
			props: {
				zLanguage: 'Z1002',
				langLabelData
			},
			global: { stubs: { WlFunctionEditorField: false } }
		} );

		const input = wrapper.findComponent( { name: 'cdx-text-input' } );
		expect( input.props( 'modelValue' ) ).toBe( '' );
	} );

	describe( 'on input', () => {
		it( 'removes the name object if new value is empty string', async () => {
			const wrapper = shallowMount( FunctionEditorName, {
				props: {
					zLanguage: 'Z1002',
					langLabelData
				},
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			wrapper.vm.updatePageTitle = jest.fn();

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: '' } } );

			// ASSERT: setZMonolingualString action runs correctly
			expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K3', 'Z12K1' ],
				itemKeyPath: 'main.Z2K3.Z12K1.3.Z11K2.Z6K1',
				value: '',
				lang: 'Z1002'
			} );

			// ASSERT: emits name-updated
			expect( wrapper.emitted( 'name-updated' ) ).toBeTruthy();

			// ASSERT: calls updatePageTitle
			expect( wrapper.vm.updatePageTitle ).toHaveBeenCalled();
		} );

		it( 'changes the name value if it already has a name object', async () => {
			const wrapper = shallowMount( FunctionEditorName, {
				props: {
					zLanguage: 'Z1002',
					langLabelData
				},
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			wrapper.vm.updatePageTitle = jest.fn();

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Name' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: setZMonolingualString action runs correctly
			expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K3', 'Z12K1' ],
				itemKeyPath: 'main.Z2K3.Z12K1.3.Z11K2.Z6K1',
				value: 'New Function Name',
				lang: 'Z1002'
			} );

			// ASSERT: emits name-updated
			expect( wrapper.emitted( 'name-updated' ) ).toBeTruthy();

			// ASSERT: calls updatePageTitle
			expect( wrapper.vm.updatePageTitle ).toHaveBeenCalled();
		} );

		it( 'adds a new monolingual string if there is no name object', async () => {
			store.getZPersistentName = createGettersWithFunctionsMock( undefined );

			const wrapper = shallowMount( FunctionEditorName, {
				props: {
					zLanguage: 'Z1002',
					langLabelData
				},
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			wrapper.vm.updatePageTitle = jest.fn();

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Name' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: setZMonolingualString action runs correctly
			expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K3', 'Z12K1' ],
				value: 'New Function Name',
				lang: 'Z1002'
			} );

			// ASSERT: emits name-updated
			expect( wrapper.emitted( 'name-updated' ) ).toBeTruthy();

			// ASSERT: calls updatePageTitle
			expect( wrapper.vm.updatePageTitle ).toHaveBeenCalled();
		} );

		it( 'changes the page title if it is the main language block', async () => {
			const wrapper = shallowMount( FunctionEditorName, {
				props: {
					zLanguage: 'Z1002',
					langLabelData
				},
				global: { stubs: { WlFunctionEditorField: false } }
			} );

			wrapper.vm.updatePageTitle = jest.fn();

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Title' } } );
			await wrapper.vm.$nextTick();

			// ASSERT: calls updatePageTitle
			expect( wrapper.vm.updatePageTitle ).toHaveBeenCalled();
		} );
	} );
} );
