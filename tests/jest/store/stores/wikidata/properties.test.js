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
const LabelData = require( '../../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );

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
		describe( 'getPropertyData', () => {

			it( 'returns undefined if property is not available', () => {
				expect( store.getPropertyData( propertyId ) ).toEqual( undefined );
			} );

			it( 'returns property data if available', () => {
				store.properties[ propertyId ] = propertyData;
				expect( store.getPropertyData( propertyId ) ).toEqual( propertyData );
			} );
		} );

		describe( 'getPropertyLabelData', () => {
			it( 'returns undefined when property ID is undefined', () => {
				const expected = undefined;
				expect( store.getPropertyLabelData( undefined ) ).toEqual( expected );
			} );

			it( 'returns property ID as label when property data is not available', () => {
				const expected = new LabelData( propertyId, propertyId, null );
				expect( store.getPropertyLabelData( propertyId ) ).toEqual( expected );
			} );

			it( 'returns property label data when property data is available', () => {
				store.properties[ propertyId ] = propertyData;
				const expected = new LabelData( propertyId, 'of', null, 'en' );
				expect( store.getPropertyLabelData( propertyId ) ).toEqual( expected );
			} );
		} );

		describe( 'getPropertyDataAsync', () => {
			it( 'returns resolved promise if property is cached', async () => {
				store.properties.P642 = propertyData;
				const result = await store.getPropertyDataAsync( 'P642' );
				expect( result ).toEqual( propertyData );
			} );

			it( 'returns in-flight promise if property is being fetched', async () => {
				let resolveFn;
				const promise = new Promise( ( resolve ) => {
					resolveFn = resolve;
				} );
				store.properties.P642 = promise;
				const resultPromise = store.getPropertyDataAsync( 'P642' );
				expect( resultPromise ).toBe( promise );
				resolveFn( propertyData );
				expect( resultPromise ).resolves.toEqual( propertyData );
			} );

			it( 'returns rejected promise if property is not present', async () => {
				expect( store.getPropertyDataAsync( 'P_NOT_PRESENT' ) ).rejects.toThrow( 'Property P_NOT_PRESENT not found' );
			} );
		} );
	} );

	describe( 'Actions', () => {
		let fetchMock;

		describe( 'setPropertyData', () => {
			it( 'stores a promise directly if data is a promise', () => {
				const promise = Promise.resolve( 'foo' );
				store.setPropertyData( { id: propertyId, data: promise } );
				expect( store.properties[ propertyId ] ).toBe( promise );
			} );
			it( 'unwraps and stores only title and labels if data is an object', () => {
				const data = { ...propertyData, extra: 'should not be stored' };
				store.setPropertyData( { id: propertyId, data } );
				expect( store.properties[ propertyId ] ).toEqual( propertyData );
			} );
		} );

		describe( 'resetPropertyData', () => {
			it( 'removes property data for given IDs', () => {
				store.properties = { P111111: 'foo', P222222: 'bar', P333333: 'baz' };
				store.resetPropertyData( { ids: [ 'P111111', 'P333333' ] } );
				expect( store.properties ).toEqual( { P222222: 'bar' } );
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

				const params = 'origin=*&action=wbgetentities&format=json&formatversion=2&languages=en&languagefallback=true&ids=P333333%7CP444444';
				const expectedUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;

				const promise = store.fetchProperties( { ids: properties } );

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl, undefined );

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

			it( 'stores the resolving promise for fetching properties', async () => {
				const properties = [ 'P333333', 'P444444' ];
				const promise = store.fetchProperties( { ids: properties } );

				expect( store.properties.P333333 ).toStrictEqual( promise );
				expect( store.properties.P444444 ).toStrictEqual( promise );

				await promise;
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

				const params = 'origin=*&action=wbgetentities&format=json&formatversion=2&languages=en&languagefallback=true&ids=P333333%7CP444444';
				const expectedUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;

				await store.fetchProperties( { ids: properties } );

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl, undefined );
				expect( store.properties ).toEqual( { P111111: 'has data' } );
			} );

			it( 'removes property IDs and returns data when API returns error', async () => {
				const properties = [ 'P333333', 'P444444' ];
				const errorResponse = { error: 'Some error' };
				fetchMock = jest.fn().mockResolvedValue( {
					json: jest.fn().mockReturnValue( errorResponse )
				} );
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;
				store.setPropertyData = jest.fn();
				store.resetPropertyData = jest.fn();

				await store.fetchProperties( { ids: properties } );

				expect( store.resetPropertyData ).toHaveBeenCalledWith( { ids: [ 'P333333', 'P444444' ] } );
			} );

			it( 'removes a single property ID when entity is missing in API response', async () => {
				const properties = [ 'P333333', 'P444444' ];
				const apiResponse = {
					entities: {
						P333333: { missing: '' }, // Simulate missing entity
						P444444: { title: 'Property:P444444', labels: {} }
					}
				};
				fetchMock = jest.fn().mockResolvedValue( {
					json: jest.fn().mockReturnValue( apiResponse )
				} );
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;
				store.setPropertyData = jest.fn();
				store.resetPropertyData = jest.fn();

				await store.fetchProperties( { ids: properties } );

				expect( store.resetPropertyData ).toHaveBeenCalledWith( { ids: [ 'P333333' ] } );
				expect( store.setPropertyData ).toHaveBeenCalledWith( {
					id: 'P444444',
					data: { title: 'Property:P444444', labels: {} }
				} );
			} );

			it( 'calls the batching method with correct parameters', () => {
				const mockFetchWikidataEntitiesBatched = jest.fn().mockReturnValue( Promise.resolve() );
				store.fetchWikidataEntitiesBatched = mockFetchWikidataEntitiesBatched;

				const properties = [ 'P333333', 'P444444' ];
				store.fetchProperties( { ids: properties } );

				expect( mockFetchWikidataEntitiesBatched ).toHaveBeenCalledWith( {
					ids: properties,
					getData: store.getPropertyData,
					setData: store.setPropertyData,
					resetData: store.resetPropertyData
				} );
			} );
		} );
	} );
} );
