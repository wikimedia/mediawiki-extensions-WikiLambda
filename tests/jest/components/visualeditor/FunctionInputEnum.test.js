'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { waitFor } = require( '@testing-library/vue' );
const FunctionInputEnum = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionInputEnum.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { createGettersWithFunctionsMock } = require( '../../helpers/getterHelpers.js' );
const { mockEnumValues } = require( '../../fixtures/mocks.js' );

describe( 'FunctionInputEnum', () => {
	const mockEnumZid = 'Z30000';
	let store;

	beforeEach( () => {
		store = useMainStore();
		store.getEnumValues = createGettersWithFunctionsMock( mockEnumValues );
		store.fetchEnumValues.mockResolvedValue();
	} );

	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid,
				isEditing: true
			}
		} );
		expect( wrapper.find( '.ext-wikilambda-app-function-input-enum' ).exists() ).toBe( true );
	} );

	it( 'displays enum values', async () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid,
				isEditing: true
			}
		} );
		await waitFor( () => expect( wrapper.getComponent( { name: 'cdx-select' } ).props( 'menuItems' ).length ).toBe( 3 ) );
	} );

	it( 'emits update event when a value is selected', () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid,
				isEditing: true
			}
		} );
		wrapper.getComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected', 'Z30003' );
		expect( wrapper.emitted().update[ 0 ] ).toEqual( [ 'Z30003' ] );
	} );

	it( 'validates selected value', async () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid,
				isEditing: true
			}
		} );
		wrapper.getComponent( { name: 'cdx-select' } ).vm.$emit( 'update:selected', 'Z30003' );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true, errorMessage: undefined } ] );
	} );

	it( 'calls validate function on blur', () => {
		const wrapper = shallowMount( FunctionInputEnum, {
			props: {
				inputType: mockEnumZid,
				isEditing: true
			}
		} );
		wrapper.getComponent( { name: 'cdx-select' } ).vm.$emit( 'blur' );
		expect( wrapper.emitted().validate ).toBeTruthy();
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: false, errorMessage: 'No option chosen.' } ] );
	} );
} );
