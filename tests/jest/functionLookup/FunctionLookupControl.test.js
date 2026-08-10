/*!
 * WikiLambda unit tests for the CommunityConfiguration function lookup control.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { mount, flushPromises } = require( '@vue/test-utils' );
const { CdxMultiselectLookup } = require( '@wikimedia/codex' );

const FunctionLookupControl =
	require( '../../../resources/ext.wikilambda.functionLookup/FunctionLookupControl.vue' );
const functionLookupApi =
	require( '../../../resources/ext.wikilambda.functionLookup/functionLookupApi.js' );

const SCHEMA = {
	type: 'array',
	items: { type: 'string', pattern: '^Z[1-9]\\d*$' },
	maxItems: 5
};

const RESULTS = [
	{ page_title: 'Z801', label: 'echo', language: 'en' },
	{ page_title: 'Z802', label: 'if', language: 'en' },
	// A function the repository knows but has no label for in this language.
	{ page_title: 'Z803', label: null, language: 'en' }
];

function mountControl( { uischema = {}, data = { SuggestedFunctions: [] } } = {} ) {
	const jsonform = { data, errors: {} };
	const wrapper = mount( FunctionLookupControl, {
		props: {
			schema: SCHEMA,
			uischema: Object.assign( {
				name: 'SuggestedFunctions',
				scope: '#/properties/SuggestedFunctions',
				type: 'Control'
			}, uischema )
		},
		global: { provide: { jsonform } }
	} );
	return { wrapper, jsonform };
}

describe( 'FunctionLookupControl', () => {
	beforeEach( () => {
		mw.config.get = jest.fn( ( key ) => {
			switch ( key ) {
				case 'wgUserLanguage':
					return 'en';
				case 'wgWikifunctionsBaseUrl':
					return 'https://www.wikifunctions.org';
				case 'wgWikiLambdaClientModeOffline':
					return false;
				default:
					return null;
			}
		} );
		jest.spyOn( functionLookupApi, 'searchFunctions' ).mockResolvedValue( RESULTS );
	} );

	describe( 'search', () => {
		it( 'offers the label of each function, with the ZID below it', async () => {
			const { wrapper } = mountControl();

			wrapper.findComponent( CdxMultiselectLookup ).vm.$emit( 'update:input-value', 'ec' );
			await flushPromises();

			expect( wrapper.findComponent( CdxMultiselectLookup ).props( 'menuItems' ) ).toEqual( [
				{ value: 'Z801', label: 'echo', description: 'Z801' },
				{ value: 'Z802', label: 'if', description: 'Z802' },
				// With no label there is nothing better to show than the ZID itself.
				{ value: 'Z803', label: 'Z803', description: 'Z803' }
			] );
		} );

		it( 'offers nothing for an empty search, and asks the API nothing', async () => {
			const { wrapper } = mountControl();

			wrapper.findComponent( CdxMultiselectLookup ).vm.$emit( 'update:input-value', '' );
			await flushPromises();

			expect( functionLookupApi.searchFunctions ).not.toHaveBeenCalled();
			expect( wrapper.findComponent( CdxMultiselectLookup ).props( 'menuItems' ) ).toEqual( [] );
		} );

		it( 'leaves out a function that is already in the list', async () => {
			const { wrapper } = mountControl( { data: { SuggestedFunctions: [ 'Z801' ] } } );
			await flushPromises();

			wrapper.findComponent( CdxMultiselectLookup ).vm.$emit( 'update:input-value', 'ec' );
			await flushPromises();

			const values = wrapper.findComponent( CdxMultiselectLookup )
				.props( 'menuItems' ).map( ( item ) => item.value );
			expect( values ).toEqual( [ 'Z802', 'Z803' ] );
		} );

		it( 'offers nothing when the search fails', async () => {
			functionLookupApi.searchFunctions.mockRejectedValue( new Error( 'network' ) );
			const { wrapper } = mountControl();

			wrapper.findComponent( CdxMultiselectLookup ).vm.$emit( 'update:input-value', 'ec' );
			await flushPromises();

			expect( wrapper.findComponent( CdxMultiselectLookup ).props( 'menuItems' ) ).toEqual( [] );
		} );

		it( 'drops the results of a search that a later search has replaced', async () => {
			let resolveFirst;
			functionLookupApi.searchFunctions
				.mockImplementationOnce( () => new Promise( ( resolve ) => {
					resolveFirst = resolve;
				} ) )
				.mockResolvedValueOnce( [ RESULTS[ 1 ] ] );
			const { wrapper } = mountControl();
			const lookup = wrapper.findComponent( CdxMultiselectLookup );

			lookup.vm.$emit( 'update:input-value', 'e' );
			lookup.vm.$emit( 'update:input-value', 'if' );
			await flushPromises();
			// The first search answers last. Its results are for a term nobody typed any more.
			resolveFirst( [ RESULTS[ 0 ] ] );
			await flushPromises();

			expect( wrapper.findComponent( CdxMultiselectLookup )
				.props( 'menuItems' ) ).toEqual( [
				{ value: 'Z802', label: 'if', description: 'Z802' }
			] );
		} );
	} );

	describe( 'options from the UI schema', () => {
		it( 'passes no output type when the UI schema asks for none', async () => {
			const { wrapper } = mountControl();

			wrapper.findComponent( CdxMultiselectLookup ).vm.$emit( 'update:input-value', 'ec' );
			await flushPromises();

			expect( functionLookupApi.searchFunctions ).toHaveBeenCalledWith(
				expect.objectContaining( { search: 'ec', language: 'en', outputType: undefined } )
			);
		} );

		it( 'limits the search to the output type the UI schema asks for', async () => {
			const { wrapper } = mountControl( { uischema: { options: { outputType: 'Z89' } } } );

			wrapper.findComponent( CdxMultiselectLookup ).vm.$emit( 'update:input-value', 'ec' );
			await flushPromises();

			expect( functionLookupApi.searchFunctions ).toHaveBeenCalledWith(
				expect.objectContaining( { outputType: 'Z89' } )
			);
		} );

		it( 'shows the hint message that the UI schema names', () => {
			// The message itself belongs to whichever list asks for the hint, so the control must
			// not care which message it is. Standing in for it here keeps this test from depending
			// on the messages that happen to exist.
			mw.message = jest.fn( ( key ) => ( { text: () => `text of ${ key }` } ) );

			const { wrapper } = mountControl( { uischema: {
				options: { hintMessage: 'some-list-specific-hint' }
			} } );

			const hint = wrapper.find( '.ext-wikilambda-functionLookup__hint' );
			expect( hint.exists() ).toBe( true );
			expect( hint.text() ).toBe( 'text of some-list-specific-hint' );
			expect( mw.message ).toHaveBeenCalledWith( 'some-list-specific-hint' );
		} );

		it( 'shows no hint when the UI schema names none', () => {
			const { wrapper } = mountControl();

			expect( wrapper.find( '.ext-wikilambda-functionLookup__hint' ).exists() ).toBe( false );
		} );
	} );

	describe( 'stored value', () => {
		it( 'writes a flat list of ZIDs back to the configuration', async () => {
			const { wrapper, jsonform } = mountControl();

			// Picking a function from the menu, or removing a chip, both give new chips.
			wrapper.findComponent( CdxMultiselectLookup ).vm.$emit( 'update:input-chips', [
				{ value: 'Z801', label: 'echo (Z801)' },
				{ value: 'Z802', label: 'if (Z802)' }
			] );
			await flushPromises();

			// Nothing that reads the configuration changes, so the value has to stay a plain
			// array of ZID strings.
			expect( jsonform.data.SuggestedFunctions ).toEqual( [ 'Z801', 'Z802' ] );
		} );

		it( 'writes an empty list when the last chip goes', async () => {
			const { wrapper, jsonform } = mountControl( {
				data: { SuggestedFunctions: [ 'Z801' ] }
			} );
			await flushPromises();

			wrapper.findComponent( CdxMultiselectLookup ).vm.$emit( 'update:input-chips', [] );
			await flushPromises();

			expect( jsonform.data.SuggestedFunctions ).toEqual( [] );
		} );

		it( 'shows a chip for each ZID that the configuration already holds', () => {
			const { wrapper } = mountControl( { data: { SuggestedFunctions: [ 'Z801' ] } } );

			expect( wrapper.findComponent( CdxMultiselectLookup ).props( 'inputChips' ) )
				.toEqual( [ { value: 'Z801', label: 'Z801' } ] );
		} );

		it( 'replaces the bare ZID of a stored chip with its label', async () => {
			const { wrapper } = mountControl( { data: { SuggestedFunctions: [ 'Z801' ] } } );
			await flushPromises();

			expect( wrapper.findComponent( CdxMultiselectLookup ).props( 'inputChips' ) )
				.toEqual( [ { value: 'Z801', label: 'echo (Z801)' } ] );
		} );

		it( 'keeps the bare ZID when the repository does not know it', async () => {
			functionLookupApi.searchFunctions.mockResolvedValue( [] );
			const { wrapper } = mountControl( { data: { SuggestedFunctions: [ 'Z999' ] } } );
			await flushPromises();

			expect( wrapper.findComponent( CdxMultiselectLookup ).props( 'inputChips' ) )
				.toEqual( [ { value: 'Z999', label: 'Z999' } ] );
		} );

		it( 'keeps the bare ZID when the label lookup fails', async () => {
			functionLookupApi.searchFunctions.mockRejectedValue( new Error( 'network' ) );
			const { wrapper } = mountControl( { data: { SuggestedFunctions: [ 'Z801' ] } } );
			await flushPromises();

			expect( wrapper.findComponent( CdxMultiselectLookup ).props( 'inputChips' ) )
				.toEqual( [ { value: 'Z801', label: 'Z801' } ] );
		} );
	} );

	describe( 'offline client mode', () => {
		beforeEach( () => {
			mw.config.get = jest.fn( ( key ) => (
				key === 'wgWikiLambdaClientModeOffline' ? true : null
			) );
		} );

		it( 'shows the stored list but lets nobody change it', async () => {
			const { wrapper } = mountControl( { data: { SuggestedFunctions: [ 'Z801' ] } } );
			await flushPromises();

			const lookup = wrapper.findComponent( CdxMultiselectLookup );
			expect( lookup.props( 'disabled' ) ).toBe( true );
			expect( lookup.props( 'inputChips' ) ).toEqual( [ { value: 'Z801', label: 'Z801' } ] );
			// There is no connection to the repository, so there is nothing to search with.
			expect( functionLookupApi.searchFunctions ).not.toHaveBeenCalled();
		} );
	} );
} );
