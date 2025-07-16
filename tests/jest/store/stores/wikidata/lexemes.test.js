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

const lexemeFormId = 'L333333-F5';
const lexemeData = {
	title: 'Lexeme:L333333',
	lemmas: {
		en: { language: 'en', value: 'turtle' }
	},
	forms: [ {
		id: lexemeFormId,
		representations: {
			fr: { language: 'fr', value: 'tortue' },
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
				const expected = undefined;
				expect( store.getLexemeFormData( lexemeFormId ) ).toEqual( expected );
			} );

			it( 'returns undefined if lexeme form is not available', () => {
				store.lexemes.L333333 = lexemeData;
				const expected = undefined;
				expect( store.getLexemeFormData( 'L333333-F3' ) ).toEqual( expected );
			} );

			it( 'returns lexeme form data if available', () => {
				store.lexemes.L333333 = lexemeData;
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
				const expected = new LabelData( lexemeFormId, lexemeFormId, null );
				expect( store.getLexemeFormLabelData( lexemeFormId ) ).toEqual( expected );
			} );

			it( 'returns lexeme form label data in user language when lexeme form data is available', () => {
				store.lexemes.L333333 = lexemeData;
				const expected = new LabelData( lexemeFormId, 'turtled', null, 'en' );
				expect( store.getLexemeFormLabelData( lexemeFormId ) ).toEqual( expected );
			} );

			it( 'returns lexeme form label data in fallback language if user language not present when lexeme form data is available', () => {
				Object.defineProperty( store, 'getUserLangCode', {
					value: 'de'
				} );
				store.lexemes.L333333 = lexemeData;
				const expected = new LabelData( lexemeFormId, 'tortue', null, 'fr' );
				expect( store.getLexemeFormLabelData( lexemeFormId ) ).toEqual( expected );
			} );

			it( 'returns lexeme form ID as label if no representations', () => {
				store.lexemes.L333333 = {
					forms: [ {
						id: lexemeFormId,
						representations: {}
					} ]
				};
				const expected = new LabelData( lexemeFormId, lexemeFormId, null );
				expect( store.getLexemeFormLabelData( lexemeFormId ) ).toEqual( expected );
			} );
		} );

		describe( 'getLexemeUrl', () => {
			it( 'returns undefined if id is not provided', () => {
				expect( store.getLexemeUrl( undefined ) ).toBeUndefined();
				expect( store.getLexemeUrl( '' ) ).toBeUndefined();
			} );
			it( 'returns correct URL for lexeme', () => {
				expect( store.getLexemeUrl( 'L333333' ) ).toContain( 'Lexeme:L333333' );
			} );
		} );

		describe( 'getLexemeFormUrl', () => {
			it( 'returns undefined if id is not provided', () => {
				expect( store.getLexemeFormUrl( undefined ) ).toBeUndefined();
				expect( store.getLexemeFormUrl( '' ) ).toBeUndefined();
			} );
			it( 'returns correct URL for lexeme form', () => {
				expect( store.getLexemeFormUrl( lexemeFormId ) ).toContain( 'Lexeme:L333333#F5' );
			} );
		} );

		describe( 'getLexemeDataAsync', () => {
			it( 'returns resolved promise if lexeme is cached', async () => {
				store.lexemes.L333333 = lexemeData;
				const result = await store.getLexemeDataAsync( 'L333333' );
				expect( result ).toEqual( lexemeData );
			} );

			it( 'returns in-flight promise if lexeme is being fetched', async () => {
				let resolveFn;
				const promise = new Promise( ( resolve ) => {
					resolveFn = resolve;
				} );
				store.lexemes.L333333 = promise;
				const resultPromise = store.getLexemeDataAsync( 'L333333' );
				expect( resultPromise ).toBe( promise );
				resolveFn( lexemeData );
				expect( resultPromise ).resolves.toEqual( lexemeData );
			} );

			it( 'returns rejected promise if lexeme is not present', async () => {
				expect( store.getLexemeDataAsync( 'L_NOT_PRESENT' ) ).rejects.toThrow( 'Lexeme L_NOT_PRESENT not found' );
			} );
		} );
	} );

	describe( 'Actions', () => {
		let fetchMock;

		describe( 'setLexemeData', () => {
			it( 'stores a promise directly if data is a promise', () => {
				const promise = Promise.resolve( 'foo' );
				store.setLexemeData( { id: 'L999999', data: promise } );
				expect( store.lexemes.L999999 ).toBe( promise );
			} );
			it( 'unwraps and stores only title, forms, and lemmas if data is an object', () => {
				const data = { title: 'Lexeme:L999999', forms: [], lemmas: {}, extra: 'should not be stored' };
				store.setLexemeData( { id: 'L999999', data } );
				expect( store.lexemes.L999999 ).toEqual( { title: 'Lexeme:L999999', forms: [], lemmas: {} } );
				expect( store.lexemes.L999999.extra ).toBeUndefined();
			} );
		} );
		describe( 'resetLexemeData', () => {
			it( 'removes lexeme data for given IDs', () => {
				store.lexemes = { L1: 'foo', L2: 'bar', L3: 'baz' };
				store.resetLexemeData( { ids: [ 'L1', 'L3' ] } );
				expect( store.lexemes ).toEqual( { L2: 'bar' } );
			} );
		} );

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

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl, undefined );

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

			it( 'stores the resolving promise for fetching lexemes', async () => {
				const lexemes = [ 'L333333', 'L444444' ];
				const promise = store.fetchLexemes( { ids: lexemes } );

				expect( store.lexemes.L333333 ).toStrictEqual( promise );
				expect( store.lexemes.L444444 ).toStrictEqual( promise );

				await promise;
			} );

			it( 'resets ids when API fails', async () => {
				store.lexemes = {
					L111111: 'has data'
				};
				const lexemes = [
					'L111111', // Already fetched
					'L333333',
					'L444444'
				];

				fetchMock = jest.fn().mockRejectedValue( 'some error' );
				store.setLexemeData = jest.fn();
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;

				const params = 'origin=*&action=wbgetentities&format=json&formatversion=2&languages=en&languagefallback=true&ids=L333333%7CL444444';
				const expectedUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;

				await store.fetchLexemes( { ids: lexemes } );

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl, undefined );
				expect( store.lexemes ).toEqual( { L111111: 'has data' } );
			} );

			it( 'removes lexeme IDs and returns data when API returns error', async () => {
				const lexemes = [ 'L333333', 'L444444' ];
				const errorResponse = { error: 'Some error' };
				fetchMock = jest.fn().mockResolvedValue( {
					json: jest.fn().mockReturnValue( errorResponse )
				} );
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;
				store.setLexemeData = jest.fn();
				store.resetLexemeData = jest.fn();

				await store.fetchLexemes( { ids: lexemes } );

				expect( store.resetLexemeData ).toHaveBeenCalledWith( { ids: [ 'L333333', 'L444444' ] } );
			} );

			it( 'removes a single lexeme ID when entity is missing in API response', async () => {
				const lexemes = [ 'L333333', 'L444444' ];
				const apiResponse = {
					entities: {
						L333333: { missing: '' }, // Simulate missing entity
						L444444: { title: 'Lexeme:L444444', forms: [], lemmas: {} }
					}
				};
				fetchMock = jest.fn().mockResolvedValue( {
					json: jest.fn().mockReturnValue( apiResponse )
				} );
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;
				store.setLexemeData = jest.fn();
				store.resetLexemeData = jest.fn();

				await store.fetchLexemes( { ids: lexemes } );

				expect( store.resetLexemeData ).toHaveBeenCalledWith( { ids: [ 'L333333' ] } );
				expect( store.setLexemeData ).toHaveBeenCalledWith( {
					id: 'L444444',
					data: { title: 'Lexeme:L444444', forms: [], lemmas: {} }
				} );
			} );
		} );
	} );
} );
