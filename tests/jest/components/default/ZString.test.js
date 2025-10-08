/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const ZString = require( '../../../../resources/ext.wikilambda.app/components/types/ZString.vue' );

// General use
const keyPath = 'main.Z2K2.Z1K1';
const objectValue = { Z1K1: 'Z6', Z6K1: 'my terminal string ' };

// Terminal value
const terminalKeyPath = 'main.Z2K2.Z1K1.Z6K1';
const terminalObjectValue = 'my terminal string ';

describe( 'ZString', () => {
	/**
	 * Helper function to render ZString component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderZString( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false
		};
		return shallowMount( ZString, { props: { ...defaultProps, ...props }, ...options } );
	}

	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = renderZString();

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays the terminal string value', async () => {
			const wrapper = renderZString( {
				keyPath: terminalKeyPath,
				objectValue: terminalObjectValue
			} );

			expect( wrapper.get( 'p' ).text() ).toBe( '"my terminal string "' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'emits the value with keyPath if value is a string object', async () => {
			const wrapper = renderZString( { edit: true } );

			await wrapper.getComponent( { name: 'cdx-text-input' } ).vm.$emit( 'update:modelValue', 'my string value' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ 'Z6K1' ], value: 'my string value' } ] ] );
		} );

		it( 'emits the value with an empty keyPath if value is a terminal string', async () => {
			const wrapper = renderZString( {
				keyPath: terminalKeyPath,
				objectValue: terminalObjectValue,
				edit: true
			} );

			await wrapper.getComponent( { name: 'cdx-text-input' } ).vm.$emit( 'update:modelValue', 'my string value' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: 'my string value' } ] ] );
		} );
	} );
} );
