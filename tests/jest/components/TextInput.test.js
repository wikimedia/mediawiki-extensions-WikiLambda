/*!
 * WikiLambda unit test suite for the TextInput component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
const mount = require( '@vue/test-utils' ).mount;
const TextInput = require( '../../../resources/ext.wikilambda.edit/components/base/TextInput.vue' );

describe( 'TextInput', () => {
	describe( 'rendering', () => {
		it( 'renders a text input', () => {
			const wrapper = mount( TextInput );
			const input = wrapper.find( 'input[type="text"]' );
			expect( input.exists() ).toBe( true );
		} );

		it( 'renders a language chip when provided with a chip prop', () => {
			const wrapper = mount( TextInput, {
				props: { chip: 'en' }
			} );
			const chip = wrapper.find( '.ext-wikilambda-lang-chip' );
			expect( chip.exists() ).toBe( true );
			expect( chip.text().toUpperCase() ).toBe( 'EN' );
		} );

		it( 'renders an empty language chip when provided with an empty string as chip prop', () => {
			const wrapper = mount( TextInput, {
				props: { chip: '' }
			} );
			const chip = wrapper.find( '.ext-wikilambda-lang-chip__empty' );
			expect( chip.exists() ).toBe( true );
		} );
	} );

	describe( 'functionality', () => {
		describe( 'modelValue', () => {
			it( 'emits an "update:modelValue" event when text is entered', async () => {
				const wrapper = mount( TextInput, {
					props: {
						modelValue: ''
					}
				} );
				const input = wrapper.find( 'input[type="text"]' );
				await input.setValue( 'test' );
				expect( wrapper.emitted( 'update:modelValue' ) ).toBeTruthy();
			} );
		} );
	} );
} );
