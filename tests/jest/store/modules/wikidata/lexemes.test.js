/*!
 * WikiLambda unit test suite for the Wikidata lexemes Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	lexemesModule = require( '../../../../../resources/ext.wikilambda.app/store/modules/wikidata/lexemes.js' );

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

describe( 'Wikidata Lexemes Vuex module', () => {
	let state, getters;

	describe( 'Getters', () => {
		describe( 'getLexemeIdRow', () => {
			beforeEach( () => {
				getters = {
					getWikidataEntityIdRow: jest.fn()
				};
			} );

			it( 'calls getWikidataEntityIdRow for lexemes', () => {
				lexemesModule.getters.getLexemeIdRow( state, getters )( 10 );
				expect( getters.getWikidataEntityIdRow ).toHaveBeenCalledWith( 10, Constants.Z_WIKIDATA_LEXEME );
			} );
		} );

		describe( 'getLexemeFormIdRow', () => {
			beforeEach( () => {
				getters = {
					getWikidataEntityIdRow: jest.fn()
				};
			} );

			it( 'calls getWikidataEntityIdRow for lexeme forms', () => {
				lexemesModule.getters.getLexemeFormIdRow( state, getters )( 10 );
				expect( getters.getWikidataEntityIdRow ).toHaveBeenCalledWith( 10, Constants.Z_WIKIDATA_LEXEME_FORM );
			} );
		} );

		describe( 'getLexemeData', () => {
			beforeEach( () => {
				state = {
					lexemes: {}
				};
			} );

			it( 'returns undefined if lexeme is not available', () => {
				const lexemeId = 'L333333';
				const expected = undefined;
				expect( lexemesModule.getters.getLexemeData( state )( lexemeId ) )
					.toEqual( expected );
			} );

			it( 'returns lexeme data if available', () => {
				state.lexemes.L333333 = lexemeData;
				const lexemeId = 'L333333';
				const expected = lexemeData;
				expect( lexemesModule.getters.getLexemeData( state )( lexemeId ) )
					.toEqual( expected );
			} );
		} );

		describe( 'getLexemeFormData', () => {
			beforeEach( () => {
				state = {
					lexemes: {}
				};
			} );

			it( 'returns undefined if lexeme is not available', () => {
				const lexemeFormId = 'L333333-F5';
				const expected = undefined;
				expect( lexemesModule.getters.getLexemeFormData( state )( lexemeFormId ) )
					.toEqual( expected );
			} );

			it( 'returns undefined if lexeme form is not available', () => {
				state.lexemes.L333333 = lexemeData;
				const lexemeFormId = 'L333333-F3';
				const expected = undefined;
				expect( lexemesModule.getters.getLexemeFormData( state )( lexemeFormId ) )
					.toEqual( expected );
			} );

			it( 'returns lexeme form data if available', () => {
				state.lexemes.L333333 = lexemeData;
				const lexemeFormId = 'L333333-F5';
				const expected = lexemeData.forms[ 0 ];
				expect( lexemesModule.getters.getLexemeFormData( state )( lexemeFormId ) )
					.toEqual( expected );
			} );
		} );
	} );

	describe( 'Mutations', () => {
		beforeEach( () => {
			state = {
				lexemes: {}
			};
		} );

		describe( 'setLexemeData', () => {
			it( 'sets lexeme data for a given lexeme Id', () => {
				const payload = {
					id: 'L333333',
					data: lexemeData
				};
				lexemesModule.mutations.setLexemeData( state, payload );
				expect( state.lexemes.L333333 ).toEqual( lexemeData );
			} );
		} );
	} );

	describe( 'Actions', () => {
		const context = {};
		let fetchMock;

		describe( 'fetchLexemes', () => {
			beforeEach( () => {
				state = {
					lexemes: {
						L111111: 'has data',
						L222222: new Promise( ( resolve ) => {
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
					getLexemeData: lexemesModule.getters.getLexemeData( state )
				};
				context.commit = jest.fn();
			} );

			it( 'exits early if lexeme ids are already fetched or in flight', () => {
				const lexemes = [
					'L111111', // Already fetched
					'L222222' // Request in flight
				];

				lexemesModule.actions.fetchLexemes( context, { ids: lexemes } );

				expect( context.commit ).not.toHaveBeenCalled();
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
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;

				const params = 'origin=*&action=wbgetentities&format=json&languages=en&languagefallback=true&ids=L333333%7CL444444';
				const expectedUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;

				const promise = lexemesModule.actions.fetchLexemes( context, { ids: lexemes } );

				expect( fetchMock ).toHaveBeenCalledWith( expectedUrl );

				// Save promises while request is in flight
				expect( context.commit ).toHaveBeenCalledWith( 'setLexemeData', {
					id: 'L333333',
					data: promise
				} );
				expect( context.commit ).toHaveBeenCalledWith( 'setLexemeData', {
					id: 'L444444',
					data: promise
				} );

				const response = await promise;

				// Save data when response arrives
				expect( context.commit ).toHaveBeenCalledWith( 'setLexemeData', {
					id: 'L333333',
					data: 'this'
				} );
				expect( context.commit ).toHaveBeenCalledWith( 'setLexemeData', {
					id: 'L444444',
					data: 'that'
				} );

				expect( response ).toEqual( expectedResponse );
			} );
		} );
	} );
} );
