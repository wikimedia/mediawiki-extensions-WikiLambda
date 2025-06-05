/*!
 * WikiLambda unit test suite for the Wikidata entities Pinia store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const { zobjectToRows } = require( '../../../helpers/zObjectTableHelpers.js' );

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
						Z6825K1: 'L111111'
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
						Z6095K1: 'L111111'
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
							Z6095K1: 'L111111'
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
							Z6095K1: 'L111111'
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
						Z6825K1: 'L111111'
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
							Z6095K1: 'L111111'
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
						Z6095K1: 'L111111'
					}
				} );
				const rowId = 1;
				const expected = true;
				expect( store.isWikidataReference( rowId ) ).toEqual( expected );
			} );
		} );

		describe( 'isWikidataEntity', () => {
			it( 'returns false when row is undefined', () => {
				const rowId = undefined;
				const expected = false;
				expect( store.isWikidataEntity( rowId ) ).toEqual( expected );
			} );

			it( 'returns false when row is not found', () => {
				const rowId = 100;
				const expected = false;
				expect( store.isWikidataEntity( rowId ) ).toEqual( expected );
			} );

			it( 'returns false when object is not a wikidata entity', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z11',
						Z11K1: 'Z1002',
						Z11K2: 'not a function call'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( store.isWikidataEntity( rowId ) ).toEqual( expected );
			} );

			it( 'returns true when object is a wikidata literal', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z6005',
						Z6005K1: {
							Z1K1: 'Z6095',
							Z6095K1: 'L111111'
						}
					}
				} );
				const rowId = 1;
				const expected = true;
				expect( store.isWikidataEntity( rowId ) ).toEqual( expected );
			} );

			it( 'returns true when object is a wikidata reference', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z6095',
						Z6095K1: 'L111111'
					}
				} );
				const rowId = 1;
				const expected = true;
				expect( store.isWikidataEntity( rowId ) ).toEqual( expected );
			} );

			it( 'returns true when object is a wikidata fetch function call', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z6825',
						Z6825K1: {
							Z1K1: 'Z6095',
							Z6095K1: 'L111111'
						}
					}
				} );
				const rowId = 1;
				const expected = true;
				expect( store.isWikidataEntity( rowId ) ).toEqual( expected );
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
						Z801K1: 'L111111'
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
							Z6095K1: 'L111111' // rowId = 9
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
						Z6095K1: 'L111111' // rowId = 9
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
							Z6095K1: 'L111111'
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

		describe( 'getWikidataEntityId', () => {
			it( 'returns null when row is undefined', () => {
				const rowId = undefined;
				const wikidataType = 'Z6005';
				const expected = null;
				expect( store.getWikidataEntityId( rowId, wikidataType ) ).toEqual( expected );
			} );

			it( 'returns undefined when row is not found', () => {
				const rowId = 100;
				const wikidataType = 'Z6005';
				const expected = null;
				expect( store.getWikidataEntityId( rowId, wikidataType ) ).toEqual( expected );
			} );

			it( 'returns entity id when is a valid Wikidata format, for example a wikidata fetch function call ', () => {
				store.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z6825',
						Z6825K1: {
							Z1K1: 'Z6095',
							Z6095K1: 'L111111'
						}
					}
				} );
				const rowId = 1;
				const wikidataType = 'Z6005';
				const expected = 'L111111';
				expect( store.getWikidataEntityId( rowId, wikidataType ) ).toBe( expected );
			} );
		} );

		describe( 'getWikidataEntityLabelData', () => {
			it( 'returns lexeme label data for lexeme types', () => {
				const expected = { label: 'foo' };
				Object.defineProperty( store, 'getLexemeLabelData', {
					value: jest.fn().mockReturnValue( expected )
				} );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_LEXEME, 'L111111' ) ).toEqual( expected );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_REFERENCE_LEXEME, 'L222222' ) ).toEqual( expected );
			} );

			it( 'returns lexeme form label data for lexeme form types', () => {
				const expected = { label: 'bar' };
				Object.defineProperty( store, 'getLexemeFormLabelData', {
					value: jest.fn().mockReturnValue( expected )
				} );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_LEXEME_FORM, 'L111111-F1' ) ).toEqual( expected );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM, 'L222222-F2' ) ).toEqual( expected );
			} );

			it( 'returns item label data for item types', () => {
				const expected = { label: 'baz' };
				Object.defineProperty( store, 'getItemLabelData', {
					value: jest.fn().mockReturnValue( expected )
				} );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_ITEM, 'Q111111' ) ).toEqual( expected );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_REFERENCE_ITEM, 'Q222222' ) ).toEqual( expected );
			} );

			it( 'returns property label data for property types', () => {
				const expected = { label: 'qux' };
				Object.defineProperty( store, 'getPropertyLabelData', {
					value: jest.fn().mockReturnValue( expected )
				} );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_PROPERTY, 'P111111' ) ).toEqual( expected );
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_REFERENCE_PROPERTY, 'P222222' ) ).toEqual( expected );
			} );

			it( 'returns undefined for unknown types', () => {
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_FETCH_ITEM, 'X111111' ) ).toBeUndefined();
			} );
		} );

		describe( 'getWikidataEntityUrl', () => {
			it( 'returns lexeme url for lexeme types', () => {
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_LEXEME, 'L111111' ) ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L111111' );
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_REFERENCE_LEXEME, 'L222222' ) ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L222222' );
			} );

			it( 'returns lexeme form url for lexeme form types', () => {
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_LEXEME_FORM, 'L111111-F1' ) ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L111111#F1' );
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_REFERENCE_LEXEME_FORM, 'L222222-F2' ) ).toBe( 'https://www.wikidata.org/wiki/Lexeme:L222222#F2' );
			} );

			it( 'returns item url for item types', () => {
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_ITEM, 'Q111111' ) ).toBe( 'https://www.wikidata.org/wiki/Q111111' );
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_REFERENCE_ITEM, 'Q222222' ) ).toBe( 'https://www.wikidata.org/wiki/Q222222' );
			} );

			it( 'returns property url for property types', () => {
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_PROPERTY, 'P111111' ) ).toBe( 'https://www.wikidata.org/wiki/Property:P111111' );
				expect( store.getWikidataEntityUrl( Constants.Z_WIKIDATA_REFERENCE_PROPERTY, 'P222222' ) ).toBe( 'https://www.wikidata.org/wiki/Property:P222222' );
			} );

			it( 'returns undefined for unknown types', () => {
				expect( store.getWikidataEntityLabelData( Constants.Z_WIKIDATA_FETCH_ITEM, 'X111111' ) ).toBeUndefined();
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

		describe( 'fetchWikidataEntitiesByType', () => {
			it( 'calls fetchLexemes for lexeme types', () => {
				const payload = { type: Constants.Z_WIKIDATA_LEXEME, ids: [ 'L111111' ] };
				const fetchLexemesMock = jest.fn();
				store.fetchLexemes = fetchLexemesMock;
				store.fetchWikidataEntitiesByType( payload );
				expect( fetchLexemesMock ).toHaveBeenCalledWith( payload );
			} );

			it( 'calls fetchLexemes for reference lexeme types', () => {
				const payload = { type: Constants.Z_WIKIDATA_REFERENCE_LEXEME, ids: [ 'L222222' ] };
				const fetchLexemesMock = jest.fn();
				store.fetchLexemes = fetchLexemesMock;
				store.fetchWikidataEntitiesByType( payload );
				expect( fetchLexemesMock ).toHaveBeenCalledWith( payload );
			} );

			it( 'transforms ids and calls fetchLexemes for lexeme form types', () => {
				const payload = { type: Constants.Z_WIKIDATA_LEXEME_FORM, ids: [ 'L111111-F1', 'L222222-F2' ] };
				const fetchLexemesMock = jest.fn();
				store.fetchLexemes = fetchLexemesMock;
				store.fetchWikidataEntitiesByType( payload );
				expect( payload.ids ).toEqual( [ 'L111111', 'L222222' ] );
				expect( fetchLexemesMock ).toHaveBeenCalledWith( payload );
			} );

			it( 'calls fetchItems for item types', () => {
				const payload = { type: Constants.Z_WIKIDATA_ITEM, ids: [ 'Q111111' ] };
				const fetchItemsMock = jest.fn();
				store.fetchItems = fetchItemsMock;
				store.fetchWikidataEntitiesByType( payload );
				expect( fetchItemsMock ).toHaveBeenCalledWith( payload );
			} );

			it( 'calls fetchProperties for property types', () => {
				const payload = { type: Constants.Z_WIKIDATA_PROPERTY, ids: [ 'P111111' ] };
				const fetchPropertiesMock = jest.fn();
				store.fetchProperties = fetchPropertiesMock;
				store.fetchWikidataEntitiesByType( payload );
				expect( fetchPropertiesMock ).toHaveBeenCalledWith( payload );
			} );

			it( 'returns undefined for unknown types', () => {
				const payload = { type: Constants.Z_WIKIDATA_FETCH_ITEM, ids: [ 'X111111' ] };
				expect( store.fetchWikidataEntitiesByType( payload ) ).toBeUndefined();
			} );
		} );

	} );
} );
