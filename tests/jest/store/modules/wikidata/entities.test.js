/*!
 * WikiLambda unit test suite for the Wikidata entities Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const
	zobjectToRows = require( '../../../helpers/zObjectTableHelpers.js' ).zobjectToRows,
	entitiesModule = require( '../../../../../resources/ext.wikilambda.app/store/modules/wikidata/entities.js' ),
	zobjectModule = require( '../../../../../resources/ext.wikilambda.app/store/modules/zobject.js' );

describe( 'Wikidata Entities Vuex module', () => {
	let state, getters;

	describe( 'Getters', () => {
		describe( 'isWikidataEntity', () => {
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
				expect( entitiesModule.getters.isWikidataEntity( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns false when row is not found', () => {
				const rowId = 100;
				const expected = false;
				expect( entitiesModule.getters.isWikidataEntity( state, getters )( rowId ) )
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
				expect( entitiesModule.getters.isWikidataEntity( state, getters )( rowId ) )
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
				expect( entitiesModule.getters.isWikidataEntity( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns true when function call is to a wikidata fetch function', () => {
				state.zobject = zobjectToRows( {
					Z2K2: { // rowId = 1
						Z1K1: 'Z7',
						Z7K1: 'Z6825',
						Z6825K1: 'L333333'
					}
				} );
				const rowId = 1;
				const expected = true;
				expect( entitiesModule.getters.isWikidataEntity( state, getters )( rowId ) )
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
						Z6005K1: 'L333333'
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
	} );
} );
