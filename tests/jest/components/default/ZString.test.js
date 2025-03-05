/*!
 * WikiLambda unit test suite for the default ZString component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { CdxTextInput } = require( '@wikimedia/codex' );
const { shallowMount } = require( '@vue/test-utils' );
const ZString = require( '../../../../resources/ext.wikilambda.app/components/types/ZString.vue' );

// General use
const keyPath = 'main.Z2K2.Z1K1';
const objectValue = { Z1K1: 'Z6', Z6K1: 'my terminal string ' };

// Terminal value
const terminalKeyPath = 'main.Z2K2.Z1K1.Z6K1';
const terminalObjectValue = 'my terminal string ';

describe( 'ZString', () => {
	describe( 'in view mode', () => {
		it( 'renders without errors', () => {
			const wrapper = shallowMount( ZString, {
				props: {
					keyPath,
					objectValue,
					edit: false
				}
			} );

			expect( wrapper.find( 'div' ).exists() ).toBe( true );
		} );

		it( 'displays the terminal string value', async () => {
			const wrapper = shallowMount( ZString, {
				props: {
					keyPath: terminalKeyPath,
					objectValue: terminalObjectValue,
					edit: false
				}
			} );

			expect( wrapper.find( 'p' ).text() ).toBe( '"my terminal string "' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'emits the value with keyPath if value is a string object', async () => {
			const wrapper = shallowMount( ZString, {
				props: {
					keyPath,
					objectValue,
					edit: true
				}
			} );

			await wrapper.getComponent( CdxTextInput ).vm.$emit( 'update:modelValue', 'my string value' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [ 'Z6K1' ], value: 'my string value' } ] ] );
		} );

		it( 'emits the value with an empty keyPath if value is a terminal string', async () => {
			const wrapper = shallowMount( ZString, {
				props: {
					keyPath: terminalKeyPath,
					objectValue: terminalObjectValue,
					edit: true
				}
			} );

			await wrapper.getComponent( CdxTextInput ).vm.$emit( 'update:modelValue', 'my string value' );

			expect( wrapper.emitted() ).toHaveProperty( 'set-value', [ [ { keyPath: [], value: 'my string value' } ] ] );
		} );
	} );
} );
