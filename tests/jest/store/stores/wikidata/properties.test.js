/*!
 * WikiLambda unit test suite for the Wikidata properties store module
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
		store.propertyPromises = new Map();
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

		describe( 'getPropertyUrl', () => {
			it( 'returns undefined if id is not provided', () => {
				expect( store.getPropertyUrl( undefined ) ).toBeUndefined();
				expect( store.getPropertyUrl( '' ) ).toBeUndefined();
			} );
			it( 'returns undefined with non-valid property Id', () => {
				expect( store.getPropertyUrl( 'bad' ) ).toBeUndefined();
			} );
			it( 'returns wikidata item URL with valid property Id', () => {
				expect( store.getPropertyUrl( 'P123' ) ).toContain( Constants.WIKIDATA_BASE_URL );
				expect( store.getPropertyUrl( 'P123' ) ).toContain( 'Property:P123' );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'setPropertyData', () => {
			it( 'unwraps and stores only title and labels if data is an object', () => {
				const data = { ...propertyData, extra: 'should not be stored' };
				store.setPropertyData( { id: propertyId, data } );
				expect( store.properties[ propertyId ] ).toEqual( propertyData );
			} );
		} );

		describe( 'fetchProperties', () => {
			// NOTE: the time window (T429766) collects the Ids of the calls which
			// arrive close together into one request, and
			// `storeUtils.doDeduplicatedBatchFetch` keeps the Ids which are cached
			// or already being fetched out of it. The request itself, which splits
			// the Ids into batches, is fully tested in entities.js
			beforeEach( () => {
				store.properties = {};
				store.propertyPromises = new Map();
				store.scheduledProps = [];
				store.scheduledPropsPromise = null;
				jest.useFakeTimers();
				Object.defineProperty( store, 'getUserLangCode', { value: 'en' } );
				store.fetchWikidataEntitiesBatched = jest.fn().mockResolvedValue( {} );
			} );

			afterEach( () => {
				jest.useRealTimers();
			} );

			it( 'opens a window and schedules the ids on the first call', () => {
				const promise = store.fetchProperties( { ids: [ 'P111111' ] } );

				expect( store.scheduledProps ).toEqual( [ 'P111111' ] );
				expect( store.scheduledPropsPromise ).toBeInstanceOf( Promise );
				expect( promise ).toBeInstanceOf( Promise );
			} );

			it( 'subsequent calls within the time window add to scheduledProps', () => {
				store.fetchProperties( { ids: [ 'P111111' ] } );
				store.fetchProperties( { ids: [ 'P222222' ] } );
				store.fetchProperties( { ids: [ 'P111111', 'P333333' ] } );

				expect( store.scheduledProps ).toEqual( [ 'P111111', 'P222222', 'P333333' ] );
			} );

			it( 'deduplicates ids across concurrent calls', () => {
				store.fetchProperties( { ids: [ 'P111111', 'P222222' ] } );
				store.fetchProperties( { ids: [ 'P222222', 'P333333' ] } );

				expect( store.scheduledProps ).toEqual( [ 'P111111', 'P222222', 'P333333' ] );
			} );

			it( 'does not schedule an id which is already cached', () => {
				store.properties = { P111111: propertyData };

				store.fetchProperties( { ids: [ 'P111111', 'P222222' ] } );

				expect( store.scheduledProps ).toEqual( [ 'P222222' ] );
			} );

			it( 'calls fetchWikidataEntitiesBatched with collected pids', () => {
				store.fetchProperties( { ids: [ 'P111111' ] } );
				store.fetchProperties( { ids: [ 'P222222' ] } );

				jest.runAllTimers();

				expect( store.fetchWikidataEntitiesBatched ).toHaveBeenCalledWith( {
					ids: [ 'P111111', 'P222222' ]
				} );
			} );

			it( 'caches the properties which the request returned', async () => {
				store.fetchWikidataEntitiesBatched = jest.fn().mockResolvedValue( {
					P111111: { ...propertyData, extra: 'should not be stored' }
				} );

				const promise = store.fetchProperties( { ids: [ 'P111111' ] } );
				jest.runAllTimers();
				await promise;

				expect( store.properties.P111111 ).toEqual( propertyData );
				expect( store.propertyPromises.size ).toBe( 0 );
			} );

			it( 'does not cache an id which the request left out, and asks again', async () => {
				const promise = store.fetchProperties( { ids: [ 'P111111' ] } );
				jest.runAllTimers();
				await promise;

				expect( store.properties.P111111 ).toBeUndefined();
				expect( store.propertyPromises.size ).toBe( 0 );

				const retry = store.fetchProperties( { ids: [ 'P111111' ] } );
				jest.runAllTimers();
				await retry;

				expect( store.fetchWikidataEntitiesBatched ).toHaveBeenCalledTimes( 2 );
			} );

			it( 'resolves the promise after the time window', async () => {
				const promise = store.fetchProperties( { ids: [ 'P111111' ] } );

				jest.runAllTimers();
				await promise;

				expect( store.fetchWikidataEntitiesBatched ).toHaveBeenCalledTimes( 1 );
			} );

			it( 'resets scheduledProps and scheduledPropsPromise after the time window', async () => {
				const promise = store.fetchProperties( { ids: [ 'P111111' ] } );

				jest.runAllTimers();
				await promise;

				expect( store.scheduledProps ).toEqual( [] );
				expect( store.scheduledPropsPromise ).toBeNull();
			} );

			it( 'allows a new window to start after the previous one resolves', async () => {
				const promise1 = store.fetchProperties( { ids: [ 'P111111' ] } );
				jest.runAllTimers();
				await promise1;

				const promise2 = store.fetchProperties( { ids: [ 'P222222' ] } );
				jest.runAllTimers();
				await promise2;

				expect( store.fetchWikidataEntitiesBatched ).toHaveBeenCalledTimes( 2 );
			} );
		} );
	} );
} );
