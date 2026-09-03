/*!
 * WikiLambda unit test suite for the Commons Media Pinia store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

const MID = 'M68960758';
const mediaData = {
	pageid: 68960758,
	title: 'File:Cat.jpg',
	imageinfo: [ {
		descriptionurl: 'https://commons.wikimedia.org/wiki/File:Cat.jpg',
		thumburl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/Cat.jpg/250px-Cat.jpg',
		thumbwidth: 250,
		thumbheight: 188
	} ]
};

describe( 'Commons Media Pinia store', () => {
	let store;
	let foreignApiGetMock;

	beforeEach( () => {
		foreignApiGetMock = jest.fn();
		mw.ForeignApi = jest.fn( () => ( {
			get: foreignApiGetMock
		} ) );
		setActivePinia( createPinia() );
		store = useMainStore();
		store.commonsMedia = {};
		store.commonsMediaPromises = new Map();
	} );

	describe( 'Getters', () => {
		describe( 'getCommonsMediaData', () => {
			it( 'returns undefined for unfetched M-ID', () => {
				expect( store.getCommonsMediaData( MID ) ).toBeUndefined();
			} );

			it( 'returns stored data for a fetched M-ID', () => {
				store.commonsMedia[ MID ] = mediaData;
				expect( store.getCommonsMediaData( MID ) ).toEqual( mediaData );
			} );
		} );

		describe( 'getCommonsMediaTitle', () => {
			it( 'returns undefined when no data is cached', () => {
				expect( store.getCommonsMediaTitle( MID ) ).toBeUndefined();
			} );

			it( 'returns the file title when data is cached', () => {
				store.commonsMedia[ MID ] = mediaData;
				expect( store.getCommonsMediaTitle( MID ) ).toBe( 'File:Cat.jpg' );
			} );
		} );

		describe( 'getCommonsMediaThumb', () => {
			it( 'returns undefined when no data is cached', () => {
				expect( store.getCommonsMediaThumb( MID ) ).toBeUndefined();
			} );

			it( 'returns the thumbnail URL when data is cached', () => {
				store.commonsMedia[ MID ] = mediaData;
				expect( store.getCommonsMediaThumb( MID ) ).toBe( mediaData.imageinfo[ 0 ].thumburl );
			} );
		} );

		describe( 'getCommonsMediaDescriptionUrl', () => {
			it( 'returns undefined when no data is cached', () => {
				expect( store.getCommonsMediaDescriptionUrl( MID ) ).toBeUndefined();
			} );

			it( 'returns the description URL when data is cached', () => {
				store.commonsMedia[ MID ] = mediaData;
				expect( store.getCommonsMediaDescriptionUrl( MID ) ).toBe( mediaData.imageinfo[ 0 ].descriptionurl );
			} );
		} );

		describe( 'getCommonsMediaThumbSize', () => {
			it( 'returns undefined when no data is cached', () => {
				expect( store.getCommonsMediaThumbSize( MID ) ).toBeUndefined();
			} );

			it( 'returns undefined when imageinfo has no thumb dimensions', () => {
				store.commonsMedia[ MID ] = {
					...mediaData,
					imageinfo: [ { thumburl: 'https://upload.wikimedia.org/thumb/Cat.jpg' } ]
				};
				expect( store.getCommonsMediaThumbSize( MID ) ).toBeUndefined();
			} );

			it( 'returns width and height when thumb dimensions are cached', () => {
				store.commonsMedia[ MID ] = mediaData;
				expect( store.getCommonsMediaThumbSize( MID ) ).toEqual( { width: 250, height: 188 } );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'setCommonsMediaData', () => {
			it( 'stores the raw page object', () => {
				store.setCommonsMediaData( { id: MID, data: mediaData } );
				expect( store.commonsMedia[ MID ] ).toStrictEqual( mediaData );
			} );
		} );

		describe( 'fetchCommonsMedia', () => {
			it( 'resolves immediately for already-cached M-IDs', async () => {
				store.commonsMedia[ MID ] = mediaData;

				await store.fetchCommonsMedia( { ids: [ MID ] } );

				expect( foreignApiGetMock ).not.toHaveBeenCalled();
			} );

			it( 'fetches and caches data for uncached M-IDs', async () => {
				foreignApiGetMock.mockResolvedValue( {
					query: { pages: { 68960758: mediaData } }
				} );

				await store.fetchCommonsMedia( { ids: [ MID ] } );

				expect( store.commonsMedia[ MID ] ).toMatchObject( mediaData );
				expect( store.commonsMediaPromises.size ).toBe( 0 );
			} );

			it( 'sends one request when two callers ask for the same M-ID', async () => {
				foreignApiGetMock.mockResolvedValue( {
					query: { pages: { 68960758: mediaData } }
				} );

				const first = store.fetchCommonsMedia( { ids: [ MID ] } );
				expect( store.commonsMediaPromises.has( MID ) ).toBe( true );
				const second = store.fetchCommonsMedia( { ids: [ MID ] } );

				await Promise.all( [ first, second ] );

				expect( foreignApiGetMock ).toHaveBeenCalledTimes( 1 );
				expect( store.commonsMedia[ MID ] ).toMatchObject( mediaData );
			} );

			it( 'does not cache an M-ID which the response leaves out', async () => {
				foreignApiGetMock.mockResolvedValue( { query: { pages: {} } } );

				await store.fetchCommonsMedia( { ids: [ MID ] } );

				expect( store.commonsMedia[ MID ] ).toBeUndefined();
				expect( store.commonsMediaPromises.size ).toBe( 0 );
			} );

			it( 'caches nothing when the request fails, and asks again', async () => {
				foreignApiGetMock.mockRejectedValue( 'commons error' );

				await store.fetchCommonsMedia( { ids: [ MID ] } );

				expect( store.commonsMedia[ MID ] ).toBeUndefined();
				expect( store.commonsMediaPromises.size ).toBe( 0 );

				foreignApiGetMock.mockResolvedValue( {
					query: { pages: { 68960758: mediaData } }
				} );

				await store.fetchCommonsMedia( { ids: [ MID ] } );

				expect( foreignApiGetMock ).toHaveBeenCalledTimes( 2 );
				expect( store.commonsMedia[ MID ] ).toMatchObject( mediaData );
			} );
		} );

		describe( 'lookupCommonsMedia', () => {
			it( 'delegates to the Commons search API', async () => {
				foreignApiGetMock.mockResolvedValue( { query: { pages: [] } } );

				const result = await store.lookupCommonsMedia( { search: 'cat' } );
				expect( result ).toEqual( { pages: [], searchContinue: null } );
				expect( foreignApiGetMock ).toHaveBeenCalledWith(
					expect.objectContaining( { gsrsearch: 'cat' } ),
					expect.anything()
				);
			} );
		} );
	} );
} );
