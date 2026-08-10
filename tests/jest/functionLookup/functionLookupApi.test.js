/*!
 * WikiLambda unit tests for the function lookup search calls.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const functionLookupApi =
	require( '../../../resources/ext.wikilambda.functionLookup/functionLookupApi.js' );

describe( 'functionLookupApi', () => {
	describe( 'newApi', () => {
		it( 'asks the Wikifunctions repository when this wiki is a client', () => {
			mw.config.get = jest.fn( ( key ) => (
				key === 'wgWikifunctionsBaseUrl' ? 'https://www.wikifunctions.org' : null
			) );

			// A client wiki has no function tables of its own, and the language parameter of the
			// search only accepts the languages the repository knows.
			expect( functionLookupApi.newApi() ).toBeInstanceOf( mw.ForeignApi );
		} );

		it( 'asks the local wiki when this wiki is the repository', () => {
			mw.config.get = jest.fn( () => null );

			const api = functionLookupApi.newApi();
			expect( api ).toBeInstanceOf( mw.Api );
			expect( api ).not.toBeInstanceOf( mw.ForeignApi );
		} );
	} );

	describe( 'searchFunctions', () => {
		let get;

		beforeEach( () => {
			get = jest.fn().mockResolvedValue( {
				query: { wikilambdasearch_functions: [ { page_title: 'Z801', label: 'echo' } ] }
			} );
			jest.spyOn( functionLookupApi, 'newApi' ).mockReturnValue( { get } );
		} );

		it( 'returns the matching functions', async () => {
			const results = await functionLookupApi.searchFunctions( {
				search: 'ec',
				language: 'en'
			} );

			expect( results ).toEqual( [ { page_title: 'Z801', label: 'echo' } ] );
		} );

		it( 'returns nothing when the response holds no query', async () => {
			get.mockResolvedValue( {} );

			expect( await functionLookupApi.searchFunctions( { search: 'ec', language: 'en' } ) )
				.toEqual( [] );
		} );

		it( 'passes the search term, the language and the output type', async () => {
			await functionLookupApi.searchFunctions( {
				search: 'ec',
				language: 'en',
				outputType: 'Z89',
				limit: 3
			} );

			expect( get ).toHaveBeenCalledWith( expect.objectContaining( {
				action: 'query',
				list: 'wikilambdasearch_functions',
				wikilambdasearch_functions_search: 'ec',
				wikilambdasearch_functions_language: 'en',
				wikilambdasearch_functions_output_type: 'Z89',
				wikilambdasearch_functions_limit: 3
			} ), expect.anything() );
		} );

		it( 'never asks for renderable functions', async () => {
			await functionLookupApi.searchFunctions( {
				search: 'ec',
				language: 'en',
				outputType: 'Z89'
			} );

			// ZObjectStore::searchFunctions() lets renderable win over output_type, so sending
			// both would silently drop the output type and offer functions that cannot be used.
			expect( get.mock.calls[ 0 ][ 0 ] )
				.not.toHaveProperty( 'wikilambdasearch_functions_renderable' );
		} );

		it( 'asks for ten results when no limit is given', async () => {
			await functionLookupApi.searchFunctions( { search: 'ec', language: 'en' } );

			expect( get ).toHaveBeenCalledWith(
				expect.objectContaining( { wikilambdasearch_functions_limit: 10 } ),
				expect.anything()
			);
		} );

		it( 'passes the abort signal on', async () => {
			const signal = new AbortController().signal;

			await functionLookupApi.searchFunctions( { search: 'ec', language: 'en', signal } );

			expect( get ).toHaveBeenCalledWith( expect.anything(), { signal } );
		} );
	} );
} );
