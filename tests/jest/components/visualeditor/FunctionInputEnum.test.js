'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const FunctionInputEnum = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionInputEnum.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const { mockEnumValues } = require( '../../fixtures/mocks.js' );

describe( 'FunctionInputEnum', () => {
	const mockEnumZid = 'Z30000';
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getEnumValues = createGettersWithFunctionsMock( mockEnumValues );
		store.fetchEnumValues.mockResolvedValue();
		store.fetchZids.mockResolvedValue();
		store.getLabelData = createLabelDataMock( {
			Z30004: 'April'
		} );
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-enum' ).exists() ).toBe( true );
	} );

	it( 'displays enum values', async () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid
			}
		} );
		await waitFor( () => expect( wrapper.getComponent( { name: 'cdx-select' } ).props( 'menuItems' ).length ).toBe( 3 ) );
	} );

	it( 'emits input and update events when a value is selected', () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid
			}
		} );
		wrapper.getComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected', 'Z30003' );
		expect( wrapper.emitted().input[ 0 ] ).toEqual( [ 'Z30003' ] );
		expect( wrapper.emitted().update[ 0 ] ).toEqual( [ 'Z30003' ] );
	} );

	it( 'emits validate event on mount', async () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid
			}
		} );
		await waitFor( () => expect( wrapper.getComponent( { name: 'cdx-select' } ).props( 'menuItems' ).length ).toBe( 3 ) );
		expect( wrapper.emitted().validate ).toBeTruthy();
	} );

	it( 'emits validate event on blur', () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid
			}
		} );
		wrapper.getComponent( { name: 'cdx-select' } ).vm.$emit( 'blur' );
		expect( wrapper.emitted().validate ).toBeTruthy();
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false, errorMessage: 'No option chosen.' } ] );
	} );

	it( 'validates selected value', async () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid
			}
		} );
		wrapper.getComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected', 'Z30003' );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true, errorMessage: undefined } ] );
	} );

	it( 'passes validation with empty value if allowed', () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: 'Z6', // just to make allowsEmptyField computed property return true
				value: ''
			}
		} );

		wrapper.getComponent( { name: 'cdx-select' } ).vm.$emit( 'blur' );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true, errorMessage: undefined } ] );
	} );

	it( 'fails validation with empty value if not allowed', () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid,
				value: ''
			}
		} );

		wrapper.getComponent( { name: 'cdx-select' } ).vm.$emit( 'blur' );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false, errorMessage: 'No option chosen.' } ] );
	} );

	it( 'fetches enum values on initialization', async () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid
			}
		} );
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

		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid,
				value: 'Z30004'
			}
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
} );
