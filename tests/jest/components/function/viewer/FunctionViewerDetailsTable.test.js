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

	it( 'offers 5, 10, 20 and 50 items per page', () => {
		const wrapper = renderFunctionViewerDetailsTable();
		const sizeOptions = wrapper.findComponent( { name: 'CdxTable' } ).props( 'paginationSizeOptions' );
		expect( sizeOptions.map( ( option ) => option.value ) ).toEqual( [ 5, 10, 20, 50 ] );
	} );

	describe( 'pagination', () => {
		const pageSizeKey = 'ext-wikilambda-app-function-details-page-size';
		const rows = Array.from( { length: 30 }, ( _, index ) => ( { id: `row-${ index }` } ) );
		const rowIds = ( table ) => table.props( 'data' ).map( ( row ) => row.id );

		beforeEach( () => {
			mw.storage.get.mockReturnValue( null );
		} );

		it( 'shows the first five rows when no page size is stored', () => {
			const wrapper = renderFunctionViewerDetailsTable( { data: rows } );
			const table = wrapper.findComponent( { name: 'CdxTable' } );

			expect( mw.storage.get ).toHaveBeenCalledWith( pageSizeKey );
			expect( table.props( 'paginationSizeDefault' ) ).toBe( 5 );
			expect( table.props( 'totalRows' ) ).toBe( 30 );
			expect( rowIds( table ) ).toEqual( [ 'row-0', 'row-1', 'row-2', 'row-3', 'row-4' ] );
		} );

		it( 'starts with the stored page size', () => {
			mw.storage.get.mockReturnValue( '20' );
			const wrapper = renderFunctionViewerDetailsTable( { data: rows } );
			const table = wrapper.findComponent( { name: 'CdxTable' } );

			expect( table.props( 'paginationSizeDefault' ) ).toBe( 20 );
			expect( table.props( 'data' ) ).toHaveLength( 20 );
		} );

		it( 'ignores a stored page size that is not an option', () => {
			mw.storage.get.mockReturnValue( '7' );
			const wrapper = renderFunctionViewerDetailsTable( { data: rows } );

			expect( wrapper.findComponent( { name: 'CdxTable' } ).props( 'paginationSizeDefault' ) ).toBe( 5 );
		} );

		it( 'shows the page that the table asks for', async () => {
			const wrapper = renderFunctionViewerDetailsTable( { data: rows } );
			const table = wrapper.findComponent( { name: 'CdxTable' } );

			table.vm.$emit( 'load-more', 5, 5 );
			await wrapper.vm.$nextTick();

			expect( rowIds( table ) ).toEqual( [ 'row-5', 'row-6', 'row-7', 'row-8', 'row-9' ] );
			expect( mw.storage.set ).not.toHaveBeenCalled();
		} );

		it( 'remembers a new page size', async () => {
			const wrapper = renderFunctionViewerDetailsTable( { data: rows } );
			const table = wrapper.findComponent( { name: 'CdxTable' } );

			table.vm.$emit( 'load-more', 0, 50 );
			await wrapper.vm.$nextTick();

			expect( mw.storage.set ).toHaveBeenCalledWith( pageSizeKey, '50' );
			expect( table.props( 'data' ) ).toHaveLength( 30 );
		} );

		it( 'shows all rows without paging when they fit on the smallest page', () => {
			const fewRows = rows.slice( 0, 5 );
			const wrapper = renderFunctionViewerDetailsTable( { data: fewRows } );
			const table = wrapper.findComponent( { name: 'CdxTable' } );

			expect( table.props( 'paginate' ) ).toBe( false );
			expect( table.props( 'data' ) ).toEqual( fewRows );
		} );
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
