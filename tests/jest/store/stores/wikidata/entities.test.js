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

describe( 'Wikidata Entities Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.zobject = [];
	} );

	describe( 'Getters', () => {
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

				const params = `origin=*&action=wbsearchentities&format=json&formatversion=2&language=en&uselang=en&search=${
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
