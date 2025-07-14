'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const FunctionInputString = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionInputString.vue' );

describe( 'FunctionInputString', () => {
	it( 'renders without errors', () => {
		const wrapper = shallowMount( FunctionInputString, {
			props: {
				value: 'Test value'
			}
		} );
		expect( wrapper.getComponent( { name: 'cdx-text-input' } ).exists() ).toBe( true );
	} );

	it( 'emits input event when value changes', () => {
		const wrapper = shallowMount( FunctionInputString, {
			props: {
				value: 'Test value'
			}
		} );
		wrapper.getComponent( { name: 'cdx-text-input' } ).vm.$emit( 'update:model-value', 'New value' );
		expect( wrapper.emitted().input[ 0 ] ).toEqual( [ 'New value' ] );
	} );

	it( 'emits update event when value changes', () => {
		const wrapper = shallowMount( FunctionInputString, {
			props: {
				value: 'Test value'
			}
		} );
		wrapper.getComponent( { name: 'cdx-text-input' } ).vm.$emit( 'change', { target: { value: 'New value' } } );
		expect( wrapper.emitted().update[ 0 ] ).toEqual( [ 'New value' ] );
	} );

	it( 'emits validate event on mount', () => {
		const wrapper = shallowMount( FunctionInputString );
		expect( wrapper.emitted().validate[ 0 ] ).toEqual( [ { isValid: true } ] );
	} );
} );
