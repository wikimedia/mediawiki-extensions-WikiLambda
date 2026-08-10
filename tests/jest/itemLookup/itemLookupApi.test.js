/*!
 * WikiLambda unit tests for the Wikidata calls of the item lookup control.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const itemLookupApi =
	require( '../../../resources/ext.wikilambda.itemLookup/itemLookupApi.js' );

describe( 'itemLookupApi', () => {
	describe( 'newWikidataApi', () => {
		it( 'always asks Wikidata, whatever wiki shows the form', () => {
			expect( itemLookupApi.newWikidataApi() ).toBeInstanceOf( mw.ForeignApi );
		} );
	} );

	describe( 'fetchItemLabels', () => {
		let get;

		beforeEach( () => {
			get = jest.fn().mockResolvedValue( {
				entities: {
					Q42: { labels: { en: { language: 'en', value: 'Douglas Adams' } } },
					// An item with no label in the language asked for.
					Q64: { labels: {} }
				}
			} );
			jest.spyOn( itemLookupApi, 'newWikidataApi' ).mockReturnValue( { get } );
		} );

		it( 'maps each item to its label, and leaves out the ones without', async () => {
			const labels = await itemLookupApi.fetchItemLabels( {
				ids: [ 'Q42', 'Q64' ],
				language: 'en'
			} );

			expect( labels ).toEqual( { Q42: 'Douglas Adams' } );
		} );

		it( 'asks for every item in one request, and for labels only', async () => {
			await itemLookupApi.fetchItemLabels( { ids: [ 'Q42', 'Q64' ], language: 'en' } );

			expect( get ).toHaveBeenCalledTimes( 1 );
			expect( get ).toHaveBeenCalledWith( expect.objectContaining( {
				action: 'wbgetentities',
				props: 'labels',
				languages: 'en',
				ids: 'Q42|Q64'
			} ), expect.anything() );
		} );

		it( 'asks nothing when there is no item to ask about', async () => {
			expect( await itemLookupApi.fetchItemLabels( { ids: [], language: 'en' } ) ).toEqual( {} );
			expect( await itemLookupApi.fetchItemLabels( { language: 'en' } ) ).toEqual( {} );
			expect( get ).not.toHaveBeenCalled();
		} );

		it( 'asks for at most fifty items in each request', async () => {
			const ids = Array.from( { length: 51 }, ( value, index ) => `Q${ index + 1 }` );
			await itemLookupApi.fetchItemLabels( { ids, language: 'en' } );

			expect( get ).toHaveBeenCalledTimes( 2 );
			expect( get.mock.calls[ 0 ][ 0 ].ids.split( '|' ) ).toHaveLength( 50 );
			expect( get.mock.calls[ 1 ][ 0 ].ids ).toBe( 'Q51' );
		} );

		it( 'returns nothing when the response holds no entities', async () => {
			get.mockResolvedValue( {} );

			expect( await itemLookupApi.fetchItemLabels( { ids: [ 'Q42' ], language: 'en' } ) )
				.toEqual( {} );
		} );
	} );
} );
