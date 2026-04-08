/*!
 * WikiLambda unit test suite for the Wikidata entities Pinia store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'Wikidata Entities Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.zobject = [];
	} );

	describe( 'Getters', () => {
		describe( 'getWikidataEntityLabelData', () => {
			it( 'returns lexeme label data for lexeme types', () => {
				const expected = { label: 'foo' };
				Object.defineProperty( store, 'getLexemeLabelData', {
					value: jest.fn().mockReturnValue( expected )
				} );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_LEXEME, 'L111111' ) ).toEqual( expected );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_REFERENCE_LEXEME, 'L222222' ) ).toEqual( expected );
			} );

			it( 'returns lexeme form label data for lexeme form types', () => {
				const expected = { label: 'bar' };
				Object.defineProperty( store, 'getLexemeFormLabelData', {
					value: jest.fn().mockReturnValue( expected )
				} );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_LEXEME_FORM, 'L111111-F1' ) ).toEqual( expected );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM, 'L222222-F2' ) ).toEqual( expected );
			} );

			it( 'returns item label data for item types', () => {
				const expected = { label: 'baz' };
				Object.defineProperty( store, 'getItemLabelData', {
					value: jest.fn().mockReturnValue( expected )
				} );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_ITEM, 'Q111111' ) ).toEqual( expected );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_REFERENCE_ITEM, 'Q222222' ) ).toEqual( expected );
			} );

			it( 'returns property label data for property types', () => {
				const expected = { label: 'qux' };
				Object.defineProperty( store, 'getPropertyLabelData', {
					value: jest.fn().mockReturnValue( expected )
				} );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_PROPERTY, 'P111111' ) ).toEqual( expected );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_REFERENCE_PROPERTY, 'P222222' ) ).toEqual( expected );
			} );

			it( 'returns undefined for unknown types', () => {
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_FETCH_ITEM, 'X111111' ) ).toBeUndefined();
			} );
		} );

		describe( 'getWikidataEntityUrl', () => {
			it( 'returns lexeme url for lexeme types', () => {
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_LEXEME, 'L111111' ) ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L111111' );
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_REFERENCE_LEXEME, 'L222222' ) ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L222222' );
			} );

			it( 'returns lexeme form url for lexeme form types', () => {
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_LEXEME_FORM, 'L111111-F1' ) ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L111111#F1' );
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM, 'L222222-F2' ) ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L222222#F2' );
			} );

			it( 'returns lexeme sense url for lexeme sense types', () => {
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_LEXEME_SENSE, 'L111111-S1' ) ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L111111#S1' );
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_REFERENCE_LEXEME_SENSE, 'L222222-S2' ) ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L222222#S2' );
			} );

			it( 'returns item url for item types', () => {
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_ITEM, 'Q111111' ) ).toBe( 'https://www.wikidata.org/wiki/Q111111' );
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_REFERENCE_ITEM, 'Q222222' ) ).toBe( 'https://www.wikidata.org/wiki/Q222222' );
			} );

			it( 'returns property url for property types', () => {
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_PROPERTY, 'P111111' ) ).toBe( 'https://www.wikidata.org/wiki/Property:P111111' );
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_REFERENCE_PROPERTY, 'P222222' ) ).toBe( 'https://www.wikidata.org/wiki/Property:P222222' );
			} );

			it( 'returns undefined for unknown types', () => {
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_FETCH_ITEM, 'X111111' ) ).toBeUndefined();
			} );
		} );

		describe( 'getWikidataEntityDataAsync', () => {
			const lexemeId = 'L111111';
			const lexemeData = { id: lexemeId, forms: [ { id: 'L111111-F1', foo: 'bar' } ] };
			const itemId = 'Q111111';
			const itemData = { id: itemId };
			const propertyId = 'P111111';
			const propertyData = { id: propertyId };
			const formId = 'L111111-F1';

			beforeEach( () => {
				store.lexemes[ lexemeId ] = lexemeData;
				store.items[ itemId ] = itemData;
				store.properties[ propertyId ] = propertyData;
			} );

			it( 'resolves for lexeme', async () => {
				const result = await store.getWikidataEntityDataAsync( Constants.Z_WIKIDATA_LEXEME, lexemeId );
				expect( result ).toEqual( lexemeData );
			} );
			it( 'resolves for item', async () => {
				const result = await store.getWikidataEntityDataAsync( Constants.Z_WIKIDATA_ITEM, itemId );
				expect( result ).toEqual( itemData );
			} );
			it( 'resolves for property', async () => {
				const result = await store.getWikidataEntityDataAsync( Constants.Z_WIKIDATA_PROPERTY, propertyId );
				expect( result ).toEqual( propertyData );
			} );
			it( 'resolves for lexeme form', async () => {
				const result = await store.getWikidataEntityDataAsync( Constants.Z_WIKIDATA_LEXEME_FORM, formId );
				expect( result ).toEqual( lexemeData.forms[ 0 ] );
			} );
			it( 'rejects for missing lexeme', async () => {
				expect( store.getWikidataEntityDataAsync( Constants.Z_WIKIDATA_LEXEME, 'L_NOT_PRESENT' ) ).rejects.toThrow( 'Lexeme L_NOT_PRESENT not found' );
			} );
			it( 'rejects for missing item', async () => {
				expect( store.getWikidataEntityDataAsync( Constants.Z_WIKIDATA_ITEM, 'Q_NOT_PRESENT' ) ).rejects.toThrow( 'Item Q_NOT_PRESENT not found' );
			} );
			it( 'rejects for missing property', async () => {
				expect( store.getWikidataEntityDataAsync( Constants.Z_WIKIDATA_PROPERTY, 'P_NOT_PRESENT' ) ).rejects.toThrow( 'Property P_NOT_PRESENT not found' );
			} );
			it( 'rejects for missing lexeme form', async () => {
				store.lexemes = {
					[ lexemeId ]: { id: lexemeId, forms: [] }
				};
				expect( store.getWikidataEntityDataAsync( Constants.Z_WIKIDATA_LEXEME_FORM, formId ) ).rejects.toThrow( `Lexeme form ${ formId } not found` );
			} );
			it( 'rejects for unknown entity type', async () => {
				expect( store.getWikidataEntityDataAsync( 'Z_UNKNOWN', 'X1' ) ).rejects.toThrow( 'Unknown entity type: Z_UNKNOWN' );
			} );
		} );

		describe( 'getWikidataBatchSize', () => {
			it( 'returns the API limit constant for Wikidata', () => {
				expect( store.getWikidataBatchSize ).toBe( Constants.API_LIMIT_WIKIDATA );
			} );
		} );

		describe( 'fetchWikidataEntitiesBatched', () => {
			let getMock;
			let mockGetData;
			let mockSetData;
			let mockResetData;

			beforeEach( () => {
				mockGetData = jest.fn().mockReturnValue( undefined ); // No cached data
				mockSetData = jest.fn();
				mockResetData = jest.fn();
				getMock = jest.fn().mockResolvedValue( {} );
				mw.ForeignApi = jest.fn( () => ( { get: getMock } ) );
				// Mock the getters
				Object.defineProperty( store, 'getUserLangCode', {
					value: 'en'
				} );
				// Mock the batch size to 2 for easier testing
				Object.defineProperty( store, 'getWikidataBatchSize', {
					value: 2
				} );
			} );

			it( 'exits early if all IDs are already fetched or in flight', () => {
				mockGetData = jest.fn()
					.mockReturnValueOnce( 'cached data' ) // Q111111 already cached
					.mockReturnValueOnce( Promise.resolve() ); // Q222222 in flight

				const payload = {
					ids: [ 'Q111111', 'Q222222' ],
					getData: mockGetData,
					setData: mockSetData,
					resetData: mockResetData
				};

				store.fetchWikidataEntitiesBatched( payload );

				expect( mw.ForeignApi ).not.toHaveBeenCalled();
			} );

			it( 'batches requests when more than items then the limit(2) are requested', async () => {
				const payload = {
					ids: [ 'Q333333', 'Q444444', 'Q555555', 'Q666666', 'Q777777' ],
					getData: mockGetData,
					setData: mockSetData,
					resetData: mockResetData
				};

				const batch1Response = { entities: { Q333333: 'data 1', Q444444: 'data 2' } };
				const batch2Response = { entities: { Q555555: 'data 3', Q666666: 'data 4' } };
				const batch3Response = { entities: { Q777777: 'data 5' } };

				getMock = jest.fn()
					.mockResolvedValueOnce( batch1Response )
					.mockResolvedValueOnce( batch2Response )
					.mockResolvedValueOnce( batch3Response );
				mw.ForeignApi = jest.fn( () => ( { get: getMock } ) );

				await store.fetchWikidataEntitiesBatched( payload );

				// Should make 3 requests (batches of 2, 2, and 1)
				expect( getMock ).toHaveBeenCalledTimes( 3 );

				// Check that each batch was called with correct IDs
				expect( getMock ).toHaveBeenNthCalledWith( 1,
					{ action: 'wbgetentities', format: 'json', formatversion: '2', languages: 'en', languagefallback: true, ids: 'Q333333|Q444444' },
					{ signal: undefined }
				);
				expect( getMock ).toHaveBeenNthCalledWith( 2,
					{ action: 'wbgetentities', format: 'json', formatversion: '2', languages: 'en', languagefallback: true, ids: 'Q555555|Q666666' },
					{ signal: undefined }
				);
				expect( getMock ).toHaveBeenNthCalledWith( 3,
					{ action: 'wbgetentities', format: 'json', formatversion: '2', languages: 'en', languagefallback: true, ids: 'Q777777' },
					{ signal: undefined }
				);

				// Check that all items were stored
				expect( mockSetData ).toHaveBeenCalledWith( { id: 'Q333333', data: 'data 1' } );
				expect( mockSetData ).toHaveBeenCalledWith( { id: 'Q444444', data: 'data 2' } );
				expect( mockSetData ).toHaveBeenCalledWith( { id: 'Q555555', data: 'data 3' } );
				expect( mockSetData ).toHaveBeenCalledWith( { id: 'Q666666', data: 'data 4' } );
				expect( mockSetData ).toHaveBeenCalledWith( { id: 'Q777777', data: 'data 5' } );
			} );

			it( 'handles API errors by resetting data', async () => {
				const payload = {
					ids: [ 'Q333333', 'Q444444' ],
					getData: mockGetData,
					setData: mockSetData,
					resetData: mockResetData
				};

				const errorResponse = { error: 'Some error' };
				getMock = jest.fn().mockResolvedValue( errorResponse );
				mw.ForeignApi = jest.fn( () => ( { get: getMock } ) );

				await store.fetchWikidataEntitiesBatched( payload );

				expect( mockResetData ).toHaveBeenCalledWith( { ids: [ 'Q333333', 'Q444444' ] } );
			} );

			it( 'handles missing entities by resetting individual IDs', async () => {
				const payload = {
					ids: [ 'Q333333', 'Q444444' ],
					getData: mockGetData,
					setData: mockSetData,
					resetData: mockResetData
				};

				const apiResponse = {
					entities: {
						Q333333: { missing: '' }, // Simulate missing entity
						Q444444: { title: 'Q444444', labels: {} }
					}
				};
				getMock = jest.fn().mockResolvedValue( apiResponse );
				mw.ForeignApi = jest.fn( () => ( { get: getMock } ) );

				await store.fetchWikidataEntitiesBatched( payload );

				expect( mockResetData ).toHaveBeenCalledWith( { ids: [ 'Q333333' ] } );
				expect( mockSetData ).toHaveBeenCalledWith( {
					id: 'Q444444',
					data: { title: 'Q444444', labels: {} }
				} );
			} );

			it( 'handles network/fetch failures by resetting data', async () => {
				const payload = {
					ids: [ 'Q333333', 'Q444444' ],
					getData: mockGetData,
					setData: mockSetData,
					resetData: mockResetData
				};

				getMock = jest.fn().mockRejectedValue( 'Network error' );
				mw.ForeignApi = jest.fn( () => ( { get: getMock } ) );

				await store.fetchWikidataEntitiesBatched( payload );

				expect( mockResetData ).toHaveBeenCalledWith( { ids: [ 'Q333333', 'Q444444' ] } );
			} );

			it( 'stores promises for in-flight requests', async () => {
				const payload = {
					ids: [ 'Q333333', 'Q444444' ],
					getData: mockGetData,
					setData: mockSetData,
					resetData: mockResetData
				};

				const promise = store.fetchWikidataEntitiesBatched( payload );

				// Check that promises are stored for each ID
				expect( mockSetData ).toHaveBeenCalledWith( {
					id: 'Q333333',
					data: promise
				} );
				expect( mockSetData ).toHaveBeenCalledWith( {
					id: 'Q444444',
					data: promise
				} );

				await promise;
			} );
		} );

	} );

	describe( 'Actions', () => {
		const responseValue = {
			search: 'some-response',
			searchContinue: null
		};
		let getMock;

		describe( 'lookupWikidataEntities', () => {
			beforeEach( () => {
				getMock = jest.fn().mockResolvedValue( { search: 'some-response' } );
				mw.ForeignApi = jest.fn( () => ( { get: getMock } ) );
				// Mock the getters
				Object.defineProperty( store, 'getUserLangCode', {
					value: 'en'
				} );
			} );

			it( 'calls wbsearchentities API for lexemes', async () => {
				const request = {
					type: 'lexeme',
					search: 'turtle'
				};
				const response = await store.lookupWikidataEntities( request );
				expect( response ).toEqual( responseValue );

				expect( mw.ForeignApi ).toHaveBeenCalledWith( `${ Constants.WIKIDATA_BASE_URL }/w/api.php`, { anonymous: true } );
				expect( getMock ).toHaveBeenCalledWith( {
					action: 'wbsearchentities',
					format: 'json',
					formatversion: '2',
					language: 'en',
					uselang: 'en',
					search: request.search,
					type: request.type,
					limit: '10',
					props: 'url'
				}, { signal: undefined } );
			} );
		} );

		describe( 'fetchWikidataEntitiesByType', () => {
			it( 'calls fetchLexemes for lexeme types', () => {
				const payload = { type: Constants.Z_WIKIDATA_LEXEME, ids: [ 'L111111' ] };
				const fetchLexemesMock = jest.fn();
				store.fetchLexemes = fetchLexemesMock;
				store.fetchWikidataEntitiesByType( payload );
				expect( fetchLexemesMock ).toHaveBeenCalledWith( payload );
			} );

			it( 'calls fetchLexemes for reference lexeme types', () => {
				const payload = { type: Constants.Z_WIKIDATA_REFERENCE_LEXEME, ids: [ 'L222222' ] };
				const fetchLexemesMock = jest.fn();
				store.fetchLexemes = fetchLexemesMock;
				store.fetchWikidataEntitiesByType( payload );
				expect( fetchLexemesMock ).toHaveBeenCalledWith( payload );
			} );

			it( 'transforms ids and calls fetchLexemes for lexeme form types', () => {
				const payload = { type: Constants.Z_WIKIDATA_LEXEME_FORM, ids: [ 'L111111-F1', 'L222222-F2' ] };
				const fetchLexemesMock = jest.fn();
				store.fetchLexemes = fetchLexemesMock;
				store.fetchWikidataEntitiesByType( payload );
				expect( payload.ids ).toEqual( [ 'L111111', 'L222222' ] );
				expect( fetchLexemesMock ).toHaveBeenCalledWith( payload );
			} );

			it( 'calls fetchItems for item types', () => {
				const payload = { type: Constants.Z_WIKIDATA_ITEM, ids: [ 'Q111111' ] };
				const fetchItemsMock = jest.fn();
				store.fetchItems = fetchItemsMock;
				store.fetchWikidataEntitiesByType( payload );
				expect( fetchItemsMock ).toHaveBeenCalledWith( payload );
			} );

			it( 'calls fetchProperties for property types', () => {
				const payload = { type: Constants.Z_WIKIDATA_PROPERTY, ids: [ 'P111111' ] };
				const fetchPropertiesMock = jest.fn();
				store.fetchProperties = fetchPropertiesMock;
				store.fetchWikidataEntitiesByType( payload );
				expect( fetchPropertiesMock ).toHaveBeenCalledWith( payload );
			} );

			it( 'returns undefined for unknown types', () => {
				const payload = { type: Constants.Z_WIKIDATA_FETCH_ITEM, ids: [ 'X111111' ] };
				expect( store.fetchWikidataEntitiesByType( payload ) ).toBeUndefined();
			} );
		} );

	} );
} );
