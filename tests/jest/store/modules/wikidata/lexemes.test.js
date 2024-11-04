/*!
 * WikiLambda unit test suite for the Wikidata lexemes Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const
	zobjectToRows = require( '../../../helpers/zObjectTableHelpers.js' ).zobjectToRows,
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	lexemesModule = require( '../../../../../resources/ext.wikilambda.app/store/modules/wikidata/lexemes.js' ),
	zobjectModule = require( '../../../../../resources/ext.wikilambda.app/store/modules/zobject.js' );

const lexemeData = {
	title: 'Lexeme:L333333',
	lemmas: {
		en: { language: 'en', value: 'turtle' }
	}
};

describe( 'Wikidata Lexemes Vuex module', () => {
	let state, getters;

	describe( 'Getters', () => {
		describe( 'getLexemeIdRow', () => {
			beforeEach( () => {
				state = {
					zobject: []
				};
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZFunctionCallArguments = zobjectModule.getters.getZFunctionCallArguments( state, getters );
				getters.getZFunctionCallFunctionId = zobjectModule.getters.getZFunctionCallFunctionId( state, getters );
				getters.getZObjectAsJsonById = zobjectModule.getters.getZObjectAsJsonById( state, getters );
				getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
			} );

			it( 'returns undefined when row is undefined', () => {
				const rowId = undefined;
				const expected = undefined;
				expect( lexemesModule.getters.getLexemeIdRow( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when row is not found', () => {
				const rowId = 100;
				const expected = undefined;
				expect( lexemesModule.getters.getLexemeIdRow( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when row belongs to something other than a function call', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z11',
						Z11K1: 'Z1002',
						Z11K2: 'not a function call'
					}
				} );
				const rowId = 1;
				const expected = undefined;
				expect( lexemesModule.getters.getLexemeIdRow( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when function call is not to a wikidata fetch function', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z801',
						Z801K1: 'some function call'
					}
				} );
				const rowId = 1;
				const expected = undefined;
				expect( lexemesModule.getters.getLexemeIdRow( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns wikidata reference lexeme Id row when inside fetch function call', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z6825',
						Z6825K1: { // rowId = 8
							Z1K1: 'Z6095',
							Z6095K1: 'L333333' // rowId = 12
						}
					}
				} );
				const rowId = 1;
				const expected = { id: 12, key: 'Z6095K1', parent: 8, value: Constants.ROW_VALUE_OBJECT };
				expect( lexemesModule.getters.getLexemeIdRow( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns wikidata reference lexeme Id row', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z6095',
						Z6095K1: 'L333333' // rowId = 5
					}
				} );
				const rowId = 1;
				const expected = { id: 5, key: 'Z6095K1', parent: 1, value: Constants.ROW_VALUE_OBJECT };
				expect( lexemesModule.getters.getLexemeIdRow( state, getters )( rowId ) )
					.toEqual( expected );
			} );
		} );

		describe( 'getLexemeData', () => {
			beforeEach( () => {
				state = {
					lexemes: {}
				};
			} );

			it( 'returns undefined if lexeme id not available', () => {
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

		describe( 'lookupLexemes', () => {
			beforeEach( () => {
				fetchMock = jest.fn().mockResolvedValue( {
					json: jest.fn().mockReturnValue( 'some response' )
				} );
				// eslint-disable-next-line n/no-unsupported-features/node-builtins
				global.fetch = fetchMock;
				context.getters = {
					getUserLangCode: 'en'
				};
			} );

			it( 'calls wbsearchentities API', async () => {
				const searchTerm = 'turtle';
				const params = `origin=*&action=wbsearchentities&format=json&language=en&uselang=en&search=${
					searchTerm }&type=lexeme&limit=10&props=url`;
				const getUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;

				const response = await lexemesModule.actions.lookupLexemes( context, searchTerm );

				expect( fetchMock ).toHaveBeenCalledWith( getUrl );
				expect( response ).toBe( 'some response' );
			} );
		} );

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
