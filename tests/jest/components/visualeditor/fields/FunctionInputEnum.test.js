'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const FunctionInputEnum = require( '../../../../../resources/ext.wikilambda.app/components/visualeditor/fields/FunctionInputEnum.vue' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const ErrorData = require( '../../../../../resources/ext.wikilambda.app/store/classes/ErrorData.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../../helpers/getterHelpers.js' );
const { mockEnumValues } = require( '../../../fixtures/mocks.js' );
const LabelData = require( '../../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );

describe( 'FunctionInputEnum', () => {

	let store;
	const mockEnumZid = 'Z30000';
	const errorNoEnum = new ErrorData( 'wikilambda-visualeditor-wikifunctionscall-error-enum', [], null, 'error' );
	const mockEnumZidWithDefault = 'Z20420';
	const defaultProps = {
		inputType: mockEnumZid,
		labelData: new LabelData( 'Z123K1', 'Test Label', 'Z1002', 'en' ),
		error: '',
		value: '',
		showValidation: false
	};

	const globalStubs = { stubs: { CdxField: false, CdxLabel: false } };

	// Helper function to render FunctionInputEnum with common configuration
	const renderFunctionInputEnum = ( props = {} ) => shallowMount( FunctionInputEnum, {
		props: {
			...defaultProps,
			...props
		},
		global: globalStubs
	} );

	beforeEach( () => {
		store = useMainStore();
		store.getEnumValues = createGettersWithFunctionsMock( mockEnumValues );
		store.fetchEnumValues.mockResolvedValue();
		store.fetchZids.mockResolvedValue();
		store.getLabelData = createLabelDataMock( {
			Z30001: 'January',
			Z30004: 'April'
		} );
		// Mock defaultValueCallbacks to include enum types for testing
		store.defaultValueCallbacks = {
			[ mockEnumZidWithDefault ]: () => 'Z30001' // Mock enum type with default value
		};
		// Mock isNewParameterSetup to false for tests that expect auto-checking behavior
		store.isNewParameterSetup = false;
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionInputEnum();
		expect( wrapper.find( '.ext-wikilambda-app-function-input-enum' ).exists() ).toBe( true );
	} );

	it( 'displays enum values', async () => {
		const wrapper = renderFunctionInputEnum();
		await waitFor( () => expect( wrapper.getComponent( { name: 'cdx-select' } ).props( 'menuItems' ).length ).toBe( 3 ) );
	} );

	it( 'emits input and update events when a value is selected', () => {
		const wrapper = renderFunctionInputEnum();
		wrapper.getComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected', 'Z30003' );
		expect( wrapper.emitted().input[ 0 ] ).toEqual( [ 'Z30003' ] );
		expect( wrapper.emitted().update[ 0 ] ).toEqual( [ 'Z30003' ] );
	} );

	it( 'emits validate event on mount', async () => {
		const wrapper = renderFunctionInputEnum();
		await waitFor( () => expect( wrapper.getComponent( { name: 'cdx-select' } ).props( 'menuItems' ).length ).toBe( 3 ) );
		expect( wrapper.emitted().validate ).toBeTruthy();
	} );

	it( 'emits validate event on blur', () => {
		const wrapper = renderFunctionInputEnum();
		wrapper.getComponent( { name: 'cdx-select' } ).vm.$emit( 'blur' );
		expect( wrapper.emitted().validate ).toBeTruthy();
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false, error: errorNoEnum } ] );
	} );

	it( 'validates selected value', async () => {
		const wrapper = renderFunctionInputEnum();
		wrapper.getComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected', 'Z30003' );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true, error: undefined } ] );
	} );

	it( 'passes validation with empty value if allowed', () => {
		const wrapper = renderFunctionInputEnum( {
			inputType: 'Z6' // just to make allowsEmptyField computed property return true
		} );

		wrapper.getComponent( { name: 'cdx-select' } ).vm.$emit( 'blur' );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true, error: undefined } ] );
	} );

	it( 'fails validation with empty value if not allowed', () => {
		const wrapper = renderFunctionInputEnum();

		wrapper.getComponent( { name: 'cdx-select' } ).vm.$emit( 'blur' );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false, error: errorNoEnum } ] );
	} );

	it( 'fetches enum values on initialization', async () => {
		const wrapper = renderFunctionInputEnum();
		await waitFor( () => expect( wrapper.getComponent( { name: 'cdx-select' } ).props( 'menuItems' ).length ).toBe( 3 ) );

		expect( store.getEnumValues ).toHaveBeenCalledWith( mockEnumZid, '' );
		expect( wrapper.getComponent( { name: 'cdx-select' } ).props( 'menuItems' ) ).toEqual( [
			{ value: 'Z30001', label: 'January' },
			{ value: 'Z30002', label: 'February' },
			{ value: 'Z30003', label: 'March' }
		] );
	} );

	it( 'prepends the seleted value if not present in the batch', async () => {
		store.getEnumValues = jest.fn().mockImplementation( ( zid, selected ) => {
			const selectedValue = { page_title: 'Z30004', label: 'April' };
			return ( selected === 'Z30004' ) ? [ selectedValue, ...mockEnumValues ] : mockEnumValues;
		} );

		const wrapper = renderFunctionInputEnum( {
			value: 'Z30004'
		} );

		const select = wrapper.getComponent( { name: 'cdx-select' } );
		await waitFor( () => expect( select.props( 'menuItems' ).length ).toBe( 4 ) );
		expect( store.getEnumValues ).toHaveBeenCalledWith( mockEnumZid, 'Z30004' );
		expect( select.props( 'menuItems' ) ).toEqual( [
			{ value: 'Z30004', label: 'April' },
			{ value: 'Z30001', label: 'January' },
			{ value: 'Z30002', label: 'February' },
			{ value: 'Z30003', label: 'March' }
		] );
	} );

	describe( 'default value functionality', () => {
		it( 'shows default value label as placeholder when shouldUseDefaultValue is true', () => {
			const wrapper = renderFunctionInputEnum( {
				shouldUseDefaultValue: true,
				defaultValue: 'Z30001'
			} );

			// Should find the enum value with Z30001 and return its label 'January'
			expect( wrapper.vm.placeholder ).toBe( 'January' );
		} );

		it( 'shows ZID as fallback when shouldUseDefaultValue is true but default value not found in enum values', () => {
			const wrapper = renderFunctionInputEnum( {
				shouldUseDefaultValue: true,
				defaultValue: 'Z99999'
			} );

			// Should return the ZID itself since Z99999 is not in enumValues
			expect( wrapper.vm.placeholder ).toBe( 'Z99999' );
		} );

		it( 'shows normal placeholder when shouldUseDefaultValue is false', () => {
			const wrapper = renderFunctionInputEnum( {
				shouldUseDefaultValue: false
			} );

			expect( wrapper.vm.placeholder ).toBe( 'Choose an option' );
		} );
	} );
} );
