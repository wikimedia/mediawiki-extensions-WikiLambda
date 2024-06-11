/*!
 * WikiLambda unit test suite for the functionEditor Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const zobjectToRows = require( '../../helpers/zObjectTableHelpers.js' ).zobjectToRows,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	zobjectModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobject.js' ),
	zfunctionModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zfunction.js' );

describe( 'zfunction Vuex module', () => {
	let getters, context;

	describe( 'Getters', () => {
		describe( 'getZFunctionInputs', () => {
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
			} );

			it( 'returns empty list when row is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = [];
				expect( zfunctionModule.getters.getZFunctionInputs( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns empty list when row does not exist', () => {
				state.zobject = [];
				const rowId = 1;
				const expected = [];
				expect( zfunctionModule.getters.getZFunctionInputs( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns empty array when no inputs', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17' ] } } );
				const rowId = 0;
				const inputs = zfunctionModule.getters.getZFunctionInputs( state, getters )( rowId );
				expect( inputs ).toHaveLength( 0 );
			} );

			it( 'returns one function input row', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const rowId = 0;
				const inputs = zfunctionModule.getters.getZFunctionInputs( state, getters )( rowId );
				expect( inputs ).toHaveLength( 1 );
				expect( inputs[ 0 ].key ).toEqual( '1' );
			} );

			it( 'returns two function input rows', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const rowId = 0;
				const inputs = zfunctionModule.getters.getZFunctionInputs( state, getters )( rowId );
				expect( inputs ).toHaveLength( 2 );
				expect( inputs[ 0 ].key ).toEqual( '1' );
				expect( inputs[ 1 ].key ).toEqual( '2' );
			} );
		} );

		describe( 'getZFunctionInputLangs', () => {
			beforeEach( () => {
				getters = {};
				/* From zObject module */
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZMonolingualLangValue = zobjectModule.getters.getZMonolingualLangValue( state, getters );
				getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZMultilingualLanguageList = zobjectModule.getters.getZMultilingualLanguageList(
					state, getters );
				/* From library module */
				getters.getLanguageIsoCodeOfZLang = ( key ) => ( key === 'Z1002' ? 'en' : 'es' );
				/* From zFunction module */
				getters.getZFunctionInputs = zfunctionModule.getters.getZFunctionInputs( state, getters );
			} );

			it( 'returns empty array when row is not found', () => {
				state.zobject = [];
				const rowId = 0;
				const expected = [];
				const current = zfunctionModule.getters.getZFunctionInputLangs( state, getters )( rowId );
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns empty array when function has no inputs', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17' ] } } );
				const expected = [];
				const current = zfunctionModule.getters.getZFunctionInputLangs( state, getters )();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns empty array when function inputs have no label key', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1' },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2' }
				] } } );
				const expected = [];
				const current = zfunctionModule.getters.getZFunctionInputLangs( state, getters )();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns empty array when function inputs have no labels', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const expected = [];
				const current = zfunctionModule.getters.getZFunctionInputLangs( state, getters )();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns array with one language', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' }
					] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input two' }
					] } }
				] } } );
				const expected = [
					{ langZid: 'Z1002', langIsoCode: 'en', rowId: 24 },
					{ langZid: 'Z1002', langIsoCode: 'en', rowId: 52 }
				];
				const current = zfunctionModule.getters.getZFunctionInputLangs( state, getters )();
				expect( current ).toStrictEqual( expected );
			} );

			it( 'returns array with two languages', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' },
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'primer argumento' }
					] } },
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );
				const expected = [
					{ langZid: 'Z1002', langIsoCode: 'en', rowId: 24 },
					{ langZid: 'Z1003', langIsoCode: 'es', rowId: 34 }
				];
				const current = zfunctionModule.getters.getZFunctionInputLangs( state, getters )();
				expect( current ).toStrictEqual( expected );
			} );
		} );

		describe( 'getZFunctionOutput', () => {
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
			} );

			it( 'returns undefined when row is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				expect( zfunctionModule.getters.getZFunctionOutput( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				state.zobject = [];
				const rowId = 1;
				const expected = undefined;
				expect( zfunctionModule.getters.getZFunctionOutput( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns output row', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K2: 'Z6' } } );
				const rowId = 0;
				const expected = { id: 2, key: 'Z8K2', parent: 1, value: Constants.ROW_VALUE_OBJECT };
				expect( zfunctionModule.getters.getZFunctionOutput( state, getters )( rowId ) )
					.toEqual( expected );
			} );
		} );

		describe( 'getZFunctionIdentity', () => {
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
			} );

			it( 'returns undefined when row is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const current = zfunctionModule.getters.getZFunctionIdentity( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const current = zfunctionModule.getters.getZFunctionIdentity( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns function identity string representation', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K5: 'Z12345' } } );
				const rowId = 0;
				const expected = 'Z12345';
				const current = zfunctionModule.getters.getZFunctionIdentity( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );
		} );

		describe( 'getZArgumentTypeRowId', () => {
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
			} );

			it( 'returns undefined when row is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const current = zfunctionModule.getters.getZArgumentTypeRowId( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const current = zfunctionModule.getters.getZArgumentTypeRowId( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns argument type row Id given the argument row Id', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					/* Arg 1: rowId 6, type is rowId 10 */
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					/* Arg 2: rowId 24, type is rowId 28 */
					{ Z1K1: 'Z17', Z17K1: 'Z40', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );

				expect( zfunctionModule.getters.getZArgumentTypeRowId( state, getters )( 6 ) )
					.toEqual( 10 );
				expect( zfunctionModule.getters.getZArgumentTypeRowId( state, getters )( 24 ) )
					.toEqual( 28 );
			} );
		} );

		describe( 'getZArgumentKey', () => {
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( state, getters );
			} );

			it( 'returns undefined when row is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const current = zfunctionModule.getters.getZArgumentKey( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when row is not found', () => {
				state.zobject = [];
				const rowId = 100;
				const expected = undefined;
				const current = zfunctionModule.getters.getZArgumentKey( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns argument key given the argument row Id', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					/* Arg 1: rowId 6, type is rowId 10 */
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
					/* Arg 2: rowId 24, type is rowId 28 */
					{ Z1K1: 'Z17', Z17K1: 'Z40', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } }
				] } } );

				expect( zfunctionModule.getters.getZArgumentKey( state, getters )( 6 ) )
					.toEqual( 'Z12345K1' );
				expect( zfunctionModule.getters.getZArgumentKey( state, getters )( 24 ) )
					.toEqual( 'Z12345K2' );
			} );
		} );

		describe( 'getZArgumentLabelForLanguage', () => {
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
				getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( state, getters );
				getters.getZMonolingualLangValue = zobjectModule.getters.getZMonolingualLangValue( state, getters );
			} );

			it( 'returns undefined when row is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const current = zfunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const current = zfunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( rowId );
				expect( current ).toEqual( expected );
			} );

			it( 'returns undefined when the language is not available', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					/* Arg 1: rowId 6 */
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' }
					] } }
				] } } );

				// First argument in an unavailable language
				expect( zfunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( 6, 'Z1003' ) )
					.toEqual( undefined );
			} );

			it( 'returns label given argument rowId and language Zid', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					/* Arg 1: rowId 6 */
					{ Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z12345K1', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input one' },
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'primer argumento' }
					] } },
					/* Arg 2: rowId 44 */
					{ Z1K1: 'Z17', Z17K1: 'Z40', Z17K2: 'Z12345K2', Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11',
						{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'input two' },
						{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'segundo argumento' }
					] } }
				] } } );

				let row;

				// First argument in English
				row = zfunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( 6, 'Z1002' );
				expect( row.id ).toEqual( 24 );
				expect( zobjectModule.getters.getZMonolingualTextValue( state, getters )( row.id ) )
					.toEqual( 'input one' );

				// First argument in Spanish
				row = zfunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( 6, 'Z1003' );
				expect( row.id ).toEqual( 34 );
				expect( zobjectModule.getters.getZMonolingualTextValue( state, getters )( row.id ) )
					.toEqual( 'primer argumento' );

				// Second argument in English
				row = zfunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( 44, 'Z1002' );
				expect( row.id ).toEqual( 62 );
				expect( zobjectModule.getters.getZMonolingualTextValue( state, getters )( row.id ) )
					.toEqual( 'input two' );

				// Second argument in Spanish
				row = zfunctionModule.getters.getZArgumentLabelForLanguage( state, getters )( 44, 'Z1003' );
				expect( row.id ).toEqual( 72 );
				expect( zobjectModule.getters.getZMonolingualTextValue( state, getters )( row.id ) )
					.toEqual( 'segundo argumento' );
			} );
		} );

		describe( 'getConnectedTests and getConnectedImplementations', () => {
			beforeEach( () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z2',
					Z2K2: {
						Z1K1: 'Z8',
						Z8K1: [ 'Z17' ],
						Z8K2: 'Z6',
						Z8K3: [ 'Z20', 'Z10002', 'Z10003' ],
						Z8K4: [ 'Z14', 'Z10004', 'Z10005' ]
					}
				} );
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
			} );
			it( 'return attached tests', () => {
				expect( zfunctionModule.getters.getConnectedTests( state, getters )( 0 ) )
					.toEqual( [ 'Z10002', 'Z10003' ] );
			} );
			it( 'return attached implementations', () => {
				expect( zfunctionModule.getters.getConnectedImplementations( state, getters )( 0 ) )
					.toEqual( [ 'Z10004', 'Z10005' ] );
			} );
			it( 'returns empty array if test and implementations rows are not found', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z2',
					Z2K2: {
						Z1K1: 'Z8',
						Z8K1: [ 'Z17' ],
						Z8K2: 'Z6'
					}
				} );
				expect( zfunctionModule.getters.getConnectedTests( state, getters )( 0 ) )
					.toEqual( [] );
				expect( zfunctionModule.getters.getConnectedImplementations( state, getters )( 0 ) )
					.toEqual( [] );
			} );
		} );

		describe( 'getInvalidOutputFields', () => {
			beforeEach( () => {
				state = { zobject: [] };
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state, getters );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );

				getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
				getters.getZFunctionCallFunctionId = zobjectModule.getters.getZFunctionCallFunctionId( state, getters );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZFunctionCallArguments = zobjectModule.getters.getZFunctionCallArguments( state, getters );
				getters.getZObjectAsJsonById = zobjectModule.getters.getZObjectAsJsonById( state, getters );
				getters.validateGenericType = zobjectModule.getters.validateGenericType( state, getters );

				getters.getZFunctionOutput = zfunctionModule.getters.getZFunctionOutput( state, getters );
			} );

			it( 'returns empty array when output is filled reference', () => {
				state.zobject = zobjectToRows( { Z2K2: {
					Z8K2: 'Z6'
				} } );

				const invalidOutput = zfunctionModule.getters.getInvalidOutputFields( state, getters );
				const expected = [];
				expect( invalidOutput ).toEqual( expected );
			} );

			it( 'returns empty array when output is filled function call', () => {
				state.zobject = zobjectToRows( { Z2K2: {
					Z8K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z881',
						Z881K1: 'Z6'
					}
				} } );

				const invalidOutput = zfunctionModule.getters.getInvalidOutputFields( state, getters );
				const expected = [];
				expect( invalidOutput ).toEqual( expected );
			} );

			it( 'returns empty array when output is filled nested function call', () => {
				state.zobject = zobjectToRows( { Z2K2: {
					Z8K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z882',
						Z882K1: 'Z6',
						Z882K2: {
							Z1K1: 'Z7',
							Z7K1: 'Z881',
							Z881K1: 'Z6'
						}
					}
				} } );

				const invalidOutput = zfunctionModule.getters.getInvalidOutputFields( state, getters );
				const expected = [];
				expect( invalidOutput ).toEqual( expected );
			} );

			it( 'returns error when output is empty reference', () => {
				state.zobject = zobjectToRows( { Z2K2: {
					Z8K2: '' // rowId 2
				} } );

				const invalidOutput = zfunctionModule.getters.getInvalidOutputFields( state, getters );
				const expected = [ 2 ];
				expect( invalidOutput ).toEqual( expected );
			} );

			it( 'returns error when output is empty function call', () => {
				state.zobject = zobjectToRows( { Z2K2: {
					Z8K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z881',
						Z881K1: '' // rowId 9
					}
				} } );

				const invalidOutput = zfunctionModule.getters.getInvalidOutputFields( state, getters );
				const expected = [ 9 ];
				expect( invalidOutput ).toEqual( expected );
			} );

			it( 'returns all errors when output is empty nested function call', () => {
				state.zobject = zobjectToRows( { Z2K2: {
					Z8K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z882',
						Z882K1: '', // rowId 9
						Z882K2: {
							Z1K1: 'Z7',
							Z7K1: 'Z881',
							Z881K1: '' // rowId 19
						}
					}
				} } );

				const invalidOutput = zfunctionModule.getters.getInvalidOutputFields( state, getters );
				const expected = [ 9, 19 ];
				expect( invalidOutput ).toEqual( expected );
			} );
		} );

		describe( 'getInvalidInputFields', () => {
			beforeEach( () => {
				state = { zobject: [] };
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state, getters );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );

				getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
				getters.getZFunctionCallFunctionId = zobjectModule.getters.getZFunctionCallFunctionId( state, getters );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZFunctionCallArguments = zobjectModule.getters.getZFunctionCallArguments( state, getters );
				getters.validateGenericType = zobjectModule.getters.validateGenericType( state, getters );

				getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( state, getters );
				getters.getZMonolingualTextValue = zobjectModule.getters.getZMonolingualTextValue( state, getters );
				getters.getZFunctionInputs = zfunctionModule.getters.getZFunctionInputs( state, getters );
			} );

			it( 'returns empty array when no inputs', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17' ] } } );

				const invalidInputs = zfunctionModule.getters.getInvalidInputFields( state, getters );
				expect( invalidInputs.length ).toEqual( 0 );
			} );

			it( 'returns empty array when all inputs have set type', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{
						Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K1',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					},
					{
						Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K2',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ] }
					}
				] } } );

				const invalidInputs = zfunctionModule.getters.getInvalidInputFields( state, getters );
				expect( invalidInputs.length ).toEqual( 0 );
			} );

			it( 'returns empty array when inputs have no type and no label', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K1',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					},
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K2',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					}
				] } } );

				const invalidInputs = zfunctionModule.getters.getInvalidInputFields( state, getters );
				expect( invalidInputs.length ).toEqual( 0 );
			} );

			it( 'returns input with empty type but non empty label', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K1',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ] }
					},
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K2',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					}
				] } } );

				const invalidInputs = zfunctionModule.getters.getInvalidInputFields( state, getters );
				// Expect first input to be invalid
				const expected = [ 10 ];
				expect( invalidInputs ).toEqual( expected );
			} );

			it( 'returns all inputs with empty type but non empty label', () => {
				state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17',
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K1',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'first' } ] }
					},
					{
						Z1K1: 'Z17', Z17K1: '', Z17K2: 'Z999K2',
						Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'segunda' } ] }
					}
				] } } );

				const invalidInputs = zfunctionModule.getters.getInvalidInputFields( state, getters );
				// Expect first and second inputs to be invalid
				const expected = [ 10, 38 ];
				expect( invalidInputs ).toEqual( expected );
			} );
		} );
	} );

	describe( 'Actions', () => {
		context = {};

		describe( 'Connect and disconnect tests and implementations', () => {
			beforeEach( () => {
				// State
				const initialFunction = {
					Z1K1: 'Z2',
					Z2K2: {
						Z1K1: 'Z8',
						Z8K1: [ 'Z17' ],
						Z8K2: 'Z6',
						Z8K3: [ 'Z20', 'Z10002', 'Z10003' ],
						Z8K4: [ 'Z14', 'Z10004', 'Z10005' ]
					}
				};
				context.state = {
					zobject: zobjectToRows( initialFunction ),
					errors: {}
				};
				context.rootState = {
					zobjectModule: context.state
				};

				// Getters
				context.getters = {};
				Object.keys( zobjectModule.getters ).forEach( ( key ) => {
					context.getters[ key ] =
						zobjectModule.getters[ key ](
							context.state, context.getters,
							{ zobjectModule: context.state },
							context.getters );
				} );

				// Mutations
				context.commit = jest.fn( ( mutationType, payload ) => {
					if ( mutationType in zobjectModule.mutations ) {
						zobjectModule.mutations[ mutationType ]( context.state, payload );
					}
				} );

				// Actions
				context.dispatch = jest.fn( ( actionType, payload ) => {
					let result;
					if ( actionType in zobjectModule.actions ) {
						result = zobjectModule.actions[ actionType ]( context, payload );
					}
					// return then and catch
					return {
						then: ( fn ) => fn( result ),
						catch: () => 'error'
					};
				} );
			} );

			describe( 'connect', () => {
				it( 'connects given tests', () => {
					zfunctionModule.actions.connectTests( context,
						{ rowId: 0, zids: [ 'Z777', 'Z888' ] } );

					expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
					expect( zobjectModule.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z2' },
						Z2K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z8' },
							Z8K1: [ { Z1K1: 'Z9', Z9K1: 'Z17' } ],
							Z8K2: { Z1K1: 'Z9', Z9K1: 'Z6' },
							Z8K3: [
								{ Z1K1: 'Z9', Z9K1: 'Z20' },
								{ Z1K1: 'Z9', Z9K1: 'Z10002' },
								{ Z1K1: 'Z9', Z9K1: 'Z10003' },
								{ Z1K1: 'Z9', Z9K1: 'Z777' },
								{ Z1K1: 'Z9', Z9K1: 'Z888' }
							],
							Z8K4: [
								{ Z1K1: 'Z9', Z9K1: 'Z14' },
								{ Z1K1: 'Z9', Z9K1: 'Z10004' },
								{ Z1K1: 'Z9', Z9K1: 'Z10005' }
							]
						}
					} );
				} );

				it( 'connects given implementations', () => {
					zfunctionModule.actions.connectImplementations( context,
						{ rowId: 0, zids: [ 'Z777', 'Z888' ] } );

					expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
					expect( zobjectModule.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z2' },
						Z2K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z8' },
							Z8K1: [ { Z1K1: 'Z9', Z9K1: 'Z17' } ],
							Z8K2: { Z1K1: 'Z9', Z9K1: 'Z6' },
							Z8K3: [
								{ Z1K1: 'Z9', Z9K1: 'Z20' },
								{ Z1K1: 'Z9', Z9K1: 'Z10002' },
								{ Z1K1: 'Z9', Z9K1: 'Z10003' }
							],
							Z8K4: [
								{ Z1K1: 'Z9', Z9K1: 'Z14' },
								{ Z1K1: 'Z9', Z9K1: 'Z10004' },
								{ Z1K1: 'Z9', Z9K1: 'Z10005' },
								{ Z1K1: 'Z9', Z9K1: 'Z777' },
								{ Z1K1: 'Z9', Z9K1: 'Z888' }
							]
						}
					} );
				} );
			} );

			describe( 'disconnect', () => {
				it( 'disconnects given testers', () => {
					zfunctionModule.actions.disconnectTests( context,
						{ rowId: 0, zids: [ 'Z10002', 'Z10003' ] } );

					expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
					expect( zobjectModule.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z2' },
						Z2K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z8' },
							Z8K1: [ { Z1K1: 'Z9', Z9K1: 'Z17' } ],
							Z8K2: { Z1K1: 'Z9', Z9K1: 'Z6' },
							Z8K3: [
								{ Z1K1: 'Z9', Z9K1: 'Z20' }
							],
							Z8K4: [
								{ Z1K1: 'Z9', Z9K1: 'Z14' },
								{ Z1K1: 'Z9', Z9K1: 'Z10004' },
								{ Z1K1: 'Z9', Z9K1: 'Z10005' }
							]
						}
					} );
				} );

				it( 'disconnects given implementations', () => {
					zfunctionModule.actions.disconnectImplementations( context,
						{ rowId: 0, zids: [ 'Z10004', 'Z10005' ] } );

					expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
					expect( zobjectModule.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z2' },
						Z2K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z8' },
							Z8K1: [ { Z1K1: 'Z9', Z9K1: 'Z17' } ],
							Z8K2: { Z1K1: 'Z9', Z9K1: 'Z6' },
							Z8K3: [
								{ Z1K1: 'Z9', Z9K1: 'Z20' },
								{ Z1K1: 'Z9', Z9K1: 'Z10002' },
								{ Z1K1: 'Z9', Z9K1: 'Z10003' }
							],
							Z8K4: [
								{ Z1K1: 'Z9', Z9K1: 'Z14' }
							]
						}
					} );
				} );
			} );

			describe( 'revert zObject to previous state if api fails', () => {
				const initialZObject = zobjectToRows( {
					Z1K1: 'Z2',
					Z2K2: {
						Z1K1: 'Z8',
						Z8K1: [ 'Z17' ],
						Z8K2: 'Z6',
						Z8K3: [ 'Z20' ],
						Z8K4: [ 'Z14' ]
					}
				} );

				beforeEach( () => {
					context.state = {
						zobject: initialZObject
					};
					context.rootState = {
						zobjectModule: context.state
					};
					Object.keys( zobjectModule.getters ).forEach( ( key ) => {
						context.getters[ key ] =
							zobjectModule.getters[ key ](
								context.state, context.getters,
								{ zobjectModule: context.state },
								context.getters );
					} );
					context.commit = jest.fn( ( mutationType, payload ) => {
						zobjectModule.mutations[ mutationType ]( context.state, payload );
					} );
					context.dispatch = jest.fn( ( actionType, payload ) => ( {
						then: function ( fn ) {
							if ( actionType === 'submitZObject' ) {
								throw fn();
							}
							return fn( payload );
						},
						catch: function ( fn ) {
							return fn( 'error' );
						}
					} ) );
				} );

				it( 'connectTests', () => {
					try {
						zfunctionModule.actions.connectTests( context,
							{ rowId: 0, zids: [ 'Z777', 'Z888' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
						expect( context.commit ).toHaveBeenCalledWith( 'setZObject', initialZObject );
					}
				} );

				it( 'disconnectTests', () => {
					try {
						zfunctionModule.actions.disconnectTests( context,
							{ rowId: 0, zids: [ 'Z111', 'Z333' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
						expect( context.commit ).toHaveBeenCalledWith( 'setZObject', initialZObject );
					}
				} );

				it( 'connectImplementations', () => {
					try {
						zfunctionModule.actions.connectImplementations( context,
							{ rowId: 0, zids: [ 'Z777', 'Z888' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
						expect( context.commit ).toHaveBeenCalledWith( 'setZObject', initialZObject );
					}
				} );

				it( 'disconnectImplementations', () => {
					try {
						zfunctionModule.actions.disconnectImplementations( context,
							{ rowId: 0, zids: [ 'Z444', 'Z666' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
						expect( context.commit ).toHaveBeenCalledWith( 'setZObject', initialZObject );
					}
				} );
			} );
		} );

		describe( 'fetch tests and implementations', () => {
			let getMock, getResolveMock;
			const mockApiResponse = {
				batchcomplete: '',
				query: {
					wikilambdafn_search: [
						{
							page_namespace: 0,
							zid: 'Z10001'
						},
						{
							page_namespace: 0,
							zid: 'Z10002'
						}
					]
				}
			};

			beforeEach( () => {
				getResolveMock = jest.fn( ( thenFunction ) => Promise.resolve( thenFunction( mockApiResponse ) ) );
				getMock = jest.fn( () => ( {
					then: getResolveMock
				} ) );
				mw.Api = jest.fn( () => ( {
					get: getMock
				} ) );

				context = Object.assign( {}, {
					commit: jest.fn(),
					dispatch: jest.fn()
				} );
			} );

			it( 'calls api.get for tests and returns their zids', async () => {
				const functionZid = 'Z801';
				const zids = await zfunctionModule.actions.fetchTests(
					context,
					functionZid
				);
				expect( zids ).toEqual( [ 'Z10001', 'Z10002' ] );
				expect( getMock ).toHaveBeenCalledWith( {
					action: 'query',
					list: 'wikilambdafn_search',
					format: 'json',
					wikilambdafn_zfunction_id: 'Z801',
					wikilambdafn_type: 'Z20',
					wikilambdafn_limit: 100
				} );
				expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: [ 'Z10001', 'Z10002' ] } );
			} );

			it( 'calls api.get for implementations and returns their zids', async () => {
				const functionZid = 'Z801';
				const zids = await zfunctionModule.actions.fetchImplementations(
					context,
					functionZid
				);

				expect( zids ).toEqual( [ 'Z10001', 'Z10002' ] );
				expect( getMock ).toHaveBeenCalledWith( {
					action: 'query',
					list: 'wikilambdafn_search',
					format: 'json',
					wikilambdafn_zfunction_id: 'Z801',
					wikilambdafn_type: 'Z14',
					wikilambdafn_limit: 100
				} );
				expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', { zids: [ 'Z10001', 'Z10002' ] } );
			} );
		} );
	} );
} );
