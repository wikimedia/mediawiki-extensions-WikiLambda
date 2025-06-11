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
		describe( 'getItemIdRow', () => {
			it( 'calls getWikidataEntityIdRow for items', () => {
				Object.defineProperty( store, 'getWikidataEntityIdRow', {
					value: jest.fn()
				} );
				store.getItemIdRow( 10 );
				expect( store.getWikidataEntityIdRow ).toHaveBeenCalledWith( 10, Constants.Z_WIKIDATA_ITEM );
			} );
		} );

		describe( 'getItemId', () => {
			it( 'returns null when row is undefined', () => {
				const rowId = undefined;
				const expected = null;
				expect( store.getItemId( rowId ) ).toEqual( expected );
			} );

			it( 'returns null when row is not found', () => {
				const rowId = 100;
				const expected = null;
				expect( store.getItemId( rowId ) ).toEqual( expected );
			} );

			it( 'returns item ID when row is found', () => {
				const rowId = 1;
				const expected = 'Q223044';
				Object.defineProperty( store, 'getItemIdRow', {
					value: jest.fn().mockReturnValue( 2 )
				} );
				Object.defineProperty( store, 'getZStringTerminalValue', {
					value: jest.fn().mockReturnValue( expected )
				} );
				expect( store.getItemId( rowId ) ).toEqual( expected );
			} );
		} );

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
	} );

	describe( 'Actions', () => {
		let fetchMock;

		describe( 'setItemData', () => {
			it( 'sets item data for a given item Id', () => {
				const payload = {
					id: itemId,
					data: itemData
				};
				store.setItemData( payload );
				expect( store.items[ itemId ] ).toEqual( itemData );
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

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl );

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

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl );
				expect( store.items ).toEqual( { Q111111: 'has data' } );
			} );

			it( 'stores the resolving promise for fetching items', async () => {
				const items = [ 'Q333333', 'Q444444' ];
				const promise = store.fetchItems( { ids: items } );

				expect( store.items.Q333333 ).toStrictEqual( promise );
				expect( store.items.Q444444 ).toStrictEqual( promise );

				await promise;
			} );

			it( 'removes item IDs from state when fetch fails', async () => {
				store.items = {
					Q111111: 'has data'
				};
				const items = [ 'Q333333', 'Q444444' ];

				fetchMock = jest.fn().mockRejectedValue( 'some error' );
				store.setItemData = jest.fn();
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;

				await store.fetchItems( { ids: items } );

				expect( store.items ).toEqual( { Q111111: 'has data' } );
			} );
		} );
	} );
} );
