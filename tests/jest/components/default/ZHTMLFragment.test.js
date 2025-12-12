/*!
 * WikiLambda unit test suite for the default ZHTMLFragment component.
 *
 * @copyright 2024 – Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const ZHTMLFragment = require( '../../../../resources/ext.wikilambda.app/components/types/ZHTMLFragment.vue' );

// General use
const keyPath = 'main.Z2K2';
const objectValue = {
	Z1K1: { Z1K1: 'Z9', Z9K1: 'Z89' },
	Z89K1: { Z1K1: 'Z6', Z6K1: '<b>hello</b>' }
};

describe( 'ZHTMLFragment', () => {
	/**
	 * Helper function to render ZHTMLFragment component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderZHTMLFragment( props = {}, options = {} ) {
		const defaultProps = {
			keyPath,
			objectValue,
			edit: false
		};
		return shallowMount( ZHTMLFragment, { props: { ...defaultProps, ...props }, ...options } );
	}

	describe( 'in view mode', () => {
		it( 'renders the HTMLFragmentViewer component with the correct value', () => {
			const wrapper = renderZHTMLFragment();

			const viewer = wrapper.findComponent( { name: 'html-fragment-viewer' } );
			expect( viewer.exists() ).toBe( true );
			expect( viewer.props( 'html' ) ).toBe( '<b>hello</b>' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders the code editor in editable mode', () => {
			const wrapper = renderZHTMLFragment( { edit: true } );

			const editor = wrapper.findComponent( { name: 'code-editor' } );
			expect( editor.exists() ).toBe( true );
			expect( editor.props( 'readOnly' ) ).toBe( false );
			expect( editor.props( 'disabled' ) ).toBe( false );
			expect( editor.props( 'value' ) ).toBe( '<b>hello</b>' );
		} );

		it( 'emits set-value event with correct payload when setValue is called', async () => {
			const wrapper = renderZHTMLFragment( { edit: true } );

			const editor = wrapper.findComponent( { name: 'code-editor' } );
			await editor.vm.$emit( 'change', '<i>changed</i>' );
			expect( wrapper.emitted( 'set-value' ) ).toBeTruthy();
			const event = wrapper.emitted( 'set-value' )[ 0 ][ 0 ];
			expect( event.keyPath ).toEqual( [ Constants.Z_HTML_FRAGMENT_VALUE, Constants.Z_STRING_VALUE ] );
			expect( event.value ).toBe( '<i>changed</i>' );
		} );
	} );
} );
