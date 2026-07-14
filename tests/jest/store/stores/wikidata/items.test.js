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
		en: { language: 'en', value: 'turtle' },
		ar: { language: 'ar', value: 'سلحفاة' }
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

			it( 'returns item label data in the requested language when available', () => {
				store.items[ itemId ] = itemData;
				const expected = new LabelData( itemId, 'سلحفاة', null, 'ar' );
				expect( store.getItemLabelData( itemId, 'ar' ) ).toEqual( expected );
			} );

			it( 'falls back to another available language when the requested one is missing', () => {
				store.items[ itemId ] = itemData;
				const expected = new LabelData( itemId, 'turtle', null, 'en' );
				expect( store.getItemLabelData( itemId, 'fr' ) ).toEqual( expected );
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

		describe( 'getItemUrl', () => {
			it( 'returns undefined if id is not provided', () => {
				expect( store.getItemUrl( undefined ) ).toBeUndefined();
				expect( store.getItemUrl( '' ) ).toBeUndefined();
			} );
			it( 'returns undefined with non-valid item Id', () => {
				expect( store.getItemUrl( 'bad' ) ).toBeUndefined();
			} );
			it( 'returns wikidata item URL with valid item Id', () => {
				expect( store.getItemUrl( 'Q123' ) ).toContain( Constants.WIKIDATA_BASE_URL );
				expect( store.getItemUrl( 'Q123' ) ).toContain( 'Q123' );
			} );
		} );
	} );

	describe( 'Actions', () => {
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

		describe( 'fetchItemLabelInLanguage', () => {
			it( 'does nothing when id is missing', async () => {
				mw.ForeignApi = jest.fn();
				await store.fetchItemLabelInLanguage( { id: undefined, langCode: 'fr' } );
				expect( mw.ForeignApi ).not.toHaveBeenCalled();
			} );

			it( 'does nothing when langCode is missing', async () => {
				mw.ForeignApi = jest.fn();
				await store.fetchItemLabelInLanguage( { id: itemId, langCode: undefined } );
				expect( mw.ForeignApi ).not.toHaveBeenCalled();
			} );

			it( 'does not fetch when the item already has the requested language cached', async () => {
				store.items[ itemId ] = itemData; // already has en and ar
				mw.ForeignApi = jest.fn();

				await store.fetchItemLabelInLanguage( { id: itemId, langCode: 'ar' } );

				expect( mw.ForeignApi ).not.toHaveBeenCalled();
				expect( store.items[ itemId ] ).toEqual( itemData );
			} );

			it( 'fetches and merges the label into the cached item, preserving other languages', async () => {
				store.items[ itemId ] = { title: itemId, labels: { en: itemData.labels.en }, descriptions: {} };
				const getMock = jest.fn().mockResolvedValue( {
					entities: {
						[ itemId ]: { labels: { fr: { language: 'fr', value: 'tortue' } } }
					}
				} );
				mw.ForeignApi = jest.fn( () => ( { get: getMock } ) );

				await store.fetchItemLabelInLanguage( { id: itemId, langCode: 'fr' } );

				expect( getMock ).toHaveBeenCalledWith(
					{
						action: 'wbgetentities',
						format: 'json',
						formatversion: '2',
						languages: 'fr',
						languagefallback: true,
						ids: itemId,
						props: 'labels'
					},
					{ signal: undefined }
				);
				expect( store.items[ itemId ] ).toEqual( {
					title: itemId,
					labels: {
						en: itemData.labels.en,
						fr: { language: 'fr', value: 'tortue' }
					},
					descriptions: {}
				} );
			} );

			it( 'creates a new cache entry when the item was never cached before', async () => {
				const getMock = jest.fn().mockResolvedValue( {
					entities: {
						[ itemId ]: { labels: { fr: { language: 'fr', value: 'tortue' } } }
					}
				} );
				mw.ForeignApi = jest.fn( () => ( { get: getMock } ) );

				await store.fetchItemLabelInLanguage( { id: itemId, langCode: 'fr' } );

				expect( store.items[ itemId ] ).toEqual( {
					title: itemId,
					labels: { fr: { language: 'fr', value: 'tortue' } },
					descriptions: {}
				} );
			} );

			it( 'leaves the cache untouched when the response has no label for the requested language', async () => {
				store.items[ itemId ] = itemData;
				const getMock = jest.fn().mockResolvedValue( { entities: { [ itemId ]: { labels: {} } } } );
				mw.ForeignApi = jest.fn( () => ( { get: getMock } ) );

				await store.fetchItemLabelInLanguage( { id: itemId, langCode: 'fr' } );

				expect( store.items[ itemId ] ).toEqual( itemData );
			} );

			it( 'leaves the cache untouched and does not throw when the fetch fails', async () => {
				store.items[ itemId ] = itemData;
				const getMock = jest.fn().mockRejectedValue( new Error( 'network error' ) );
				mw.ForeignApi = jest.fn( () => ( { get: getMock } ) );

				await expect(
					store.fetchItemLabelInLanguage( { id: itemId, langCode: 'fr' } )
				).resolves.toBeUndefined();
				expect( store.items[ itemId ] ).toEqual( itemData );
			} );
		} );

		describe( 'fetchItems', () => {
			// NOTE: before T429766 test cases were duplicate between fetchItems/Lexemes/Properties
			// and fetchWikidataEntitiesBatched. Now, fetchItems/Lexemes/Properties tests need to
			// test that the time window behavior is correct, and the call to fetchWikidataEntitiesBatched
			// happens with the right parameters. The internal behavior of the entities fetch method
			// is fully tested in entities.js
			beforeEach( () => {
				store.items = {};
				store.scheduledItems = [];
				store.scheduledItemsPromise = null;
				jest.useFakeTimers();
				Object.defineProperty( store, 'getUserLangCode', { value: 'en' } );
				store.fetchWikidataEntitiesBatched = jest.fn().mockReturnValue( Promise.resolve() );
			} );

			afterEach( () => {
				jest.useRealTimers();
			} );

			it( 'creates a new promise and initiates scheduledItems on first call', () => {
				const promise = store.fetchItems( { ids: [ 'Q111111' ] } );

				expect( store.scheduledItems ).toEqual( [ 'Q111111' ] );
				expect( store.scheduledItemsPromise ).toStrictEqual( promise );
				expect( promise ).toBeInstanceOf( Promise );
			} );

			it( 'subsequent calls within the time window add to scheduledItems and return the same promise', () => {
				const promise1 = store.fetchItems( { ids: [ 'Q111111' ] } );
				const promise2 = store.fetchItems( { ids: [ 'Q222222' ] } );
				const promise3 = store.fetchItems( { ids: [ 'Q111111', 'Q333333' ] } );

				expect( store.scheduledItems ).toEqual( [ 'Q111111', 'Q222222', 'Q333333' ] );
				expect( promise2 ).toStrictEqual( promise1 );
				expect( promise3 ).toStrictEqual( promise1 );
			} );

			it( 'deduplicates ids across concurrent calls', () => {
				store.fetchItems( { ids: [ 'Q111111', 'Q222222' ] } );
				store.fetchItems( { ids: [ 'Q222222', 'Q333333' ] } );

				expect( store.scheduledItems ).toEqual( [ 'Q111111', 'Q222222', 'Q333333' ] );
			} );

			it( 'calls fetchWikidataEntitiesBatched with collected qids', () => {
				store.fetchItems( { ids: [ 'Q111111' ] } );
				store.fetchItems( { ids: [ 'Q222222' ] } );

				jest.runAllTimers();

				expect( store.fetchWikidataEntitiesBatched ).toHaveBeenCalledWith( {
					ids: [ 'Q111111', 'Q222222' ],
					getData: expect.any( Function ),
					setData: expect.any( Function ),
					resetData: expect.any( Function )
				} );
			} );

			it( 'calls fetchWikidataEntitiesBatched with the correct item setters and getters', () => {
				// Mock getter, setter an resetter
				const mockGetter = jest.fn();
				const mockSetter = jest.fn();
				const mockResetter = jest.fn();

				Object.defineProperty( store, 'getItemData', { value: mockGetter } );
				store.setItemData = mockSetter;
				store.resetItemData = mockResetter;

				// Make call
				store.fetchItems( { ids: [ 'Q111111' ] } );
				jest.runAllTimers();

				const call = store.fetchWikidataEntitiesBatched.mock.calls[ 0 ][ 0 ];

				// Check getter
				call.getData( 'Q111111' );
				expect( mockGetter ).toHaveBeenCalledWith( 'Q111111' );

				// Check setter
				call.setData( { id: 'Q111111', data: itemData } );
				expect( mockSetter ).toHaveBeenCalledWith( { id: 'Q111111', data: itemData } );

				// Check resetter
				call.resetData( { ids: [ 'Q111111' ] } );
				expect( mockResetter ).toHaveBeenCalledWith( { ids: [ 'Q111111' ] } );
			} );

			it( 'resolves the promise after the time window', async () => {
				const promise = store.fetchItems( { ids: [ 'Q111111' ] } );

				jest.runAllTimers();
				await promise;

				expect( store.fetchWikidataEntitiesBatched ).toHaveBeenCalledTimes( 1 );
			} );

			it( 'resets scheduledItems and scheduledItemsPromise after the time window', async () => {
				const promise = store.fetchItems( { ids: [ 'Q111111' ] } );

				jest.runAllTimers();
				await promise;

				expect( store.scheduledItems ).toEqual( [] );
				expect( store.scheduledItemsPromise ).toBeNull();
			} );

			it( 'allows a new window to start after the previous one resolves', async () => {
				const promise1 = store.fetchItems( { ids: [ 'Q111111' ] } );
				jest.runAllTimers();
				await promise1;

				const promise2 = store.fetchItems( { ids: [ 'Q222222' ] } );
				jest.runAllTimers();
				await promise2;

				expect( promise2 ).not.toBe( promise1 );
				expect( store.fetchWikidataEntitiesBatched ).toHaveBeenCalledTimes( 2 );
			} );
		} );
	} );
} );
