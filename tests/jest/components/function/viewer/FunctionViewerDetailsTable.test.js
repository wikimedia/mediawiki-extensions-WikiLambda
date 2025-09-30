/*!
 * WikiLambda unit test suite for the function-viewers-details-table component and related files.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const FunctionViewerDetailsTable = require( '../../../../../resources/ext.wikilambda.app/components/function/viewer/FunctionViewerDetailsTable.vue' );

describe( 'FunctionViewerDetailsTable', () => {
	/**
	 * Helper function to render FunctionViewerDetailsTable with given props
	 *
	 * @param {Object} props - Props to pass to the component
	 * @return {Object} Vue wrapper
	 */
	function renderFunctionViewerDetailsTable( props = {} ) {
		const defaultProps = {
			addLink: '/',
			canConnect: false,
			canDisconnect: false,
			type: 'Z6'
		};

		const options = {
			props: Object.assign( {}, defaultProps, props ),
			global: { stubs: { CdxTable: false, CdxButton: false } }
		};

		return shallowMount( FunctionViewerDetailsTable, options );
	}

	it( 'renders without errors', () => {
		const wrapper = renderFunctionViewerDetailsTable();
		expect( wrapper.find( '.ext-wikilambda-app-function-viewer-details-table' ).exists() ).toBe( true );
	} );

	describe( 'connect and disconnect buttons', () => {
		it( 'disables connect button when canConnect is false', () => {
			const wrapper = renderFunctionViewerDetailsTable( {
				canConnect: false,
				canDisconnect: true
			} );
			const connectButton = wrapper.find( '[data-testid="connect"]' );
			expect( connectButton.exists() ).toBe( true );
			expect( connectButton.attributes( 'disabled' ) ).toBeDefined();
		} );

		it( 'disables disconnect button when canDisconnect is false', () => {
			const wrapper = renderFunctionViewerDetailsTable( {
				canConnect: true,
				canDisconnect: false
			} );
			const disconnectButton = wrapper.find( '[data-testid="disconnect"]' );
			expect( disconnectButton.exists() ).toBe( true );
			expect( disconnectButton.attributes( 'disabled' ) ).toBeDefined();
		} );

		it( 'disables connect button when isLoading is true', () => {
			const wrapper = renderFunctionViewerDetailsTable( {
				canConnect: true,
				canDisconnect: false,
				isLoading: true
			} );
			const connectButton = wrapper.find( '[data-testid="connect"]' );
			expect( connectButton.exists() ).toBe( true );
			expect( connectButton.attributes( 'disabled' ) ).toBeDefined();
		} );

		it( 'disables disconnect button when isLoading is true', () => {
			const wrapper = renderFunctionViewerDetailsTable( {
				canConnect: false,
				canDisconnect: true,
				isLoading: true
			} );
			const disconnectButton = wrapper.find( '[data-testid="disconnect"]' );
			expect( disconnectButton.exists() ).toBe( true );
			expect( disconnectButton.attributes( 'disabled' ) ).toBeDefined();
		} );

		it( 'enables connect button when canConnect is true and not loading', () => {
			const wrapper = renderFunctionViewerDetailsTable( {
				canConnect: true,
				canDisconnect: false,
				isLoading: false
			} );
			const connectButton = wrapper.find( '[data-testid="connect"]' );
			expect( connectButton.exists() ).toBe( true );
			expect( connectButton.attributes( 'disabled' ) ).toBeUndefined();
		} );

		it( 'enables disconnect button when canDisconnect is true and not loading', () => {
			const wrapper = renderFunctionViewerDetailsTable( {
				canConnect: false,
				canDisconnect: true,
				isLoading: false
			} );
			const disconnectButton = wrapper.find( '[data-testid="disconnect"]' );
			expect( disconnectButton.exists() ).toBe( true );
			expect( disconnectButton.attributes( 'disabled' ) ).toBeUndefined();
		} );
	} );
} );
