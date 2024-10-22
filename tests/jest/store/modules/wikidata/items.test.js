/*!
 * WikiLambda unit test suite for the Wikidata items Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	itemsModule = require( '../../../../../resources/ext.wikilambda.app/store/modules/wikidata/items.js' );

const itemId = 'Q223044';
const itemData = {
	title: 'Q223044',
	labels: {
		en: { language: 'en', value: 'turtle' }
	}
};

describe( 'Wikidata Items Vuex module', () => {
	let state, getters;

	describe( 'Getters', () => {
		describe( 'getItemIdRow', () => {
			beforeEach( () => {
				getters = {
					getWikidataEntityIdRow: jest.fn()
				};
			} );

			it( 'calls getWikidataEntityIdRow for items', () => {
				itemsModule.getters.getItemIdRow( state, getters )( 10 );
				expect( getters.getWikidataEntityIdRow ).toHaveBeenCalledWith( 10, Constants.Z_WIKIDATA_ITEM );
			} );
		} );

		describe( 'getItemData', () => {
			beforeEach( () => {
				state = {
					items: {}
				};
			} );

			it( 'returns undefined if item is not available', () => {
				expect( itemsModule.getters.getItemData( state )( itemId ) )
					.toEqual( undefined );
			} );

			it( 'returns item data if available', () => {
				state.items[ itemId ] = itemData;
				expect( itemsModule.getters.getItemData( state )( itemId ) )
					.toEqual( itemData );
			} );
		} );
	} );

	describe( 'Mutations', () => {
		beforeEach( () => {
			state = {
				items: {}
			};
		} );

		describe( 'setItemData', () => {
			it( 'sets item data for a given item Id', () => {
				const payload = {
					id: itemId,
					data: itemData
				};
				itemsModule.mutations.setItemData( state, payload );
				expect( state.items[ itemId ] ).toEqual( itemData );
			} );
		} );
	} );

	describe( 'Actions', () => {
		const context = {};
		let fetchMock;

		describe( 'fetchItems', () => {
			beforeEach( () => {
				state = {
					items: {
						Q111111: 'has data',
						Q222222: new Promise( ( resolve ) => {
							resolve();
						} )
					}
				};
				fetchMock = jest.fn().mockResolvedValue( {
					json: jest.fn().mockReturnValue( {} )
				} );
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;
				context.getters = {
					getUserLangCode: 'en',
					getItemData: itemsModule.getters.getItemData( state )
				};
				context.commit = jest.fn();
			} );

			it( 'exits early if item ids are already fetched or in flight', () => {
				const items = [
					'Q111111', // Already fetched
					'Q222222' // Request in flight
				];

				itemsModule.actions.fetchItems( context, { ids: items } );

				expect( context.commit ).not.toHaveBeenCalled();
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
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;

				const params = 'origin=*&action=wbgetentities&format=json&languages=en&languagefallback=true&ids=Q333333%7CQ444444';
				const expectedUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;

				const promise = itemsModule.actions.fetchItems( context, { ids: items } );

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl );

				// Save promises while request is in flight
				expect( context.commit ).toHaveBeenCalledWith( 'setItemData', {
					id: 'Q333333',
					data: promise
				} );
				expect( context.commit ).toHaveBeenCalledWith( 'setItemData', {
					id: 'Q444444',
					data: promise
				} );

				const response = await promise;

				// Save data when response arrives
				expect( context.commit ).toHaveBeenCalledWith( 'setItemData', {
					id: 'Q333333',
					data: 'this'
				} );
				expect( context.commit ).toHaveBeenCalledWith( 'setItemData', {
					id: 'Q444444',
					data: 'that'
				} );

				expect( response ).toEqual( expectedResponse );
			} );
		} );
	} );
} );
