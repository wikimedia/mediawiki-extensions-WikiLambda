/*!
 * WikiLambda unit test suite for the zobject Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const tableDataToRowObjects = require( '../../helpers/zObjectTableHelpers.js' ).tableDataToRowObjects,
	zobjectToRows = require( '../../helpers/zObjectTableHelpers.js' ).zobjectToRows,
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	zobjectModule = require( '../../../../resources/ext.wikilambda.app/store/modules/zobject.js' ),
	errorModule = require( '../../../../resources/ext.wikilambda.app/store/modules/errors.js' ),
	libraryModule = require( '../../../../resources/ext.wikilambda.app/store/modules/library.js' ),
	mockApiZids = require( '../../fixtures/mocks.js' ).mockApiZids;

const blankPersistentObject = {
	Z1K1: 'Z2',
	Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
	Z2K2: '', // content rowId = 7
	Z2K3: {
		Z1K1: 'Z12',
		Z12K1: [ 'Z11' ]
	}
};

let state,
	context,
	postMock,
	postWithEditTokenMock,
	getResolveMock;

describe( 'zobject Vuex module', () => {
	beforeEach( () => {
		// eslint-disable-next-line no-unused-vars
		postMock = jest.fn( ( payload ) => ( {
			// eslint-disable-next-line no-unused-vars
			then: jest.fn( ( responsePayload ) => ( {
				catch: jest.fn()
			} ) )
		} ) );
		// eslint-disable-next-line no-unused-vars
		postWithEditTokenMock = jest.fn( ( payload ) => new Promise( ( resolve ) => {
			resolve( {
				wikilambda_edit: {
					page: 'sample'
				}
			} );
		} ) );

		state = Object.assign( {}, zobjectModule.state );
		getResolveMock = jest.fn( ( thenFunction ) => thenFunction() );
		context = Object.assign( {}, {
			// eslint-disable-next-line no-unused-vars
			commit: jest.fn( ( mutationType, payload ) => {} ),
			// eslint-disable-next-line no-unused-vars
			dispatch: jest.fn( ( actionType, payload ) => ( {
				then: getResolveMock
			} ) ),
			getters: {}
		} );

		mw.Api = jest.fn( () => ( {
			post: postMock,
			postWithEditToken: postWithEditTokenMock
		} ) );
	} );

	describe( 'Getters', () => {
		describe( 'getRowIndexById', () => {
			it( 'Returns row index by its rowId when index and id are aligned', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'Z6' },
					{ id: 2, key: 'Z6K1', parent: 0, value: 'some string' }
				] );

				expect( zobjectModule.getters.getRowIndexById( state )( 2 ) ).toEqual( 2 );
			} );

			it( 'Returns row index by its rowId when index and id are misaligned', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 10, key: 'Z1K1', parent: 0, value: 'Z6' },
					{ id: 20, key: 'Z6K1', parent: 0, value: 'some string' }
				] );

				expect( zobjectModule.getters.getRowIndexById( state )( 20 ) ).toEqual( 2 );
			} );
		} );

		describe( 'getNextKey', () => {
			it( 'Returns first ID for argument', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z8',
					Z8K1: [ 'Z17' ]
				} );
				expect( zobjectModule.getters.getNextKey( state, { getCurrentZObjectId: 'Z0' } ) ).toEqual( 'Z0K1' );
			} );

			it( 'Returns second ID for argument', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z8',
					Z8K1: [ 'Z17', {
						Z1K1: 'Z17',
						Z17K1: 'Z6',
						Z17K2: 'Z0K1'
					} ]
				} );
				expect( zobjectModule.getters.getNextKey( state, { getCurrentZObjectId: 'Z0' } ) ).toEqual( 'Z0K2' );
			} );
		} );

		describe( 'getRowById', () => {
			it( 'returns undefined where the input id is undefined', () => {
				expect( zobjectModule.getters.getRowById( state )( undefined ) ).toEqual( undefined );
			} );

			it( 'returns undefined where the row id is not found', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( zobjectModule.getters.getRowById( state )( 3 ) ).toEqual( undefined );
			} );

			it( 'returns Row given its row id', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( zobjectModule.getters.getRowById( state )( 2 ) )
					.toEqual( { id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 } );
			} );
		} );

		describe( 'getZObjectKeyByRowId', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
			} );

			it( 'returns undefined where the input id is undefined', () => {
				expect( zobjectModule.getters.getZObjectKeyByRowId( state, getters )( undefined ) )
					.toEqual( undefined );
			} );

			it( 'returns undefined where the row id is not found', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( zobjectModule.getters.getZObjectKeyByRowId( state, getters )( 3 ) ).toEqual( undefined );
			} );

			it( 'returns row key given its row id', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( zobjectModule.getters.getZObjectKeyByRowId( state, getters )( 2 ) )
					.toEqual( Constants.Z_STRING_VALUE );
			} );
		} );

		describe( 'getZObjectValueByRowId', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
			} );

			it( 'returns undefined where the input id is undefined', () => {
				expect( zobjectModule.getters.getZObjectValueByRowId( state, getters )( undefined ) )
					.toEqual( undefined );
			} );

			it( 'returns undefined where the row id is not found', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( zobjectModule.getters.getZObjectValueByRowId( state, getters )( 3 ) ).toEqual( undefined );
			} );

			it( 'returns row key given its row id', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( zobjectModule.getters.getZObjectValueByRowId( state, getters )( 2 ) )
					.toEqual( 'stringiform' );
			} );
		} );

		describe( 'getChildrenByParentRowId', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
			} );

			it( 'returns undefined when input is undefined', () => {
				state.zobject = [];
				expect( zobjectModule.getters.getChildrenByParentRowId( state )( undefined ) ).toEqual( [] );
			} );

			it( 'returns undefined when state is empty', () => {
				state.zobject = [];
				expect( zobjectModule.getters.getChildrenByParentRowId( state )( 0 ) ).toEqual( [] );
			} );

			it( 'returns undefined where the row id is not found', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( zobjectModule.getters.getChildrenByParentRowId( state )( 3 ) ).toEqual( [] );
			} );

			it( 'returns array of child rows given the parent row id', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				const children = zobjectModule.getters.getChildrenByParentRowId( state )( 0 );
				expect( children ).toHaveLength( 2 );
				expect( children[ 0 ] )
					.toEqual( { id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 } );
				expect( children[ 1 ] )
					.toEqual( { id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 } );
			} );
		} );

		describe( 'getRowByKeyPath', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
			} );

			it( 'returns undefined when state is empty', () => {
				state.zobject = [];
				expect( zobjectModule.getters.getRowByKeyPath( state, getters )() ).toEqual( undefined );
			} );

			it( 'returns undefined when rowId doesn not exist', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( zobjectModule.getters.getRowByKeyPath( state, getters )( [], 3 ) ).toEqual( undefined );
			} );

			it( 'returns root row when called with default args', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( zobjectModule.getters.getRowByKeyPath( state, getters )() )
					.toEqual( { id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined } );
			} );

			it( 'returns row with no keyPath and non-root row id', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( zobjectModule.getters.getRowByKeyPath( state, getters )( [], 2 ) )
					.toEqual( { id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 } );
			} );

			it( 'returns row when length 1 keyPath and root row id', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( zobjectModule.getters.getRowByKeyPath( state, getters )( [ Constants.Z_STRING_VALUE ], 0 ) )
					.toEqual( { id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 } );
			} );

			it( 'returns undefined when keyPath is incorrect', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( zobjectModule.getters.getRowByKeyPath( state, getters )( [ Constants.Z_FUNCTION_TESTERS ], 0 ) )
					.toEqual( undefined );
			} );

			it( 'returns correct row when keyPath is complex', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 3, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 16, key: 'Z1K1', value: 'Z6', parent: 3 },
					{ id: 17, key: 'Z6K1', value: '', parent: 3 }
				] );
				const keyPath = [ 'Z2K2', 'Z6K1' ];
				const expected = { key: 'Z6K1', value: '', parent: 3, id: 17 };
				expect( zobjectModule.getters.getRowByKeyPath( state, getters )( keyPath ) ).toEqual( expected );
			} );

			it( 'returns correct row when keyPath is complex, walks through objects and lists, and starts from non-root row', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 6, key: 'Z2K3', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 7, key: 'Z1K1', value: 'Z12', parent: 6 },
					{ id: 8, key: 'Z12K1', value: Constants.ROW_VALUE_ARRAY, parent: 6 },
					{ id: 9, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 8 },
					{ id: 10, key: 'Z1K1', value: 'Z9', parent: 9 },
					{ id: 11, key: 'Z9K1', value: 'Z11', parent: 9 },
					{ id: 12, key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 8 },
					{ id: 13, key: 'Z1K1', value: 'Z11', parent: 12 },
					{ id: 14, key: 'Z11K1', value: 'Z1002', parent: 12 },
					{ id: 15, key: 'Z11K2', value: '', parent: 12 }
				] );
				const keyPath = [ 'Z12K1', '1', 'Z11K2' ];
				const rowId = 6;
				const expected = { key: 'Z11K2', value: '', parent: 12, id: 15 };
				expect( zobjectModule.getters.getRowByKeyPath( state, getters )( keyPath, rowId ) ).toEqual( expected );
			} );
		} );

		describe( 'getZObjectTerminalValue', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
			} );

			it( 'returns undefined when row is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const terminalKey = '';
				const expected = undefined;
				expect( zobjectModule.getters.getZObjectTerminalValue( state, getters )( rowId, terminalKey ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const terminalKey = '';
				const expected = undefined;
				expect( zobjectModule.getters.getZObjectTerminalValue( state, getters )( rowId, terminalKey ) )
					.toEqual( expected );
			} );

			it( 'returns terminal value of terminal row given its rowId', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				const rowId = 2;
				const terminalKey = '';
				const expected = 'stringiform';
				expect( zobjectModule.getters.getZObjectTerminalValue( state, getters )( rowId, terminalKey ) )
					.toEqual( expected );
			} );

			it( 'returns terminal value of existing key given a non terminal rowId', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				const rowId = 0;
				const terminalKey = Constants.Z_STRING_VALUE;
				const expected = 'stringiform';
				expect( zobjectModule.getters.getZObjectTerminalValue( state, getters )( rowId, terminalKey ) )
					.toEqual( expected );
			} );

			it( 'returns terminal value of nested objects given a non terminal rowId', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 0 },
					{ id: 2, key: Constants.Z_REFERENCE_ID, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 3, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 2 },
					{ id: 4, key: Constants.Z_REFERENCE_ID, value: 'Z10001', parent: 2 }
				] );
				const rowId = 2;
				const terminalKey = Constants.Z_REFERENCE_ID;
				const expected = 'Z10001';
				expect( zobjectModule.getters.getZObjectTerminalValue( state, getters )( rowId, terminalKey ) )
					.toEqual( expected );
			} );

			it( 'returns terminal value of nested objects given a non terminal rowId and starting from the root', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 0 },
					{ id: 2, key: Constants.Z_REFERENCE_ID, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 3, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 2 },
					{ id: 4, key: Constants.Z_REFERENCE_ID, value: 'Z10001', parent: 2 }
				] );
				const rowId = 0;
				const terminalKey = Constants.Z_REFERENCE_ID;
				const expected = 'Z10001';
				expect( zobjectModule.getters.getZObjectTerminalValue( state, getters )( rowId, terminalKey ) )
					.toEqual( expected );
			} );
		} );

		describe( 'getZFunctionCallFunctionId', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
			} );

			it( 'returns undefined when row is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				expect( zobjectModule.getters.getZFunctionCallFunctionId( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				state.zobject = [];
				const rowId = 30;
				const expected = undefined;
				expect( zobjectModule.getters.getZFunctionCallFunctionId( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns function Zid given rowId of the function call', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 2, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 1 },
					{ id: 3, key: Constants.Z_REFERENCE_ID, value: Constants.Z_FUNCTION_CALL, parent: 1 },
					{ id: 4, key: Constants.Z_FUNCTION_CALL_FUNCTION, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 5, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 4 },
					{ id: 6, key: Constants.Z_REFERENCE_ID, value: Constants.Z_TYPED_PAIR, parent: 4 },
					{ id: 7, key: Constants.Z_TYPED_PAIR_TYPE1, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 8, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 7 },
					{ id: 9, key: Constants.Z_REFERENCE_ID, value: Constants.Z_STRING, parent: 7 },
					{ id: 10, key: Constants.Z_TYPED_PAIR_TYPE2, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 11, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 10 },
					{ id: 12, key: Constants.Z_REFERENCE_ID, value: Constants.Z_BOOLEAN, parent: 10 }
				] );
				const rowId = 0;
				const expected = Constants.Z_TYPED_PAIR;
				expect( zobjectModule.getters.getZFunctionCallFunctionId( state, getters )( rowId ) )
					.toEqual( expected );
			} );
		} );

		describe( 'getZFunctionCallArguments', () => {
			let getters;
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
				expect( zobjectModule.getters.getZFunctionCallArguments( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				state.zobject = [];
				const rowId = 30;
				const expected = [];
				expect( zobjectModule.getters.getZFunctionCallArguments( state, getters )( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns function Zid given rowId of the function call', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 2, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 1 },
					{ id: 3, key: Constants.Z_REFERENCE_ID, value: Constants.Z_FUNCTION_CALL, parent: 1 },
					{ id: 4, key: Constants.Z_FUNCTION_CALL_FUNCTION, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 5, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 4 },
					{ id: 6, key: Constants.Z_REFERENCE_ID, value: Constants.Z_TYPED_PAIR, parent: 4 },
					{ id: 7, key: Constants.Z_TYPED_PAIR_TYPE1, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 8, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 7 },
					{ id: 9, key: Constants.Z_REFERENCE_ID, value: Constants.Z_STRING, parent: 7 },
					{ id: 10, key: Constants.Z_TYPED_PAIR_TYPE2, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 11, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 10 },
					{ id: 12, key: Constants.Z_REFERENCE_ID, value: Constants.Z_BOOLEAN, parent: 10 }
				] );
				const rowId = 0;
				const args = zobjectModule.getters.getZFunctionCallArguments( state, getters )( rowId );
				expect( args ).toHaveLength( 2 );
				expect( args[ 0 ] ).toEqual(
					{ id: 7, key: Constants.Z_TYPED_PAIR_TYPE1, value: Constants.ROW_VALUE_OBJECT, parent: 0 }
				);
				expect( args[ 1 ] ).toEqual(
					{ id: 10, key: Constants.Z_TYPED_PAIR_TYPE2, value: Constants.ROW_VALUE_OBJECT, parent: 0 }
				);
			} );
		} );

		describe( 'getTypedListItemType', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZFunctionCallArguments = zobjectModule.getters.getZFunctionCallArguments( state, getters );
				getters.getZFunctionCallFunctionId = zobjectModule.getters.getZFunctionCallFunctionId( state, getters );
				getters.getZObjectAsJsonById = zobjectModule.getters.getZObjectAsJsonById( state, getters );
				getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
			} );

			it( 'returns undefined when the rowId is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				expect( zobjectModule.getters.getTypedListItemType( state, getters )( rowId ) ).toEqual( expected );
			} );

			it( 'returns undefined when the row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				expect( zobjectModule.getters.getTypedListItemType( state, getters )( rowId ) ).toEqual( expected );
			} );

			it( 'returns undefined when the row is not the start of a typed list', () => {
				state.zobject = zobjectToRows( {
					Z1K1: Constants.Z_STRING,
					Z6K1: 'stringiform'
				} );
				const rowId = 0;
				const expected = undefined;
				expect( zobjectModule.getters.getTypedListItemType( state, getters )( rowId ) ).toEqual( expected );
			} );

			it( 'returns type when it is defined as a reference', () => {
				state.zobject = zobjectToRows( {
					Z2K2: [ 'Z6', 'first string', 'second string' ]
				} );
				const rowId = 1;
				const expected = 'Z6';
				expect( zobjectModule.getters.getTypedListItemType( state, getters )( rowId ) ).toEqual( expected );
			} );

			it( 'returns type when it is defined as a function call', () => {
				state.zobject = zobjectToRows( {
					Z2K2: [
						{
							Z1K1: Constants.Z_FUNCTION_CALL,
							Z7K1: Constants.Z_TYPED_LIST,
							Z881K1: Constants.Z_STRING
						},
						[ 'Z6', 'first list of strings' ],
						[ 'Z6', 'second list of strings' ]
					]
				} );
				const rowId = 1;
				const expected = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_LIST,
					Z881K1: Constants.Z_STRING
				};
				expect( zobjectModule.getters.getTypedListItemType( state, getters )( rowId ) ).toEqual( expected );
			} );
		} );

		describe( 'getZStringTerminalValue', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
			} );

			it( 'returns the terminal value of a zstring when rowId corresponds to parent object row', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: 'Z6K1', value: 'myString', parent: 0 }
				] );

				const expected = 'myString';
				expect( zobjectModule.getters.getZStringTerminalValue( state, getters )( 0 ) ).toBe( expected );
			} );

			it( 'returns the terminal value of a zstring when rowId corresponds to the row with the ZString value', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: 'Z6K1', value: 'myString', parent: 0 }
				] );

				const expected = 'myString';
				expect( zobjectModule.getters.getZStringTerminalValue( state, getters )( 2 ) ).toBe( expected );
			} );

			it( 'returns undefined if a non-existent rowId is provided', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: 'Z6K1', value: 'myString', parent: 0 }
				] );

				expect( zobjectModule.getters.getZStringTerminalValue( state, getters )( 3 ) ).toBeUndefined();
			} );
		} );

		describe( 'getZReferenceTerminalValue', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
			} );

			it( 'returns the terminal value of a zreference when rowId corresponds to the row with the reference value', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 0 },
					{ id: 2, key: 'Z9K1', value: 'Z10001', parent: 0 }
				] );

				const expected = 'Z10001';
				expect( zobjectModule.getters.getZReferenceTerminalValue( state, getters )( 2 ) ).toBe( expected );
			} );

			it( 'returns the terminal value of a zreference when rowId corresponds to parent object row', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 0 },
					{ id: 2, key: 'Z9K1', value: 'Z10001', parent: 0 }
				] );

				const expected = 'Z10001';
				expect( zobjectModule.getters.getZReferenceTerminalValue( state, getters )( 0 ) ).toBe( expected );
			} );

			it( 'returns undefined if a non-existent rowId is provided', () => {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 0 },
					{ id: 2, key: 'Z9K1', value: 'Z10001', parent: 0 }
				] );

				expect( zobjectModule.getters.getZReferenceTerminalValue( state, getters )( 3 ) ).toBeUndefined();
			} );
		} );

		describe( 'ZMonolingualString', () => {
			describe( 'getZMonolingualTextValue', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
					getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( state, getters );

					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: Constants.ROW_VALUE_OBJECT },
						{ id: 1, key: 'Z1K1', value: Constants.Z_MONOLINGUALSTRING, parent: 0 },
						{ id: 2, key: 'Z11K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 3, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1002', parent: 2 },
						{ id: 5, key: 'Z11K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 6, key: 'Z1K1', value: Constants.Z_STRING, parent: 5 },
						{ id: 7, key: 'Z6K1', value: 'mystring', parent: 5 }
					] );
				} );

				it( 'gets the text value of a ZMonolingualString', () => {
					const expected = 'mystring';
					expect( zobjectModule.getters.getZMonolingualTextValue( state, getters )( 0 ) ).toBe( expected );
				} );

				it( 'should return undefined when an incorrect rowId is passed in', () => {
					expect( zobjectModule.getters.getZMonolingualTextValue( state, getters )( 4 ) ).toBeUndefined();
				} );
			} );

			describe( 'getZMonolingualLangValue', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
					getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue(
						state, getters );
				} );

				it( 'gets the language value of a ZMonolingualString when the language is a Z_REFERENCE', () => {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: Constants.ROW_VALUE_OBJECT },
						{ id: 1, key: 'Z1K1', value: Constants.Z_MONOLINGUALSTRING, parent: 0 },
						{ id: 2, key: 'Z11K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 3, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1002', parent: 2 },
						{ id: 5, key: 'Z11K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 6, key: 'Z1K1', value: Constants.Z_STRING, parent: 5 },
						{ id: 7, key: 'Z6K1', value: 'mystring', parent: 5 }
					] );

					const expected = 'Z1002';

					expect( zobjectModule.getters.getZMonolingualLangValue( state, getters )( 0 ) ).toBe( expected );
				} );

				it( 'gets the language value of a ZMonolingualString when the language is a Z_NATURAL_LANGUAGE', () => {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: Constants.ROW_VALUE_OBJECT },
						{ id: 1, key: 'Z1K1', value: Constants.Z_MONOLINGUALSTRING, parent: 0 },
						{ id: 2, key: 'Z11K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 3, key: 'Z1K1', value: Constants.Z_NATURAL_LANGUAGE, parent: 2 },
						{ id: 4, key: 'Z60K1', value: Constants.ROW_VALUE_OBJECT, parent: 2 },
						{ id: 5, key: 'Z1K1', value: Constants.Z_STRING, parent: 4 },
						{ id: 6, key: 'Z6K1', value: 'Z1002', parent: 4 },
						{ id: 7, key: 'Z11K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 8, key: 'Z1K1', value: Constants.Z_STRING, parent: 7 },
						{ id: 9, key: 'Z6K1', value: 'mystring', parent: 7 }
					] );

					const expected = 'Z1002';

					expect( zobjectModule.getters.getZMonolingualLangValue( state, getters )( 0 ) ).toBe( expected );
				} );
			} );

			describe( 'getZMonolingualForLanguage', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				} );

				it( 'returns monolingual string row in the given language if available', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11', // rowId = 4
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' },
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'en español' } // rowId = 18
						]
					} );
					const langZid = 'Z1003';
					const expected = { id: 18, key: '2', parent: 4, value: Constants.ROW_VALUE_OBJECT };
					const metadata = zobjectModule.getters.getZMonolingualForLanguage( state, getters )( langZid );
					expect( metadata ).toEqual( expected );
				} );

				it( 'returns undefined if the given language is not available', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' }
						]
					} );
					const langZid = 'Z1003';
					const metadata = zobjectModule.getters.getZMonolingualForLanguage( state, getters )( langZid );
					expect( metadata ).toBeUndefined();
				} );
			} );
		} );

		describe( 'ZMultilingualString', () => {
			describe( 'getZMultilingualLanguageList', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getZMonolingualLangValue = zobjectModule.getters.getZMonolingualLangValue( state, getters );
					getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
					getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue(
						state, getters );
				} );

				it( 'returns empty array when the row is not found', () => {
					state.zobject = [];
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZMultilingualLanguageList( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty array when the row does not contain an array', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ] // rowId = 4
					} );
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZMultilingualLanguageList( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty list when the multilingual string is empty', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ] // rowId = 4
					} );
					const rowId = 4;
					const expected = [];
					const metadata = zobjectModule.getters.getZMultilingualLanguageList( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with one item', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11', // rowId = 4
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'one item' }
						]
					} );
					const rowId = 4;
					const expected = [ 'Z1002' ];
					const metadata = zobjectModule.getters.getZMultilingualLanguageList( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with two items', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z12',
						Z12K1: [ // rowId = 4
							'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'one item' },
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'otro item' }
						]
					} );
					const rowId = 4;
					const expected = [ 'Z1002', 'Z1003' ];
					const metadata = zobjectModule.getters.getZMultilingualLanguageList( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );
		} );

		describe( 'ZMonolingualStringSet', () => {
			describe( 'getZMonolingualStringsetValues', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
					getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( state, getters );
				} );

				it( 'returns an empty array when row not found', () => {
					state.zobject = [];
					const rowId = 0;
					const expected = [];
					const returned = zobjectModule.getters.getZMonolingualStringsetValues( state, getters )( rowId );
					expect( returned ).toStrictEqual( expected );
				} );

				it( 'returns an empty array when object is not a ZMonolingualStringSet', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z32',
						Z32K1: [ 'Z31' ]
					} );
					const rowId = 0;
					const expected = [];
					const returned = zobjectModule.getters.getZMonolingualStringsetValues( state, getters )( rowId );
					expect( returned ).toStrictEqual( expected );
				} );

				it( 'returns an empty array when ZMonolingualStringset has an empty array', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z31',
						Z31K1: 'Z1002',
						Z31K2: [ 'Z6' ]
					} );
					const rowId = 0;
					const expected = [];
					const returned = zobjectModule.getters.getZMonolingualStringsetValues( state, getters )( rowId );
					expect( returned ).toStrictEqual( expected );
				} );

				it( 'returns an array with one item', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z31',
						Z31K1: 'Z1002',
						Z31K2: [ 'Z6', 'one' ]
					} );
					const rowId = 0;
					const expected = [ { rowId: 11, value: 'one' } ];
					const returned = zobjectModule.getters.getZMonolingualStringsetValues( state, getters )( rowId );
					expect( returned ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZMonolingualStringsetLang', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
					getters.getZReferenceTerminalValue = zobjectModule.getters
						.getZReferenceTerminalValue( state, getters );
					getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
				} );

				it( 'returns undefined when row not found', () => {
					state.zobject = [];
					const rowId = 0;
					const expected = undefined;
					const returned = zobjectModule.getters.getZMonolingualStringsetLang( state, getters )( rowId );
					expect( returned ).toStrictEqual( expected );
				} );

				it( 'returns undefined when object is not a ZMonolingualStringSet', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z32',
						Z32K1: [ 'Z31' ]
					} );
					const rowId = 0;
					const expected = undefined;
					const returned = zobjectModule.getters.getZMonolingualStringsetLang( state, getters )( rowId );
					expect( returned ).toStrictEqual( expected );
				} );

				it( 'returns language zid of ZMonolingualStringset', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z31',
						Z31K1: 'Z1002',
						Z31K2: [ 'Z6' ]
					} );
					const rowId = 0;
					const expected = 'Z1002';
					const returned = zobjectModule.getters.getZMonolingualStringsetLang( state, getters )( rowId );
					expect( returned ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZMonolingualStringsetForLanguage', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				} );

				it( 'returns monolingual string row in the given language if available', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z32',
						Z32K1: [ 'Z31', // rowId = 4
							{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6' ] },
							{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6' ] } // rowId = 19
						]
					} );
					const langZid = 'Z1003';
					const expected = { id: 19, key: '2', parent: 4, value: Constants.ROW_VALUE_OBJECT };
					const metadata = zobjectModule.getters.getZMonolingualStringsetForLanguage( state, getters )( langZid );
					expect( metadata ).toEqual( expected );
				} );

				it( 'returns undefined if the given language is not available', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z32',
						Z32K1: [ 'Z31',
							{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6' ] }
						]
					} );
					const langZid = 'Z1003';
					const metadata = zobjectModule.getters.getZMonolingualStringsetForLanguage( state, getters )( langZid );
					expect( metadata ).toBeUndefined();
				} );
			} );
		} );

		describe( 'ZPersistentObject', () => {
			describe( 'getZPersistentContentRowId', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				} );

				it( 'returns undefined when the rowId is undefined', () => {
					state.zobject = [];
					const rowId = undefined;
					const expectedRowId = undefined;
					const contentRowId = zobjectModule.getters.getZPersistentContentRowId( state, getters )( rowId );
					expect( contentRowId ).toBe( expectedRowId );
				} );

				it( 'returns undefined when the row does not exist', () => {
					state.zobject = [];
					const rowId = 0;
					const expectedRowId = undefined;
					const contentRowId = zobjectModule.getters.getZPersistentContentRowId( state, getters )( rowId );
					expect( contentRowId ).toBe( expectedRowId );
				} );

				it( 'returns row where persistent object content/Z2K2 starts with default row (0)', () => {
					state.zobject = zobjectToRows( {
						Z1K1: 'Z2',
						Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
						Z2K2: Constants.ROW_VALUE_OBJECT
					} );
					const expectedRowId = 7;
					const contentRowId = zobjectModule.getters.getZPersistentContentRowId( state, getters )();
					expect( contentRowId ).toBe( expectedRowId );
				} );

				it( 'returns row where persistent object content/Z2K2 starts with input rowId', () => {
					// Force Z2 object to start at a different row
					state.zobject = zobjectToRows( {
						Z1K1: 'Z10000',
						Z10000K1: {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
							Z2K2: Constants.ROW_VALUE_OBJECT
						}
					} );
					const rowId = 4;
					const expectedRowId = 11;
					const contentRowId = zobjectModule.getters.getZPersistentContentRowId( state, getters )( rowId );
					expect( contentRowId ).toBe( expectedRowId );
				} );
			} );

			describe( 'getZPersistentNameLangs', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getZMultilingualLanguageList = zobjectModule.getters
						.getZMultilingualLanguageList( state, getters );
					getters.getZMonolingualLangValue = zobjectModule.getters.getZMonolingualLangValue( state, getters );
					getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
					getters.getZReferenceTerminalValue = zobjectModule.getters
						.getZReferenceTerminalValue( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
					getters.getLanguageIsoCodeOfZLang = () => 'en';
				} );

				it( 'returns empty array when the row is not found', () => {
					state.zobject = [];
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZPersistentNameLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty list when the name multilingual string is empty', () => {
					state.zobject = zobjectToRows( {
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11' ]
						}
					} );
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZPersistentNameLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with one item', () => {
					state.zobject = zobjectToRows( {
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'test' }
							]
						}
					} );
					const rowId = 0;
					const expected = [ 'Z1002' ];
					const metadata = zobjectModule.getters.getZPersistentNameLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZPersistentName', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getZMonolingualForLanguage = zobjectModule.getters.getZMonolingualForLanguage( state, getters );
					getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				} );

				it( 'returns name row in the given language if available', () => {
					state.zobject = zobjectToRows( {
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11', // rowId = 5
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' },
								{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'en español' } // rowId = 19
							]
						}
					} );
					const langZid = 'Z1003';
					const expected = { id: 19, key: '2', parent: 5, value: Constants.ROW_VALUE_OBJECT };
					const metadata = zobjectModule.getters.getZPersistentName( state, getters )( langZid );
					expect( metadata ).toEqual( expected );
				} );

				it( 'returns undefined if the given language is not available', () => {
					state.zobject = zobjectToRows( {
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' }
							]
						}
					} );
					const langZid = 'Z1003';
					const expected = undefined;
					const metadata = zobjectModule.getters.getZPersistentName( state, getters )( langZid );
					expect( metadata ).toEqual( expected );
				} );
			} );

			describe( 'getZPersistentDescriptionLangs', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getZMultilingualLanguageList = zobjectModule.getters
						.getZMultilingualLanguageList( state, getters );
					getters.getZMonolingualLangValue = zobjectModule.getters.getZMonolingualLangValue( state, getters );
					getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
					getters.getZReferenceTerminalValue = zobjectModule.getters
						.getZReferenceTerminalValue( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
					getters.getLanguageIsoCodeOfZLang = () => 'en';
				} );

				it( 'returns empty array when the row is not found', () => {
					state.zobject = [];
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZPersistentDescriptionLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty list when the description multilingual string is empty', () => {
					state.zobject = zobjectToRows( {
						Z2K5: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11' ]
						}
					} );
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZPersistentDescriptionLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with one item', () => {
					state.zobject = zobjectToRows( {
						Z2K5: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'test' }
							]
						}
					} );
					const rowId = 0;
					const expected = [ 'Z1002' ];
					const metadata = zobjectModule.getters.getZPersistentDescriptionLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZPersistentDescription', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getZMonolingualForLanguage = zobjectModule.getters.getZMonolingualForLanguage( state, getters );
					getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				} );

				it( 'returns description row in the given language if available', () => {
					state.zobject = zobjectToRows( {
						Z2K5: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11', // rowId = 5
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' },
								{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'en español' } // rowId = 19
							]
						}
					} );
					const langZid = 'Z1003';
					const expected = { id: 19, key: '2', parent: 5, value: Constants.ROW_VALUE_OBJECT };
					const metadata = zobjectModule.getters.getZPersistentDescription( state, getters )( langZid );
					expect( metadata ).toEqual( expected );
				} );

				it( 'returns undefined if the given language is not available', () => {
					state.zobject = zobjectToRows( {
						Z2K5: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' }
							]
						}
					} );
					const langZid = 'Z1003';
					const expected = undefined;
					const metadata = zobjectModule.getters.getZPersistentDescription( state, getters )( langZid );
					expect( metadata ).toEqual( expected );
				} );
			} );

			describe( 'getZPersistentAliasLangs', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getZMonolingualStringsetLang = zobjectModule.getters
						.getZMonolingualStringsetLang( state, getters );
					getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
					getters.getZReferenceTerminalValue = zobjectModule.getters
						.getZReferenceTerminalValue( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
					getters.getLanguageIsoCodeOfZLang = ( zid ) => zid === 'Z1003' ? 'es' : 'en';
				} );

				it( 'returns empty array when the row is not found', () => {
					state.zobject = [];
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZPersistentAliasLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty list when the alias multilingual string set is empty', () => {
					state.zobject = zobjectToRows( {
						Z2K4: {
							Z1K1: 'Z32',
							Z32K1: [ 'Z31' ]
						}
					} );
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZPersistentAliasLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with one item', () => {
					state.zobject = zobjectToRows( {
						Z2K4: {
							Z1K1: 'Z32',
							Z32K1: [ 'Z31',
								{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6' ] }
							]
						}
					} );
					const rowId = 0;
					const expected = [ 'Z1002' ];
					const metadata = zobjectModule.getters.getZPersistentAliasLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with multiple items', () => {
					state.zobject = zobjectToRows( {
						Z2K4: {
							Z1K1: 'Z32',
							Z32K1: [ 'Z31',
								{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6' ] },
								{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6' ] }
							]
						}
					} );
					const rowId = 0;
					const expected = [ 'Z1002', 'Z1003' ];
					const metadata = zobjectModule.getters.getZPersistentAliasLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZPersistentAlias', () => {
				let getters;
				beforeEach( () => {
					getters = {};
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getZMonolingualStringsetForLanguage = zobjectModule.getters.getZMonolingualStringsetForLanguage( state, getters );
					getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				} );

				it( 'returns alias row in the given language if available', () => {
					state.zobject = zobjectToRows( {
						Z2K4: {
							Z1K1: 'Z32',
							Z32K1: [ 'Z31',
								{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6' ] },
								{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6' ] } // rowId = 20
							]
						}
					} );
					const langZid = 'Z1003';
					const expected = { id: 20, key: '2', parent: 5, value: Constants.ROW_VALUE_OBJECT };
					const metadata = zobjectModule.getters.getZPersistentAlias( state, getters )( langZid );
					expect( metadata ).toEqual( expected );
				} );

				it( 'returns undefined if the given language is not available', () => {
					state.zobject = zobjectToRows( {
						Z2K4: {
							Z1K1: 'Z32',
							Z32K1: [ 'Z31',
								{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6' ] }
							]
						}
					} );
					const langZid = 'Z1003';
					const expected = undefined;
					const metadata = zobjectModule.getters.getZPersistentAlias( state, getters )( langZid );
					expect( metadata ).toEqual( expected );
				} );
			} );

			describe( 'getMultilingualDataLanguages', () => {
				beforeEach( () => {
					getters = {};
					getters.getZPersistentNameLangs = () => [];
					getters.getZPersistentDescriptionLangs = () => [];
					getters.getZPersistentAliasLangs = () => [];
					getters.getZFunctionInputLangs = () => [];
				} );

				it( 'returns empty array when there is no metadata', () => {
					const expected = [];
					const current = zobjectModule.getters.getMultilingualDataLanguages( state, getters )();
					expect( current ).toStrictEqual( expected );
				} );

				it( 'returns array with one language', () => {
					getters.getZPersistentNameLangs = () => [ 'Z1002' ];
					getters.getZPersistentDescriptionLangs = () => [ 'Z1002' ];
					getters.getZPersistentAliasLangs = () => [ 'Z1002' ];
					getters.getZFunctionInputLangs = () => [ 'Z1002' ];

					const expected = [ 'Z1002' ];
					const current = zobjectModule.getters.getMultilingualDataLanguages( state, getters )();
					expect( current ).toStrictEqual( expected );
				} );

				it( 'returns array with four non overlapping languages', () => {
					getters.getZPersistentNameLangs = () => [ 'Z1003' ];
					getters.getZPersistentDescriptionLangs = () => [ 'Z1002' ];
					getters.getZPersistentAliasLangs = () => [ 'Z1004' ];
					getters.getZFunctionInputLangs = () => [ 'Z1006' ];

					const expected = [ 'Z1003', 'Z1002', 'Z1004', 'Z1006' ];
					const current = zobjectModule.getters.getMultilingualDataLanguages( state, getters )();
					expect( current ).toStrictEqual( expected );
				} );

				it( 'returns array with two overlapping languages', () => {
					getters.getZPersistentNameLangs = () => [ 'Z1002', 'Z1003' ];
					getters.getZPersistentDescriptionLangs = () => [ 'Z1002', 'Z1003' ];
					getters.getZPersistentAliasLangs = () => [ 'Z1002', 'Z1003' ];
					getters.getZFunctionInputLangs = () => [ 'Z1002', 'Z1003' ];

					const expected = [ 'Z1002', 'Z1003' ];
					const current = zobjectModule.getters.getMultilingualDataLanguages( state, getters )();
					expect( current ).toStrictEqual( expected );
				} );
			} );
		} );

		describe( 'getZImplementationFunctionRowId', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
			} );

			it( 'returns undefined when the rowId is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expectedRowId = undefined;
				const functionRowId = zobjectModule.getters.getZImplementationFunctionRowId( state, getters )( rowId );
				expect( functionRowId ).toBe( expectedRowId );
			} );

			it( 'returns undefined when the row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const expectedRowId = undefined;
				const functionRowId = zobjectModule.getters.getZImplementationFunctionRowId( state, getters )( rowId );
				expect( functionRowId ).toBe( expectedRowId );
			} );

			it( 'returns row where target function object starts (key Z14K1)', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001'
				} );
				const rowId = 0;
				const expectedRowId = 4;
				const functionRowId = zobjectModule.getters.getZImplementationFunctionRowId( state, getters )( rowId );
				expect( functionRowId ).toBe( expectedRowId );
			} );
		} );

		describe( 'getZImplementationFunctionZid', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZImplementationFunctionRowId = zobjectModule.getters
					.getZImplementationFunctionRowId( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
			} );

			it( 'returns undefined when the rowId is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const functionZid = zobjectModule.getters.getZImplementationFunctionZid( state, getters )( rowId );
				expect( functionZid ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const functionZid = zobjectModule.getters.getZImplementationFunctionZid( state, getters )( rowId );
				expect( functionZid ).toBe( expected );
			} );

			it( 'returns target function zid', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001'
				} );
				const rowId = 0;
				const expected = 'Z10001';
				const functionZid = zobjectModule.getters.getZImplementationFunctionZid( state, getters )( rowId );
				expect( functionZid ).toBe( expected );
			} );
		} );

		describe( 'getZImplementationContentType', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
			} );

			it( 'returns undefined when the rowId is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const contentType = zobjectModule.getters.getZImplementationContentType( state, getters )( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const contentType = zobjectModule.getters.getZImplementationContentType( state, getters )( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns composition (key Z14K2)', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K2: { Z1K1: 'Z7', Z7K1: 'Z10002' }
				} );
				const rowId = 0;
				const expected = 'Z14K2';
				const contentType = zobjectModule.getters.getZImplementationContentType( state, getters )( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns code (key Z14K3)', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K3: { Z1K1: 'Z16', Z16K1: 'Z600', Z16K2: '() => "hello";' }
				} );
				const rowId = 0;
				const expected = 'Z14K3';
				const contentType = zobjectModule.getters.getZImplementationContentType( state, getters )( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns builtin (key Z14K4)', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K4: 'BUILTIN'
				} );
				const rowId = 0;
				const expected = 'Z14K4';
				const contentType = zobjectModule.getters.getZImplementationContentType( state, getters )( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns undefined if no key is found', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001'
				} );
				const rowId = 0;
				const expected = undefined;
				const contentType = zobjectModule.getters.getZImplementationContentType( state, getters )( rowId );
				expect( contentType ).toBe( expected );
			} );
		} );

		describe( 'getZImplementationContentRowId', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
			} );

			it( 'returns undefined when the rowId and key are undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const key = undefined;
				const expected = undefined;
				const contentRowId = zobjectModule.getters
					.getZImplementationContentRowId( state, getters )( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const key = 'Z14K2';
				const expected = undefined;
				const contentRowId = zobjectModule.getters
					.getZImplementationContentRowId( state, getters )( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );

			it( 'returns composition when available (key Z14K2)', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K2: { Z1K1: 'Z7', Z7K1: 'Z10002' }
				} );
				const rowId = 0;
				const key = 'Z14K2';
				const expected = 4;
				const contentRowId = zobjectModule.getters
					.getZImplementationContentRowId( state, getters )( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );

			it( 'returns code when available (key Z14K3)', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K3: { Z1K1: 'Z16', Z16K1: 'Z600', Z16K2: '() => "hello world";' }
				} );
				const rowId = 0;
				const key = 'Z14K3';
				const expected = 4;
				const contentRowId = zobjectModule.getters
					.getZImplementationContentRowId( state, getters )( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );

			it( 'returns undefined if given key is not found', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K2: { Z1K1: 'Z7', Z7K1: 'Z10002' }
				} );
				const rowId = 0;
				const key = 'Z14K3';
				const expected = undefined;
				const contentRowId = zobjectModule.getters
					.getZImplementationContentRowId( state, getters )( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );
		} );

		describe( 'getZCodeProgrammingLanguageRow', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
			} );

			it( 'returns undefined when the rowId is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const lang = zobjectModule.getters.getZCodeProgrammingLanguageRow( state, getters )( rowId );
				expect( lang ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const lang = zobjectModule.getters.getZCodeProgrammingLanguageRow( state, getters )( rowId );
				expect( lang ).toBe( expected );
			} );

			it( 'returns the row that contains the programing language', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z16',
					Z16K1: 'Z600'
				} );

				const rowId = 0;
				const expected = { id: 4, key: Constants.Z_CODE_LANGUAGE, parent: 0, value: Constants.ROW_VALUE_OBJECT };
				const lang = zobjectModule.getters.getZCodeProgrammingLanguageRow( state, getters )( rowId );
				expect( lang ).toEqual( expected );
			} );
		} );

		describe( 'getZCodeString', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
			} );

			it( 'returns undefined when the rowId is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const lang = zobjectModule.getters.getZCodeString( state, getters )( rowId );
				expect( lang ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', () => {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const lang = zobjectModule.getters.getZCodeString( state, getters )( rowId );
				expect( lang ).toBe( expected );
			} );

			it( 'returns string value of the code', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z16',
					Z16K1: 'Z610',
					Z16K2: 'def Z10001:'
				} );
				const rowId = 0;
				const expected = 'def Z10001:';
				const lang = zobjectModule.getters.getZCodeString( state, getters )( rowId );
				expect( lang ).toBe( expected );
			} );
		} );

		describe( 'isInsideComposition', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
			} );

			it( 'returns false when the rowId is undefined', () => {
				state.zobject = [];
				const rowId = undefined;
				const expected = false;
				const result = zobjectModule.getters.isInsideComposition( state, getters )( rowId );
				expect( result ).toBe( expected );
			} );

			it( 'returns false when the rowId is not found', () => {
				state.zobject = [];
				const rowId = 10;
				const expected = false;
				const result = zobjectModule.getters.isInsideComposition( state, getters )( rowId );
				expect( result ).toBe( expected );
			} );

			it( 'returns false when the row is zero (root)', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z10002'
					}
				} );
				const rowId = 0;
				const expected = false;
				const result = zobjectModule.getters.isInsideComposition( state, getters )( rowId );
				expect( result ).toBe( expected );
			} );

			it( 'returns false when no parent has composition/Z14K2 key', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K3: {
						Z1K1: 'Z16',
						Z16K1: 'Z610',
						Z16K2: 'def Z10001:' // rowId = 16
					}
				} );
				const rowId = 16;
				const expected = false;
				const result = zobjectModule.getters.isInsideComposition( state, getters )( rowId );
				expect( result ).toBe( expected );
			} );

			it( 'returns true when a parent has composition/Z14K2 key', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z10002',
						Z10002K1: 'uno',
						Z10002K2: 'dos' // rowId = 17
					}
				} );
				const rowId = 17;
				const expected = true;
				const result = zobjectModule.getters.isInsideComposition( state, getters )( rowId );
				expect( result ).toBe( expected );
			} );
		} );

		describe( 'getZBooleanValue', () => {
			beforeEach( () => {
				context.state = { };

				context.state.zobject = zobjectToRows( [
					'Z1', // rowId = 1
					{ Z1K1: 'Z40', Z40K1: Constants.Z_BOOLEAN_TRUE }, // rowId = 4
					{ Z1K1: 'Z40', Z40K1: Constants.Z_BOOLEAN_FALSE } // rowId = 11
				] );

				context.getters.getChildrenByParentRowId =
				zobjectModule.getters.getChildrenByParentRowId( context.state );
				context.getters.getRowById =
				zobjectModule.getters.getRowById( context.state );
				context.getters.getRowByKeyPath =
				zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
				context.getters.getZReferenceTerminalValue =
				zobjectModule.getters.getZReferenceTerminalValue( context.state, context.getters );
				context.getters.getZObjectTerminalValue =
				zobjectModule.getters.getZObjectTerminalValue( context.state, context.getters );
				context.getters.getZBooleanValue =
				zobjectModule.getters.getZBooleanValue( context.state, context.getters );
			} );

			it( 'returns Z41(true) when the boolean value is true', () => {
				// rowId of the parent of the boolean value
				const rowId = 4;
				const expected = Constants.Z_BOOLEAN_TRUE;
				const result = context.getters.getZBooleanValue( rowId );

				expect( result ).toBe( expected );
			} );

			it( 'returns Z42(false) when the boolean value is true', () => {
				// rowId of the parent of the boolean value
				const rowId = 11;
				const expected = Constants.Z_BOOLEAN_FALSE;
				const result = context.getters.getZBooleanValue( rowId );

				expect( result ).toBe( expected );
			} );

			it( 'returns undefined when the rowId is NOT a boolean', () => {
				const rowId = 1;
				const result = context.getters.getZBooleanValue( rowId );

				expect( result ).toBeUndefined();
			} );

			it( 'returns undefined when the rowId does NOT exist', () => {
				const rowId = 100;
				const result = context.getters.getZBooleanValue( rowId );

				expect( result ).toBeUndefined();
			} );
		} );

		describe( 'getZObjectTypeByRowId', () => {
			let getters;

			beforeEach( () => {
				state = { zobject: [] };
				getters = {};
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZFunctionCallArguments = zobjectModule.getters.getZFunctionCallArguments( state, getters );
				getters.getZFunctionCallFunctionId = zobjectModule.getters.getZFunctionCallFunctionId( state, getters );
				getters.getZObjectAsJsonById = zobjectModule.getters.getZObjectAsJsonById( state, getters );
				getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
			} );

			it( 'should return undefined if rowId is undefined or falsy', () => {
				const rowId = undefined;
				expect( getters.getZObjectTypeByRowId( rowId ) ).toBeUndefined();
			} );

			it( 'should return undefined if rowId is not found', () => {
				const rowId = 100;
				expect( getters.getZObjectTypeByRowId( rowId ) ).toBeUndefined();
			} );

			it( 'should return Z9/Reference if the row is terminal and the key is Z9K1/Reference Id', () => {
				const rowId = 2;
				state.zobject = zobjectToRows( {
					Z1K1: Constants.Z_REFERENCE,
					Z9K1: Constants.Z_STRING
				} );

				expect( getters.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_REFERENCE );
			} );

			it( 'should return Z6/String if the row is terminal and the key is Z1K1/Object Type', () => {
				const rowId = 1;
				state.zobject = zobjectToRows( {
					Z1K1: Constants.Z_REFERENCE,
					Z9K1: Constants.Z_MONOLINGUALSTRING
				} );

				expect( getters.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_STRING );
			} );

			it( 'should return Z6/String if the row is a terminal string value', () => {
				const rowId = 2;
				state.zobject = zobjectToRows( {
					Z1K1: Constants.Z_STRING,
					Z6K1: 'value'
				} );

				expect( getters.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_STRING );
			} );

			it( 'should return Z9/Reference if the row is nor terminal has a reference object', () => {
				const rowId = 0;
				state.zobject = zobjectToRows( {
					Z1K1: Constants.Z_REFERENCE,
					Z9K1: Constants.Z_STRING
				} );

				expect( getters.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_REFERENCE );
			} );

			it( 'should return Typed list of String if the row is an array of strings', () => {
				const rowId = 1;
				state.zobject = zobjectToRows( {
					Z2K2: [ Constants.Z_STRING ]
				} );
				const expected = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_LIST,
					Z881K1: Constants.Z_STRING
				};

				expect( getters.getZObjectTypeByRowId( rowId ) ).toStrictEqual( expected );
			} );

			it( 'should return Typed list of Object if the row is an array', () => {
				const rowId = 1;
				state.zobject = zobjectToRows( {
					Z2K2: [ Constants.Z_OBJECT ]
				} );
				const expected = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_LIST,
					Z881K1: Constants.Z_OBJECT
				};

				expect( getters.getZObjectTypeByRowId( rowId ) ).toStrictEqual( expected );
			} );

			it( 'should return Typed list of undefined if the row is an array with no type', () => {
				const rowId = 1;
				state.zobject = zobjectToRows( {
					Z2K2: []
				} );
				const expected = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_LIST,
					Z881K1: ''
				};

				expect( getters.getZObjectTypeByRowId( rowId ) ).toStrictEqual( expected );
			} );

			it( 'should return Typed list of Typed lists of Strings if the row is a nested array', () => {
				const rowId = 1;
				state.zobject = zobjectToRows( {
					Z2K2: [ {
						Z1K1: Constants.Z_FUNCTION_CALL,
						Z7K1: Constants.Z_TYPED_LIST,
						Z881K1: Constants.Z_STRING
					}, [ Constants.Z_STRING, 'one', 'two' ] ]
				} );
				const expected = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_LIST,
					Z881K1: {
						Z1K1: Constants.Z_FUNCTION_CALL,
						Z7K1: Constants.Z_TYPED_LIST,
						Z881K1: Constants.Z_STRING
					}
				};

				expect( getters.getZObjectTypeByRowId( rowId ) ).toStrictEqual( expected );
			} );

			it( 'should return the terminal reference value if the object is a reference', () => {
				const rowId = 0;
				state.zobject = zobjectToRows( {
					Z1K1: {
						Z1K1: Constants.Z_REFERENCE,
						Z9K1: Constants.Z_MONOLINGUALSTRING
					}
				} );

				const result = getters.getZObjectTypeByRowId( rowId );
				expect( result ).toBe( Constants.Z_MONOLINGUALSTRING );
			} );

			it( 'should return the type of the object in a list', () => {
				const rowId = 5;
				state.zobject = zobjectToRows( {
					Z2K2: [ Constants.Z_MONOLINGUALSTRING,
						{ // rowId = 5
							Z1K1: Constants.Z_MONOLINGUALSTRING,
							Z11K1: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
							Z11K2: 'value'
						}
					]
				} );

				expect( getters.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_MONOLINGUALSTRING );
			} );

			it( 'returns the internal type of a function call', () => {
				const rowId = 1;
				state.zobject = zobjectToRows( {
					Z1K1: {
						Z1K1: Constants.Z_FUNCTION_CALL,
						Z7K1: Constants.Z_TYPED_LIST,
						Z881K1: Constants.Z_STRING
					}
				} );

				expect( getters.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_FUNCTION_CALL );
			} );

			it( 'returns the string representation of a type described by a function call to typed list', () => {
				const rowId = 0;
				const type = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_LIST,
					Z881K1: Constants.Z_STRING
				};
				state.zobject = zobjectToRows( {
					Z1K1: type
				} );

				expect( getters.getZObjectTypeByRowId( rowId ) ).toStrictEqual( type );
			} );

			it( 'returns the string representation of a type described by a function call to typed pair', () => {
				const rowId = 0;
				const type = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_PAIR,
					Z882K1: Constants.Z_STRING,
					Z882K2: Constants.Z_BOOLEAN
				};
				state.zobject = zobjectToRows( {
					Z1K1: type
				} );

				expect( getters.getZObjectTypeByRowId( rowId ) ).toStrictEqual( type );
			} );

			it( 'returns the string representation of a type described by a function call with no arguments', () => {
				const rowId = 0;
				const type = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: 'Z10000'
				};
				state.zobject = zobjectToRows( {
					Z1K1: type
				} );

				expect( getters.getZObjectTypeByRowId( rowId ) ).toStrictEqual( type );
			} );

			it( 'returns the type id if the type is a literal', () => {
				const rowId = 0;
				const type = {
					Z1K1: 'Z4',
					Z4K1: 'Z11'
				};
				state.zobject = zobjectToRows( {
					Z1K1: type
				} );

				expect( getters.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_MONOLINGUALSTRING );
			} );

			it( 'returns the terminal type id if the type is a literal and contains nested literals', () => {
				const rowId = 0;
				const type = {
					Z1K1: 'Z4',
					Z4K1: {
						Z1K1: 'Z4',
						Z4K1: 'Z11'
					}
				};
				state.zobject = zobjectToRows( {
					Z1K1: type
				} );

				expect( getters.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_MONOLINGUALSTRING );
			} );
		} );

		describe( 'getDepthByRowId', () => {
			beforeEach( () => {
				context.state = {};
				context.state.zobject = zobjectToRows( {
					Z2K3: { // rowId = 1
						Z1K1: 'Z12',
						Z12K1: [ 'Z11',
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'test' // rowId = 18
							}
						]
					}
				} );

				context.getters.getChildrenByParentRowId =
				zobjectModule.getters.getChildrenByParentRowId( context.state );
				context.getters.getRowById =
				zobjectModule.getters.getRowById( context.state );
				context.getters.getDepthByRowId =
				zobjectModule.getters.getDepthByRowId( context.state, context.getters );
			} );

			it( 'should return 0 if the row is not found', () => {
				const rowId = 100;

				expect( context.getters.getDepthByRowId( rowId ) ).toBe( 0 );
			} );

			it( 'should return 0 if the row has no parent', () => {
				const rowId = 0;

				expect( context.getters.getDepthByRowId( rowId ) ).toBe( 0 );
			} );

			it( 'should return the correct depth when the row has a parent', () => {
				const rowId = 1;

				expect( context.getters.getDepthByRowId( rowId ) ).toBe( 1 );
			} );

			it( 'should return the correct depth for nested parents', () => {
				const rowId = 18;

				expect( context.getters.getDepthByRowId( rowId ) ).toBe( 5 );
			} );
		} );

		describe( 'getParentRowId', () => {
			beforeEach( () => {
				context.state = {};
				context.state.zobject = zobjectToRows( {
					Z2K3: { // rowId = 1
						Z1K1: 'Z12', // rowId = 2
						Z12K1: [ 'Z11' ]
					}
				} );

				context.getters.getChildrenByParentRowId =
				zobjectModule.getters.getChildrenByParentRowId( context.state );
				context.getters.getRowById =
				zobjectModule.getters.getRowById( context.state );
				context.getters.getParentRowId = zobjectModule.getters.getParentRowId( context.state, context.getters );
			} );

			it( 'returns undefined if row is not found', () => {
				expect( context.getters.getParentRowId( 100 ) ).toBe( undefined );
			} );

			it( 'should return the parent rowId of a given rowId', () => {
				const rowId = 2;

				expect( context.getters.getParentRowId( rowId ) ).toBe( 1 );
			} );

			it( 'should return undefined if the rowId has no parent', () => {
				const rowId = 0;

				expect( context.getters.getParentRowId( rowId ) ).toBeUndefined();
			} );
		} );

		describe( 'getNextRowId', () => {
			beforeEach( () => {
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId;
			} );

			it( 'should return 0 if zobject is empty', () => {
				expect( context.getters.getNextRowId( [] ) ).toBe( 0 );
			} );

			it( 'should return the next available rowId', () => {
				context.state = {
					zobject: tableDataToRowObjects( [
						{ id: 0, value: Constants.ROW_VALUE_OBJECT },
						{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
						{ id: 2, key: Constants.Z_STRING_VALUE, value: 'string value', parent: 0 }
					] )
				};
				expect( context.getters.getNextRowId( context.state ) ).toBe( 3 );
			} );
		} );

		describe( 'getMapValueByKey', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
			} );

			it( 'returns undefined when row not found', () => {
				const rowId = 1;
				const key = 'errors';
				const expected = undefined;
				const result = zobjectModule.getters.getMapValueByKey( state, getters )( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns undefined when row is not a map', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z6',
					Z6K1: 'not a map'
				} );
				const rowId = 0;
				const key = 'errors';
				const expected = undefined;
				const result = zobjectModule.getters.getMapValueByKey( state, getters )( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns undefined when map is empty', () => {
				state.zobject = zobjectToRows( {
					Z1K1: { Z1K1: 'Z7', Z7K1: 'Z883', Z883K1: 'Z6', Z883K2: 'Z1' },
					K1: [ { Z1K1: 'Z7', Z7K1: 'Z882', Z882K1: 'Z6', Z882K2: 'Z2' } ]
				} );
				const rowId = 0;
				const key = 'errors';
				const expected = undefined;
				const result = zobjectModule.getters.getMapValueByKey( state, getters )( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns undefined when map item has no key', () => {
				state.zobject = zobjectToRows( {
					Z1K1: { Z1K1: 'Z7', Z7K1: 'Z883', Z883K1: 'Z6', Z883K2: 'Z1' },
					K1: [ { Z1K1: 'Z7', Z7K1: 'Z882', Z882K1: 'Z6', Z882K2: 'Z2' },
						{ // first item of the map
							Z1K1: { Z1K1: 'Z7', Z7K1: 'Z882', Z882K1: 'Z6', Z882K2: 'Z2' }
						}
					]
				} );
				const rowId = 0;
				const key = 'errors';
				const expected = undefined;
				const result = zobjectModule.getters.getMapValueByKey( state, getters )( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns undefined when key not found', () => {
				state.zobject = zobjectToRows( {
					Z1K1: { Z1K1: 'Z7', Z7K1: 'Z883', Z883K1: 'Z6', Z883K2: 'Z1' },
					K1: [ { Z1K1: 'Z7', Z7K1: 'Z882', Z882K1: 'Z6', Z882K2: 'Z2' },
						{ // first item of the map
							Z1K1: { Z1K1: 'Z7', Z7K1: 'Z882', Z882K1: 'Z6', Z882K2: 'Z2' },
							K1: 'errors',
							K2: 'some error'
						}
					]
				} );
				const rowId = 0;
				const key = 'xenarthans';
				const expected = undefined;
				const result = zobjectModule.getters.getMapValueByKey( state, getters )( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns value given a map key', () => {
				state.zobject = zobjectToRows( {
					Z1K1: { Z1K1: 'Z7', Z7K1: 'Z883', Z883K1: 'Z6', Z883K2: 'Z1' },
					K1: [ { Z1K1: 'Z7', Z7K1: 'Z882', Z882K1: 'Z6', Z882K2: 'Z2' },
						{ // first item of the map
							Z1K1: { Z1K1: 'Z7', Z7K1: 'Z882', Z882K1: 'Z6', Z882K2: 'Z2' },
							K1: 'errors',
							K2: 'some error'
						}
					]
				} );
				const rowId = 0;
				const key = 'errors';
				const expected = { id: 45, key: 'K2', parent: 28, value: Constants.ROW_VALUE_OBJECT };
				const result = zobjectModule.getters.getMapValueByKey( state, getters )( rowId, key );
				expect( result ).toEqual( expected );
			} );
		} );

		describe( 'getZKeyIsIdentity', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZFunctionCallArguments = zobjectModule.getters.getZFunctionCallArguments( state, getters );
				getters.getZFunctionCallFunctionId = zobjectModule.getters.getZFunctionCallFunctionId( state, getters );
				getters.getZObjectAsJsonById = zobjectModule.getters.getZObjectAsJsonById( state, getters );
				getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
				getters.getZBooleanValue = zobjectModule.getters.getZBooleanValue( state, getters );
			} );

			it( 'returns true when the is identity field is a reference to true', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					Z3K4: 'Z41'
				} );
				const rowId = 0;
				const result = zobjectModule.getters.getZKeyIsIdentity( state, getters )( rowId );
				expect( result ).toBe( true );
			} );

			it( 'returns true when the is identity field is the literal object true', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z41' }
				} );
				const rowId = 0;
				const result = zobjectModule.getters.getZKeyIsIdentity( state, getters )( rowId );
				expect( result ).toBe( true );
			} );

			it( 'returns false when the is identity field is undefined', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
				} );
				const rowId = 0;
				const result = zobjectModule.getters.getZKeyIsIdentity( state, getters )( rowId );
				expect( result ).toBe( false );
			} );

			it( 'returns false when the is identity field is a reference to false', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					Z3K4: 'Z42'
				} );
				const rowId = 0;
				const result = zobjectModule.getters.getZKeyIsIdentity( state, getters )( rowId );
				expect( result ).toBe( false );
			} );

			it( 'returns false when the is identity field is the literal object false', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z42' }
				} );
				const rowId = 0;
				const result = zobjectModule.getters.getZKeyIsIdentity( state, getters )( rowId );
				expect( result ).toBe( false );
			} );
		} );

		describe( 'getZKeyTypeRowId', () => {
			let getters;
			beforeEach( () => {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
			} );

			it( 'returns undefined if the object is not a key', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'something else'
				} );
				const rowId = 0;
				const result = zobjectModule.getters.getZKeyTypeRowId( state, getters )( rowId );
				expect( result ).toBe( undefined );
			} );

			it( 'returns undefined if the key type field does not exist', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					Z3K4: 'Z41'
				} );
				const rowId = 0;
				const result = zobjectModule.getters.getZKeyTypeRowId( state, getters )( rowId );
				expect( result ).toBe( undefined );
			} );

			it( 'returns the rowId of the key type field', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K1: 'Z6', // rowId = 4
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					Z3K4: 'Z41'
				} );
				const rowId = 0;
				const result = zobjectModule.getters.getZKeyTypeRowId( state, getters )( rowId );
				expect( result ).toBe( 4 );
			} );
		} );

		describe( 'getConverterIdentity', () => {
			beforeEach( () => {
				state = { zobject: [] };
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
			} );

			it( 'returns undefined if rowId is undefined', () => {
				const rowId = undefined;
				const type = Constants.Z_SERIALISER;
				const expected = undefined;
				const result = zobjectModule.getters.getConverterIdentity( state, getters )( rowId, type );
				expect( result ).toBe( expected );
			} );

			it( 'returns undefined if type is undefined', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z64',
					Z64K1: 'Z12345',
					Z64K2: 'Z6',
					Z64K3: { Z1K1: 'Z16', Z16K1: 'Z600', Z16K2: '()=>true' },
					Z64K4: 'Int'
				} );
				const rowId = 0;
				const type = undefined;
				const expected = undefined;
				const result = zobjectModule.getters.getConverterIdentity( state, getters )( rowId, type );
				expect( result ).toBe( expected );
			} );

			it( 'returns undefined if object is not a converter', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'not a converter'
				} );
				const rowId = 0;
				const type = 'Z11';
				const expected = undefined;
				const result = zobjectModule.getters.getConverterIdentity( state, getters )( rowId, type );
				expect( result ).toBe( expected );
			} );

			it( 'returns the identity of the Serialiser', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z64',
					Z64K1: 'Z12345',
					Z64K2: 'Z6',
					Z64K3: { Z1K1: 'Z16', Z16K1: 'Z600', Z16K2: '()=>true' },
					Z64K4: 'Int'
				} );
				const rowId = 0;
				const type = 'Z64';
				const expected = 'Z12345';
				const result = zobjectModule.getters.getConverterIdentity( state, getters )( rowId, type );
				expect( result ).toBe( expected );
			} );

			it( 'returns the identity of the Deserialiser', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z46',
					Z46K1: 'Z12345',
					Z46K2: 'Z6',
					Z46K3: { Z1K1: 'Z16', Z16K1: 'Z600', Z16K2: '()=>true' },
					Z46K4: 'Int'
				} );
				const rowId = 0;
				const type = 'Z46';
				const expected = 'Z12345';
				const result = zobjectModule.getters.getConverterIdentity( state, getters )( rowId, type );
				expect( result ).toBe( expected );
			} );
		} );

		describe( 'validateGenericType', () => {
			let getters;
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
			} );

			it( 'unset reference is not valid', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z9',
					Z9K1: ''
				} );

				const actual = getters.validateGenericType( 0 );
				const expected = [ { rowId: 0, isValid: false } ];

				expect( actual ).toEqual( expected );
			} );

			it( 'set reference is valid', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z9',
					Z9K1: 'Z6'
				} );

				const actual = getters.validateGenericType( 0 );
				const expected = [ { rowId: 0, isValid: true } ];

				expect( actual ).toEqual( expected );
			} );

			it( 'unset function call is not valid', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z7',
					Z7K1: ''
				} );

				const actual = getters.validateGenericType( 0 );
				const expected = [ { rowId: 0, isValid: false } ];

				expect( actual ).toEqual( expected );
			} );

			it( 'unset function call argument is not valid', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z7',
					Z7K1: 'Z881', // rowId 0
					Z881K1: '' // rowId 7
				} );

				const actual = getters.validateGenericType( 0 );
				const expected = [ { rowId: 0, isValid: true }, { rowId: 7, isValid: false } ];

				expect( actual ).toEqual( expected );
			} );

			it( 'nested function call argument is not valid', () => {
				state.zobject = zobjectToRows( {
					Z1K1: 'Z7',
					Z7K1: 'Z881', // rowId 0
					Z881K1: { // rowId 7
						Z1K1: 'Z7',
						Z7K1: 'Z881',
						Z881K1: { // rowId 14
							Z1K1: 'Z9',
							Z9K1: ''
						}
					}
				} );

				const actual = getters.validateGenericType( 0 );
				const expected = [
					{ rowId: 0, isValid: true },
					{ rowId: 7, isValid: true },
					{ rowId: 14, isValid: false }
				];

				expect( actual ).toEqual( expected );
			} );
		} );
	} );

	describe( 'Mutations', () => {
		describe( 'setZObject', () => {
			it( 'Updates the zobject', () => {
				const zobject = zobjectToRows( {
					Z1K1: 'Z2',
					Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
					Z2K2: '',
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [
							'Z11'
						]
					}
				} );
				zobjectModule.mutations.setZObject( state, zobject );
				expect( state.zobject ).toEqual( zobject );
			} );
		} );
	} );

	describe( 'Actions', () => {
		describe( 'initializeView', () => {
			it( 'calls initializeCreateNewPage when creating new page', () => {
				mw.config = {
					get: jest.fn( () => ( {
						createNewPage: true,
						runFunction: false,
						zId: null
					} ) )
				};
				zobjectModule.actions.initializeView( context );
				expect( context.dispatch ).toHaveBeenCalledWith( 'initializeCreateNewPage' );
			} );

			it( 'calls initializeEvaluateFunction when opening the function evaluator', () => {
				mw.config = {
					get: jest.fn( () => ( {
						createNewPage: false,
						runFunction: true,
						zId: null
					} ) )
				};
				zobjectModule.actions.initializeView( context );
				expect( context.dispatch ).toHaveBeenCalledWith( 'initializeEvaluateFunction' );
			} );

			it( 'calls initializeEvaluateFunction when no info available', () => {
				mw.config = {
					get: jest.fn( () => ( {
						createNewPage: false,
						runFunction: false,
						zId: null
					} ) )
				};
				zobjectModule.actions.initializeView( context );
				expect( context.dispatch ).toHaveBeenCalledWith( 'initializeEvaluateFunction' );
			} );

			it( 'calls initializeRootZObject when viewing or editing an object', () => {
				mw.config = {
					get: jest.fn( () => ( {
						createNewPage: false,
						runFunction: false,
						zId: 'Z10000'
					} ) )
				};
				zobjectModule.actions.initializeView( context );
				expect( context.dispatch ).toHaveBeenCalledWith( 'initializeRootZObject', 'Z10000' );
			} );

			it( 'Initialize ZObject, create new page', () => {
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				context.getters = {
					getStoredObject: () => ( { Z2K2: { Z1K1: 'Z4' } } )
				};

				const expectedChangeTypePayload = { id: 0, type: Constants.Z_PERSISTENTOBJECT };
				const expectedRootObject = { id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.commit ).toHaveBeenCalledTimes( 5 );
				expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setCreateNewPage', true );
				expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z0' );
				expect( context.commit ).toHaveBeenCalledWith( 'pushRow', expectedRootObject );
				expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', expectedChangeTypePayload );
				expect( context.commit ).toHaveBeenCalledWith( 'setInitialized', true );
			} );

			it( 'Initialize ZObject, create new page, initial value for Z2K2', () => {
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						zid: Constants.Z_BOOLEAN,
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				context.state = {
					zobject: zobjectToRows( blankPersistentObject )
				};
				context.getters = {
					getStoredObject: () => ( { Z2K2: { Z1K1: 'Z4' } } )
				};

				const expectedChangeTypePayload = { id: 0, type: Constants.Z_PERSISTENTOBJECT };
				const expectedRootObject = { id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT };
				const expectedZ2K2ChangeTypePayload = { id: 7, type: Constants.Z_BOOLEAN, literal: true };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.commit ).toHaveBeenCalledTimes( 5 );
				expect( context.dispatch ).toHaveBeenCalledTimes( 3 );
				expect( context.commit ).toHaveBeenCalledWith( 'setCreateNewPage', true );
				expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z0' );
				expect( context.commit ).toHaveBeenCalledWith( 'pushRow', expectedRootObject );
				expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', expectedChangeTypePayload );
				expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
				expect( context.commit ).toHaveBeenCalledWith( 'setInitialized', true );
			} );

			it( 'Initialize ZObject, create new page, non-ZID value as initial', () => {
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						zid: 'banana',
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				context.state = {
					zobject: zobjectToRows( blankPersistentObject )
				};
				context.getters = {
					getStoredObject: () => undefined
				};

				const expectedZ2K2ChangeTypePayload = { id: 7, type: 'banana' };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
				expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
			} );

			it( 'Initialize ZObject, create new page, non-type value as initial', () => {
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						zid: 'Z801',
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				context.state = {
					zobject: zobjectToRows( blankPersistentObject )
				};
				context.getters = {
					getStoredObject: () => ( { Z2K2: { Z1K1: 'Z8' } } )
				};

				const expectedZ2K2ChangeTypePayload = { id: 3, type: 'Z801' };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.dispatch ).toHaveBeenCalledTimes( 2 );
				expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
			} );

			it( 'Initialize ZObject, create new page, lowercase ZID', () => {
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						zid: 'z8',
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				context.state = {
					zobject: zobjectToRows( blankPersistentObject )
				};
				context.getters = {
					getStoredObject: () => ( { Z2K2: { Z1K1: 'Z8' } } )
				};

				const expectedZ2K2ChangeTypePayload = { id: 7, type: Constants.Z_FUNCTION };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
			} );

			it( 'Initialize ZObject, create new page, ZObject key passed as initial', () => {
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						zid: 'Z14K1',
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				context.state = {
					zobject: zobjectToRows( blankPersistentObject )
				};

				const expectedZ2K2ChangeTypePayload = { id: 7, type: 'Z14K1' };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
			} );

			it( 'Initialize ZObject, create new page, quasi-valid ZID', () => {
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						zid: 'Z8s',
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				context.state = {
					zobject: zobjectToRows( blankPersistentObject )
				};

				const expectedZ2K2ChangeTypePayload = { id: 7, type: 'Z8s' };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
			} );

			it( 'initialize ZObject for an old revision', () => {
				const response = { query: { wikilambdaload_zobjects: {
					Z10001: { data: {} }
				} } };
				const getMock = jest.fn().mockResolvedValueOnce( response );
				mw.Api = jest.fn( () => ( { get: getMock } ) );
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						title: 'Z10001',
						oldid: '10002'
					}
				} ) );

				const expectedPayload = {
					action: 'query',
					list: 'wikilambdaload_zobjects',
					format: 'json',
					wikilambdaload_get_dependencies: 'false',
					wikilambdaload_language: undefined,
					wikilambdaload_zids: 'Z10001',
					wikilambdaload_revisions: '10002'
				};

				zobjectModule.actions.initializeRootZObject( context, 'Z10001' );

				expect( getMock ).toHaveBeenCalledWith( expectedPayload );
			} );

			it( 'initialize ZObject without revision', () => {
				const response = { query: { wikilambdaload_zobjects: {
					Z10001: { data: {} }
				} } };
				const getMock = jest.fn().mockResolvedValueOnce( response );
				mw.Api = jest.fn( () => ( { get: getMock } ) );
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						title: 'Z10001'
					}
				} ) );

				const expectedPayload = {
					action: 'query',
					list: 'wikilambdaload_zobjects',
					format: 'json',
					wikilambdaload_get_dependencies: 'false',
					wikilambdaload_language: undefined,
					wikilambdaload_zids: 'Z10001',
					wikilambdaload_revisions: undefined
				};

				zobjectModule.actions.initializeRootZObject( context, 'Z10001' );

				expect( getMock ).toHaveBeenCalledWith( expectedPayload );
			} );

			describe( 'initializeRootZObject', () => {
				beforeEach( () => {
					context.getters.getViewMode = false;
				} );

				it( 'initializes empty description and alias fields', async () => {
					// Initial ZObject
					const Z1234 = {
						Z1K1: 'Z2',
						Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
						Z2K2: 'test',
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [
								'Z11',
								{
									Z1K1: 'Z11',
									Z11K1: 'Z1002',
									Z11K2: 'test'
								}
							]
						}
					};

					// Mock responses
					const mockApiResponse = {
						batchcomplete: '',
						query: {
							wikilambdaload_zobjects: {
								Z1234: {
									success: '',
									data: Z1234
								}
							}
						}
					};
					const getMock = jest.fn().mockResolvedValueOnce( mockApiResponse );
					mw.Api = jest.fn( () => ( { get: getMock } ) );

					const expectedZObjectJson = {
						Z1K1: 'Z2',
						Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
						Z2K2: 'test',
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [
								'Z11',
								{
									Z1K1: 'Z11',
									Z11K1: 'Z1002',
									Z11K2: 'test'
								}
							]
						},
						Z2K4: {
							Z1K1: 'Z32',
							Z32K1: [ 'Z31' ]
						},
						Z2K5: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11' ]
						}
					};

					// Expected data
					const expectedFetchZidsPayload = {
						zids: [ 'Z1', 'Z2', 'Z6', 'Z1234', 'Z12', 'Z11', 'Z1002', 'Z32', 'Z31' ]
					};

					await zobjectModule.actions.initializeRootZObject( context, 'Z1234' );

					expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
					expect( context.commit ).toHaveBeenCalledTimes( 5 );
					expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z1234' );
					expect( context.commit ).toHaveBeenCalledWith( 'saveMultilingualDataCopy', expectedZObjectJson );
					expect( context.commit ).toHaveBeenCalledWith( 'setZObject', expect.anything() );
					expect( context.commit ).toHaveBeenCalledWith( 'setInitialized', true );
					expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', expectedFetchZidsPayload );
				} );

				describe( 'For users with type editing permissions', () => {
					beforeEach( () => {
						context.getters.userCanEditTypes = true;
					} );

					it( 'initializes undefined type functions', async () => {
						// Initial ZObject
						const Z1234 = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3' ],
								Z4K7: [ 'Z46' ],
								Z4K8: [ 'Z64' ]
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};

						// Mock responses
						const mockApiResponse = {
							batchcomplete: '',
							query: {
								wikilambdaload_zobjects: {
									Z1234: {
										success: '',
										data: Z1234
									}
								}
							}
						};
						const getMock = jest.fn().mockResolvedValueOnce( mockApiResponse );
						mw.Api = jest.fn( () => ( { get: getMock } ) );

						const expectedZObjectJson = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3' ],
								Z4K3: { Z1K1: 'Z9', Z9K1: '' },
								Z4K4: { Z1K1: 'Z9', Z9K1: '' },
								Z4K5: { Z1K1: 'Z9', Z9K1: '' },
								Z4K6: { Z1K1: 'Z9', Z9K1: '' },
								Z4K7: [ 'Z46' ],
								Z4K8: [ 'Z64' ]
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};

						await zobjectModule.actions.initializeRootZObject( context, 'Z1234' );

						expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
						expect( context.commit ).toHaveBeenCalledTimes( 5 );
						expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z1234' );
						expect( context.commit ).toHaveBeenCalledWith( 'saveMultilingualDataCopy', expectedZObjectJson );
						expect( context.commit ).toHaveBeenCalledWith( 'setZObject', expect.anything() );
						expect( context.commit ).toHaveBeenCalledWith( 'setInitialized', true );
					} );

					it( 'initializes undefined identity flags for every key', async () => {
						// Initial ZObject
						const Z1234 = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3',
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K2', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: 'Z41' },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K3', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K4', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: 'Z42' }
								],
								Z4K3: 'Z10001',
								Z4K4: 'Z10002',
								Z4K5: 'Z10003',
								Z4K6: 'Z10004',
								Z4K7: [ 'Z46' ],
								Z4K8: [ 'Z64' ]
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};

						// Mock responses
						const mockApiResponse = {
							batchcomplete: '',
							query: {
								wikilambdaload_zobjects: {
									Z1234: {
										success: '',
										data: Z1234
									}
								}
							}
						};
						const getMock = jest.fn().mockResolvedValueOnce( mockApiResponse );
						mw.Api = jest.fn( () => ( { get: getMock } ) );

						const expectedZObjectJson = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3',
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: { Z1K1: 'Z40', Z40K1: 'Z42' } },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K2', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: 'Z41' },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K3', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: { Z1K1: 'Z40', Z40K1: 'Z42' } },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K4', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: 'Z42' }
								],
								Z4K3: 'Z10001',
								Z4K4: 'Z10002',
								Z4K5: 'Z10003',
								Z4K6: 'Z10004',
								Z4K7: [ 'Z46' ],
								Z4K8: [ 'Z64' ]
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};

						await zobjectModule.actions.initializeRootZObject( context, 'Z1234' );

						expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
						expect( context.commit ).toHaveBeenCalledTimes( 5 );
						expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z1234' );
						expect( context.commit ).toHaveBeenCalledWith( 'saveMultilingualDataCopy', expectedZObjectJson );
						expect( context.commit ).toHaveBeenCalledWith( 'setZObject', expect.anything() );
						expect( context.commit ).toHaveBeenCalledWith( 'setInitialized', true );
					} );

					it( 'initializes undefined converter lists for type editor', async () => {
						// Initial ZObject
						const Z1234 = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3' ],
								Z4K3: 'Z10001',
								Z4K4: 'Z10002',
								Z4K5: 'Z10003',
								Z4K6: 'Z10004'
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};

						// Mock responses
						const mockApiResponse = {
							batchcomplete: '',
							query: {
								wikilambdaload_zobjects: {
									Z1234: {
										success: '',
										data: Z1234
									}
								}
							}
						};
						const getMock = jest.fn().mockResolvedValueOnce( mockApiResponse );
						mw.Api = jest.fn( () => ( { get: getMock } ) );

						const expectedZObjectJson = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3' ],
								Z4K3: 'Z10001',
								Z4K4: 'Z10002',
								Z4K5: 'Z10003',
								Z4K6: 'Z10004',
								Z4K7: [ 'Z46' ],
								Z4K8: [ 'Z64' ]
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};

						await zobjectModule.actions.initializeRootZObject( context, 'Z1234' );

						expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
						expect( context.commit ).toHaveBeenCalledTimes( 5 );
						expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z1234' );
						expect( context.commit ).toHaveBeenCalledWith( 'saveMultilingualDataCopy', expectedZObjectJson );
						expect( context.commit ).toHaveBeenCalledWith( 'setZObject', expect.anything() );
						expect( context.commit ).toHaveBeenCalledWith( 'setInitialized', true );
					} );
				} );

				describe( 'For users without type editing permissions', () => {
					beforeEach( () => {
						context.getters.userCanEditTypes = false;
					} );

					it( 'does not initialize undefined keys and type keys to falsy values', async () => {
						// Initial ZObject
						const Z1234 = {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z1234' },
							Z2K2: {
								Z1K1: 'Z4',
								Z4K1: 'Z1234',
								Z4K2: [ 'Z3',
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K1', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K2', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: 'Z41' },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K3', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] } },
									{ Z1K1: 'Z3', Z3K1: 'Z6', Z3K2: 'Z1234K4', Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }, Z3K4: 'Z42' }
								]
							},
							Z2K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							},
							Z2K4: {
								Z1K1: 'Z32',
								Z32K1: [ 'Z31' ]
							},
							Z2K5: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11' ]
							}
						};

						// Mock responses
						const mockApiResponse = {
							batchcomplete: '',
							query: {
								wikilambdaload_zobjects: {
									Z1234: {
										success: '',
										data: Z1234
									}
								}
							}
						};
						const getMock = jest.fn().mockResolvedValueOnce( mockApiResponse );
						mw.Api = jest.fn( () => ( { get: getMock } ) );

						await zobjectModule.actions.initializeRootZObject( context, 'Z1234' );

						expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
						expect( context.commit ).toHaveBeenCalledTimes( 5 );
						expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z1234' );
						expect( context.commit ).toHaveBeenCalledWith( 'saveMultilingualDataCopy', Z1234 );
						expect( context.commit ).toHaveBeenCalledWith( 'setZObject', expect.anything() );
						expect( context.commit ).toHaveBeenCalledWith( 'setInitialized', true );
					} );
				} );
			} );

			it( 'Initialize evaluate function call page', () => {
				const expectedChangeTypePayload = { id: 0, type: Constants.Z_FUNCTION_CALL };
				const expectedRootObject = { id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT };
				context.state = {
					zobject: []
				};
				context.getters.getStoredObject = () => ( { Z1K1: 'test', Z2K1: 'test' } );
				zobjectModule.actions.initializeEvaluateFunction( context );

				expect( context.commit ).toHaveBeenCalledTimes( 4 );
				expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z0' );
				expect( context.commit ).toHaveBeenCalledWith( 'pushRow', expectedRootObject );
				expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', expectedChangeTypePayload );
				expect( context.commit ).toHaveBeenCalledWith( 'setInitialized', true );
			} );
		} );

		describe( 'recalculateTypedListKeys', () => {
			// In the event that a ZList item is removed, the indeces of the remaining items need to be updated.
			// This is to prevent a null value from appearing in the generated JSON array.
			it( 'does not change a correct indexed list', () => {
				const initialList = [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z2K2', parent: 0, value: Constants.ROW_VALUE_ARRAY },
					{ id: 2, key: '0', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'Z9' },
					{ id: 4, key: 'Z9K1', parent: 2, value: 'Z6' },
					{ id: 5, key: '1', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z6' },
					{ id: 7, key: 'Z6K1', parent: 5, value: 'one' },
					{ id: 8, key: '2', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z6' },
					{ id: 10, key: 'Z6K1', parent: 8, value: 'two' }
				];
				context.state = { zobject: tableDataToRowObjects( initialList ) };
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId(
					context.state );
				context.commit = jest.fn( ( mutationType, payload ) => {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				} );

				zobjectModule.actions.recalculateTypedListKeys( context, 1 );
				expect( context.state.zobject ).toEqual( initialList );
			} );

			it( 'recalculates indices for list with gaps', () => {
				const initialList = [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z2K2', parent: 0, value: Constants.ROW_VALUE_ARRAY },
					{ id: 2, key: '0', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'Z9' },
					{ id: 4, key: 'Z9K1', parent: 2, value: 'Z6' },
					{ id: 5, key: '3', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z6' },
					{ id: 7, key: 'Z6K1', parent: 5, value: 'one' },
					{ id: 8, key: '7', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z6' },
					{ id: 10, key: 'Z6K1', parent: 8, value: 'two' }
				];

				context.state = { zobject: tableDataToRowObjects( initialList ) };
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId(
					context.state );
				context.commit = jest.fn( ( mutationType, payload ) => {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				} );

				zobjectModule.actions.recalculateTypedListKeys( context, 1 );

				// Set indices to [0, 1, 2]
				initialList[ 5 ].key = '1';
				initialList[ 8 ].key = '2';
				expect( context.state.zobject ).toEqual( initialList );
			} );
		} );

		describe( 'removeRow', () => {
			const tableData = [
				{ id: 0, key: undefined, parent: undefined, value: 1 },
				{ id: 1, key: 'Z1K1', parent: 0, value: 1 },
				{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
				{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
				{ id: 4, key: 'Z2K2', parent: 0, value: 1 },
				{ id: 5, key: 'Z1K1', parent: 4, value: 1 },
				{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
				{ id: 7, key: 'Z9K1', parent: 5, value: 'Z61' },
				{ id: 8, key: 'Z61K1', parent: 4, value: 1 },
				{ id: 9, key: 'Z1K1', parent: 8, value: 'Z6' },
				{ id: 10, key: 'Z6K1', parent: 8, value: 'some language code' },
				{ id: 11, key: 'Z2K3', parent: 0, value: 1 },
				{ id: 12, key: 'Z1K1', parent: 11, value: 1 },
				{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
				{ id: 14, key: 'Z9K1', parent: 12, value: 'Z12' },
				{ id: 15, key: 'Z12K1', parent: 11, value: 2 },
				{ id: 16, key: '0', parent: 15, value: 1 },
				{ id: 17, key: 'Z1K1', parent: 16, value: 'Z9' },
				{ id: 18, key: 'Z9K1', parent: 16, value: 'Z11' },
				{ id: 19, key: '1', parent: 15, value: 1 },
				{ id: 20, key: 'Z1K1', parent: 19, value: 1 },
				{ id: 21, key: 'Z1K1', parent: 20, value: 'Z9' },
				{ id: 22, key: 'Z9K1', parent: 20, value: 'Z11' },
				{ id: 23, key: 'Z11K1', parent: 19, value: 1 },
				{ id: 24, key: 'Z1K1', parent: 23, value: 'Z9' },
				{ id: 25, key: 'Z9K1', parent: 23, value: 'Z1002' },
				{ id: 26, key: 'Z11K2', parent: 19, value: 1 },
				{ id: 27, key: 'Z1K1', parent: 26, value: 'Z6' },
				{ id: 28, key: 'Z6K1', parent: 26, value: 'some label' }
			];

			beforeEach( () => {
				// Mock initial state
				context.state = { zobject: tableDataToRowObjects( tableData ) };

				// Run getters from zobject module
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId(
					context.state );

				// Spy on commit:
				context.commit = jest.fn( ( mutationType, payload ) => {
					// Run mutations from the zobject module
					if ( mutationType in zobjectModule.mutations ) {
						zobjectModule.mutations[ mutationType ]( context.state, payload );
					}
				} );
			} );

			it( 'does nothing if rowId is undefined', () => {
				const rowId = undefined;
				zobjectModule.actions.removeRow( context, rowId );
				expect( context.state.zobject ).toEqual( tableData );
				expect( context.commit ).not.toHaveBeenCalled();
			} );

			it( 'does nothing if rowId is not found', () => {
				const rowId = 30;
				zobjectModule.actions.removeRow( context, rowId );
				expect( context.state.zobject ).toEqual( tableData );
				expect( context.commit ).not.toHaveBeenCalled();
			} );

			it( 'removes the row Id and no children', () => {
				const rowId = 19;
				zobjectModule.actions.removeRow( context, rowId );

				expect( context.commit ).toHaveBeenCalledTimes( 2 );

				// parent row doesn't exist
				const parentRow = context.state.zobject.find( ( row ) => row.id === rowId );
				expect( parentRow ).toBe( undefined );

				// all child rows still exist
				const children = [ 20, 21, 22, 23, 24, 25, 26, 27, 28 ];
				const childRows = context.state.zobject.filter( ( row ) => children.includes( row.id ) );
				expect( childRows.length ).toBe( children.length );
			} );
		} );

		describe( 'removeRowChildren', () => {
			const tableData = [
				{ id: 0, key: undefined, parent: undefined, value: 1 },
				{ id: 1, key: 'Z1K1', parent: 0, value: 1 },
				{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
				{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
				{ id: 4, key: 'Z2K2', parent: 0, value: 1 },
				{ id: 5, key: 'Z1K1', parent: 4, value: 1 },
				{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
				{ id: 7, key: 'Z9K1', parent: 5, value: 'Z61' },
				{ id: 8, key: 'Z61K1', parent: 4, value: 1 },
				{ id: 9, key: 'Z1K1', parent: 8, value: 'Z6' },
				{ id: 10, key: 'Z6K1', parent: 8, value: 'some language code' },
				{ id: 11, key: 'Z2K3', parent: 0, value: 1 },
				{ id: 12, key: 'Z1K1', parent: 11, value: 1 },
				{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
				{ id: 14, key: 'Z9K1', parent: 12, value: 'Z12' },
				{ id: 15, key: 'Z12K1', parent: 11, value: 2 },
				{ id: 16, key: '0', parent: 15, value: 1 },
				{ id: 17, key: 'Z1K1', parent: 16, value: 'Z9' },
				{ id: 18, key: 'Z9K1', parent: 16, value: 'Z11' },
				{ id: 19, key: '1', parent: 15, value: 1 },
				{ id: 20, key: 'Z1K1', parent: 19, value: 1 },
				{ id: 21, key: 'Z1K1', parent: 20, value: 'Z9' },
				{ id: 22, key: 'Z9K1', parent: 20, value: 'Z11' },
				{ id: 23, key: 'Z11K1', parent: 19, value: 1 },
				{ id: 24, key: 'Z1K1', parent: 23, value: 'Z9' },
				{ id: 25, key: 'Z9K1', parent: 23, value: 'Z1002' },
				{ id: 26, key: 'Z11K2', parent: 19, value: 1 },
				{ id: 27, key: 'Z1K1', parent: 26, value: 'Z6' },
				{ id: 28, key: 'Z6K1', parent: 26, value: 'some label' }
			];

			beforeEach( () => {
				// Mock initial state
				context.state = { zobject: tableDataToRowObjects( tableData ) };

				// Run getters from zobject module
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId(
					context.state );

				// Spy on commit:
				context.commit = jest.fn( ( mutationType, payload ) => {
					// Run mutations from the zobject module
					if ( mutationType in zobjectModule.mutations ) {
						zobjectModule.mutations[ mutationType ]( context.state, payload );
					}
				} );
				context.dispatch = jest.fn( ( actionType, payload ) => {
					zobjectModule.actions[ actionType ]( context, payload );
				} );
			} );

			it( 'does nothing if rowId is undefined', () => {
				const rowId = undefined;
				zobjectModule.actions.removeRowChildren( context, { rowId } );
				expect( context.state.zobject ).toEqual( tableData );
				expect( context.commit ).not.toHaveBeenCalled();
			} );

			it( 'does nothing if rowId is not found', () => {
				const rowId = 30;
				zobjectModule.actions.removeRowChildren( context, { rowId } );
				expect( context.state.zobject ).toEqual( tableData );
				expect( context.commit ).not.toHaveBeenCalled();
			} );

			it( 'removes the child rows if removeParent is set to false', () => {
				const rowId = 19;
				const children = [ 20, 21, 22, 23, 24, 25, 26, 27, 28 ];

				zobjectModule.actions.removeRowChildren( context, { rowId } );
				expect( context.commit ).toHaveBeenCalledTimes( children.length * 2 );

				// parent row still exists
				const parentRow = context.state.zobject.find( ( row ) => row.id === rowId );
				expect( parentRow.id ).toBe( rowId );

				// no child rows exist
				const childRows = context.state.zobject.filter( ( row ) => children.includes( row.id ) );
				expect( childRows.length ).toBe( 0 );
			} );

			it( 'removes the child and parent rows if removeParent is set to true', () => {
				const rowId = 19;
				const children = [ 20, 21, 22, 23, 24, 25, 26, 27, 28 ];

				zobjectModule.actions.removeRowChildren( context, { rowId, removeParent: true } );
				expect( context.commit ).toHaveBeenCalledTimes( children.length * 2 + 2 );

				// parent row doesn't exist
				const parentRow = context.state.zobject.find( ( row ) => row.id === rowId );
				expect( parentRow ).toBe( undefined );

				// no child rows exist
				const childRows = context.state.zobject.filter( ( row ) => children.includes( row.id ) );
				expect( childRows.length ).toBe( 0 );
			} );
		} );

		describe( 'recalculateKeys', () => {
			beforeEach( () => {
				context.state = { zobject: [] };
				context.getters.getCurrentZObjectId = 'Z999';
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId(
					context.state );
				context.commit = jest.fn( ( mutationType, payload ) => {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				} );
			} );

			it( 'does not change arguments that are correctly numbered', () => {
				const argList = {
					Z8K1: [ 'Z17', // row Id 1
						{
							Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K1', // row Id 14
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						},
						{
							Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K2', // row Id 32
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ] }
						}
					]
				};
				context.state.zobject = zobjectToRows( argList );

				// Recalculate keys
				zobjectModule.actions.recalculateKeys( context, { listRowId: 1, key: 'Z17K2' } );

				expect( context.getters.getRowById( 14 ).value ).toEqual( 'Z999K1' );
				expect( context.getters.getRowById( 32 ).value ).toEqual( 'Z999K2' );
			} );

			it( 'renumbers argument keys to sequential numbers', () => {
				const argList = {
					Z8K1: [ 'Z17', // row Id 1
						{
							Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K2', // row Id 14
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						},
						{
							Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K7', // row Id 32
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ] }
						}
					]
				};
				context.state.zobject = zobjectToRows( argList );

				// Recalculate keys
				zobjectModule.actions.recalculateKeys( context, { listRowId: 1, key: 'Z17K2' } );

				expect( context.getters.getRowById( 14 ).value ).toEqual( 'Z999K1' );
				expect( context.getters.getRowById( 32 ).value ).toEqual( 'Z999K2' );
			} );

			it( 'renumbers type keys', () => {
				const type = {
					Z1K1: 'Z4',
					Z4K1: [ 'Z3', // rowId = 4
						{
							Z1K1: 'Z3',
							Z3K1: 'Z6',
							Z3K2: 'Z999K6', // rowId = 17
							Z3K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11',
									{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'one' }
								]
							}
						},
						{
							Z1K1: 'Z3',
							Z3K1: 'Z6',
							Z3K2: 'Z999K3', // rowId = 45
							Z3K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11',
									{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'two' }
								]
							}
						}
					]
				};
				context.state.zobject = zobjectToRows( type );

				// Recalculate keys
				zobjectModule.actions.recalculateKeys( context, { listRowId: 4, key: 'Z3K2' } );

				expect( context.getters.getRowById( 17 ).value ).toEqual( 'Z999K1' );
				expect( context.getters.getRowById( 45 ).value ).toEqual( 'Z999K2' );
			} );
		} );

		describe( 'injectZObjectFromRowId', () => {
			beforeEach( () => {
				context.state = {
					zobject: zobjectToRows( {
						Z1K1: 'Z2',
						Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
						Z2K2: '',
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11' ]
						}
					} ),
					errors: {}
				};
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
				// Mutations
				context.commit = jest.fn( ( mutationType, payload ) => {
					if ( mutationType in zobjectModule.mutations ) {
						zobjectModule.mutations[ mutationType ]( context.state, payload );
					} else if ( mutationType in errorModule.mutations ) {
						errorModule.mutations[ mutationType ]( context.state, payload );
					}
				} );
				// Actions
				context.dispatch = jest.fn( ( actionType, payload ) => {
					zobjectModule.actions[ actionType ]( context, payload );
					return {
						then: ( fn ) => fn()
					};
				} );
			} );

			it( 'injects string zobject value', () => {
				const zObject = 'stringness';
				const expected = [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'Z6' },
					{ id: 6, key: 'Z6K1', parent: 4, value: 'Z0' },
					{ id: 7, key: 'Z2K2', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 10, key: 'Z2K3', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 11, key: 'Z1K1', parent: 10, value: Constants.ROW_VALUE_OBJECT },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'Z9' },
					{ id: 13, key: 'Z9K1', parent: 11, value: 'Z12' },
					{ id: 14, key: 'Z12K1', parent: 10, value: Constants.ROW_VALUE_ARRAY },
					{ id: 15, key: '0', parent: 14, value: Constants.ROW_VALUE_OBJECT },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'Z9' },
					{ id: 17, key: 'Z9K1', parent: 15, value: 'Z11' },
					// New value:
					{ id: 18, key: 'Z1K1', parent: 7, value: 'Z6' },
					{ id: 19, key: 'Z6K1', parent: 7, value: 'stringness' }
				];

				zobjectModule.actions.injectZObjectFromRowId( context, {
					rowId: 7,
					value: zObject
				} );

				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'injects array of strings into zobject value', () => {
				const zObject = [ 'Z6', 'stringful', 'stringlord' ];
				const expected = [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'Z6' },
					{ id: 6, key: 'Z6K1', parent: 4, value: 'Z0' },
					{ id: 7, key: 'Z2K2', parent: 0, value: Constants.ROW_VALUE_ARRAY },
					{ id: 10, key: 'Z2K3', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 11, key: 'Z1K1', parent: 10, value: Constants.ROW_VALUE_OBJECT },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'Z9' },
					{ id: 13, key: 'Z9K1', parent: 11, value: 'Z12' },
					{ id: 14, key: 'Z12K1', parent: 10, value: Constants.ROW_VALUE_ARRAY },
					{ id: 15, key: '0', parent: 14, value: Constants.ROW_VALUE_OBJECT },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'Z9' },
					{ id: 17, key: 'Z9K1', parent: 15, value: 'Z11' },
					// New value:
					{ id: 18, key: '0', parent: 7, value: Constants.ROW_VALUE_OBJECT },
					{ id: 19, key: 'Z1K1', parent: 18, value: 'Z9' },
					{ id: 20, key: 'Z9K1', parent: 18, value: 'Z6' },
					{ id: 21, key: '1', parent: 7, value: Constants.ROW_VALUE_OBJECT },
					{ id: 22, key: 'Z1K1', parent: 21, value: 'Z6' },
					{ id: 23, key: 'Z6K1', parent: 21, value: 'stringful' },
					{ id: 24, key: '2', parent: 7, value: Constants.ROW_VALUE_OBJECT },
					{ id: 25, key: 'Z1K1', parent: 24, value: 'Z6' },
					{ id: 26, key: 'Z6K1', parent: 24, value: 'stringlord' }
				];

				zobjectModule.actions.injectZObjectFromRowId( context, {
					rowId: 7,
					value: zObject
				} );

				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'injects zobject into zobject value', () => {
				const zObject = {
					Z1K1: 'Z11',
					Z11K1: {
						Z1K1: 'Z60',
						Z60K1: 'pang'
					},
					Z11K2: 'Gñeee'
				};

				const expected = [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'Z6' },
					{ id: 6, key: 'Z6K1', parent: 4, value: 'Z0' },
					{ id: 7, key: 'Z2K2', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 10, key: 'Z2K3', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 11, key: 'Z1K1', parent: 10, value: Constants.ROW_VALUE_OBJECT },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'Z9' },
					{ id: 13, key: 'Z9K1', parent: 11, value: 'Z12' },
					{ id: 14, key: 'Z12K1', parent: 10, value: Constants.ROW_VALUE_ARRAY },
					{ id: 15, key: '0', parent: 14, value: Constants.ROW_VALUE_OBJECT },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'Z9' },
					{ id: 17, key: 'Z9K1', parent: 15, value: 'Z11' },
					// New value:
					{ id: 18, key: 'Z1K1', parent: 7, value: Constants.ROW_VALUE_OBJECT },
					{ id: 19, key: 'Z1K1', parent: 18, value: 'Z9' },
					{ id: 20, key: 'Z9K1', parent: 18, value: 'Z11' },
					{ id: 21, key: 'Z11K1', parent: 7, value: Constants.ROW_VALUE_OBJECT },
					{ id: 22, key: 'Z1K1', parent: 21, value: Constants.ROW_VALUE_OBJECT },
					{ id: 23, key: 'Z1K1', parent: 22, value: 'Z9' },
					{ id: 24, key: 'Z9K1', parent: 22, value: 'Z60' },
					{ id: 25, key: 'Z60K1', parent: 21, value: Constants.ROW_VALUE_OBJECT },
					{ id: 26, key: 'Z1K1', parent: 25, value: 'Z6' },
					{ id: 27, key: 'Z6K1', parent: 25, value: 'pang' },
					{ id: 28, key: 'Z11K2', parent: 7, value: Constants.ROW_VALUE_OBJECT },
					{ id: 29, key: 'Z1K1', parent: 28, value: 'Z6' },
					{ id: 30, key: 'Z6K1', parent: 28, value: 'Gñeee' }
				];

				zobjectModule.actions.injectZObjectFromRowId( context, {
					rowId: 7,
					value: zObject
				} );

				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'injects zobject into root', () => {
				const zObject = {
					Z1K1: 'Z11',
					Z11K1: {
						Z1K1: 'Z60',
						Z60K1: 'pang'
					},
					Z11K2: 'Gñeee'
				};

				const expected = [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 18, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 19, key: 'Z1K1', value: 'Z9', parent: 18 },
					{ id: 20, key: 'Z9K1', value: 'Z11', parent: 18 },
					{ id: 21, key: 'Z11K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 22, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 21 },
					{ id: 23, key: 'Z1K1', value: 'Z9', parent: 22 },
					{ id: 24, key: 'Z9K1', value: 'Z60', parent: 22 },
					{ id: 25, key: 'Z60K1', value: Constants.ROW_VALUE_OBJECT, parent: 21 },
					{ id: 26, key: 'Z1K1', value: 'Z6', parent: 25 },
					{ id: 27, key: 'Z6K1', value: 'pang', parent: 25 },
					{ id: 28, key: 'Z11K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 29, key: 'Z1K1', value: 'Z6', parent: 28 },
					{ id: 30, key: 'Z6K1', value: 'Gñeee', parent: 28 }
				];

				zobjectModule.actions.injectZObjectFromRowId( context, {
					rowId: 0,
					value: zObject
				} );

				expect( context.state.zobject ).toEqual( expected );
			} );
		} );

		describe( 'injectKeyValueFromRowId', () => {
			beforeEach( () => {
				context.state = {
					zobject: zobjectToRows( {
						Z1K1: 'Z7',
						Z7K1: 'Z881'
					} )
				};
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
				context.commit = jest.fn( ( mutationType, payload ) => {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				} );
			} );

			it( 'injects another key-value without removing the current ones', () => {
				const expected = [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z7' },
					{ id: 4, key: 'Z7K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'Z9' },
					{ id: 6, key: 'Z9K1', parent: 4, value: 'Z881' },
					// New key:
					{ id: 7, key: 'Z881K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 8, key: 'Z1K1', parent: 7, value: 'Z9' },
					{ id: 9, key: 'Z9K1', parent: 7, value: 'Z6' }
				];

				zobjectModule.actions.injectKeyValueFromRowId( context, {
					rowId: 0,
					key: 'Z881K1',
					value: 'Z6'
				} );

				expect( context.state.zobject ).toEqual( expected );
			} );
		} );

		describe( 'pushValuesToList', () => {
			beforeEach( () => {
				context.state = {
					zobject: zobjectToRows( { Z2K2: [ 'Z1' ] } )
				};
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
				context.getters.getNextArrayIndex = zobjectModule.getters.getNextArrayIndex( context.state, context.getters );
				context.commit = jest.fn( ( mutationType, payload ) => {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				} );
			} );

			it( 'does nothing if rowId does not exist', () => {
				const payload = { rowId: 100, values: [ 'one string' ] };
				const expected = [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z2K2', parent: 0, value: Constants.ROW_VALUE_ARRAY },
					{ id: 2, key: '0', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'Z9' },
					{ id: 4, key: 'Z9K1', parent: 2, value: 'Z1' }
				];

				zobjectModule.actions.pushValuesToList( context, payload );
				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'does nothing if rowId does not belong to a list', () => {
				const payload = { rowId: 2, values: [ 'one string' ] };
				const expected = [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z2K2', parent: 0, value: Constants.ROW_VALUE_ARRAY },
					{ id: 2, key: '0', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'Z9' },
					{ id: 4, key: 'Z9K1', parent: 2, value: 'Z1' }
				];

				zobjectModule.actions.pushValuesToList( context, payload );
				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'pushes one string into the parent list', () => {
				const payload = { rowId: 1, values: [ 'one string' ] };
				const expected = [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z2K2', parent: 0, value: Constants.ROW_VALUE_ARRAY },
					{ id: 2, key: '0', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'Z9' },
					{ id: 4, key: 'Z9K1', parent: 2, value: 'Z1' },
					{ id: 5, key: '1', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z6' },
					{ id: 7, key: 'Z6K1', parent: 5, value: 'one string' }
				];

				zobjectModule.actions.pushValuesToList( context, payload );
				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'pushes two strings into the parent list', () => {
				const payload = { rowId: 1, values: [ 'one string', 'another string' ] };
				const expected = [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z2K2', parent: 0, value: Constants.ROW_VALUE_ARRAY },
					{ id: 2, key: '0', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'Z9' },
					{ id: 4, key: 'Z9K1', parent: 2, value: 'Z1' },
					{ id: 5, key: '1', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z6' },
					{ id: 7, key: 'Z6K1', parent: 5, value: 'one string' },
					{ id: 8, key: '2', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z6' },
					{ id: 10, key: 'Z6K1', parent: 8, value: 'another string' }
				];

				zobjectModule.actions.pushValuesToList( context, payload );
				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'pushes one monolingual string into the parent list', () => {
				const payload = { rowId: 1, values: [ {
					Z1K1: Constants.Z_MONOLINGUALSTRING,
					Z11K1: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
					Z11K2: 'one monolingual'
				} ] };
				const expected = [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z2K2', parent: 0, value: Constants.ROW_VALUE_ARRAY },
					{ id: 2, key: '0', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'Z9' },
					{ id: 4, key: 'Z9K1', parent: 2, value: 'Z1' },
					{ id: 5, key: '1', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 6, key: 'Z1K1', parent: 5, value: Constants.ROW_VALUE_OBJECT },
					{ id: 7, key: 'Z1K1', parent: 6, value: 'Z9' },
					{ id: 8, key: 'Z9K1', parent: 6, value: 'Z11' },
					{ id: 9, key: 'Z11K1', parent: 5, value: Constants.ROW_VALUE_OBJECT },
					{ id: 10, key: 'Z1K1', parent: 9, value: 'Z9' },
					{ id: 11, key: 'Z9K1', parent: 9, value: 'Z1002' },
					{ id: 12, key: 'Z11K2', parent: 5, value: Constants.ROW_VALUE_OBJECT },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z6' },
					{ id: 14, key: 'Z6K1', parent: 12, value: 'one monolingual' }
				];

				zobjectModule.actions.pushValuesToList( context, payload );
				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'pushes a list into the parent list', () => {
				const payload = { rowId: 1, values: [ [ 'Z6' ] ] };
				const expected = [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z2K2', parent: 0, value: Constants.ROW_VALUE_ARRAY },
					{ id: 2, key: '0', parent: 1, value: Constants.ROW_VALUE_OBJECT },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'Z9' },
					{ id: 4, key: 'Z9K1', parent: 2, value: 'Z1' },
					{ id: 5, key: '1', parent: 1, value: Constants.ROW_VALUE_ARRAY },
					{ id: 6, key: '0', parent: 5, value: Constants.ROW_VALUE_OBJECT },
					{ id: 7, key: 'Z1K1', parent: 6, value: 'Z9' },
					{ id: 8, key: 'Z9K1', parent: 6, value: 'Z6' }
				];

				zobjectModule.actions.pushValuesToList( context, payload );
				expect( context.state.zobject ).toEqual( expected );
			} );
		} );

		describe( 'setZFunctionCallArguments', () => {
			beforeEach( () => {
				context.state = {
					objects: mockApiZids,
					zobject: zobjectToRows( {
						Z1K1: 'Z7',
						Z7K1: 'Z882',
						Z882K1: 'Z6', // rowId = 7
						Z882K2: 'Z1' // rowId = 10
					} ),
					errors: {}
				};

				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
				context.getters.getZFunctionCallArguments = zobjectModule.getters.getZFunctionCallArguments( context.state, context.getters );
				// Getters: library module
				context.getters.getInputsOfFunctionZid = libraryModule.getters.getInputsOfFunctionZid( context.state );
				context.getters.getStoredObject = libraryModule.getters.getStoredObject( context.state );
				context.getters.isEnumType = libraryModule.getters.isEnumType( context.state );
				context.getters.isCustomEnum = libraryModule.getters.isCustomEnum( context.state, context.getters );
				// Getters: addZObject module
				Object.keys( zobjectModule.modules.factory.getters ).forEach( ( key ) => {
					context.getters[ key ] =
						zobjectModule.modules.factory.getters[ key ](
							context.state,
							context.getters,
							{ zobjectModule: context.state },
							context.getters );
				} );
			} );

			it( 'unsets current args and sets none if functionId is null or undefined', () => {
				zobjectModule.actions.setZFunctionCallArguments( context, {
					parentId: 0,
					functionZid: null
				} );

				// Assert that existing arguments are deleted
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', { rowId: 7, removeParent: true } );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', { rowId: 10, removeParent: true } );
				// Assert that no new arguments are injected
				expect( context.dispatch ).not.toHaveBeenCalledWith( 'injectKeyValueFromRowId', expect.anything() );
				// Assert that no new zids are fetched
				expect( context.dispatch ).not.toHaveBeenCalledWith( 'fetchZids', expect.anything() );
			} );

			it( 'unsets current args and sets one function argument for the function Typed list', () => {
				zobjectModule.actions.setZFunctionCallArguments( context, {
					parentId: 0,
					functionZid: 'Z881'
				} );

				// Assert that existing arguments are deleted
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', { rowId: 7, removeParent: true } );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', { rowId: 10, removeParent: true } );

				// Assert that new arguments are injected
				const expectedArg = {
					rowId: 0,
					key: 'Z881K1',
					value: { Z1K1: 'Z9', Z9K1: '' }
				};
				expect( context.dispatch ).toHaveBeenCalledWith( 'injectKeyValueFromRowId', expectedArg );

				// Assert that new zids are fetched
				const expectedZids = { zids: [ 'Z881', 'Z1', 'Z9' ] };
				expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', expectedZids );
			} );

			it( 'sets three function arguments for the function If', () => {
				zobjectModule.actions.setZFunctionCallArguments( context, {
					parentId: 0,
					functionZid: 'Z802'
				} );

				// Assert that existing arguments are deleted
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', { rowId: 7, removeParent: true } );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', { rowId: 10, removeParent: true } );

				// Assert that new arguments are injected
				const expectedArgs = [ {
					rowId: 0,
					key: 'Z802K1',
					value: { Z1K1: 'Z40', Z40K1: { Z1K1: 'Z9', Z9K1: '' } }
				}, {
					rowId: 0,
					key: 'Z802K2',
					value: { Z1K1: { Z1K1: 'Z9', Z9K1: '' } }
				}, {
					rowId: 0,
					key: 'Z802K3',
					value: { Z1K1: { Z1K1: 'Z9', Z9K1: '' } }
				} ];
				expect( context.dispatch ).toHaveBeenCalledWith( 'injectKeyValueFromRowId', expectedArgs[ 0 ] );
				expect( context.dispatch ).toHaveBeenCalledWith( 'injectKeyValueFromRowId', expectedArgs[ 1 ] );
				expect( context.dispatch ).toHaveBeenCalledWith( 'injectKeyValueFromRowId', expectedArgs[ 2 ] );

				// Assert that new zids are fetched
				const expectedZids = { zids: [ 'Z802', 'Z1', 'Z40', 'Z9' ] };
				expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', expectedZids );
			} );

			it( 'makes no changes when the new function Id is the same as the old', () => {
				zobjectModule.actions.setZFunctionCallArguments( context, {
					parentId: 0,
					functionZid: Constants.Z_TYPED_PAIR
				} );

				// Assert that existing arguments are not deleted
				expect( context.dispatch ).not.toHaveBeenCalledWith( 'removeRowChildren', expect.anything() );
				// Assert that no new arguments are injected
				expect( context.dispatch ).not.toHaveBeenCalledWith( 'injectKeyValueFromRowId', expect.anything() );
				// Assert that no new zids are fetched
				expect( context.dispatch ).not.toHaveBeenCalledWith( 'fetchZids', expect.anything() );
			} );

			it( 'sets only the second argument when its parent is a tester result validation call', () => {
				context.state.zobject = zobjectToRows( {
					Z1K1: 'Z20',
					Z20K3: { // rowId = 4
						Z1K1: 'Z7',
						Z7K1: 'Z882'
					}
				} );
				const functionZid = 'Z882';
				zobjectModule.actions.setZFunctionCallArguments( context, {
					parentId: 4,
					functionZid
				} );

				// Assert that no arguments are not deleted
				expect( context.dispatch ).not.toHaveBeenCalledWith( 'removeRowChildren', expect.anything() );
				// Assert that only second argument is injected
				const expectedArg = {
					rowId: 4,
					key: 'Z882K2',
					value: { Z1K1: 'Z9', Z9K1: '' }
				};
				expect( context.dispatch ).toHaveBeenCalledWith( 'injectKeyValueFromRowId', expectedArg );
				// Assert that new zids are fetched
				const expectZids = { zids: [ 'Z882', 'Z1', 'Z9' ] };
				expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', expectZids );
			} );
		} );

		describe( 'setZImplementationContentType', () => {
			beforeEach( () => {
				context.state = { zobject: [], objects: [], errors: {} };
				// Getters
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
				context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
				// Getters: library module
				context.getters.getStoredObject = libraryModule.getters.getStoredObject( context.state );
				context.getters.isEnumType = libraryModule.getters.isEnumType( context.state );
				context.getters.isCustomEnum = libraryModule.getters.isCustomEnum( context.state, context.getters );
				// Getters: addZObject module
				Object.keys( zobjectModule.modules.factory.getters ).forEach( ( key ) => {
					context.getters[ key ] =
						zobjectModule.modules.factory.getters[ key ](
							context.state,
							context.getters,
							{ zobjectModule: context.state },
							context.getters );
				} );
			} );

			it( 'unsets composition (Z14K2) and sets code (Z14K3)', () => {
				context.state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K2: { // rowId = 7
						Z1K1: 'Z7',
						Z7K1: 'Z10002',
						Z10002K1: 'uno',
						Z10002K2: 'dos'
					}
				} );
				zobjectModule.actions.setZImplementationContentType( context, {
					parentId: 0,
					key: 'Z14K3'
				} );

				// Assert that current key is deleted
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', { rowId: 7, removeParent: true } );

				// Assert that new key is injected
				const expectedKey = {
					rowId: 0,
					key: 'Z14K3',
					value: { Z1K1: 'Z16', Z16K1: { Z1K1: 'Z9', Z9K1: '' }, Z16K2: '' }
				};
				expect( context.dispatch ).toHaveBeenCalledWith( 'injectKeyValueFromRowId', expectedKey );
			} );

			it( 'unsets code (Z14K3) and sets composition (Z14K2)', () => {
				context.state.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K3: { // rowId = 7
						Z1K1: 'Z16',
						Z16K1: 'Z600',
						Z16K2: '() => "hello world";'
					}
				} );
				zobjectModule.actions.setZImplementationContentType( context, {
					parentId: 0,
					key: 'Z14K2'
				} );

				// Assert that current key is deleted
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', { rowId: 7, removeParent: true } );

				// Assert that new key is injected
				const expectedKey = {
					rowId: 0,
					key: 'Z14K2',
					value: { Z1K1: 'Z7', Z7K1: { Z1K1: 'Z9', Z9K1: '' } }
				};
				expect( context.dispatch ).toHaveBeenCalledWith( 'injectKeyValueFromRowId', expectedKey );
			} );
		} );

		describe( 'setValueByRowIdAndPath', () => {
			beforeEach( () => {
				context.state = {
					zobject: zobjectToRows( {
						Z1K1: 'Z2',
						Z2K2: [ // rowId = 4
							'Z6',
							'Foo' // rowId = 8
						]
					} )
				};

				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
				context.getters.getNextArrayIndex = zobjectModule.getters.getNextArrayIndex( context.state, context.getters );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state, context.getters );
			} );

			describe( 'when value is a string', () => {
				it( 'should dispatch an action', () => {
					const payload = {
						rowId: 8,
						keyPath: [ Constants.Z_STRING_VALUE ],
						value: 'Test String'
					};

					zobjectModule.actions.setValueByRowIdAndPath( context, payload );

					expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
				} );

				it( 'should dispatch the setValueByRowId action with an object containing rowId and value', () => {
					const expectedStringValue = 'Test String';

					const payload = {
						rowId: 8,
						keyPath: [ Constants.Z_STRING_VALUE ],
						value: expectedStringValue
					};

					zobjectModule.actions.setValueByRowIdAndPath( context, payload );

					expect( context.dispatch ).toHaveBeenCalledWith( 'setValueByRowId', { rowId: 10, value: expectedStringValue } );
				} );

			} );

			describe( 'when value is an array', () => {
				it( 'should dispatch an action', () => {
					const payload = {
						rowId: 4,
						keyPath: [ '1', Constants.Z_STRING_VALUE ],
						value: [ Constants.Z_STRING ]
					};

					zobjectModule.actions.setValueByRowIdAndPath( context, payload );

					expect( context.dispatch ).toHaveBeenCalled();
				} );

				it( 'should dispatch the injectZObjectFromRowId action with an object containing rowId, value and append as false', () => {
					const expectedStringValue = 'Test String';
					const payload = {
						rowId: 4,
						keyPath: [ '1', Constants.Z_STRING_VALUE ],
						value: [ expectedStringValue ]
					};

					zobjectModule.actions.setValueByRowIdAndPath( context, payload );

					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', { append: false, rowId: 10, value: [ expectedStringValue ] } );
				} );

				describe( 'when append has been set', () => {
					it( 'should dispatch the injectZObjectFromRowId action with an object containing an append value that matches the set append value', () => {
						const expectedStringValue = 'Test String';
						const appendValue = true;

						const payload = {
							rowId: 4,
							keyPath: [ '1', Constants.Z_STRING_VALUE ],
							value: [ expectedStringValue ],
							append: appendValue
						};

						zobjectModule.actions.setValueByRowIdAndPath( context, payload );

						expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', { append: appendValue, rowId: 10, value: [ expectedStringValue ] } );
					} );
				} );

				describe( 'when the row could not be found', () => {
					it( 'does nothing if the row is invalid', () => {
						const payload = {
							rowId: null,
							keyPath: [ Constants.Z_STRING_VALUE ],
							value: 'Test String'
						};

						zobjectModule.actions.setValueByRowIdAndPath( context, payload );

						expect( context.dispatch ).toHaveBeenCalledTimes( 0 );
					} );

					it( 'does nothing if the row is not found', () => {
						const payload = {
							rowId: 100,
							keyPath: [ Constants.Z_STRING_VALUE ],
							value: 'Test String'
						};

						zobjectModule.actions.setValueByRowIdAndPath( context, payload );

						expect( context.dispatch ).toHaveBeenCalledTimes( 0 );
					} );

					it( 'does nothing if the path is not correct', () => {
						const payload = {
							rowId: 8,
							keyPath: [ Constants.Z_MONOLINGUALSTRING_VALUE ],
							value: 'Test String'
						};

						zobjectModule.actions.setValueByRowIdAndPath( context, payload );

						expect( context.dispatch ).toHaveBeenCalledTimes( 0 );
					} );
				} );
			} );
		} );

		describe( 'setValueByRowId', () => {
			beforeEach( () => {
				context.state = {
					zobject: zobjectToRows( {
						Z1K1: 'Z2',
						Z2K2: [
							'Z6',
							'Foo' // terminal value rowId = 10
						]
					} )
				};
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
			} );

			describe( 'when rowId is valid', () => {
				it( 'should call the setValueByRowIndex mutation with the correct rowIndex and value', () => {
					const expectedStringValue = 'Test String';
					const payload = {
						rowId: 10,
						value: expectedStringValue
					};

					zobjectModule.actions.setValueByRowId( context, payload );

					expect( context.commit ).toHaveBeenCalledWith( 'setValueByRowIndex', { index: 10, value: expectedStringValue } );
				} );
			} );

			describe( 'when rowId is invalid', () => {
				it( 'should not call setValueByRowIndex mutation', () => {
					const expectedStringValue = 'Test String';
					const payload = {
						rowId: null,
						value: expectedStringValue
					};

					zobjectModule.actions.setValueByRowId( context, payload );

					expect( context.commit ).not.toHaveBeenCalledWith( 'setValueByRowIndex' );
				} );
			} );
		} );

		describe( 'removeItemFromTypedList', () => {
			it( 'should do nothing if rowId does not exist', () => {
				const payload = { rowId: 4 };
				context.getters.getRowById = jest.fn( () => undefined );
				zobjectModule.actions.removeItemFromTypedList( context, payload );

				expect( context.dispatch ).toHaveBeenCalledTimes( 0 );
			} );

			it( 'should dispatch the removeRowChildren action with row id', () => {
				const payload = { rowId: 4 };
				context.getters.getRowById = jest.fn( () => ( { id: 4, parent: 3 } ) );
				zobjectModule.actions.removeItemFromTypedList( context, payload );

				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', { rowId: 4, removeParent: true } );
			} );

			it( 'should dispatch the recalculateTypedListKeys action with parent id', () => {
				const payload = { rowId: 4 };
				context.getters.getRowById = jest.fn( () => ( { id: 4, parent: 3 } ) );
				zobjectModule.actions.removeItemFromTypedList( context, payload );

				expect( context.dispatch ).toHaveBeenCalledWith( 'recalculateTypedListKeys', 3 );
			} );
		} );

		describe( 'removeItemsFromTypedList', () => {
			it( 'should dispatch a removeRowChildren action for each item in the list', () => {
				const payload = { parentRowId: 4, listItems: [ 11, 14 ] };
				zobjectModule.actions.removeItemsFromTypedList( context, payload );

				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', { rowId: 11, removeParent: true } );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeRowChildren', { rowId: 14, removeParent: true } );
			} );

			it( 'should dispatch the recalculateTypedListKeys actions with parent id', () => {
				const payload = { parentRowId: 4, listItems: [ 11, 14 ] };
				zobjectModule.actions.removeItemsFromTypedList( context, payload );

				expect( context.dispatch ).toHaveBeenCalledWith( 'recalculateTypedListKeys', 4 );
			} );
		} );

		describe( 'moveItemInTypedList', () => {
			let listRows;

			beforeEach( () => {
				listRows = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 2 },
					{ id: 1, key: '0', parent: 0, value: 1 },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z6' },
					{ id: 4, key: '1', parent: 0, value: 1 },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'Z6' },
					{ id: 6, key: 'Z6K1', parent: 4, value: 'one' },
					{ id: 7, key: '2', parent: 0, value: 1 },
					{ id: 8, key: 'Z1K1', parent: 7, value: 'Z6' },
					{ id: 9, key: 'Z6K1', parent: 7, value: 'two' },
					{ id: 10, key: '3', parent: 0, value: 1 },
					{ id: 11, key: 'Z1K1', parent: 10, value: 'Z6' },
					{ id: 12, key: 'Z6K1', parent: 10, value: 'three' },
					{ id: 13, key: '4', parent: 0, value: 1 },
					{ id: 14, key: 'Z1K1', parent: 13, value: 'Z6' },
					{ id: 15, key: 'Z6K1', parent: 13, value: 'four' }
				] );

				context.state = {
					zobject: listRows
				};

				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );

				context.commit = jest.fn( ( mutationType, payload ) => {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				} );
			} );

			it( 'moves an item one position earlier in the list', () => {
				expect( context.state.zobject[ 1 ].key ).toBe( '0' );
				expect( context.state.zobject[ 4 ].key ).toBe( '1' );
				expect( context.state.zobject[ 7 ].key ).toBe( '2' );
				expect( context.state.zobject[ 10 ].key ).toBe( '3' );
				expect( context.state.zobject[ 13 ].key ).toBe( '4' );

				const payload = {
					parentRowId: 0,
					key: '2',
					offset: -1
				};
				zobjectModule.actions.moveItemInTypedList( context, payload );

				expect( context.state.zobject[ 1 ].key ).toBe( '0' );
				expect( context.state.zobject[ 7 ].key ).toBe( '1' );
				expect( context.state.zobject[ 4 ].key ).toBe( '2' );
				expect( context.state.zobject[ 10 ].key ).toBe( '3' );
				expect( context.state.zobject[ 13 ].key ).toBe( '4' );
			} );

			it( 'moves an item one position later in the list', () => {
				expect( context.state.zobject[ 1 ].key ).toBe( '0' );
				expect( context.state.zobject[ 4 ].key ).toBe( '1' );
				expect( context.state.zobject[ 7 ].key ).toBe( '2' );
				expect( context.state.zobject[ 10 ].key ).toBe( '3' );
				expect( context.state.zobject[ 13 ].key ).toBe( '4' );

				const payload = {
					parentRowId: 0,
					key: '3',
					offset: 1
				};
				zobjectModule.actions.moveItemInTypedList( context, payload );

				expect( context.state.zobject[ 1 ].key ).toBe( '0' );
				expect( context.state.zobject[ 4 ].key ).toBe( '1' );
				expect( context.state.zobject[ 7 ].key ).toBe( '2' );
				expect( context.state.zobject[ 13 ].key ).toBe( '3' );
				expect( context.state.zobject[ 10 ].key ).toBe( '4' );
			} );
		} );
	} );
} );
