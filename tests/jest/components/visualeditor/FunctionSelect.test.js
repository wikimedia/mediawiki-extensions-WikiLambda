'use strict';

const { shallowMount } = require( '@vue/test-utils' );
const { createLabelDataMock } = require( '../../helpers/getterHelpers.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const FunctionSelect = require( '../../../../resources/ext.wikilambda.app/components/visualeditor/FunctionSelect.vue' );
const { waitFor } = require( '@testing-library/vue' );

describe( 'FunctionSelect', () => {
	let store;

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
		const wrapper = shallowMount( FunctionSelect );
		expect( wrapper.find( '.ext-wikilambda-app-function-select' ).exists() ).toBe( true );
	} );

	it( 'shows suggested functions when search term is empty', () => {
		const wrapper = shallowMount( FunctionSelect );

		expect( wrapper.find( '.ext-wikilambda-app-function-select__title' ).exists() ).toBe( true );

		const items = wrapper.findAllComponents( { name: 'wl-function-select-item' } );
		expect( items.length ).toBe( 2 );
		expect( items[ 0 ].props( 'description' ).label ).toBe( 'Description for Z1' );
		expect( items[ 1 ].props( 'description' ).label ).toBe( 'Description for Z2' );
	} );

	it( 'shows lookup results when search term is not empty', async () => {
		store.getSearchTerm = 'Function';
		store.getLookupResults = [ { zid: 'Z3', label: 'Function 3', language: 'en' } ];

		const wrapper = shallowMount( FunctionSelect );

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

		const wrapper = shallowMount( FunctionSelect );

		const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );
		searchInput.vm.$emit( 'update:modelValue', 'Function' );

		await wrapper.findComponent( { name: 'wl-function-select-item' } ).trigger( 'click' );
		expect( wrapper.emitted().select[ 0 ] ).toEqual( [ 'Z3' ] );
	} );

	it( 'clears lookupResults when search term is cleared', async () => {
		store.getSearchTerm = 'Function';

		const wrapper = shallowMount( FunctionSelect );

		const searchInput = wrapper.findComponent( { name: 'cdx-search-input' } );

		// Clear the search term
		searchInput.vm.$emit( 'update:modelValue', '' );

		expect( store.setLookupResults ).toHaveBeenCalledWith( [] );
	} );

	it( 'does not emit select event for invalid Zids', () => {
		const wrapper = shallowMount( FunctionSelect );

		wrapper.vm.selectFunction( 'invalidZid' );

		expect( wrapper.emitted().select ).toBeFalsy();
	} );
} );
