/*!
 * WikiLambda unit test suite for the Wikidata entities Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const
	zobjectToRows = require( '../../../helpers/zObjectTableHelpers.js' ).zobjectToRows,
	Constants = require( '../../../../../resources/ext.wikilambda.app/Constants.js' ),
	entitiesModule = require( '../../../../../resources/ext.wikilambda.app/store/modules/wikidata/entities.js' ),
	zobjectModule = require( '../../../../../resources/ext.wikilambda.app/store/modules/zobject.js' );

describe( 'Wikidata Entities Vuex module', () => {
	let state, getters;

	describe( 'Getters', () => {
		describe( 'isWikidataLiteral', () => {
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

			it( 'returns false when row is undefined', () => {
				const rowId = undefined;
				const expected = false;
				expect( entitiesModule.getters.isWikidataLiteral( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns false when row is not found', () => {
				const rowId = 100;
				const expected = false;
				expect( entitiesModule.getters.isWikidataLiteral( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns false when object is not a wikidata reference type', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z11',
						Z11K1: 'Z1002',
						Z11K2: 'not a function call'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( entitiesModule.getters.isWikidataLiteral( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns false when object is a wikidata entity represented by a fetch function call', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z6825',
						Z6825K1: 'L333333'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( entitiesModule.getters.isWikidataLiteral( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns false when object is a wikidata reference type', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z6095',
						Z6095K1: 'L333333'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( entitiesModule.getters.isWikidataLiteral( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns true when object is a wikidata literal', () => {
				state.zobject = zobjectToRows( {
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
				expect( entitiesModule.getters.isWikidataLiteral( state, getters )( rowId ) )
					.toEqual( expected );
			} );
		} );

		describe( 'isWikidataFetch', () => {
			beforeEach( () => {
				state = {
					zobject: []
				};
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZFunctionCallFunctionId = zobjectModule.getters.getZFunctionCallFunctionId( state, getters );
			} );

			it( 'returns false when row is undefined', () => {
				const rowId = undefined;
				const expected = false;
				expect( entitiesModule.getters.isWikidataFetch( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns false when row is not found', () => {
				const rowId = 100;
				const expected = false;
				expect( entitiesModule.getters.isWikidataFetch( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns false when row belongs to something other than a function call', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z11',
						Z11K1: 'Z1002',
						Z11K2: 'not a function call'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( entitiesModule.getters.isWikidataFetch( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns false when function call is not to a wikidata fetch function', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z801',
						Z801K1: 'some function call'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( entitiesModule.getters.isWikidataFetch( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns true when function call is to a wikidata fetch function', () => {
				state.zobject = zobjectToRows( {
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
				expect( entitiesModule.getters.isWikidataFetch( state, getters )( rowId ) )
					.toEqual( expected );
			} );
		} );

		describe( 'isWikidataReference', () => {
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

			it( 'returns false when row is undefined', () => {
				const rowId = undefined;
				const expected = false;
				expect( entitiesModule.getters.isWikidataReference( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns false when row is not found', () => {
				const rowId = 100;
				const expected = false;
				expect( entitiesModule.getters.isWikidataReference( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns false when object is not a wikidata reference type', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z11',
						Z11K1: 'Z1002',
						Z11K2: 'not a function call'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( entitiesModule.getters.isWikidataReference( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns false when object is a wikidata entity represented by a fetch function call', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z6825',
						Z6825K1: 'L333333'
					}
				} );
				const rowId = 1;
				const expected = false;
				expect( entitiesModule.getters.isWikidataReference( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns false when object is a wikidata literal', () => {
				state.zobject = zobjectToRows( {
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
				expect( entitiesModule.getters.isWikidataReference( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns true when object is a wikidata reference type', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z6095',
						Z6095K1: 'L333333'
					}
				} );
				const rowId = 1;
				const expected = true;
				expect( entitiesModule.getters.isWikidataReference( state, getters )( rowId ) )
					.toEqual( expected );
			} );
		} );

		describe( 'getWikidataEntityIdRow', () => {
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
				const wikidataType = 'Z6005';
				const expected = undefined;
				expect( entitiesModule.getters.getWikidataEntityIdRow( state, getters )( rowId, wikidataType ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when row is not found', () => {
				const rowId = 100;
				const wikidataType = 'Z6005';
				const expected = undefined;
				expect( entitiesModule.getters.getWikidataEntityIdRow( state, getters )( rowId, wikidataType ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when object is not a wikidata entity', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z11',
						Z11K1: 'Z1002',
						Z11K2: 'not a function call'
					}
				} );
				const rowId = 1;
				const wikidataType = 'Z6005';
				const expected = undefined;
				expect( entitiesModule.getters.getWikidataEntityIdRow( state, getters )( rowId, wikidataType ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when object is a function call to a different function', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z801',
						Z801K1: 'L333333'
					}
				} );
				const rowId = 1;
				const wikidataType = 'Z6005';
				const expected = undefined;
				expect( entitiesModule.getters.getWikidataEntityIdRow( state, getters )( rowId, wikidataType ) )
					.toEqual( expected );
			} );

			it( 'returns identity row when object is a wikidata literal', () => {
				state.zobject = zobjectToRows( {
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
				const referenceRow = entitiesModule.getters.getWikidataEntityIdRow( state, getters )( rowId, wikidataType );
				expect( referenceRow.key ).toBe( expectedKey );
			} );

			it( 'returns identity row when object is a wikidata reference', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z6095',
						Z6095K1: 'L333333' // rowId = 9
					}
				} );
				const rowId = 1;
				const wikidataType = 'Z6005';
				const expectedKey = 'Z6095K1';
				const referenceRow = entitiesModule.getters.getWikidataEntityIdRow( state, getters )( rowId, wikidataType );
				expect( referenceRow.key ).toBe( expectedKey );
			} );

			it( 'returns identity row when object is a wikidata fetch function call', () => {
				state.zobject = zobjectToRows( {
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
				const referenceRow = entitiesModule.getters.getWikidataEntityIdRow( state, getters )( rowId, wikidataType );
				expect( referenceRow.key ).toBe( expectedKey );
			} );
		} );
	} );

	describe( 'Actions', () => {
		const context = {};
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
				context.getters = {
					getUserLangCode: 'en'
				};
			} );

			it( 'calls wbsearchentities API for lexemes', async () => {
				const request = {
					type: 'lexeme',
					search: 'turtle'
				};
				const response = await entitiesModule.actions.lookupWikidataEntities( context, request );
				expect( response ).toEqual( responseValue );

				const params = `origin=*&action=wbsearchentities&format=json&language=en&uselang=en&search=${
					request.search }&type=${ request.type }&limit=10&props=url`;
				const getUrl = `${ Constants.WIKIDATA_BASE_URL }/w/api.php?${ params }`;
				expect( fetchMock ).toHaveBeenCalledWith( getUrl );
			} );
		} );
	} );
} );
