'use strict';

const apiUtils = require( '../../../resources/ext.wikilambda.app/utils/apiUtils.js' );
const ApiError = require( '../../../resources/ext.wikilambda.app/store/classes/ApiError.js' );

describe( 'apiUtils', () => {
	let apiGetMock;
	let apiPostMock;
	let apiPostWithEditTokenMock;
	let foreignApiGetMock;

	function mockMwApi() {
		apiGetMock = jest.fn();
		apiPostMock = jest.fn();
		apiPostWithEditTokenMock = jest.fn();
		mw.Api = jest.fn( () => ( {
			get: apiGetMock,
			post: apiPostMock,
			postWithEditToken: apiPostWithEditTokenMock
		} ) );
	}

	beforeEach( () => {
		mockMwApi();
		foreignApiGetMock = jest.fn();
		mw.ForeignApi = jest.fn( () => ( {
			get: foreignApiGetMock
		} ) );
	} );

	describe( 'searchWikidataEntities', () => {
		it( 'returns a native Promise with transformed response', async () => {
			foreignApiGetMock.mockReturnValue(
				$.Deferred().resolve( {
					search: [ { id: 'Q42' } ],
					'search-continue': '5'
				} ).promise()
			);

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
			foreignApiGetMock.mockReturnValue(
				$.Deferred().reject( 'internal_api_error_WLWhatever', {
					error: { info: 'nope' }
				} ).promise()
			);

			await expect( apiUtils.searchWikidataEntities( {
				language: 'en',
				type: 'item',
				search: 'Douglas Adams'
			} ) ).rejects.toBeInstanceOf( ApiError );
		} );
	} );

	describe( 'fetchWikidataEntities', () => {
		it( 'returns a native Promise with finally', async () => {
			foreignApiGetMock.mockReturnValue(
				$.Deferred().resolve( {
					entities: {
						Q42: { id: 'Q42' }
					}
				} ).promise()
			);

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
