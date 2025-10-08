'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const FunctionInputField = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionInputField.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const LabelData = require( '../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );
const ErrorData = require( '../../../../resources/ext.wikilambda.app/store/classes/ErrorData.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );

describe( 'FunctionInputField', () => {
	const mockErrorData = new ErrorData( null, [], 'An error occurred', 'error' );
	let store;

	/**
	 * Helper function to render FunctionInputField component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderFunctionInputField( props = {}, options = {} ) {
		const defaultProps = {
			labelData: new LabelData( 'Z123K1', 'Test Label', 'Z1002', 'en' ),
			inputType: 'Z456',
			showValidation: true
		};
		const defaultOptions = {
			global: { stubs: { ...options?.stubs, CdxField: false, CdxLabel: false } }
		};
		return shallowMount( FunctionInputField, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getLabelData = createLabelDataMock( { Z123: 'Test Label' } );
		store.isEnumType = createGettersWithFunctionsMock( false );
		store.hasDefaultValueForType = createGettersWithFunctionsMock( false );
		store.getDefaultValueForType = createGettersWithFunctionsMock( '' );
		store.hasParser = createGettersWithFunctionsMock( false );
		store.isNewParameterSetup = false;
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionInputField();
		expect( wrapper.find( '.ext-wikilambda-app-function-input-field' ).exists() ).toBe( true );
	} );

	it( 'displays the correct label', () => {
		const wrapper = renderFunctionInputField();
		expect( wrapper.get( 'span' ).text() ).toBe( 'Test Label' );
	} );

	it( 'emits update event when input value changes', async () => {
		const wrapper = renderFunctionInputField();
		wrapper.getComponent( { name: 'wl-function-input-string' } ).vm.$emit( 'update', 'New value' );
		expect( wrapper.emitted().update[ 0 ] ).toEqual( [ 'New value' ] );
	} );

	it( 'emits update:modelValue event when input value changes', () => {
		const wrapper = renderFunctionInputField();
		const childComponent = wrapper.getComponent( { name: 'wl-function-input-string' } );
		childComponent.vm.$emit( 'input', 'Updated value' );

		expect( wrapper.emitted()[ 'update:modelValue' ][ 0 ] ).toEqual( [ 'Updated value' ] );

		// Test loading events forwarding
		childComponent.vm.$emit( 'loading-start' );
		expect( wrapper.emitted()[ 'loading-start' ] ).toBeTruthy();

		childComponent.vm.$emit( 'loading-end' );
		expect( wrapper.emitted()[ 'loading-end' ] ).toBeTruthy();
	} );

	it( 'emits validate event when validation occurs', async () => {
		const wrapper = renderFunctionInputField();
		wrapper.getComponent( { name: 'wl-function-input-string' } ).vm.$emit( 'validate', { isValid: true, error: mockErrorData } );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true, error: mockErrorData } ] );
	} );

	it( 'shows error status when error is present and showValidation is true', () => {
		const wrapper = renderFunctionInputField( {
			showValidation: true,
			error: mockErrorData
		} );
		expect( wrapper.findComponent( { name: 'cdx-field' } ).props( 'status' ) ).toBe( 'error' );
	} );

	it( 'shows default status when error is present but showValidation is false', () => {
		const wrapper = renderFunctionInputField( {
			showValidation: false,
			error: mockErrorData
		} );
		expect( wrapper.findComponent( { name: 'cdx-field' } ).props( 'status' ) ).toBe( 'default' );
	} );

	describe( 'field type selection', () => {

		it( 'renders string input component for string type', () => {
			const wrapper = renderFunctionInputField( {
				inputType: 'Z6'
			} );
			expect( wrapper.findComponent( { name: 'wl-function-input-string' } ).exists() ).toBe( true );
		} );

		it( 'renders language input component for language type', () => {
			const wrapper = renderFunctionInputField( {
				inputType: 'Z60'
			} );
			expect( wrapper.findComponent( { name: 'wl-function-input-language' } ).exists() ).toBe( true );
		} );

		it( 'renders wikidata input component for wikidata item type', () => {
			const wrapper = renderFunctionInputField( {
				inputType: 'Z6001'
			} );
			expect( wrapper.findComponent( { name: 'wl-function-input-wikidata' } ).exists() ).toBe( true );
		} );

		it( 'renders wikidata input component for wikidata item reference type', () => {
			const wrapper = renderFunctionInputField( {
				inputType: 'Z6091'
			} );
			expect( wrapper.findComponent( { name: 'wl-function-input-wikidata' } ).exists() ).toBe( true );
		} );

		it( 'renders wikidata input component for wikidata lexeme type', () => {
			const wrapper = renderFunctionInputField( {
				inputType: 'Z6005'
			} );
			expect( wrapper.findComponent( { name: 'wl-function-input-wikidata' } ).exists() ).toBe( true );
		} );

		it( 'renders wikidata input component for wikidata lexeme reference type', () => {
			const wrapper = renderFunctionInputField( {
				inputType: 'Z6095'
			} );
			expect( wrapper.findComponent( { name: 'wl-function-input-wikidata' } ).exists() ).toBe( true );
		} );

		it( 'renders enum input component for enum types', () => {
			store.isEnumType = createGettersWithFunctionsMock( true );
			store.hasParser = createGettersWithFunctionsMock( false );
			const wrapper = renderFunctionInputField( {
				inputType: 'Z456'
			} );
			expect( wrapper.findComponent( { name: 'wl-function-input-enum' } ).exists() ).toBe( true );
		} );

		it( 'renders parser input component for types with parser', () => {
			store.isEnumType = createGettersWithFunctionsMock( false );
			store.hasParser = createGettersWithFunctionsMock( true );
			const wrapper = renderFunctionInputField( {
				inputType: 'Z456'
			} );
			expect( wrapper.findComponent( { name: 'wl-function-input-parser' } ).exists() ).toBe( true );
		} );

		it( 'renders string input component as fallback', () => {
			store.isEnumType = createGettersWithFunctionsMock( false );
			store.hasParser = createGettersWithFunctionsMock( false );
			const wrapper = renderFunctionInputField( {
				inputType: 'Z456'
			} );
			expect( wrapper.findComponent( { name: 'wl-function-input-string' } ).exists() ).toBe( true );
		} );
	} );

	describe( 'default value functionality', () => {
		it( 'shows default value checkbox for types that have default values', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420' // Date type
			} );
			expect( wrapper.findComponent( { name: 'wl-function-input-default-value-checkbox' } ).exists() ).toBe( true );
		} );

		it( 'does not show default value checkbox for types that do not have default values', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( false );
			const wrapper = renderFunctionInputField();
			expect( wrapper.findComponent( { name: 'wl-function-input-default-value-checkbox' } ).exists() ).toBe( false );
		} );

		it( 'handles default value checkbox toggle correctly', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420',
				modelValue: 'some value'
			} );

			const checkbox = wrapper.findComponent( { name: 'wl-function-input-default-value-checkbox' } );
			checkbox.vm.$emit( 'update:is-checked', true );

			expect( wrapper.vm.shouldUseDefaultValue ).toBe( true );
			expect( wrapper.emitted()[ 'update:modelValue' ][ 0 ] ).toEqual( [ '' ] );
			expect( wrapper.emitted().update[ 0 ] ).toEqual( [ '' ] );
			expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true } ] );
		} );

		it( 'passes shouldUseDefaultValue prop to child components', async () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420'
			} );

			// Toggle checkbox
			const checkbox = wrapper.findComponent( { name: 'wl-function-input-default-value-checkbox' } );
			checkbox.vm.$emit( 'update:is-checked', true );

			// Wait for the component to update
			await wrapper.vm.$nextTick();

			const childComponent = wrapper.getComponent( { name: 'wl-function-input-string' } );
			expect( childComponent.props( 'shouldUseDefaultValue' ) ).toBe( true );
		} );

		it( 'automatically initializes default value checkbox when field is empty and has default value', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );

			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420',
				modelValue: ''
			} );

			expect( wrapper.vm.shouldUseDefaultValue ).toBe( true );
		} );

		it( 'does not initialize default value checkbox when field has a value', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );

			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420',
				modelValue: 'some value'
			} );

			expect( wrapper.vm.shouldUseDefaultValue ).toBe( false );
		} );

		it( 'does not initialize default value checkbox when creating new parameter', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			store.isNewParameterSetup = true;

			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420',
				modelValue: ''
			} );

			expect( wrapper.vm.shouldUseDefaultValue ).toBe( false );
		} );
	} );

	describe( 'default value functionality', () => {
		it( 'shows default value checkbox for types that have default values', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420' // Date type
			} );
			expect( wrapper.findComponent( { name: 'wl-function-input-default-value-checkbox' } ).exists() ).toBe( true );
		} );

		it( 'does not show default value checkbox for types that do not have default values', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( false );
			const wrapper = renderFunctionInputField();
			expect( wrapper.findComponent( { name: 'wl-function-input-default-value-checkbox' } ).exists() ).toBe( false );
		} );

		it( 'handles default value checkbox toggle correctly', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420',
				modelValue: 'some value'
			} );

			const checkbox = wrapper.findComponent( { name: 'wl-function-input-default-value-checkbox' } );
			checkbox.vm.$emit( 'update:is-checked', true );

			expect( wrapper.vm.shouldUseDefaultValue ).toBe( true );
			expect( wrapper.emitted()[ 'update:modelValue' ][ 0 ] ).toEqual( [ '' ] );
			expect( wrapper.emitted().update[ 0 ] ).toEqual( [ '' ] );
			expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true } ] );
		} );

		it( 'passes shouldUseDefaultValue prop to child components', async () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420'
			} );

			// Toggle checkbox
			const checkbox = wrapper.findComponent( { name: 'wl-function-input-default-value-checkbox' } );
			checkbox.vm.$emit( 'update:is-checked', true );

			// Wait for the component to update
			await wrapper.vm.$nextTick();

			const childComponent = wrapper.getComponent( { name: 'wl-function-input-string' } );
			expect( childComponent.props( 'shouldUseDefaultValue' ) ).toBe( true );
		} );

		it( 'automatically initializes default value checkbox when field is empty and has default value', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );

			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420',
				modelValue: ''
			} );

			expect( wrapper.vm.shouldUseDefaultValue ).toBe( true );
		} );

		it( 'does not initialize default value checkbox when field has a value', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );

			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420',
				modelValue: 'some value'
			} );

			expect( wrapper.vm.shouldUseDefaultValue ).toBe( false );
		} );

		it( 'does not initialize default value checkbox when creating new parameter', () => {
			store.hasDefaultValueForType = createGettersWithFunctionsMock( true );
			store.isNewParameterSetup = true;

			const wrapper = renderFunctionInputField( {
				inputType: 'Z20420',
				modelValue: ''
			} );

			expect( wrapper.vm.shouldUseDefaultValue ).toBe( false );
		} );
	} );
} );
