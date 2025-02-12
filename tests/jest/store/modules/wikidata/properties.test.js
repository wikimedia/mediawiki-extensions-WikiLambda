/*!
 * WikiLambda unit test suite for the Wikidata properties Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	propertiesModule = require( '../../../../../resources/ext.wikilambda.app/store/modules/wikidata/properties.js' );

const propertyId = 'P642';
const propertyData = {
	title: 'Property:P642',
	labels: {
		en: { language: 'en', value: 'of' }
	}
};

describe( 'Wikidata Properties Vuex module', () => {
	let state, getters;

	describe( 'Getters', () => {
		describe( 'getPropertyIdRow', () => {
			beforeEach( () => {
				getters = {
					getWikidataEntityIdRow: jest.fn()
				};
			} );

			it( 'calls getWikidataEntityIdRow for properties', () => {
				propertiesModule.getters.getPropertyIdRow( state, getters )( 10 );
				expect( getters.getWikidataEntityIdRow ).toHaveBeenCalledWith( 10, Constants.Z_WIKIDATA_PROPERTY );
			} );
		} );

		describe( 'getPropertyData', () => {
			beforeEach( () => {
				state = {
					properties: {}
				};
			} );

			it( 'returns undefined if property is not available', () => {
				expect( propertiesModule.getters.getPropertyData( state )( propertyId ) )
					.toEqual( undefined );
			} );

			it( 'returns property data if available', () => {
				state.properties[ propertyId ] = propertyData;
				expect( propertiesModule.getters.getPropertyData( state )( propertyId ) )
					.toEqual( propertyData );
			} );
		} );
	} );

	describe( 'Mutations', () => {
		beforeEach( () => {
			state = {
				properties: {}
			};
		} );

		describe( 'setPropertyData', () => {
			it( 'sets property data for a given property Id', () => {
				const payload = {
					id: propertyId,
					data: propertyData
				};
				propertiesModule.mutations.setPropertyData( state, payload );
				expect( state.properties[ propertyId ] ).toEqual( propertyData );
			} );
		} );
	} );

	describe( 'Actions', () => {
		const context = {};
		let fetchMock;

		describe( 'fetchProperties', () => {
			beforeEach( () => {
				state = {
					properties: {
						P111111: 'has data',
						P222222: new Promise( ( resolve ) => {
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
					getPropertyData: propertiesModule.getters.getPropertyData( state )
				};
				context.commit = jest.fn();
			} );

			it( 'exits early if property ids are already fetched or in flight', () => {
				const properties = [
					'P111111', // Already fetched
					'P222222' // Request in flight
				];

				propertiesModule.actions.fetchProperties( context, { ids: properties } );

				expect( context.commit ).not.toHaveBeenCalled();
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
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;

				const params = 'origin=*&action=wbgetentities&format=json&languages=en&languagefallback=true&ids=P333333%7CP444444';
				const expectedUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;

				const promise = propertiesModule.actions.fetchProperties( context, { ids: properties } );

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl );

				// Save promises while request is in flight
				expect( context.commit ).toHaveBeenCalledWith( 'setPropertyData', {
					id: 'P333333',
					data: promise
				} );
				expect( context.commit ).toHaveBeenCalledWith( 'setPropertyData', {
					id: 'P444444',
					data: promise
				} );

				const response = await promise;

				// Save data when response arrives
				expect( context.commit ).toHaveBeenCalledWith( 'setPropertyData', {
					id: 'P333333',
					data: 'this'
				} );
				expect( context.commit ).toHaveBeenCalledWith( 'setPropertyData', {
					id: 'P444444',
					data: 'that'
				} );

				expect( response ).toEqual( expectedResponse );
			} );
		} );
	} );
} );
