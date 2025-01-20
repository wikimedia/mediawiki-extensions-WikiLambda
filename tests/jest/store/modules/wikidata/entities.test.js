/*!
 * WikiLambda unit test suite for the Wikidata entities Pinia store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { setActivePinia, createPinia } = require( 'pinia' );
const { zobjectToRows } = require( '../../../helpers/zObjectTableHelpers.js' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'Wikidata Entities Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.zobject = [];
	} );

	describe( 'Getters', () => {
		describe( 'isWikidataLiteral', () => {
			it( 'returns false when row is undefined', () => {
				const rowId = undefined;
				const expected = false;
				expect( store.isWikidataLiteral( rowId ) ).toEqual( expected );
			} );

			it( 'returns false when row is not found', () => {
				const rowId = 100;
				const expected = false;
				expect( store.isWikidataLiteral( rowId ) ).toEqual( expected );
			} );

			it( 'returns false when object is not a wikidata reference type', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z11',
						Z11K1: 'Z1002',
						Z11K2: 'not a function call'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( store.isWikidataLiteral( rowId ) ).toEqual( expected );
			} );

			it( 'returns false when object is a wikidata entity represented by a fetch function call', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z6825',
						Z6825K1: 'L333333'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( store.isWikidataLiteral( rowId ) ).toEqual( expected );
			} );

			it( 'returns false when object is a wikidata reference type', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z6095',
						Z6095K1: 'L333333'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( store.isWikidataLiteral( rowId ) ).toEqual( expected );
			} );

			it( 'returns true when object is a wikidata literal', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z6005',
						Z6005K1: {
							Z1K1: 'Z6095',
							Z6095K1: 'L333333'
						}
					}
				} );
				const rowId = 1;
				const expected = true;
				expect( store.isWikidataLiteral( rowId ) ).toEqual( expected );
			} );
		} );

		describe( 'isWikidataFetch', () => {
			it( 'returns false when row is undefined', () => {
				const rowId = undefined;
				const expected = false;
				expect( store.isWikidataFetch( rowId ) ).toEqual( expected );
			} );

			it( 'returns false when row is not found', () => {
				const rowId = 100;
				const expected = false;
				expect( store.isWikidataFetch( rowId ) ).toEqual( expected );
			} );

			it( 'returns false when row belongs to something other than a function call', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z11',
						Z11K1: 'Z1002',
						Z11K2: 'not a function call'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( store.isWikidataFetch( rowId ) ).toEqual( expected );
			} );

			it( 'returns false when function call is not to a wikidata fetch function', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z801',
						Z801K1: 'some function call'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( store.isWikidataFetch( rowId ) ).toEqual( expected );
			} );

			it( 'returns true when function call is to a wikidata fetch function', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z6825',
						Z6825K1: {
							Z1K1: 'Z6095',
							Z6095K1: 'L333333'
						}
					}
				} );
				const rowId = 1;
				const expected = true;
				expect( store.isWikidataFetch( rowId ) ).toEqual( expected );
			} );
		} );

		describe( 'isWikidataReference', () => {
			it( 'returns false when row is undefined', () => {
				const rowId = undefined;
				const expected = false;
				expect( store.isWikidataReference( rowId ) ).toEqual( expected );
			} );

			it( 'returns false when row is not found', () => {
				const rowId = 100;
				const expected = false;
				expect( store.isWikidataReference( rowId ) ).toEqual( expected );
			} );

			it( 'returns false when object is not a wikidata reference type', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z11',
						Z11K1: 'Z1002',
						Z11K2: 'not a function call'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( store.isWikidataReference( rowId ) ).toEqual( expected );
			} );

			it( 'returns false when object is a wikidata entity represented by a fetch function call', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z6825',
						Z6825K1: 'L333333'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( store.isWikidataReference( rowId ) ).toEqual( expected );
			} );

			it( 'returns false when object is a wikidata literal', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z6005',
						Z6005K1: {
							Z1K1: 'Z6095',
							Z6095K1: 'L333333'
						}
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( store.isWikidataReference( rowId ) ).toEqual( expected );
			} );

			it( 'returns true when object is a wikidata reference type', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z6095',
						Z6095K1: 'L333333'
					}
				} );
				const rowId = 1;
				const expected = true;
				expect( store.isWikidataReference( rowId ) ).toEqual( expected );
			} );
		} );

		describe( 'getWikidataEntityIdRow', () => {
			it( 'returns undefined when row is undefined', () => {
				const rowId = undefined;
				const wikidataType = 'Z6005';
				const expected = undefined;
				expect( store.getWikidataEntityIdRow( rowId, wikidataType ) ).toEqual( expected );
			} );

			it( 'returns undefined when row is not found', () => {
				const rowId = 100;
				const wikidataType = 'Z6005';
				const expected = undefined;
				expect( store.getWikidataEntityIdRow( rowId, wikidataType ) ).toEqual( expected );
			} );

			it( 'returns undefined when object is not a wikidata entity', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z11',
						Z11K1: 'Z1002',
						Z11K2: 'not a function call'
					}
				} );
				const rowId = 1;
				const wikidataType = 'Z6005';
				const expected = undefined;
				expect( store.getWikidataEntityIdRow( rowId, wikidataType ) ).toEqual( expected );
			} );

			it( 'returns undefined when object is a function call to a different function', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z801',
						Z801K1: 'L333333'
					}
				} );
				const rowId = 1;
				const wikidataType = 'Z6005';
				const expected = undefined;
				expect( store.getWikidataEntityIdRow( rowId, wikidataType ) ).toEqual( expected );
			} );

			it( 'returns identity row when object is a wikidata literal', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z6005',
						Z6005K1: {
							Z1K1: 'Z6095',
							Z6095K1: 'L333333' // rowId = 9
						}
					}
				} );
				const rowId = 1;
				const wikidataType = 'Z6005';
				const expectedKey = 'Z6095K1';
				const referenceRow = store.getWikidataEntityIdRow( rowId, wikidataType );
				expect( referenceRow.key ).toBe( expectedKey );
			} );

			it( 'returns identity row when object is a wikidata reference', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z6095',
						Z6095K1: 'L333333' // rowId = 9
					}
				} );
				const rowId = 1;
				const wikidataType = 'Z6005';
				const expectedKey = 'Z6095K1';
				const referenceRow = store.getWikidataEntityIdRow( rowId, wikidataType );
				expect( referenceRow.key ).toBe( expectedKey );
			} );

			it( 'returns identity row when object is a wikidata fetch function call', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z6825',
						Z6825K1: {
							Z1K1: 'Z6095',
							Z6095K1: 'L333333'
						}
					}
				} );
				const rowId = 1;
				const wikidataType = 'Z6005';
				const expectedKey = 'Z6095K1';
				const referenceRow = store.getWikidataEntityIdRow( rowId, wikidataType );
				expect( referenceRow.key ).toBe( expectedKey );
			} );
		} );
	} );

	describe( 'Actions', () => {
		const responseValue = {
			search: 'some-response',
			searchContinue: null
		};
		let fetchMock;

		describe( 'lookupWikidataEntities', () => {
			beforeEach( () => {
				fetchMock = jest.fn().mockResolvedValue( {
					json: jest.fn().mockResolvedValue( responseValue )
				} );
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;
				// Mock the getters
				Object.defineProperty( store, 'getUserLangCode', {
					value: 'en'
				} );
			} );

			it( 'calls wbsearchentities API for lexemes', async () => {
				const request = {
					type: 'lexeme',
					search: 'turtle'
				};
				const response = await store.lookupWikidataEntities( request );
				expect( response ).toEqual( responseValue );

				const params = `origin=*&action=wbsearchentities&format=json&language=en&uselang=en&search=${
					request.search }&type=${ request.type }&limit=10&props=url`;
				const getUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;
				expect( fetchMock ).toHaveBeenCalledWith( getUrl );
			} );
		} );
	} );
} );
