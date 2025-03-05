/*!
 * WikiLambda unit test suite for the Wikidata lexemes Pinia store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { createPinia, setActivePinia } = require( 'pinia' );
const Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../../resources/ext.wikilambda.app/store/index.js' );
const LabelData = require( '../../../../../resources/ext.wikilambda.app/store/classes/LabelData.js' );

const lexemeData = {
	title: 'Lexeme:L333333',
	lemmas: {
		en: { language: 'en', value: 'turtle' }
	},
	forms: [ {
		id: 'L333333-F5',
		representations: {
			en: { language: 'en', value: 'turtled' }
		},
		grammaticalFeatures: [ 'Q1230649' ],
		claims: {}
	} ]
};

describe( 'Wikidata Lexemes Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.lexemes = {};
	} );

	describe( 'Getters', () => {
		describe( 'getLexemeData', () => {
			it( 'returns undefined if lexeme is not available', () => {
				const lexemeId = 'L333333';
				const expected = undefined;
				expect( store.getLexemeData( lexemeId ) ).toEqual( expected );
			} );

			it( 'returns lexeme data if available', () => {
				store.lexemes.L333333 = lexemeData;
				const lexemeId = 'L333333';
				const expected = lexemeData;
				expect( store.getLexemeData( lexemeId ) ).toEqual( expected );
			} );
		} );

		describe( 'getLexemeFormData', () => {
			it( 'returns undefined if lexeme is not available', () => {
				const lexemeFormId = 'L333333-F5';
				const expected = undefined;
				expect( store.getLexemeFormData( lexemeFormId ) ).toEqual( expected );
			} );

			it( 'returns undefined if lexeme form is not available', () => {
				store.lexemes.L333333 = lexemeData;
				const lexemeFormId = 'L333333-F3';
				const expected = undefined;
				expect( store.getLexemeFormData( lexemeFormId ) ).toEqual( expected );
			} );

			it( 'returns lexeme form data if available', () => {
				store.lexemes.L333333 = lexemeData;
				const lexemeFormId = 'L333333-F5';
				const expected = lexemeData.forms[ 0 ];
				expect( store.getLexemeFormData( lexemeFormId ) ).toEqual( expected );
			} );
		} );

		describe( 'getLexemeLabelData', () => {
			it( 'returns undefined when lexeme ID is undefined', () => {
				const expected = undefined;
				expect( store.getLexemeLabelData( undefined ) ).toEqual( expected );
			} );

			it( 'returns lexeme ID as label when lexeme data is not available', () => {
				const lexemeId = 'L333333';
				const expected = new LabelData( lexemeId, lexemeId, null );
				expect( store.getLexemeLabelData( lexemeId ) ).toEqual( expected );
			} );

			it( 'returns lexeme label data when lexeme data is available', () => {
				const lexemeId = 'L333333';
				store.lexemes[ lexemeId ] = lexemeData;
				const expected = new LabelData( lexemeId, 'turtle', null, 'en' );
				expect( store.getLexemeLabelData( lexemeId ) ).toEqual( expected );
			} );
		} );

		describe( 'getLexemeFormLabelData', () => {
			it( 'returns undefined when lexeme form ID is undefined', () => {
				const expected = undefined;
				expect( store.getLexemeFormLabelData( undefined ) ).toEqual( expected );
			} );

			it( 'returns lexeme form ID as label when lexeme form data is not available', () => {
				const lexemeFormId = 'L333333-F5';
				const expected = new LabelData( lexemeFormId, lexemeFormId, null );
				expect( store.getLexemeFormLabelData( lexemeFormId ) ).toEqual( expected );
			} );

			it( 'returns lexeme form label data when lexeme form data is available', () => {
				const lexemeFormId = 'L333333-F5';
				store.lexemes.L333333 = lexemeData;
				const expected = new LabelData( lexemeFormId, 'turtled', null, 'en' );
				expect( store.getLexemeFormLabelData( lexemeFormId ) ).toEqual( expected );
			} );
		} );
	} );

	describe( 'Actions', () => {
		let fetchMock;

		describe( 'fetchLexemes', () => {
			beforeEach( () => {
				store.lexemes = {
					L111111: 'has data',
					L222222: new Promise( ( resolve ) => {
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

			it( 'exits early if lexeme ids are already fetched or in flight', () => {
				const lexemes = [
					'L111111', // Already fetched
					'L222222' // Request in flight
				];

				store.fetchLexemes( { ids: lexemes } );

				expect( fetchMock ).not.toHaveBeenCalled();
			} );

			it( 'calls wbgetentities API to fetch all unfetched lexemes', async () => {
				const lexemes = [
					'L111111', // Already fetched
					'L222222', // Request in flight
					'L333333',
					'L444444'
				];

				const expectedResponse = { entities: { L333333: 'this', L444444: 'that' } };
				fetchMock = jest.fn().mockResolvedValue( {
					json: jest.fn().mockReturnValue( expectedResponse )
				} );
				store.setLexemeData = jest.fn();
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;

				const params = 'origin=*&action=wbgetentities&format=json&formatversion=2&languages=en&languagefallback=true&ids=L333333%7CL444444';
				const expectedUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;

				const promise = store.fetchLexemes( { ids: lexemes } );

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl );

				// Save promises while request is in flight
				expect( store.setLexemeData ).toHaveBeenCalledWith( {
					id: 'L333333',
					data: promise
				} );
				expect( store.setLexemeData ).toHaveBeenCalledWith( {
					id: 'L444444',
					data: promise
				} );

				const response = await promise;

				// Save data when response arrives
				expect( store.setLexemeData ).toHaveBeenCalledWith( {
					id: 'L333333',
					data: 'this'
				} );
				expect( store.setLexemeData ).toHaveBeenCalledWith( {
					id: 'L444444',
					data: 'that'
				} );

				expect( response ).toEqual( expectedResponse );
			} );

			it( 'resets ids when API fails', async () => {
				store.items = {
					L111111: 'has data'
				};
				const items = [
					'L111111', // Already fetched
					'L333333',
					'L444444'
				];

				fetchMock = jest.fn().mockRejectedValue( 'some error' );
				store.setItemData = jest.fn();
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;

				const params = 'origin=*&action=wbgetentities&format=json&formatversion=2&languages=en&languagefallback=true&ids=L333333%7CL444444';
				const expectedUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;

				await store.fetchItems( { ids: items } );

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl );
				expect( store.items ).toEqual( { L111111: 'has data' } );
				expect( store.items ).toEqual( { L111111: 'has data' } );
			} );

			it( 'stores the resolving promise for fetching lexemes', async () => {
				const lexemes = [ 'L333333', 'L444444' ];
				const promise = store.fetchLexemes( { ids: lexemes } );

				expect( store.lexemes.L333333 ).toStrictEqual( promise );
				expect( store.lexemes.L444444 ).toStrictEqual( promise );

				await promise;
			} );

			it( 'removes lexeme IDs from state when fetch fails', async () => {
				store.lexemes = {
					L111111: 'has data'
				};
				const lexemes = [ 'L333333', 'L444444' ];

				fetchMock = jest.fn().mockRejectedValue( 'some error' );
				store.setLexemeData = jest.fn();
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;

				await store.fetchLexemes( { ids: lexemes } );

				expect( store.lexemes ).toEqual( { L111111: 'has data' } );
			} );
		} );
	} );
} );
