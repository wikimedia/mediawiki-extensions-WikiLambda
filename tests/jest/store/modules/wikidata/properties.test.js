/*!
 * WikiLambda unit test suite for the Wikidata properties Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { setActivePinia, createPinia } = require( 'pinia' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

const propertyId = 'P642';
const propertyData = {
	title: 'Property:P642',
	labels: {
		en: { language: 'en', value: 'of' }
	}
};

describe( 'Wikidata Properties Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.properties = {};
	} );

	describe( 'Getters', () => {
		describe( 'getPropertyIdRow', () => {

			it( 'calls getWikidataEntityIdRow for properties', () => {
				Object.defineProperty( store, 'getWikidataEntityIdRow', {
					value: jest.fn()
				} );
				store.getPropertyIdRow( 10 );
				expect( store.getWikidataEntityIdRow ).toHaveBeenCalledWith( 10, Constants.Z_WIKIDATA_PROPERTY );
			} );
		} );

		describe( 'getPropertyData', () => {

			it( 'returns undefined if property is not available', () => {
				expect( store.getPropertyData( propertyId ) ).toEqual( undefined );
			} );

			it( 'returns property data if available', () => {
				store.properties[ propertyId ] = propertyData;
				expect( store.getPropertyData( propertyId ) ).toEqual( propertyData );
			} );
		} );
	} );

	describe( 'Actions', () => {
		let fetchMock;

		describe( 'setPropertyData', () => {
			it( 'sets property data for a given property Id', () => {
				const payload = {
					id: propertyId,
					data: propertyData
				};
				store.setPropertyData( payload );
				expect( store.properties[ propertyId ] ).toEqual( propertyData );
			} );
		} );

		describe( 'fetchProperties', () => {
			beforeEach( () => {
				store.properties = {
					P111111: 'has data',
					P222222: new Promise( ( resolve ) => {
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

			it( 'exits early if property ids are already fetched or in flight', () => {
				const properties = [
					'P111111', // Already fetched
					'P222222' // Request in flight
				];

				store.fetchProperties( { ids: properties } );

				expect( fetchMock ).not.toHaveBeenCalled();
			} );

			it( 'calls wbgetentities API to fetch all unfetched properties', async () => {
				const properties = [
					'P111111', // Already fetched
					'P222222', // Request in flight
					'P333333',
					'P444444'
				];

				const expectedResponse = { entities: { P333333: 'this', P444444: 'that' } };
				fetchMock = jest.fn().mockResolvedValue( {
					json: jest.fn().mockReturnValue( expectedResponse )
				} );
				store.setPropertyData = jest.fn();
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;

				const params = 'origin=*&action=wbgetentities&format=json&languages=en&languagefallback=true&ids=P333333%7CP444444';
				const expectedUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;

				const promise = store.fetchProperties( { ids: properties } );

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl );

				// Save promises while request is in flight
				expect( store.setPropertyData ).toHaveBeenCalledWith( {
					id: 'P333333',
					data: promise
				} );
				expect( store.setPropertyData ).toHaveBeenCalledWith( {
					id: 'P444444',
					data: promise
				} );

				const response = await promise;

				// Save data when response arrives
				expect( store.setPropertyData ).toHaveBeenCalledWith( {
					id: 'P333333',
					data: 'this'
				} );
				expect( store.setPropertyData ).toHaveBeenCalledWith( {
					id: 'P444444',
					data: 'that'
				} );

				expect( response ).toEqual( expectedResponse );
			} );

			it( 'resets ids when API fails', async () => {
				store.properties = {
					P111111: 'has data'
				};
				const properties = [
					'P111111', // Already fetched
					'P333333',
					'P444444'
				];

				fetchMock = jest.fn().mockRejectedValue( 'some error' );
				store.setPropertyData = jest.fn();
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;

				const params = 'origin=*&action=wbgetentities&format=json&languages=en&languagefallback=true&ids=P333333%7CP444444';
				const expectedUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;

				await store.fetchProperties( { ids: properties } );

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl );
				expect( store.properties ).toEqual( { P111111: 'has data' } );
			} );
		} );
	} );
} );
