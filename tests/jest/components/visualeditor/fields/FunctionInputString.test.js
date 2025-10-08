'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const FunctionInputString = require( '../../../../../resources/ext.wikilambda.app/components/visualeditor/fields/FunctionInputString.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'FunctionInputString', () => {
	let store;

	// Helper function to render FunctionInputString with common configuration
	const renderFunctionInputString = ( props = {}, options = {} ) => {
		const defaultProps = {
			value: 'Test value',
			inputType: 'Z6'
		};
		const defaultOptions = {
			global: {
				stubs: {
					CdxField: false,
					CdxLabel: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( FunctionInputString, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	};

	beforeEach( () => {
		store = useMainStore();
		// Mock defaultValueCallbacks to include string types for testing
		store.defaultValueCallbacks = {
			Z6: () => 'Default String Value' // Mock string type with default value
		};
		// Mock isNewParameterSetup to false for tests that expect auto-checking behavior
		store.isNewParameterSetup = false;
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionInputString();
		expect( wrapper.find( '.ext-wikilambda-app-function-input-string' ).exists() ).toBe( true );
	} );

	it( 'emits input event when value changes', () => {
		const wrapper = renderFunctionInputString();
		wrapper.getComponent( { name: 'cdx-text-input' } ).vm.$emit( 'update:model-value', 'New value' );
		expect( wrapper.emitted().input[ 0 ] ).toEqual( [ 'New value' ] );
	} );

	it( 'emits update event when value changes', () => {
		const wrapper = renderFunctionInputString();
		wrapper.getComponent( { name: 'cdx-text-input' } ).vm.$emit( 'update:model-value', 'New value' );
		expect( wrapper.emitted().update[ 0 ] ).toEqual( [ 'New value' ] );
	} );

	it( 'emits validate event on mount', () => {
		const wrapper = renderFunctionInputString();
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true } ] );
	} );

	describe( 'default value functionality', () => {
		it( 'shows default value as placeholder when shouldUseDefaultValue is true', () => {
			const wrapper = renderFunctionInputString( {
				shouldUseDefaultValue: true,
				defaultValue: 'Default String Value'
			} );

			expect( wrapper.vm.placeholder ).toBe( 'Default String Value' );
		} );

		it( 'shows normal placeholder when shouldUseDefaultValue is false', () => {
			const wrapper = renderFunctionInputString( {
				shouldUseDefaultValue: false
			} );

			expect( wrapper.vm.placeholder ).toBe( 'Enter text' );
		} );
	} );
} );
