'use strict';

const apiUtils = require( '../../../resources/ext.wikilambda.app/utils/apiUtils.js' );
const ApiError = require( '../../../resources/ext.wikilambda.app/store/classes/ApiError.js' );

describe( 'apiUtils', () => {
	let foreignApiGetMock;
	let apiGetMock;
	let apiPostMock;
	let apiPostWithEditTokenMock;

	beforeEach( () => {
		foreignApiGetMock = jest.fn();
		mw.ForeignApi = jest.fn( () => ( {
			get: foreignApiGetMock
		} ) );

		apiGetMock = jest.fn();
		apiPostMock = jest.fn();
		apiPostWithEditTokenMock = jest.fn();
		mw.Api = jest.fn( () => ( {
			get: apiGetMock,
			post: apiPostMock,
			postWithEditToken: apiPostWithEditTokenMock
		} ) );
	} );

	describe( 'searchWikidataEntities', () => {
		it( 'returns a native Promise with transformed response', async () => {
			foreignApiGetMock.mockResolvedValue( {
				search: [ { id: 'Q42' } ],
				'search-continue': '5'
			} );

			const resultPromise = apiUtils.searchWikidataEntities( {
				language: 'en',
				type: 'item',
				search: 'Douglas Adams',
				searchContinue: 5
			} );

			expect( typeof resultPromise.finally ).toBe( 'function' );
			await expect( resultPromise ).resolves.toEqual( {
				search: [ { id: 'Q42' } ],
				searchContinue: 5
			} );

			expect( foreignApiGetMock ).toHaveBeenCalledWith( {
				action: 'wbsearchentities',
				format: 'json',
				formatversion: '2',
				language: 'en',
				uselang: 'en',
				search: 'Douglas Adams',
				type: 'item',
				limit: '10',
				props: 'url',
				continue: 5
			}, { signal: undefined } );
		} );

		it( 'maps rejection to ApiError', async () => {
			foreignApiGetMock.mockRejectedValue( 'internal_api_error_WLWhatever' );

			await expect( apiUtils.searchWikidataEntities( {
				language: 'en',
				type: 'item',
				search: 'Douglas Adams'
			} ) ).rejects.toBeInstanceOf( ApiError );
		} );
	} );

	describe( 'fetchWikidataEntities', () => {
		it( 'returns a native Promise with finally', async () => {
			foreignApiGetMock.mockResolvedValue( {
				entities: {
					Q42: { id: 'Q42' }
				}
			} );

			const resultPromise = apiUtils.fetchWikidataEntities( {
				language: 'en',
				ids: 'Q42'
			} );

			expect( typeof resultPromise.finally ).toBe( 'function' );
			await expect( resultPromise ).resolves.toEqual( {
				entities: {
					Q42: { id: 'Q42' }
				}
			} );
		} );
	} );

	describe( 'searchCommonsMedia', () => {
		it( 'returns sorted pages and pagination offset', async () => {
			foreignApiGetMock.mockResolvedValue( {
				query: {
					pages: {
						3: { pageid: 3, title: 'File:Cat.jpg', index: 2 },
						1: { pageid: 1, title: 'File:Apple.jpg', index: 1 }
					}
				},
				continue: { gsroffset: 10 }
			} );

			const result = await apiUtils.searchCommonsMedia( { search: 'cat' } );
			expect( result.pages[ 0 ].title ).toBe( 'File:Apple.jpg' );
			expect( result.pages[ 1 ].title ).toBe( 'File:Cat.jpg' );
			expect( result.searchContinue ).toBe( 10 );
		} );

		it( 'returns all file types without filtering', async () => {
			foreignApiGetMock.mockResolvedValue( {
				query: {
					pages: {
						1: { pageid: 1, title: 'File:Cat.jpg', index: 1, imageinfo: [ { mime: 'image/jpeg' } ] },
						2: { pageid: 2, title: 'File:Video.ogv', index: 2, imageinfo: [ { mime: 'video/ogg' } ] }
					}
				}
			} );

			const result = await apiUtils.searchCommonsMedia( { search: 'cat' } );
			expect( result.pages ).toHaveLength( 2 );
		} );

		it( 'passes gsroffset when searchContinue is provided', async () => {
			foreignApiGetMock.mockResolvedValue( { query: { pages: [] } } );

			await apiUtils.searchCommonsMedia( { search: 'cat', searchContinue: 20 } );

			expect( foreignApiGetMock ).toHaveBeenCalledWith(
				expect.objectContaining( { gsroffset: 20 } ),
				expect.anything()
			);
		} );

		it( 'maps rejection to ApiError', async () => {
			foreignApiGetMock.mockRejectedValue( 'internal_api_error' );

			await expect( apiUtils.searchCommonsMedia( { search: 'cat' } ) )
				.rejects.toBeInstanceOf( ApiError );
		} );
	} );

	describe( 'fetchCommonsMediaByIds', () => {
		it( 'passes pageids and resolves data', async () => {
			foreignApiGetMock.mockResolvedValue( {
				query: { pages: { 123: { pageid: 123, title: 'File:Cat.jpg' } } }
			} );

			const result = await apiUtils.fetchCommonsMediaByIds( { ids: '123' } );
			expect( result.query.pages[ 123 ].title ).toBe( 'File:Cat.jpg' );
			expect( foreignApiGetMock ).toHaveBeenCalledWith(
				expect.objectContaining( { action: 'query', pageids: '123' } ),
				expect.anything()
			);
		} );

		it( 'maps rejection to ApiError', async () => {
			foreignApiGetMock.mockRejectedValue( 'internal_api_error' );

			await expect( apiUtils.fetchCommonsMediaByIds( { ids: '123' } ) )
				.rejects.toBeInstanceOf( ApiError );
		} );
	} );

	describe( 'fetchZObjects', () => {
		it( 'passes dependencies flag and resolves payload', async () => {
			apiGetMock.mockResolvedValue( {
				query: {
					wikilambdaload_zobjects: { Z1: { success: true } }
				}
			} );

			await expect( apiUtils.fetchZObjects( {
				zids: 'Z1|Z2',
				revisions: '12|13',
				language: 'en',
				dependencies: true
			} ) ).resolves.toEqual( { Z1: { success: true } } );

			expect( apiGetMock ).toHaveBeenCalledWith( expect.objectContaining( {
				wikilambdaload_get_dependencies: 'true'
			} ), { signal: undefined } );
		} );
	} );

	describe( 'searchLabels', () => {
		it( 'maps query data and continuation token', async () => {
			apiGetMock.mockResolvedValue( {
				query: { wikilambdasearch_labels: [ { zid: 'Z1' } ] },
				continue: { wikilambdasearch_continue: '20' }
			} );

			await expect( apiUtils.searchLabels( {
				input: 'foo',
				types: [ 'Z8', 'Z4' ],
				returnTypes: [ 'Z6' ],
				language: 'en',
				limit: 5,
				exact: true,
				searchContinue: 10
			} ) ).resolves.toEqual( {
				labels: [ { zid: 'Z1' } ],
				searchContinue: 20
			} );
		} );
	} );

	describe( 'performFunctionCall', () => {
		it( 'converts response and returns result/metadata', async () => {
			apiPostMock.mockResolvedValue( {
				wikilambda_function_call: {
					data: JSON.stringify( {
						Z1K1: 'Z22',
						Z22K1: 'Hello',
						Z22K2: { quality: 'ok' }
					} )
				}
			} );

			await expect( apiUtils.performFunctionCall( {
				functionCall: {
					Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' }
				},
				language: 'en'
			} ) ).resolves.toEqual( {
				response: {
					Z1K1: 'Z22',
					Z22K1: 'Hello',
					Z22K2: { quality: 'ok' }
				},
				result: 'Hello',
				metadata: { quality: 'ok' }
			} );

			expect( apiPostMock ).toHaveBeenCalledWith(
				expect.objectContaining( {
					action: 'wikilambda_function_call',
					uselang: 'en'
				} ),
				{ signal: undefined }
			);
		} );
	} );

	describe( 'saveZObject', () => {
		it( 'uses local mw.Api and resolves edit response', async () => {
			apiPostWithEditTokenMock.mockResolvedValue( {
				wikilambda_edit: { zid: 'Z100', status: 'ok' }
			} );

			await expect( apiUtils.saveZObject( {
				zid: 'Z100',
				zobject: { Z1K1: 'Z2' },
				summary: 'Saving',
				language: 'en'
			} ) ).resolves.toEqual( { zid: 'Z100', status: 'ok' } );

			expect( apiPostWithEditTokenMock ).toHaveBeenCalledWith(
				expect.objectContaining( {
					action: 'wikilambda_edit',
					uselang: 'en',
					zobject: JSON.stringify( { Z1K1: 'Z2' } )
				} ),
				{ signal: undefined }
			);
		} );
	} );

	describe( 'sanitiseHtmlFragment', () => {
		it( 'returns sanitised html value', async () => {
			apiPostWithEditTokenMock.mockResolvedValue( {
				wikifunctions_html_sanitiser: { value: '<p>safe</p>' }
			} );

			await expect( apiUtils.sanitiseHtmlFragment( {
				html: '<script>bad()</script>'
			} ) ).resolves.toEqual( { html: '<p>safe</p>' } );
		} );

		it( 'returns empty html when value is absent', async () => {
			apiPostWithEditTokenMock.mockResolvedValue( {} );
			await expect( apiUtils.sanitiseHtmlFragment( { html: 'x' } ) ).resolves.toEqual( { html: '' } );
		} );
	} );

	describe( 'performTests', () => {
		it( 'rejects with ApiError when successful response has no result payload', async () => {
			apiGetMock.mockResolvedValue( { query: {}, warnings: { result: { '*': 'truncated' } } } );
			await expect( apiUtils.performTests( {
				functionZid: 'Z8',
				implementations: [ 'Z14' ],
				testers: [ 'Z20' ],
				language: 'en'
			} ) ).rejects.toBeInstanceOf( ApiError );
		} );
	} );
} );
