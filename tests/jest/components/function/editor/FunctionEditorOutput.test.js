/*!
 * WikiLambda unit test suite for the Function Editor output component.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const FunctionEditorOutput = require( '../../../../../resources/ext.wikilambda.app/components/function/editor/FunctionEditorOutput.vue' );

describe( 'FunctionEditorOutput', () => {
	let store;

	/**
	 * Helper function to render FunctionEditorOutput component
	 *
	 * @param {Object} props - Props to pass to the component
	 * @param {Object} options - Additional mount options
	 * @return {Object} Mounted wrapper
	 */
	function renderFunctionEditorOutput( props = {}, options = {} ) {
		const defaultProps = { canEdit: true };
		const defaultOptions = {
			global: {
				stubs: {
					WlFunctionEditorField: false,
					...options?.stubs
				}
			}
		};
		return shallowMount( FunctionEditorOutput, {
			props: { ...defaultProps, ...props },
			...defaultOptions
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getUserLangCode = 'en';
		store.getZFunctionOutput = { Z1K1: 'Z9', Z9K1: 'Z6' };
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionEditorOutput();

		expect( wrapper.find( '.ext-wikilambda-app-function-editor-output' ).exists() ).toBe( true );
	} );

	it( 'loads the type selector component', () => {
		const wrapper = renderFunctionEditorOutput();

		expect( wrapper.findComponent( { name: 'wl-type-selector' } ).exists() ).toBe( true );
	} );

	it( 'initializes the type selector component with the function output key path and value', () => {
		const wrapper = renderFunctionEditorOutput();

		const selector = wrapper.findComponent( { name: 'wl-type-selector' } );
		expect( selector.exists() ).toBe( true );
		expect( selector.props( 'keyPath' ) ).toBe( 'main.Z2K2.Z8K2' );
		expect( selector.props( 'objectValue' ) ).toEqual( { Z1K1: 'Z9', Z9K1: 'Z6' } );
	} );

	it( 'initializes a disabled type selector component with the function output key path and value', () => {
		const wrapper = renderFunctionEditorOutput( { canEdit: false } );

		const selector = wrapper.findComponent( { name: 'wl-type-selector' } );
		expect( selector.exists() ).toBe( true );
		expect( selector.props( 'keyPath' ) ).toBe( 'main.Z2K2.Z8K2' );
		expect( selector.props( 'objectValue' ) ).toEqual( { Z1K1: 'Z9', Z9K1: 'Z6' } );
		expect( selector.props( 'disabled' ) ).toBe( true );
	} );

	it( 'does not initialize a type selector component', () => {
		store.getZFunctionOutput = undefined;
		const wrapper = renderFunctionEditorOutput();

		const selector = wrapper.findComponent( { name: 'wl-type-selector' } );
		expect( selector.exists() ).toBe( false );
	} );
} );
