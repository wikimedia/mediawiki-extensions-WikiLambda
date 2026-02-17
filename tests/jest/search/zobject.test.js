/*!
 * WikiLambda unit tests for the ZObject (Repo mode) search client
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const zobjectSearch = require( '../../../resources/ext.wikilambda.search/zobject.js' );

describe( 'ext.wikilambda.search.zobject', () => {
	let apiGetMock;

	beforeEach( () => {
		apiGetMock = jest.fn();
		mw.Api = jest.fn( () => ( {
			get: apiGetMock,
			abort: jest.fn()
		} ) );
	} );

	describe( 'vectorSearchClient', () => {
		it( 'fetchByTitle returns object with fetch promise and abort, resolving to results with value, description, url', async () => {
			apiGetMock.mockResolvedValue( {
				query: {
					wikilambdasearch_labels: [
						{
							page_title: 'Z1',
							page_type: 'Z4',
							return_type: null,
							match_is_primary: true,
							match_lang: 'Z1002',
							match_label: 'Type',
							label: 'Type',
							type_label: 'Type'
						}
					]
				}
			} );

			const client = zobjectSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Type', 10, true );

			expect( result ).toHaveProperty( 'fetch' );
			expect( result ).toHaveProperty( 'abort' );
			expect( typeof result.abort ).toBe( 'function' );

			const payload = await result.fetch;
			expect( payload ).toHaveProperty( 'query', 'Type' );
			expect( payload ).toHaveProperty( 'results' );
			expect( Array.isArray( payload.results ) ).toBe( true );
			expect( payload.results.length ).toBe( 1 );

			const item = payload.results[ 0 ];
			expect( item ).toHaveProperty( 'value' );
			expect( item ).toHaveProperty( 'url' );
			expect( item.value ).toContain( 'Type' );
			expect( item.value ).toContain( 'Z1' );
			expect( item.url ).toMatch( /\/view\/.+\/Z1/ );
		} );

		it( 'loadMore returns object with fetch promise resolving to results', async () => {
			apiGetMock.mockResolvedValue( {
				query: {
					wikilambdasearch_labels: [
						{
							page_title: 'Z801',
							page_type: 'Z8',
							return_type: 'Z4',
							match_is_primary: true,
							match_lang: 'Z1002',
							match_label: 'Identity function',
							label: 'Identity function',
							type_label: 'Function'
						}
					]
				}
			} );

			const client = zobjectSearch.vectorSearchClient;
			const result = client.loadMore( 'Identity', 5, 10, true );

			const payload = await result.fetch;
			expect( payload.query ).toBe( 'Identity' );
			expect( payload.results.length ).toBe( 1 );
			expect( payload.results[ 0 ].value ).toContain( 'Identity function' );
			expect( payload.results[ 0 ].value ).toContain( 'Z801' );
			expect( payload.results[ 0 ].url ).toContain( 'Z801' );
		} );

		it( 'includes searchContinue when API returns continue for pagination', async () => {
			apiGetMock.mockResolvedValue( {
				query: {
					wikilambdasearch_labels: [
						{
							page_title: 'Z1',
							page_type: 'Z4',
							return_type: null,
							match_is_primary: true,
							match_lang: 'Z1002',
							match_label: 'Type',
							label: 'Type',
							type_label: 'Type'
						}
					]
				},
				continue: { wikilambdasearch_continue: '1' }
			} );

			const client = zobjectSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Type', 10, true );
			const payload = await result.fetch;

			expect( payload.searchContinue ).toBe( '1' );
		} );

		it( 'loadMore uses offset/limit as continue (page index)', async () => {
			apiGetMock
				.mockResolvedValueOnce( {
					query: {
						wikilambdasearch_labels: [
							{
								page_title: 'Z1',
								page_type: 'Z4',
								return_type: null,
								match_is_primary: true,
								match_lang: 'Z1002',
								match_label: 'Type',
								label: 'Type',
								type_label: 'Type'
							}
						]
					},
					continue: { wikilambdasearch_continue: '1' }
				} )
				.mockResolvedValueOnce( {
					query: {
						wikilambdasearch_labels: [
							{
								page_title: 'Z2',
								page_type: 'Z4',
								return_type: null,
								match_is_primary: true,
								match_lang: 'Z1002',
								match_label: 'Object',
								label: 'Object',
								type_label: 'Type'
							}
						]
					}
				} );

			const client = zobjectSearch.vectorSearchClient;
			await client.fetchByTitle( 'Type', 10, true ).fetch;

			apiGetMock.mockClear();
			await client.loadMore( 'Type', 10, 10, true ).fetch;

			// Vector passes offset=10 (results loaded), limit=10 → continue = 1 (page index)
			expect( apiGetMock ).toHaveBeenCalledWith(
				expect.objectContaining( {
					wikilambdasearch_continue: 1
				} )
			);
		} );

		it( 'sets searchContinue to null when no more results', async () => {
			apiGetMock.mockResolvedValue( {
				query: {
					wikilambdasearch_labels: [
						{
							page_title: 'Z1',
							page_type: 'Z4',
							return_type: null,
							match_is_primary: true,
							match_lang: 'Z1002',
							match_label: 'Type',
							label: 'Type',
							type_label: 'Type'
						}
					]
				}
			} );

			const client = zobjectSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Type', 10, true );
			const payload = await result.fetch;

			expect( payload.searchContinue ).toBeNull();
		} );

		it( 'omits match when match label equals ZID (search by ZID)', async () => {
			apiGetMock.mockResolvedValue( {
				query: {
					wikilambdasearch_labels: [
						{
							page_title: 'Z801',
							page_type: 'Z8',
							return_type: 'Z4',
							match_is_primary: false,
							match_lang: 'Z1002',
							match_label: 'Z801',
							label: 'Identity function',
							type_label: 'Function'
						}
					]
				}
			} );

			const client = zobjectSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Z801', 10, true );
			const payload = await result.fetch;

			expect( payload.results.length ).toBe( 1 );
			expect( payload.results[ 0 ].match ).toBeUndefined();
		} );

		it( 'omits match when primary label in same language as request', async () => {
			apiGetMock.mockResolvedValue( {
				query: {
					wikilambdasearch_labels: [
						{
							page_title: 'Z801',
							page_type: 'Z8',
							return_type: 'Z4',
							match_is_primary: true,
							match_lang: 'Z1002',
							match_label: 'IdFunc',
							label: 'Identity function',
							type_label: 'Function'
						}
					]
				}
			} );

			const client = zobjectSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'IdFunc', 10, true );
			const payload = await result.fetch;

			expect( payload.results.length ).toBe( 1 );
			expect( payload.results[ 0 ].match ).toBeUndefined();
		} );

		it( 'includes match (alias in other language) when not primary or different lang', async () => {
			apiGetMock.mockResolvedValue( {
				query: {
					wikilambdasearch_labels: [
						{
							page_title: 'Z999',
							page_type: 'Z4',
							return_type: null,
							match_is_primary: false,
							match_lang: 'Z1003',
							match_label: 'Alias',
							label: 'Full Type Name',
							type_label: 'Type'
						}
					]
				}
			} );

			const client = zobjectSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Alias', 10, true );
			const payload = await result.fetch;

			expect( payload.results.length ).toBe( 1 );
			expect( payload.results[ 0 ].match ).toBeDefined();
			expect( mw.msg ).toHaveBeenCalledWith( 'quotation-marks', [ 'Alias' ] );
		} );

		it( 'omits description when showDescription is false', async () => {
			apiGetMock.mockResolvedValue( {
				query: {
					wikilambdasearch_labels: [
						{
							page_title: 'Z1',
							page_type: 'Z4',
							return_type: null,
							match_is_primary: true,
							match_lang: 'Z1002',
							match_label: 'Type',
							label: 'Type',
							type_label: 'Type'
						}
					]
				}
			} );

			const client = zobjectSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Type', 10, false );
			const payload = await result.fetch;

			expect( payload.results.length ).toBe( 1 );
			expect( payload.results[ 0 ].description ).toBeUndefined();
		} );

		it( 'uses wgUserLanguage when wgWikiLambda is not set', async () => {
			const originalGet = mw.config.get.getMockImplementation();
			mw.config.get.mockImplementation( ( key ) => {
				if ( key === 'wgWikiLambda' ) {
					return null;
				}
				return key === 'wgUserLanguage' ? 'de' : ( originalGet ? originalGet( key ) : null );
			} );

			apiGetMock.mockResolvedValue( { query: { wikilambdasearch_labels: [] } } );

			const client = zobjectSearch.vectorSearchClient;
			client.fetchByTitle( 'foo', 10, true );
			await Promise.resolve();

			expect( apiGetMock ).toHaveBeenCalledWith(
				expect.objectContaining( {
					wikilambdasearch_language: 'de'
				} )
			);

			mw.config.get.mockImplementation( originalGet );
		} );

		it( 'omits match when primary and matchLang equals default zlangZid (wgWikiLambda null)', async () => {
			const originalGet = mw.config.get.getMockImplementation();
			mw.config.get.mockImplementation( ( key ) => {
				if ( key === 'wgWikiLambda' ) {
					return null;
				}
				return originalGet ? originalGet( key ) : null;
			} );

			apiGetMock.mockResolvedValue( {
				query: {
					wikilambdasearch_labels: [
						{
							page_title: 'Z802',
							page_type: 'Z8',
							return_type: 'Z4',
							match_is_primary: true,
							match_lang: 'Z1002',
							match_label: 'Other',
							label: 'Other function',
							type_label: 'Function'
						}
					]
				}
			} );

			const client = zobjectSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Other', 10, true );
			const payload = await result.fetch;

			expect( payload.results.length ).toBe( 1 );
			expect( payload.results[ 0 ].match ).toBeUndefined();

			mw.config.get.mockImplementation( originalGet );
		} );
	} );
} );
