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

	/**
	 * Helper function to render FunctionEditorName component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderFunctionEditorName( props = {}, options = {} ) {
		const defaultProps = { zLanguage: 'Z1002', langLabelData };
		const defaultOptions = {
			global: {
				stubs: {
					WlFunctionEditorField: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( FunctionEditorName, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getZPersistentName = createGettersWithFunctionsMock( {
			keyPath: 'main.Z2K3.Z12K1.3.Z11K2.Z6K1',
			value: 'Function name'
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionEditorName();

		expect( wrapper.find( '.ext-wikilambda-app-function-editor-name' ).exists() ).toBe( true );
	} );

	it( 'renders an initialized input box', () => {
		const wrapper = renderFunctionEditorName();

		const input = wrapper.findComponent( { name: 'cdx-text-input' } );
		expect( input.props( 'modelValue' ) ).toBe( 'Function name' );
	} );

	it( 'renders an input box when there is no name', () => {
		store.getZPersistentName = createGettersWithFunctionsMock();
		const wrapper = renderFunctionEditorName();

		const input = wrapper.findComponent( { name: 'cdx-text-input' } );
		expect( input.props( 'modelValue' ) ).toBe( '' );
	} );

	describe( 'on input', () => {
		it( 'removes the name object if new value is empty string', async () => {
			const wrapper = renderFunctionEditorName();

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
		} );

		it( 'changes the name value if it already has a name object', async () => {
			const wrapper = renderFunctionEditorName();

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Name' } } );

			// ASSERT: setZMonolingualString action runs correctly
			expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K3', 'Z12K1' ],
				itemKeyPath: 'main.Z2K3.Z12K1.3.Z11K2.Z6K1',
				value: 'New Function Name',
				lang: 'Z1002'
			} );

			// ASSERT: emits name-updated
			expect( wrapper.emitted( 'name-updated' ) ).toBeTruthy();
		} );

		it( 'adds a new monolingual string if there is no name object', async () => {
			store.getZPersistentName = createGettersWithFunctionsMock( undefined );

			const wrapper = renderFunctionEditorName();

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Name' } } );

			// ASSERT: setZMonolingualString action runs correctly
			expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K3', 'Z12K1' ],
				value: 'New Function Name',
				lang: 'Z1002'
			} );

			// ASSERT: emits name-updated
			expect( wrapper.emitted( 'name-updated' ) ).toBeTruthy();
		} );

		it( 'changes the page title if it is the main language block', async () => {
			const wrapper = renderFunctionEditorName();

			// ACT: Change value of name input
			const input = wrapper.findComponent( { name: 'cdx-text-input' } );
			input.vm.$emit( 'change', { target: { value: 'New Function Title' } } );

			// ASSERT: setZMonolingualString action runs correctly
			expect( store.setZMonolingualString ).toHaveBeenCalledWith( {
				parentKeyPath: [ 'main', 'Z2K3', 'Z12K1' ],
				itemKeyPath: 'main.Z2K3.Z12K1.3.Z11K2.Z6K1',
				value: 'New Function Title',
				lang: 'Z1002'
			} );

			// ASSERT: emits name-updated
			expect( wrapper.emitted( 'name-updated' ) ).toBeTruthy();
		} );
	} );
} );
