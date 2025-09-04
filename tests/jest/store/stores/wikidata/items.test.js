/*!
 * WikiLambda unit test suite for the Wikidata items Pinia store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const LabelData = require( '../../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );

const itemId = 'Q223044';
const itemData = {
	title: 'Q223044',
	labels: {
		en: { language: 'en', value: 'turtle' }
	}
};

describe( 'Wikidata Items Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.items = {};
	} );

	describe( 'Getters', () => {
		describe( 'getItemLabelData', () => {
			it( 'returns undefined when item ID is undefined', () => {
				const expected = undefined;
				expect( store.getItemLabelData( undefined ) ).toEqual( expected );
			} );

			it( 'returns item ID as label when item data is not available', () => {
				const expected = new LabelData( itemId, itemId, null );
				expect( store.getItemLabelData( itemId ) ).toEqual( expected );
			} );

			it( 'returns item label data when item data is available', () => {
				store.items[ itemId ] = itemData;
				const expected = new LabelData( itemId, 'turtle', null, 'en' );
				expect( store.getItemLabelData( itemId ) ).toEqual( expected );
			} );
		} );

		describe( 'getItemData', () => {
			it( 'returns undefined if item is not available', () => {
				expect( store.getItemData( itemId ) ).toEqual( undefined );
			} );

			it( 'returns item data if available', () => {
				store.items[ itemId ] = itemData;
				expect( store.getItemData( itemId ) ).toEqual( itemData );
			} );
		} );

		describe( 'getItemDataAsync', () => {
			it( 'returns resolved promise if item is cached', async () => {
				store.items[ itemId ] = itemData;
				const result = await store.getItemDataAsync( itemId );
				expect( result ).toEqual( itemData );
			} );

			it( 'returns in-flight promise if item is being fetched', async () => {
				let resolveFn;
				const promise = new Promise( ( resolve ) => {
					resolveFn = resolve;
				} );
				store.items[ itemId ] = promise;
				const resultPromise = store.getItemDataAsync( itemId );
				// Should be the same promise
				expect( resultPromise ).toBe( promise );
				// Resolve and check
				resolveFn( itemData );
				expect( resultPromise ).resolves.toEqual( itemData );
			} );

			it( 'returns rejected promise if item is not present', async () => {
				expect( store.getItemDataAsync( 'Q_NOT_PRESENT' ) ).rejects.toThrow( 'Item Q_NOT_PRESENT not found' );
			} );
		} );
	} );

	describe( 'Actions', () => {
		let fetchMock;

		describe( 'setItemData', () => {
			it( 'stores a promise directly if data is a promise', () => {
				const promise = Promise.resolve( 'foo' );
				store.setItemData( { id: itemId, data: promise } );
				expect( store.items[ itemId ] ).toBe( promise );
			} );

			it( 'unwraps and stores only title and labels if data is an object', () => {
				const data = { ...itemData, extra: 'should not be stored' };
				store.setItemData( { id: itemId, data } );
				expect( store.items[ itemId ] ).toEqual( itemData );
			} );
		} );

		describe( 'resetItemData', () => {
			it( 'removes item data for given IDs', () => {
				store.items = { Q111111: 'foo', Q222222: 'bar', Q333333: 'baz' };
				store.resetItemData( { ids: [ 'Q111111', 'Q333333' ] } );
				expect( store.items ).toEqual( { Q222222: 'bar' } );
			} );
		} );

		describe( 'fetchItems', () => {
			beforeEach( () => {
				store.items = {
					Q111111: 'has data',
					Q222222: new Promise( ( resolve ) => {
						resolve();
					} )
				};
				fetchMock = jest.fn().mockResolvedValue( {
					json: jest.fn().mockReturnValue( {} )
				} );
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;
				// Mock the getters
				Object.defineProperty( store, 'getUserLangCode', {
					value: 'en'
				} );
			} );

			it( 'exits early if item ids are already fetched or in flight', () => {
				const items = [
					'Q111111', // Already fetched
					'Q222222' // Request in flight
				];

				store.fetchItems( { ids: items } );

				expect( fetchMock ).not.toHaveBeenCalled();
			} );

			it( 'calls wbgetentities API to fetch all unfetched items', async () => {
				const items = [
					'Q111111', // Already fetched
					'Q222222', // Request in flight
					'Q333333',
					'Q444444'
				];

				const expectedResponse = { entities: { Q333333: 'this', Q444444: 'that' } };
				fetchMock = jest.fn().mockResolvedValue( {
					json: jest.fn().mockReturnValue( expectedResponse )
				} );
				store.setItemData = jest.fn();
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;

				const params = 'origin=*&action=wbgetentities&format=json&formatversion=2&languages=en&languagefallback=true&ids=Q333333%7CQ444444';
				const expectedUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;

				const promise = store.fetchItems( { ids: items } );

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl, undefined );

				// Save promises while request is in flight
				expect( store.setItemData ).toHaveBeenCalledWith( {
					id: 'Q333333',
					data: promise
				} );
				expect( store.setItemData ).toHaveBeenCalledWith( {
					id: 'Q444444',
					data: promise
				} );

				const response = await promise;

				// Save data when response arrives
				expect( store.setItemData ).toHaveBeenCalledWith( {
					id: 'Q333333',
					data: 'this'
				} );
				expect( store.setItemData ).toHaveBeenCalledWith( {
					id: 'Q444444',
					data: 'that'
				} );

				expect( response ).toEqual( expectedResponse );
			} );

			it( 'stores the resolving promise for fetching items', async () => {
				const items = [ 'Q333333', 'Q444444' ];
				const promise = store.fetchItems( { ids: items } );

				expect( store.items.Q333333 ).toStrictEqual( promise );
				expect( store.items.Q444444 ).toStrictEqual( promise );

				await promise;
			} );

			it( 'resets ids when API fails', async () => {
				store.items = {
					Q111111: 'has data'
				};
				const items = [
					'Q111111', // Already fetched
					'Q333333',
					'Q444444'
				];

				fetchMock = jest.fn().mockRejectedValue( 'some error' );
				store.setItemData = jest.fn();
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;

				const params = 'origin=*&action=wbgetentities&format=json&formatversion=2&languages=en&languagefallback=true&ids=Q333333%7CQ444444';
				const expectedUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;

				await store.fetchItems( { ids: items } );

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl, undefined );
				expect( store.items ).toEqual( { Q111111: 'has data' } );
			} );

			it( 'removes item IDs and returns data when API returns error', async () => {
				const items = [ 'Q333333', 'Q444444' ];
				const errorResponse = { error: 'Some error' };
				fetchMock = jest.fn().mockResolvedValue( {
					json: jest.fn().mockReturnValue( errorResponse )
				} );
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;
				store.setItemData = jest.fn();
				store.resetItemData = jest.fn();

				await store.fetchItems( { ids: items } );

				expect( store.resetItemData ).toHaveBeenCalledWith( { ids: [ 'Q333333', 'Q444444' ] } );
			} );

			it( 'removes a single item ID when entity is missing in API response', async () => {
				const items = [ 'Q333333', 'Q444444' ];
				const apiResponse = {
					entities: {
						Q333333: { missing: '' }, // Simulate missing entity
						Q444444: { title: 'Q444444', labels: {} }
					}
				};
				fetchMock = jest.fn().mockResolvedValue( {
					json: jest.fn().mockReturnValue( apiResponse )
				} );
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;
				store.setItemData = jest.fn();
				store.resetItemData = jest.fn();

				await store.fetchItems( { ids: items } );

				expect( store.resetItemData ).toHaveBeenCalledWith( { ids: [ 'Q333333' ] } );
				expect( store.setItemData ).toHaveBeenCalledWith( {
					id: 'Q444444',
					data: { title: 'Q444444', labels: {} }
				} );
			} );

			it( 'calls the batching method with correct parameters', () => {
				const mockFetchWikidataEntitiesBatched = jest.fn().mockReturnValue( Promise.resolve() );
				store.fetchWikidataEntitiesBatched = mockFetchWikidataEntitiesBatched;

				const items = [ 'Q333333', 'Q444444' ];
				store.fetchItems( { ids: items } );

				expect( mockFetchWikidataEntitiesBatched ).toHaveBeenCalledWith( {
					ids: items,
					getData: store.getItemData,
					setData: store.setItemData,
					resetData: store.resetItemData
				} );
			} );
		} );
	} );
} );
