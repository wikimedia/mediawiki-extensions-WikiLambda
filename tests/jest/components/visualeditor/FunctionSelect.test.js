'use strict';

const { flushPromises, shallowMount } = require( '@vue/test-utils' );
const { createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const ApiError = require( '../../../../resources/ext.wikilambda.app/store/classes/ApiError.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const FunctionSelect = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionSelect.vue' );
const { waitFor } = require( '@testing-library/vue' );

describe( 'FunctionSelect', () => {
	let store;

	function renderFunctionSelect( props = {}, options = {} ) {
		return shallowMount( FunctionSelect, {
			props,
			...options
		} );
	}

	beforeEach( () => {
		store = useMainStore();
		store.getSuggestedFunctions = [ 'Z1', 'Z2' ];
		store.getLabelData = createLabelDataMock( { Z1: 'Function 1', Z2: 'Function 2' } );
		store.getDescription = createLabelDataMock( {
			Z1: 'Description for Z1',
			Z2: 'Description for Z2',
			Z3: 'Description for Z3'
		} );
		store.lookupFunctions = jest.fn().mockImplementation( () => new Promise( ( resolve ) => {
			setTimeout( () => {
				resolve( {
					objects: [
						{ page_title: 'Z3', label: 'Function 3', language: 'en' }
					]
				} );
			}, 100 ); // Simulate delay
		} ) );
		store.fetchZids.mockResolvedValue();
		store.getSearchTerm = '';
		store.getLookupResults = [];
	} );

	it( 'renders without errors', () => {
		const wrapper = renderFunctionSelect();
		expect( wrapper.find( '.ext-wikilambda-app-function-select' ).exists() ).toBe( true );
	} );

	it( 'shows suggested functions when search term is empty', () => {
		const wrapper = renderFunctionSelect();

		expect( wrapper.find( '.ext-wikilambda-app-function-select__title' ).exists() ).toBe( true );

		const items = wrapper.findAllComponents( { name: 'wl-function-select-item' } );
		expect( items.length ).toBe( 2 );
		expect( items[ 0 ].props( 'description' ).label ).toBe( 'Description for Z1' );
		expect( items[ 1 ].props( 'description' ).label ).toBe( 'Description for Z2' );
	} );

	it( 'searches for the Zid when pasting a Wikifunctions URL', async () => {
		const url = 'https://www.wikifunctions.org/wiki/Z801';
		store.getSearchTerm = url;

		const wrapper = renderFunctionSelect();

		const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
		searchInput.vm.$emit( 'update:modelValue', url );

		expect( store.lookupFunctions ).toHaveBeenCalledWith( {
			search: 'Z801',
			renderable: true,
			signal: expect.any( Object )
		} );
		// The results are not discarded as stale, because the pasted URL stays in the field
		await waitFor( () => expect( store.setLookupResults ).toHaveBeenCalledWith(
			[ { zid: 'Z3', label: 'Function 3', language: 'en' } ]
		) );
	} );

	it( 'shows lookup results when search term is not empty', async () => {
		store.getSearchTerm = 'Function';
		store.getLookupResults = [ { zid: 'Z3', label: 'Function 3', language: 'en' } ];

		const wrapper = renderFunctionSelect();

		const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
		searchInput.vm.$emit( 'update:modelValue', 'Function' );

		expect( store.lookupFunctions ).toHaveBeenCalledWith( {
			search: 'Function',
			renderable: true,
			signal: expect.any( Object )
		} );
		await waitFor( () => expect( store.setLookupResults ).toHaveBeenCalledWith( [ { zid: 'Z3', label: 'Function 3', language: 'en' } ] ) );
		expect( store.fetchZids ).toHaveBeenCalledWith( {
			zids: [ 'Z3' ]
		} );

		expect( wrapper.find( '.ext-wikilambda-app-function-select__title' ).exists() ).toBe( true );

		const items = wrapper.findAllComponents( { name: 'wl-function-select-item' } );
		expect( items.length ).toBe( 1 );
		expect( items[ 0 ].props( 'description' ).label ).toBe( 'Description for Z3' );
	} );

	it( 'emits select event when a function is clicked', async () => {
		store.getSearchTerm = 'Function';
		store.getLookupResults = [ { zid: 'Z3', label: 'Function 3', language: 'en' } ];

		const wrapper = renderFunctionSelect();

		const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
		searchInput.vm.$emit( 'update:modelValue', 'Function' );

		await wrapper.findComponent( { name: 'wl-function-select-item' } ).trigger( 'click' );
		expect( wrapper.emitted().select[ 0 ] ).toEqual( [ 'Z3' ] );
	} );

	it( 'clears lookupResults when search term is cleared', async () => {
		store.getSearchTerm = 'Function';

		const wrapper = renderFunctionSelect();

		const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );

		// Clear the search term
		searchInput.vm.$emit( 'update:modelValue', '' );

		expect( store.setLookupResults ).toHaveBeenCalledWith( [] );
	} );

	describe( 'when the lookup for a new search term rejects', () => {
		beforeEach( () => {
			// Results for an earlier term are still showing
			store.getSearchTerm = 'addition';
			store.getLookupResults = [ { zid: 'Z3', label: 'Function 3', language: 'en' } ];
		} );

		it( 'clears the previous lookup results when the lookup fails', async () => {
			store.lookupFunctions = jest.fn().mockRejectedValue(
				new ApiError( 'http', { error: { message: 'mock lookup error' } } )
			);
			const wrapper = renderFunctionSelect();

			const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
			searchInput.vm.$emit( 'update:modelValue', 'addition' );
			await flushPromises();

			expect( store.setLookupResults ).toHaveBeenCalledWith( [] );
		} );

		it( 'keeps the previous lookup results when the lookup is aborted', async () => {
			store.lookupFunctions = jest.fn().mockRejectedValue( new ApiError( 'abort', {} ) );
			const wrapper = renderFunctionSelect();

			const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
			searchInput.vm.$emit( 'update:modelValue', 'addition' );
			await flushPromises();

			expect( store.setLookupResults ).not.toHaveBeenCalled();
		} );
	} );

	it( 'does not emit select event for invalid Zids', async () => {
		store.getSuggestedFunctions = [ 'invalidZid' ];
		store.getLabelData = createLabelDataMock( { invalidZid: 'Invalid function' } );
		store.getDescription = createLabelDataMock( { invalidZid: 'Description for invalid function' } );

		const wrapper = renderFunctionSelect();

		const item = wrapper.getComponent( { name: 'wl-function-select-item' } );
		await item.trigger( 'click' );

		expect( wrapper.emitted().select ).toBeFalsy();
	} );
} );
