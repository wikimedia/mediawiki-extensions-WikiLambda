/*!
 * WikiLambda unit test suite for the default ZHTMLFragment component.
 *
 * @copyright 2024 – Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const ZHTMLFragment = require( '../../../../resources/ext.wikilambda.app/components/default-view-types/ZHTMLFragment.vue' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const { createGettersWithFunctionsMock, createLabelDataMock } = require( '../../helpers/getterHelpers.js' );

describe( 'ZHTMLFragment', () => {
	let store;
	beforeEach( () => {
		store = useMainStore();
		store.getZHTMLFragmentTerminalValue = createGettersWithFunctionsMock( '<b>hello</b>' );
		store.getLabelData = createLabelDataMock( {
			Z89: 'HTML Fragment'
		} );
		store.getUserLangCode = 'en';
	} );

	describe( 'in view mode', () => {
		it( 'renders the code editor in read-only mode with the correct value', () => {
			const wrapper = shallowMount( ZHTMLFragment, {
				props: {
					edit: false,
					rowId: 1
				}
			} );
			const editor = wrapper.findComponent( { name: 'code-editor' } );
			expect( editor.exists() ).toBe( true );
			expect( editor.props( 'readOnly' ) ).toBe( true );
			expect( editor.props( 'disabled' ) ).toBe( true );
			expect( editor.props( 'value' ) ).toBe( '<b>hello</b>' );
		} );
	} );

	describe( 'in edit mode', () => {
		it( 'renders the code editor in editable mode', () => {
			const wrapper = shallowMount( ZHTMLFragment, {
				props: {
					edit: true,
					rowId: 1
				}
			} );
			const editor = wrapper.findComponent( { name: 'code-editor' } );
			expect( editor.exists() ).toBe( true );
			expect( editor.props( 'readOnly' ) ).toBe( false );
			expect( editor.props( 'disabled' ) ).toBe( false );
			expect( editor.props( 'value' ) ).toBe( '<b>hello</b>' );
		} );

		it( 'emits set-value event with correct payload when setValue is called', async () => {
			const wrapper = shallowMount( ZHTMLFragment, {
				props: {
					edit: true,
					rowId: 1
				}
			} );
			const editor = wrapper.findComponent( { name: 'code-editor' } );
			await editor.vm.$emit( 'change', '<i>changed</i>' );
			expect( wrapper.emitted( 'set-value' ) ).toBeTruthy();
			const event = wrapper.emitted( 'set-value' )[ 0 ][ 0 ];
			expect( event.keyPath ).toEqual( [ Constants.Z_HTML_FRAGMENT_VALUE, Constants.Z_STRING_VALUE ] );
			expect( event.value ).toBe( '<i>changed</i>' );
		} );
	} );
} );
