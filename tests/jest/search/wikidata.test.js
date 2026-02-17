/*!
 * WikiLambda unit tests for the Wikidata (Abstract Wikipedia) search client
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const wikidataSearch = require( '../../../resources/ext.wikilambda.search/wikidata.js' );

describe( 'ext.wikilambda.search.wikidata', () => {
	let fetchMock;
	let apiGetMock;

	beforeEach( () => {
		fetchMock = jest.fn();
		// eslint-disable-next-line n/no-unsupported-features/node-builtins
		global.fetch = fetchMock;

		apiGetMock = jest.fn();
		mw.Api = jest.fn( () => ( {
			get: apiGetMock,
			abort: jest.fn()
		} ) );
	} );

	describe( 'vectorSearchClient', () => {
		it( 'fetchByTitle returns object with fetch promise and abort, resolving to results with value, description, supportingText, url', async () => {
			const apiResponse = {
				search: [
					{ id: 'Q90', label: 'Paris', description: 'capital of France' }
				]
			};
			fetchMock.mockResolvedValue( {
				json: jest.fn().mockReturnValue( apiResponse )
			} );
			apiGetMock.mockResolvedValue( {
				query: {
					pages: [
						{ title: 'Abstract_Wikipedia:Q90' }
					]
				}
			} );

			const client = wikidataSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Paris', 10, true );

			expect( result ).toHaveProperty( 'fetch' );
			expect( result ).toHaveProperty( 'abort' );
			expect( typeof result.abort ).toBe( 'function' );

			const payload = await result.fetch;
			expect( payload ).toHaveProperty( 'query', 'Paris' );
			expect( payload ).toHaveProperty( 'results' );
			expect( Array.isArray( payload.results ) ).toBe( true );
			expect( payload.results.length ).toBe( 1 );

			const item = payload.results[ 0 ];
			expect( item ).toHaveProperty( 'value' );
			expect( item ).toHaveProperty( 'url' );
			expect( item.value ).toContain( 'Paris' );
			expect( item.value ).toContain( 'Q90' );
			expect( item.supportingText ).toBe( '- AW' );
			expect( item.url ).toContain( '/view/' );
			expect( item.url ).toContain( 'Q90' );
		} );

		it( 'loadMore returns object with fetch promise resolving to results', async () => {
			const apiResponse = {
				search: [
					{ id: 'Q42', label: 'Douglas Adams', description: 'British writer' }
				]
			};
			fetchMock.mockResolvedValue( {
				json: jest.fn().mockReturnValue( apiResponse )
			} );
			apiGetMock.mockResolvedValue( {
				query: {
					pages: []
				}
			} );

			const client = wikidataSearch.vectorSearchClient;
			const result = client.loadMore( 'Adams', 1, 10, true );

			const payload = await result.fetch;
			expect( payload.query ).toBe( 'Adams' );
			expect( payload.results.length ).toBe( 1 );
			expect( payload.results[ 0 ].value ).toContain( 'Douglas Adams' );
			expect( payload.results[ 0 ].value ).toContain( 'Q42' );
		} );

		it( 'returns empty results when Wikidata returns no matches', async () => {
			fetchMock.mockResolvedValue( {
				json: jest.fn().mockReturnValue( { search: [] } )
			} );

			const client = wikidataSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Nope', 10, true );

			const payload = await result.fetch;
			expect( payload.query ).toBe( 'Nope' );
			expect( payload.results ).toEqual( [] );
			expect( apiGetMock ).not.toHaveBeenCalled();
		} );

		it( 'omits description when showDescription=false and no abstract content exists', async () => {
			fetchMock.mockResolvedValue( {
				json: jest.fn().mockReturnValue( {
					search: [ { id: 'Q90', label: 'Paris', description: 'capital of France' } ]
				} )
			} );
			apiGetMock.mockResolvedValue( { query: { pages: [] } } );

			const client = wikidataSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Paris', 10, false );

			const payload = await result.fetch;
			expect( payload.results ).toHaveLength( 1 );
			expect( payload.results[ 0 ].description ).toBeUndefined();
		} );

		it( 'omits description when Wikidata description is empty but keeps supportingText for existing abstracts', async () => {
			fetchMock.mockResolvedValue( {
				json: jest.fn().mockReturnValue( {
					search: [ { id: 'Q90', label: 'Paris', description: '' } ]
				} )
			} );
			apiGetMock.mockResolvedValue( {
				query: {
					pages: [
						{ title: 'Abstract_Wikipedia:Q90' }
					]
				}
			} );

			const client = wikidataSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Paris', 10, true );

			const payload = await result.fetch;
			expect( payload.results ).toHaveLength( 1 );
			expect( payload.results[ 0 ].description ).toBeUndefined();
			expect( payload.results[ 0 ].supportingText ).toBe( '- AW' );
		} );

		it( 'handles existence-check response without query/pages (treats as no abstract content)', async () => {
			fetchMock.mockResolvedValue( {
				json: jest.fn().mockReturnValue( {
					search: [ { id: 'Q90', label: 'Paris', description: 'capital of France' } ]
				} )
			} );
			apiGetMock.mockResolvedValue( {} );

			const client = wikidataSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Paris', 10, true );

			const payload = await result.fetch;
			expect( payload.results ).toHaveLength( 1 );
			expect( payload.results[ 0 ].url ).toBe( '/wiki/Special:CreateAbstract/Q90' );
		} );

		it( 'ignores page objects without a title when checking for existing abstracts', async () => {
			fetchMock.mockResolvedValue( {
				json: jest.fn().mockReturnValue( {
					search: [ { id: 'Q90', label: 'Paris', description: 'capital of France' } ]
				} )
			} );
			apiGetMock.mockResolvedValue( { query: { pages: [ {} ] } } );

			const client = wikidataSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Paris', 10, true );

			const payload = await result.fetch;
			expect( payload.results ).toHaveLength( 1 );
			expect( payload.results[ 0 ].url ).toBe( '/wiki/Special:CreateAbstract/Q90' );
		} );

		it( 'builds titles without namespace when abstract namespace config is empty', async () => {
			const originalGetImpl = mw.config.get.getMockImplementation();
			mw.config.get.mockImplementation( ( key ) => (
				key === 'wgWikiLambdaAbstractPrimaryNamespace' ? '' : originalGetImpl( key )
			) );

			fetchMock.mockResolvedValue( {
				json: jest.fn().mockReturnValue( {
					search: [ { id: 'Q90', label: 'Paris', description: 'capital of France' } ]
				} )
			} );
			apiGetMock.mockResolvedValue( { query: { pages: [ { title: 'Q90' } ] } } );

			const client = wikidataSearch.vectorSearchClient;
			const result = client.fetchByTitle( 'Paris', 10, true );

			const payload = await result.fetch;
			expect( apiGetMock ).toHaveBeenCalled();
			expect( apiGetMock.mock.calls[ 0 ][ 0 ].titles ).toBe( 'Q90' );
			expect( payload.results[ 0 ].url ).toBe( '/view/en/Q90' );

			mw.config.get.mockImplementation( originalGetImpl );
		} );
	} );
} );
