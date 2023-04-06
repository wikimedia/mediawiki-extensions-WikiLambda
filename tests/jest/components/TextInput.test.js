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

		describe( 'field width', () => {

			it( 'does not set the width of the field when fitWidth prop is false', () => {
				const wrapper = mount( TextInput, {
					props: {
						fitWidth: false
					}
				} );
				const fieldWidth = wrapper.vm.fieldWidth;
				expect( fieldWidth ).toBe( 'auto' );
			} );

			it( 'sets the width of the field to 100% if fitWidth is true and the component is active', async () => {
				const wrapper = mount( TextInput, {
					props: {
						fitWidth: true
					},
					data() {
						return { active: true };
					}
				} );
				const fieldWidth = wrapper.vm.fieldWidth;
				expect( fieldWidth ).toBe( '100%' );
			} );

			it( 'sets the field width to 18ch if there is no value or placeholder & there is no chip', () => {
				const wrapper = mount( TextInput, {
					props: {
						fitWidth: true
					}
				} );
				const fieldWidth = wrapper.vm.fieldWidth;
				expect( fieldWidth ).toBe( '18ch' );
			} );

			it( 'sets the field width based on placeholder length if there is no value', () => {
				const placeholder = 'placeholder'; // 11 characters

				const wrapper = mount( TextInput, {
					props: {
						fitWidth: true,
						placeholder
					}
				} );
				const fieldWidth = wrapper.vm.fieldWidth;
				expect( fieldWidth ).toBe( '10ch' );

			} );

			it( 'sets the field width based on value and chip length if fitWidth is true', async () => {

				const wrapper = mount( TextInput, {
					props: {
						fitWidth: true,
						chip: 'chip text' // 9 characters
					}
				} );
				const fieldWidth = wrapper.vm.fieldWidth;
				expect( fieldWidth ).toBe( '32ch' );
			} );
		} );
	} );
} );
