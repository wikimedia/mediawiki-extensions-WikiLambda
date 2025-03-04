/*!
 * WikiLambda unit test suite for the zobject Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { setActivePinia, createPinia } = require( 'pinia' );
const { mockStoredObjects } = require( '../../fixtures/mocks.js' );
const { tableDataToRowObjects, zobjectToRows } = require( '../../helpers/zObjectTableHelpers.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

const blankPersistentObject = {
	Z1K1: 'Z2',
	Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
	Z2K2: '', // content rowId = 7
	Z2K3: {
		Z1K1: 'Z12',
		Z12K1: [ 'Z11' ]
	}
};

const mockMWGetConfig = ( configVars ) => {
	mw.config = {
		get: jest.fn( ( varName ) => configVars[ varName ] || null )
	};
};

let postMock,
	postWithEditTokenMock;

describe( 'zobject Pinia store', () => {
	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.zobject = [];
		store.objects = mockStoredObjects;
		store.errors = {};

		// Mock mw.config.get
		mockMWGetConfig( {
			wgWikiLambda: {
				zlang: 'en',
				zlangZid: 'Z1002'
			},
			wgWikifunctionsBaseUrl: null
		} );

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
		getMock = jest.fn().mockResolvedValue();
		mw.Api = jest.fn( () => ( { get: getMock } ) );

		mw.Api = jest.fn( () => ( {
			post: postMock,
			postWithEditToken: postWithEditTokenMock,
			get: getMock
		} ) );
	} );

	describe( 'Getters', () => {
		describe( 'getRowIndexById', () => {
			it( 'Returns row index by its rowId when index and id are aligned', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'Z6' },
					{ id: 2, key: 'Z6K1', parent: 0, value: 'some string' }
				] );

				expect( store.getRowIndexById( 2 ) ).toEqual( 2 );
			} );

			it( 'Returns row index by its rowId when index and id are misaligned', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT },
					{ id: 10, key: 'Z1K1', parent: 0, value: 'Z6' },
					{ id: 20, key: 'Z6K1', parent: 0, value: 'some string' }
				] );

				expect( store.getRowIndexById( 20 ) ).toEqual( 2 );
			} );
		} );

		describe( 'getNextKey', () => {
			beforeEach( () => {
				Object.defineProperty( store, 'getCurrentZObjectId', {
					value: 'Z0'
				} );
			} );

			it( 'Returns first ID for argument', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z8',
					Z8K1: [ 'Z17' ]
				} );
				expect( store.getNextKey ).toEqual( 'Z0K1' );
			} );

			it( 'Returns second ID for argument', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z8',
					Z8K1: [ 'Z17', {
						Z1K1: 'Z17',
						Z17K1: 'Z6',
						Z17K2: 'Z0K1'
					} ]
				} );
				expect( store.getNextKey ).toEqual( 'Z0K2' );
			} );
		} );

		describe( 'getRowById', () => {
			it( 'returns undefined where the input id is undefined', () => {
				expect( store.getRowById( undefined ) ).toEqual( undefined );
			} );

			it( 'returns undefined where the row id is not found', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( store.getRowById( 3 ) ).toEqual( undefined );
			} );

			it( 'returns Row given its row id', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( store.getRowById( 2 ) )
					.toEqual( { id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 } );
			} );
		} );

		describe( 'getZObjectKeyByRowId', () => {

			it( 'returns undefined where the input id is undefined', () => {
				expect( store.getZObjectKeyByRowId( undefined ) )
					.toEqual( undefined );
			} );

			it( 'returns undefined where the row id is not found', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( store.getZObjectKeyByRowId( 3 ) ).toEqual( undefined );
			} );

			it( 'returns row key given its row id', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( store.getZObjectKeyByRowId( 2 ) )
					.toEqual( Constants.Z_STRING_VALUE );
			} );
		} );

		describe( 'getZObjectValueByRowId', () => {

			it( 'returns undefined where the input id is undefined', () => {
				expect( store.getZObjectValueByRowId( undefined ) )
					.toEqual( undefined );
			} );

			it( 'returns undefined where the row id is not found', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( store.getZObjectValueByRowId( 3 ) ).toEqual( undefined );
			} );

			it( 'returns row key given its row id', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( store.getZObjectValueByRowId( 2 ) )
					.toEqual( 'stringiform' );
			} );
		} );

		describe( 'getChildrenByParentRowId', () => {

			it( 'returns undefined when input is undefined', () => {
				expect( store.getChildrenByParentRowId( undefined ) ).toEqual( [] );
			} );

			it( 'returns undefined when state is empty', () => {
				expect( store.getChildrenByParentRowId( 0 ) ).toEqual( [] );
			} );

			it( 'returns undefined where the row id is not found', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( store.getChildrenByParentRowId( 3 ) ).toEqual( [] );
			} );

			it( 'returns array of child rows given the parent row id', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				const children = store.getChildrenByParentRowId( 0 );
				expect( children ).toHaveLength( 2 );
				expect( children[ 0 ] )
					.toEqual( { id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 } );
				expect( children[ 1 ] )
					.toEqual( { id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 } );
			} );
		} );

		describe( 'getRowByKeyPath', () => {

			it( 'returns undefined when state is empty', () => {
				expect( store.getRowByKeyPath() ).toEqual( undefined );
			} );

			it( 'returns undefined when rowId doesn not exist', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( store.getRowByKeyPath( [], 3 ) ).toEqual( undefined );
			} );

			it( 'returns root row when called with default args', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( store.getRowByKeyPath() )
					.toEqual( { id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined } );
			} );

			it( 'returns row with no keyPath and non-root row id', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( store.getRowByKeyPath( [], 2 ) )
					.toEqual( { id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 } );
			} );

			it( 'returns row when length 1 keyPath and root row id', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( store.getRowByKeyPath( [ Constants.Z_STRING_VALUE ], 0 ) )
					.toEqual( { id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 } );
			} );

			it( 'returns undefined when keyPath is incorrect', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				expect( store.getRowByKeyPath( [ Constants.Z_FUNCTION_TESTERS ], 0 ) )
					.toEqual( undefined );
			} );

			it( 'returns correct row when keyPath is complex', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 3, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 16, key: 'Z1K1', value: 'Z6', parent: 3 },
					{ id: 17, key: 'Z6K1', value: '', parent: 3 }
				] );
				const keyPath = [ 'Z2K2', 'Z6K1' ];
				const expected = { key: 'Z6K1', value: '', parent: 3, id: 17 };
				expect( store.getRowByKeyPath( keyPath ) ).toEqual( expected );
			} );

			it( 'returns correct row when keyPath is complex, walks through objects and lists, and starts from non-root row', () => {
				store.zobject = tableDataToRowObjects( [
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
				expect( store.getRowByKeyPath( keyPath, rowId ) ).toEqual( expected );
			} );
		} );

		describe( 'getZObjectTerminalValue', () => {

			it( 'returns undefined when row is undefined', () => {
				const rowId = undefined;
				const terminalKey = '';
				const expected = undefined;
				expect( store.getZObjectTerminalValue( rowId, terminalKey ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				const rowId = 0;
				const terminalKey = '';
				const expected = undefined;
				expect( store.getZObjectTerminalValue( rowId, terminalKey ) )
					.toEqual( expected );
			} );

			it( 'returns terminal value of terminal row given its rowId', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				const rowId = 2;
				const terminalKey = '';
				const expected = 'stringiform';
				expect( store.getZObjectTerminalValue( rowId, terminalKey ) )
					.toEqual( expected );
			} );

			it( 'returns terminal value of existing key given a non terminal rowId', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'stringiform', parent: 0 }
				] );
				const rowId = 0;
				const terminalKey = Constants.Z_STRING_VALUE;
				const expected = 'stringiform';
				expect( store.getZObjectTerminalValue( rowId, terminalKey ) )
					.toEqual( expected );
			} );

			it( 'returns terminal value of nested objects given a non terminal rowId', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 0 },
					{ id: 2, key: Constants.Z_REFERENCE_ID, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 3, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 2 },
					{ id: 4, key: Constants.Z_REFERENCE_ID, value: 'Z10001', parent: 2 }
				] );
				const rowId = 2;
				const terminalKey = Constants.Z_REFERENCE_ID;
				const expected = 'Z10001';
				expect( store.getZObjectTerminalValue( rowId, terminalKey ) )
					.toEqual( expected );
			} );

			it( 'returns terminal value of nested objects given a non terminal rowId and starting from the root', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 0 },
					{ id: 2, key: Constants.Z_REFERENCE_ID, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 3, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 2 },
					{ id: 4, key: Constants.Z_REFERENCE_ID, value: 'Z10001', parent: 2 }
				] );
				const rowId = 0;
				const terminalKey = Constants.Z_REFERENCE_ID;
				const expected = 'Z10001';
				expect( store.getZObjectTerminalValue( rowId, terminalKey ) )
					.toEqual( expected );
			} );
		} );

		describe( 'getZFunctionCallFunctionId', () => {
			it( 'returns undefined when row is undefined', () => {
				const rowId = undefined;
				const expected = undefined;
				expect( store.getZFunctionCallFunctionId( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				const rowId = 30;
				const expected = undefined;
				expect( store.getZFunctionCallFunctionId( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns function Zid given rowId of the function call', () => {
				store.zobject = tableDataToRowObjects( [
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
				expect( store.getZFunctionCallFunctionId( rowId ) )
					.toEqual( expected );
			} );
		} );

		describe( 'getZFunctionCallArguments', () => {

			it( 'returns empty list when row is undefined', () => {
				const rowId = undefined;
				const expected = [];
				expect( store.getZFunctionCallArguments( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns undefined when row does not exist', () => {
				const rowId = 30;
				const expected = [];
				expect( store.getZFunctionCallArguments( rowId ) )
					.toEqual( expected );
			} );

			it( 'returns function Zid given rowId of the function call', () => {
				store.zobject = tableDataToRowObjects( [
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
				const args = store.getZFunctionCallArguments( rowId );
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

			it( 'returns undefined when the rowId is undefined', () => {
				const rowId = undefined;
				const expected = undefined;
				expect( store.getTypedListItemType( rowId ) ).toEqual( expected );
			} );

			it( 'returns undefined when the row does not exist', () => {
				const rowId = 0;
				const expected = undefined;
				expect( store.getTypedListItemType( rowId ) ).toEqual( expected );
			} );

			it( 'returns undefined when the row is not the start of a typed list', () => {
				store.zobject = zobjectToRows( {
					Z1K1: Constants.Z_STRING,
					Z6K1: 'stringiform'
				} );
				const rowId = 0;
				const expected = undefined;
				expect( store.getTypedListItemType( rowId ) ).toEqual( expected );
			} );

			it( 'returns type when it is defined as a reference', () => {
				store.zobject = zobjectToRows( {
					Z2K2: [ 'Z6', 'first string', 'second string' ]
				} );
				const rowId = 1;
				const expected = 'Z6';
				expect( store.getTypedListItemType( rowId ) ).toEqual( expected );
			} );

			it( 'returns type when it is defined as a function call', () => {
				store.zobject = zobjectToRows( {
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
				expect( store.getTypedListItemType( rowId ) ).toEqual( expected );
			} );
		} );

		describe( 'getZStringTerminalValue', () => {

			it( 'returns the terminal value of a zstring when rowId corresponds to parent object row', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: 'Z6K1', value: 'myString', parent: 0 }
				] );

				const expected = 'myString';
				expect( store.getZStringTerminalValue( 0 ) ).toBe( expected );
			} );

			it( 'returns the terminal value of a zstring when rowId corresponds to the row with the ZString value', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: 'Z6K1', value: 'myString', parent: 0 }
				] );

				const expected = 'myString';
				expect( store.getZStringTerminalValue( 2 ) ).toBe( expected );
			} );

			it( 'returns undefined if a non-existent rowId is provided', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: 'Z6K1', value: 'myString', parent: 0 }
				] );

				expect( store.getZStringTerminalValue( 3 ) ).toBeUndefined();
			} );
		} );

		describe( 'getZReferenceTerminalValue', () => {

			it( 'returns the terminal value of a zreference when rowId corresponds to the row with the reference value', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 0 },
					{ id: 2, key: 'Z9K1', value: 'Z10001', parent: 0 }
				] );

				const expected = 'Z10001';
				expect( store.getZReferenceTerminalValue( 2 ) ).toBe( expected );
			} );

			it( 'returns the terminal value of a zreference when rowId corresponds to parent object row', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 0 },
					{ id: 2, key: 'Z9K1', value: 'Z10001', parent: 0 }
				] );

				const expected = 'Z10001';
				expect( store.getZReferenceTerminalValue( 0 ) ).toBe( expected );
			} );

			it( 'returns undefined if a non-existent rowId is provided', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 0 },
					{ id: 2, key: 'Z9K1', value: 'Z10001', parent: 0 }
				] );

				expect( store.getZReferenceTerminalValue( 3 ) ).toBeUndefined();
			} );
		} );

		describe( 'getZArgumentReferenceTerminalValue', () => {
			it( 'returns the terminal value of a zArgumentReference when rowId corresponds to parent object row', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_ARGUMENT_REFERENCE, parent: 0 },
					{ id: 2, key: 'Z18K1', value: 1, parent: 0 },
					{ id: 3, key: 'Z1K1', value: Constants.Z_STRING, parent: 2 },
					{ id: 4, key: 'Z6K1', value: 'Z10001K1', parent: 2 }
				] );

				const expected = 'Z10001K1';
				expect( store.getZArgumentReferenceTerminalValue( 0 ) ).toBe( expected );
			} );

			it( 'returns undefined if a non-existent rowId is provided', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: 'Z1K1', value: Constants.Z_ARGUMENT_REFERENCE, parent: 0 },
					{ id: 2, key: 'Z18K1', value: 1, parent: 0 },
					{ id: 3, key: 'Z1K1', value: Constants.Z_STRING, parent: 2 },
					{ id: 4, key: 'Z6K1', value: 'Z10001K1', parent: 2 }
				] );

				expect( store.getZArgumentReferenceTerminalValue( 6 ) ).toBeUndefined();
			} );
		} );

		describe( 'ZMonolingualString', () => {
			describe( 'getZMonolingualTextValue', () => {
				beforeEach( () => {
					store.zobject = tableDataToRowObjects( [
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
					expect( store.getZMonolingualTextValue( 0 ) ).toBe( expected );
				} );

				it( 'should return undefined when an incorrect rowId is passed in', () => {
					expect( store.getZMonolingualTextValue( 4 ) ).toBeUndefined();
				} );
			} );

			describe( 'getZMonolingualLangValue', () => {

				it( 'gets the language value of a ZMonolingualString when the language is a Z_REFERENCE', () => {
					store.zobject = tableDataToRowObjects( [
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

					expect( store.getZMonolingualLangValue( 0 ) ).toBe( expected );
				} );

				it( 'gets the language value of a ZMonolingualString when the language is a Z_NATURAL_LANGUAGE', () => {
					store.zobject = tableDataToRowObjects( [
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

					expect( store.getZMonolingualLangValue( 0 ) ).toBe( expected );
				} );
			} );

			describe( 'getZMonolingualForLanguage', () => {

				it( 'returns monolingual string row in the given language if available', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11', // rowId = 4
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' },
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'en español' } // rowId = 18
						]
					} );
					const langZid = 'Z1003';
					const expected = { id: 18, key: '2', parent: 4, value: Constants.ROW_VALUE_OBJECT };
					const metadata = store.getZMonolingualForLanguage( langZid );
					expect( metadata ).toEqual( expected );
				} );

				it( 'returns undefined if the given language is not available', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' }
						]
					} );
					const langZid = 'Z1003';
					const metadata = store.getZMonolingualForLanguage( langZid );
					expect( metadata ).toBeUndefined();
				} );
			} );
		} );

		describe( 'ZMultilingualString', () => {
			describe( 'getZMultilingualLanguageList', () => {

				it( 'returns empty array when the row is not found', () => {
					const rowId = 0;
					const expected = [];
					const metadata = store.getZMultilingualLanguageList( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty array when the row does not contain an array', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ] // rowId = 4
					} );
					const rowId = 0;
					const expected = [];
					const metadata = store.getZMultilingualLanguageList( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty list when the multilingual string is empty', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ] // rowId = 4
					} );
					const rowId = 4;
					const expected = [];
					const metadata = store.getZMultilingualLanguageList( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with one item', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11', // rowId = 4
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'one item' }
						]
					} );
					const rowId = 4;
					const expected = [ 'Z1002' ];
					const metadata = store.getZMultilingualLanguageList( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with two items', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z12',
						Z12K1: [ // rowId = 4
							'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'one item' },
							{ Z1K1: 'Z11', Z11K1: 'Z1003', Z11K2: 'otro item' }
						]
					} );
					const rowId = 4;
					const expected = [ 'Z1002', 'Z1003' ];
					const metadata = store.getZMultilingualLanguageList( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );
		} );

		describe( 'ZMonolingualStringSet', () => {
			describe( 'getZMonolingualStringsetValues', () => {

				it( 'returns an empty array when row not found', () => {
					const rowId = 0;
					const expected = [];
					const returned = store.getZMonolingualStringsetValues( rowId );
					expect( returned ).toStrictEqual( expected );
				} );

				it( 'returns an empty array when object is not a ZMonolingualStringSet', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z32',
						Z32K1: [ 'Z31' ]
					} );
					const rowId = 0;
					const expected = [];
					const returned = store.getZMonolingualStringsetValues( rowId );
					expect( returned ).toStrictEqual( expected );
				} );

				it( 'returns an empty array when ZMonolingualStringset has an empty array', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z31',
						Z31K1: 'Z1002',
						Z31K2: [ 'Z6' ]
					} );
					const rowId = 0;
					const expected = [];
					const returned = store.getZMonolingualStringsetValues( rowId );
					expect( returned ).toStrictEqual( expected );
				} );

				it( 'returns an array with one item', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z31',
						Z31K1: 'Z1002',
						Z31K2: [ 'Z6', 'one' ]
					} );
					const rowId = 0;
					const expected = [ { rowId: 11, value: 'one' } ];
					const returned = store.getZMonolingualStringsetValues( rowId );
					expect( returned ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZMonolingualStringsetLang', () => {
				it( 'returns undefined when row not found', () => {
					const rowId = 0;
					const expected = undefined;
					const returned = store.getZMonolingualStringsetLang( rowId );
					expect( returned ).toStrictEqual( expected );
				} );

				it( 'returns undefined when object is not a ZMonolingualStringSet', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z32',
						Z32K1: [ 'Z31' ]
					} );
					const rowId = 0;
					const expected = undefined;
					const returned = store.getZMonolingualStringsetLang( rowId );
					expect( returned ).toStrictEqual( expected );
				} );

				it( 'returns language zid of ZMonolingualStringset', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z31',
						Z31K1: 'Z1002',
						Z31K2: [ 'Z6' ]
					} );
					const rowId = 0;
					const expected = 'Z1002';
					const returned = store.getZMonolingualStringsetLang( rowId );
					expect( returned ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZMonolingualStringsetForLanguage', () => {
				it( 'returns monolingual string row in the given language if available', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z32',
						Z32K1: [ 'Z31', // rowId = 4
							{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6' ] },
							{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'Z6' ] } // rowId = 19
						]
					} );
					const langZid = 'Z1003';
					const expected = { id: 19, key: '2', parent: 4, value: Constants.ROW_VALUE_OBJECT };
					const metadata = store.getZMonolingualStringsetForLanguage( langZid );
					expect( metadata ).toEqual( expected );
				} );

				it( 'returns undefined if the given language is not available', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z32',
						Z32K1: [ 'Z31',
							{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6' ] }
						]
					} );
					const langZid = 'Z1003';
					const metadata = store.getZMonolingualStringsetForLanguage( langZid );
					expect( metadata ).toBeUndefined();
				} );
			} );
		} );

		describe( 'ZPersistentObject', () => {
			describe( 'getZPersistentContentRowId', () => {

				it( 'returns undefined when the rowId is undefined', () => {
					const rowId = undefined;
					const expectedRowId = undefined;
					const contentRowId = store.getZPersistentContentRowId( rowId );
					expect( contentRowId ).toBe( expectedRowId );
				} );

				it( 'returns undefined when the row does not exist', () => {
					const rowId = 0;
					const expectedRowId = undefined;
					const contentRowId = store.getZPersistentContentRowId( rowId );
					expect( contentRowId ).toBe( expectedRowId );
				} );

				it( 'returns row where persistent object content/Z2K2 starts with default row (0)', () => {
					store.zobject = zobjectToRows( {
						Z1K1: 'Z2',
						Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
						Z2K2: Constants.ROW_VALUE_OBJECT
					} );
					const expectedRowId = 7;
					const contentRowId = store.getZPersistentContentRowId();
					expect( contentRowId ).toBe( expectedRowId );
				} );

				it( 'returns row where persistent object content/Z2K2 starts with input rowId', () => {
					// Force Z2 object to start at a different row
					store.zobject = zobjectToRows( {
						Z1K1: 'Z10000',
						Z10000K1: {
							Z1K1: 'Z2',
							Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
							Z2K2: Constants.ROW_VALUE_OBJECT
						}
					} );
					const rowId = 4;
					const expectedRowId = 11;
					const contentRowId = store.getZPersistentContentRowId( rowId );
					expect( contentRowId ).toBe( expectedRowId );
				} );
			} );

			describe( 'getZPersistentNameLangs', () => {

				it( 'returns empty array when the row is not found', () => {
					const rowId = 0;
					const expected = [];
					const metadata = store.getZPersistentNameLangs( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty list when the name multilingual string is empty', () => {
					store.zobject = zobjectToRows( {
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11' ]
						}
					} );
					const rowId = 0;
					const expected = [];
					const metadata = store.getZPersistentNameLangs( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with one item', () => {
					store.zobject = zobjectToRows( {
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'test' }
							]
						}
					} );
					const rowId = 0;
					const expected = [ 'Z1002' ];
					const metadata = store.getZPersistentNameLangs( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZPersistentName', () => {

				it( 'returns name row in the given language if available', () => {
					store.zobject = zobjectToRows( {
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
					const metadata = store.getZPersistentName( langZid );
					expect( metadata ).toEqual( expected );
				} );

				it( 'returns undefined if the given language is not available', () => {
					store.zobject = zobjectToRows( {
						Z2K3: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' }
							]
						}
					} );
					const langZid = 'Z1003';
					const expected = undefined;
					const metadata = store.getZPersistentName( langZid );
					expect( metadata ).toEqual( expected );
				} );
			} );

			describe( 'getZPersistentDescriptionLangs', () => {

				it( 'returns empty array when the row is not found', () => {
					const rowId = 0;
					const expected = [];
					const metadata = store.getZPersistentDescriptionLangs( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty list when the description multilingual string is empty', () => {
					store.zobject = zobjectToRows( {
						Z2K5: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11' ]
						}
					} );
					const rowId = 0;
					const expected = [];
					const metadata = store.getZPersistentDescriptionLangs( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with one item', () => {
					store.zobject = zobjectToRows( {
						Z2K5: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'test' }
							]
						}
					} );
					const rowId = 0;
					const expected = [ 'Z1002' ];
					const metadata = store.getZPersistentDescriptionLangs( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZPersistentDescription', () => {

				it( 'returns description row in the given language if available', () => {
					store.zobject = zobjectToRows( {
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
					const metadata = store.getZPersistentDescription( langZid );
					expect( metadata ).toEqual( expected );
				} );

				it( 'returns undefined if the given language is not available', () => {
					store.zobject = zobjectToRows( {
						Z2K5: {
							Z1K1: 'Z12',
							Z12K1: [ 'Z11',
								{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'in english' }
							]
						}
					} );
					const langZid = 'Z1003';
					const expected = undefined;
					const metadata = store.getZPersistentDescription( langZid );
					expect( metadata ).toEqual( expected );
				} );
			} );

			describe( 'getZPersistentAliasLangs', () => {

				it( 'returns empty array when the row is not found', () => {
					const rowId = 0;
					const expected = [];
					const metadata = store.getZPersistentAliasLangs( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty list when the alias multilingual string set is empty', () => {
					store.zobject = zobjectToRows( {
						Z2K4: {
							Z1K1: 'Z32',
							Z32K1: [ 'Z31' ]
						}
					} );
					const rowId = 0;
					const expected = [];
					const metadata = store.getZPersistentAliasLangs( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with one item', () => {
					store.zobject = zobjectToRows( {
						Z2K4: {
							Z1K1: 'Z32',
							Z32K1: [ 'Z31',
								{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6' ] }
							]
						}
					} );
					const rowId = 0;
					const expected = [ 'Z1002' ];
					const metadata = store.getZPersistentAliasLangs( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with multiple items', () => {
					store.zobject = zobjectToRows( {
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
					const metadata = store.getZPersistentAliasLangs( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZPersistentAlias', () => {

				it( 'returns alias row in the given language if available', () => {
					store.zobject = zobjectToRows( {
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
					const metadata = store.getZPersistentAlias( langZid );
					expect( metadata ).toEqual( expected );
				} );

				it( 'returns undefined if the given language is not available', () => {
					store.zobject = zobjectToRows( {
						Z2K4: {
							Z1K1: 'Z32',
							Z32K1: [ 'Z31',
								{ Z1K1: 'Z31', Z31K1: 'Z1002', Z31K2: [ 'Z6' ] }
							]
						}
					} );
					const langZid = 'Z1003';
					const expected = undefined;
					const metadata = store.getZPersistentAlias( langZid );
					expect( metadata ).toEqual( expected );
				} );
			} );

			describe( 'getMultilingualDataLanguages', () => {
				it( 'returns empty array when there is no metadata', () => {
					const expected = [];
					const current = store.getMultilingualDataLanguages();
					expect( current ).toStrictEqual( expected );
				} );

				it( 'returns array with one language', () => {
					Object.defineProperty( store, 'getZPersistentNameLangs', {
						value: () => [ 'Z1002' ]
					} );
					Object.defineProperty( store, 'getZPersistentDescriptionLangs', {
						value: () => [ 'Z1002' ]
					} );
					Object.defineProperty( store, 'getZPersistentAliasLangs', {
						value: () => [ 'Z1002' ]
					} );
					Object.defineProperty( store, 'getZFunctionInputLangs', {
						value: () => [ 'Z1002' ]
					} );

					const expected = [ 'Z1002' ];
					const current = store.getMultilingualDataLanguages();
					expect( current ).toStrictEqual( expected );
				} );

				it( 'returns array with four non overlapping languages', () => {
					Object.defineProperty( store, 'getZPersistentNameLangs', {
						value: () => [ 'Z1003' ]
					} );
					Object.defineProperty( store, 'getZPersistentDescriptionLangs', {
						value: () => [ 'Z1002' ]
					} );
					Object.defineProperty( store, 'getZPersistentAliasLangs', {
						value: () => [ 'Z1004' ]
					} );
					Object.defineProperty( store, 'getZFunctionInputLangs', {
						value: () => [ 'Z1006' ]
					} );

					const expected = [ 'Z1003', 'Z1002', 'Z1004', 'Z1006' ];
					const current = store.getMultilingualDataLanguages();
					expect( current ).toStrictEqual( expected );
				} );

				it( 'returns array with two overlapping languages', () => {
					Object.defineProperty( store, 'getZPersistentNameLangs', {
						value: () => [ 'Z1002', 'Z1003' ]
					} );
					Object.defineProperty( store, 'getZPersistentDescriptionLangs', {
						value: () => [ 'Z1002', 'Z1003' ]
					} );
					Object.defineProperty( store, 'getZPersistentAliasLangs', {
						value: () => [ 'Z1002', 'Z1003' ]
					} );
					Object.defineProperty( store, 'getZFunctionInputLangs', {
						value: () => [ 'Z1002', 'Z1003' ]
					} );

					const expected = [ 'Z1002', 'Z1003' ];
					const current = store.getMultilingualDataLanguages();
					expect( current ).toStrictEqual( expected );
				} );
			} );
		} );

		describe( 'getZImplementationFunctionRowId', () => {

			it( 'returns undefined when the rowId is undefined', () => {
				const rowId = undefined;
				const expectedRowId = undefined;
				const functionRowId = store.getZImplementationFunctionRowId( rowId );
				expect( functionRowId ).toBe( expectedRowId );
			} );

			it( 'returns undefined when the row does not exist', () => {
				const rowId = 0;
				const expectedRowId = undefined;
				const functionRowId = store.getZImplementationFunctionRowId( rowId );
				expect( functionRowId ).toBe( expectedRowId );
			} );

			it( 'returns row where target function object starts (key Z14K1)', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001'
				} );
				const rowId = 0;
				const expectedRowId = 4;
				const functionRowId = store.getZImplementationFunctionRowId( rowId );
				expect( functionRowId ).toBe( expectedRowId );
			} );
		} );

		describe( 'getZImplementationFunctionZid', () => {

			it( 'returns undefined when the rowId is undefined', () => {
				const rowId = undefined;
				const expected = undefined;
				const functionZid = store.getZImplementationFunctionZid( rowId );
				expect( functionZid ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', () => {
				const rowId = 0;
				const expected = undefined;
				const functionZid = store.getZImplementationFunctionZid( rowId );
				expect( functionZid ).toBe( expected );
			} );

			it( 'returns target function zid', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001'
				} );
				const rowId = 0;
				const expected = 'Z10001';
				const functionZid = store.getZImplementationFunctionZid( rowId );
				expect( functionZid ).toBe( expected );
			} );
		} );

		describe( 'getZImplementationContentType', () => {
			it( 'returns undefined when the rowId is undefined', () => {
				const rowId = undefined;
				const expected = undefined;
				const contentType = store.getZImplementationContentType( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', () => {
				const rowId = 0;
				const expected = undefined;
				const contentType = store.getZImplementationContentType( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns composition (key Z14K2)', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K2: { Z1K1: 'Z7', Z7K1: 'Z10002' }
				} );
				const rowId = 0;
				const expected = 'Z14K2';
				const contentType = store.getZImplementationContentType( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns code (key Z14K3)', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K3: { Z1K1: 'Z16', Z16K1: 'Z600', Z16K2: '() => "hello";' }
				} );
				const rowId = 0;
				const expected = 'Z14K3';
				const contentType = store.getZImplementationContentType( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns builtin (key Z14K4)', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K4: 'BUILTIN'
				} );
				const rowId = 0;
				const expected = 'Z14K4';
				const contentType = store.getZImplementationContentType( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns undefined if no key is found', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001'
				} );
				const rowId = 0;
				const expected = undefined;
				const contentType = store.getZImplementationContentType( rowId );
				expect( contentType ).toBe( expected );
			} );
		} );

		describe( 'getZImplementationContentRowId', () => {

			it( 'returns undefined when the rowId and key are undefined', () => {
				const rowId = undefined;
				const key = undefined;
				const expected = undefined;
				const contentRowId = store.getZImplementationContentRowId( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', () => {
				const rowId = 0;
				const key = 'Z14K2';
				const expected = undefined;
				const contentRowId = store.getZImplementationContentRowId( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );

			it( 'returns composition when available (key Z14K2)', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K2: { Z1K1: 'Z7', Z7K1: 'Z10002' }
				} );
				const rowId = 0;
				const key = 'Z14K2';
				const expected = 4;
				const contentRowId = store.getZImplementationContentRowId( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );

			it( 'returns code when available (key Z14K3)', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K3: { Z1K1: 'Z16', Z16K1: 'Z600', Z16K2: '() => "hello world";' }
				} );
				const rowId = 0;
				const key = 'Z14K3';
				const expected = 4;
				const contentRowId = store.getZImplementationContentRowId( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );

			it( 'returns undefined if given key is not found', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K2: { Z1K1: 'Z7', Z7K1: 'Z10002' }
				} );
				const rowId = 0;
				const key = 'Z14K3';
				const expected = undefined;
				const contentRowId = store.getZImplementationContentRowId( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );
		} );

		describe( 'getZCodeProgrammingLanguageRow', () => {

			it( 'returns undefined when the rowId is undefined', () => {
				const rowId = undefined;
				const expected = undefined;
				const lang = store.getZCodeProgrammingLanguageRow( rowId );
				expect( lang ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', () => {
				const rowId = 0;
				const expected = undefined;
				const lang = store.getZCodeProgrammingLanguageRow( rowId );
				expect( lang ).toBe( expected );
			} );

			it( 'returns the row that contains the programing language', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z16',
					Z16K1: 'Z600'
				} );

				const rowId = 0;
				const expected = { id: 4, key: Constants.Z_CODE_LANGUAGE, parent: 0, value: Constants.ROW_VALUE_OBJECT };
				const lang = store.getZCodeProgrammingLanguageRow( rowId );
				expect( lang ).toEqual( expected );
			} );
		} );

		describe( 'getZCodeString', () => {

			it( 'returns undefined when the rowId is undefined', () => {
				const rowId = undefined;
				const expected = undefined;
				const lang = store.getZCodeString( rowId );
				expect( lang ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', () => {
				const rowId = 0;
				const expected = undefined;
				const lang = store.getZCodeString( rowId );
				expect( lang ).toBe( expected );
			} );

			it( 'returns string value of the code', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z16',
					Z16K1: 'Z610',
					Z16K2: 'def Z10001:'
				} );
				const rowId = 0;
				const expected = 'def Z10001:';
				const lang = store.getZCodeString( rowId );
				expect( lang ).toBe( expected );
			} );
		} );

		describe( 'isInsideComposition', () => {

			it( 'returns false when the rowId is undefined', () => {
				const rowId = undefined;
				const expected = false;
				const result = store.isInsideComposition( rowId );
				expect( result ).toBe( expected );
			} );

			it( 'returns false when the rowId is not found', () => {
				const rowId = 10;
				const expected = false;
				const result = store.isInsideComposition( rowId );
				expect( result ).toBe( expected );
			} );

			it( 'returns false when the row is zero (root)', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z10002'
					}
				} );
				const rowId = 0;
				const expected = false;
				const result = store.isInsideComposition( rowId );
				expect( result ).toBe( expected );
			} );

			it( 'returns false when no parent has composition/Z14K2 key', () => {
				store.zobject = zobjectToRows( {
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
				const result = store.isInsideComposition( rowId );
				expect( result ).toBe( expected );
			} );

			it( 'returns true when a parent has composition/Z14K2 key', () => {
				store.zobject = zobjectToRows( {
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
				const result = store.isInsideComposition( rowId );
				expect( result ).toBe( expected );
			} );
		} );

		describe( 'getZBooleanValue', () => {
			beforeEach( () => {
				store.zobject = zobjectToRows( [
					'Z1', // rowId = 1
					{ Z1K1: 'Z40', Z40K1: Constants.Z_BOOLEAN_TRUE }, // rowId = 4
					{ Z1K1: 'Z40', Z40K1: Constants.Z_BOOLEAN_FALSE } // rowId = 11
				] );
			} );

			it( 'returns Z41(true) when the boolean value is true', () => {
				// rowId of the parent of the boolean value
				const rowId = 4;
				const expected = Constants.Z_BOOLEAN_TRUE;
				const result = store.getZBooleanValue( rowId );

				expect( result ).toBe( expected );
			} );

			it( 'returns Z42(false) when the boolean value is true', () => {
				// rowId of the parent of the boolean value
				const rowId = 11;
				const expected = Constants.Z_BOOLEAN_FALSE;
				const result = store.getZBooleanValue( rowId );

				expect( result ).toBe( expected );
			} );

			it( 'returns undefined when the rowId is NOT a boolean', () => {
				const rowId = 1;
				const result = store.getZBooleanValue( rowId );

				expect( result ).toBeUndefined();
			} );

			it( 'returns undefined when the rowId does NOT exist', () => {
				const rowId = 100;
				const result = store.getZBooleanValue( rowId );

				expect( result ).toBeUndefined();
			} );
		} );

		describe( 'getZObjectTypeByRowId', () => {

			it( 'should return undefined if rowId is undefined or falsy', () => {
				const rowId = undefined;
				expect( store.getZObjectTypeByRowId( rowId ) ).toBeUndefined();
			} );

			it( 'should return undefined if rowId is not found', () => {
				const rowId = 100;
				expect( store.getZObjectTypeByRowId( rowId ) ).toBeUndefined();
			} );

			it( 'should return Z9/Reference if the row is terminal and the key is Z9K1/Reference Id', () => {
				const rowId = 2;
				store.zobject = zobjectToRows( {
					Z1K1: Constants.Z_REFERENCE,
					Z9K1: Constants.Z_STRING
				} );

				expect( store.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_REFERENCE );
			} );

			it( 'should return Z6/String if the row is terminal and the key is Z1K1/Object Type', () => {
				const rowId = 1;
				store.zobject = zobjectToRows( {
					Z1K1: Constants.Z_REFERENCE,
					Z9K1: Constants.Z_MONOLINGUALSTRING
				} );

				expect( store.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_STRING );
			} );

			it( 'should return Z6/String if the row is a terminal string value', () => {
				const rowId = 2;
				store.zobject = zobjectToRows( {
					Z1K1: Constants.Z_STRING,
					Z6K1: 'value'
				} );

				expect( store.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_STRING );
			} );

			it( 'should return Z9/Reference if the row is nor terminal has a reference object', () => {
				const rowId = 0;
				store.zobject = zobjectToRows( {
					Z1K1: Constants.Z_REFERENCE,
					Z9K1: Constants.Z_STRING
				} );

				expect( store.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_REFERENCE );
			} );

			it( 'should return Typed list of String if the row is an array of strings', () => {
				const rowId = 1;
				store.zobject = zobjectToRows( {
					Z2K2: [ Constants.Z_STRING ]
				} );
				const expected = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_LIST,
					Z881K1: Constants.Z_STRING
				};

				expect( store.getZObjectTypeByRowId( rowId ) ).toStrictEqual( expected );
			} );

			it( 'should return Typed list of Object if the row is an array', () => {
				const rowId = 1;
				store.zobject = zobjectToRows( {
					Z2K2: [ Constants.Z_OBJECT ]
				} );
				const expected = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_LIST,
					Z881K1: Constants.Z_OBJECT
				};

				expect( store.getZObjectTypeByRowId( rowId ) ).toStrictEqual( expected );
			} );

			it( 'should return Typed list of undefined if the row is an array with no type', () => {
				const rowId = 1;
				store.zobject = zobjectToRows( {
					Z2K2: []
				} );
				const expected = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_LIST,
					Z881K1: ''
				};

				expect( store.getZObjectTypeByRowId( rowId ) ).toStrictEqual( expected );
			} );

			it( 'should return Typed list of Typed lists of Strings if the row is a nested array', () => {
				const rowId = 1;
				store.zobject = zobjectToRows( {
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

				expect( store.getZObjectTypeByRowId( rowId ) ).toStrictEqual( expected );
			} );

			it( 'should return the terminal reference value if the object is a reference', () => {
				const rowId = 0;
				store.zobject = zobjectToRows( {
					Z1K1: {
						Z1K1: Constants.Z_REFERENCE,
						Z9K1: Constants.Z_MONOLINGUALSTRING
					}
				} );

				const result = store.getZObjectTypeByRowId( rowId );
				expect( result ).toBe( Constants.Z_MONOLINGUALSTRING );
			} );

			it( 'should return the type of the object in a list', () => {
				const rowId = 5;
				store.zobject = zobjectToRows( {
					Z2K2: [ Constants.Z_MONOLINGUALSTRING,
						{ // rowId = 5
							Z1K1: Constants.Z_MONOLINGUALSTRING,
							Z11K1: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
							Z11K2: 'value'
						}
					]
				} );

				expect( store.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_MONOLINGUALSTRING );
			} );

			it( 'returns the internal type of a function call', () => {
				const rowId = 1;
				store.zobject = zobjectToRows( {
					Z1K1: {
						Z1K1: Constants.Z_FUNCTION_CALL,
						Z7K1: Constants.Z_TYPED_LIST,
						Z881K1: Constants.Z_STRING
					}
				} );

				expect( store.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_FUNCTION_CALL );
			} );

			it( 'returns the string representation of a type described by a function call to typed list', () => {
				const rowId = 0;
				const type = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_LIST,
					Z881K1: Constants.Z_STRING
				};
				store.zobject = zobjectToRows( {
					Z1K1: type
				} );

				expect( store.getZObjectTypeByRowId( rowId ) ).toStrictEqual( type );
			} );

			it( 'returns the string representation of a type described by a function call to typed pair', () => {
				const rowId = 0;
				const type = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: Constants.Z_TYPED_PAIR,
					Z882K1: Constants.Z_STRING,
					Z882K2: Constants.Z_BOOLEAN
				};
				store.zobject = zobjectToRows( {
					Z1K1: type
				} );

				expect( store.getZObjectTypeByRowId( rowId ) ).toStrictEqual( type );
			} );

			it( 'returns the string representation of a type described by a function call with no arguments', () => {
				const rowId = 0;
				const type = {
					Z1K1: Constants.Z_FUNCTION_CALL,
					Z7K1: 'Z10000'
				};
				store.zobject = zobjectToRows( {
					Z1K1: type
				} );

				expect( store.getZObjectTypeByRowId( rowId ) ).toStrictEqual( type );
			} );

			it( 'returns the type id if the type is a literal', () => {
				const rowId = 0;
				const type = {
					Z1K1: 'Z4',
					Z4K1: 'Z11'
				};
				store.zobject = zobjectToRows( {
					Z1K1: type
				} );

				expect( store.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_MONOLINGUALSTRING );
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
				store.zobject = zobjectToRows( {
					Z1K1: type
				} );

				expect( store.getZObjectTypeByRowId( rowId ) ).toBe( Constants.Z_MONOLINGUALSTRING );
			} );
		} );

		describe( 'getDepthByRowId', () => {
			beforeEach( () => {
				store.zobject = zobjectToRows( {
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
			} );

			it( 'should return 0 if the row is not found', () => {
				const rowId = 100;

				expect( store.getDepthByRowId( rowId ) ).toBe( 0 );
			} );

			it( 'should return 0 if the row has no parent', () => {
				const rowId = 0;

				expect( store.getDepthByRowId( rowId ) ).toBe( 0 );
			} );

			it( 'should return the correct depth when the row has a parent', () => {
				const rowId = 1;

				expect( store.getDepthByRowId( rowId ) ).toBe( 1 );
			} );

			it( 'should return the correct depth for nested parents', () => {
				const rowId = 18;
				expect( store.getDepthByRowId( rowId ) ).toBe( 5 );
			} );
		} );

		describe( 'getNextRowId', () => {

			it( 'should return 0 if zobject is empty', () => {
				expect( store.getNextRowId ).toBe( 0 );
			} );

			it( 'should return the next available rowId', () => {
				store.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 0 },
					{ id: 2, key: Constants.Z_STRING_VALUE, value: 'string value', parent: 0 }
				] );
				expect( store.getNextRowId ).toBe( 3 );
			} );
		} );

		describe( 'getMapValueByKey', () => {

			it( 'returns undefined when row not found', () => {
				const rowId = 1;
				const key = 'errors';
				const expected = undefined;
				const result = store.getMapValueByKey( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns undefined when row is not a map', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z6',
					Z6K1: 'not a map'
				} );
				const rowId = 0;
				const key = 'errors';
				const expected = undefined;
				const result = store.getMapValueByKey( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns undefined when map is empty', () => {
				store.zobject = zobjectToRows( {
					Z1K1: { Z1K1: 'Z7', Z7K1: 'Z883', Z883K1: 'Z6', Z883K2: 'Z1' },
					K1: [ { Z1K1: 'Z7', Z7K1: 'Z882', Z882K1: 'Z6', Z882K2: 'Z2' } ]
				} );
				const rowId = 0;
				const key = 'errors';
				const expected = undefined;
				const result = store.getMapValueByKey( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns undefined when map item has no key', () => {
				store.zobject = zobjectToRows( {
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
				const result = store.getMapValueByKey( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns undefined when key not found', () => {
				store.zobject = zobjectToRows( {
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
				const result = store.getMapValueByKey( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns value given a map key', () => {
				store.zobject = zobjectToRows( {
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
				const result = store.getMapValueByKey( rowId, key );
				expect( result ).toEqual( expected );
			} );
		} );

		describe( 'getZKeyIsIdentity', () => {

			it( 'returns true when the is identity field is a reference to true', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					Z3K4: 'Z41'
				} );
				const rowId = 0;
				const result = store.getZKeyIsIdentity( rowId );
				expect( result ).toBe( true );
			} );

			it( 'returns true when the is identity field is the literal object true', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z41' }
				} );
				const rowId = 0;
				const result = store.getZKeyIsIdentity( rowId );
				expect( result ).toBe( true );
			} );

			it( 'returns false when the is identity field is undefined', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
				} );
				const rowId = 0;
				const result = store.getZKeyIsIdentity( rowId );
				expect( result ).toBe( false );
			} );

			it( 'returns false when the is identity field is a reference to false', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					Z3K4: 'Z42'
				} );
				const rowId = 0;
				const result = store.getZKeyIsIdentity( rowId );
				expect( result ).toBe( false );
			} );

			it( 'returns false when the is identity field is the literal object false', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K1: 'Z6',
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					Z3K4: { Z1K1: 'Z40', Z40K1: 'Z42' }
				} );
				const rowId = 0;
				const result = store.getZKeyIsIdentity( rowId );
				expect( result ).toBe( false );
			} );
		} );

		describe( 'getZKeyTypeRowId', () => {

			it( 'returns undefined if the object is not a key', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'something else'
				} );
				const rowId = 0;
				const result = store.getZKeyTypeRowId( rowId );
				expect( result ).toBe( undefined );
			} );

			it( 'returns undefined if the key type field does not exist', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					Z3K4: 'Z41'
				} );
				const rowId = 0;
				const result = store.getZKeyTypeRowId( rowId );
				expect( result ).toBe( undefined );
			} );

			it( 'returns the rowId of the key type field', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z3',
					Z3K1: 'Z6', // rowId = 4
					Z3K2: 'Z0K1',
					Z3K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
					Z3K4: 'Z41'
				} );
				const rowId = 0;
				const result = store.getZKeyTypeRowId( rowId );
				expect( result ).toBe( 4 );
			} );
		} );

		describe( 'getConverterIdentity', () => {
			it( 'returns undefined if rowId is undefined', () => {
				const rowId = undefined;
				const type = Constants.Z_SERIALISER;
				const expected = undefined;
				const result = store.getConverterIdentity( rowId, type );
				expect( result ).toBe( expected );
			} );

			it( 'returns undefined if type is undefined', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z64',
					Z64K1: 'Z12345',
					Z64K2: 'Z6',
					Z64K3: { Z1K1: 'Z16', Z16K1: 'Z600', Z16K2: '()=>true' },
					Z64K4: 'Int'
				} );
				const rowId = 0;
				const type = undefined;
				const expected = undefined;
				const result = store.getConverterIdentity( rowId, type );
				expect( result ).toBe( expected );
			} );

			it( 'returns undefined if object is not a converter', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'not a converter'
				} );
				const rowId = 0;
				const type = 'Z11';
				const expected = undefined;
				const result = store.getConverterIdentity( rowId, type );
				expect( result ).toBe( expected );
			} );

			it( 'returns the identity of the Serialiser', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z64',
					Z64K1: 'Z12345',
					Z64K2: 'Z6',
					Z64K3: { Z1K1: 'Z16', Z16K1: 'Z600', Z16K2: '()=>true' },
					Z64K4: 'Int'
				} );
				const rowId = 0;
				const type = 'Z64';
				const expected = 'Z12345';
				const result = store.getConverterIdentity( rowId, type );
				expect( result ).toBe( expected );
			} );

			it( 'returns the identity of the Deserialiser', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z46',
					Z46K1: 'Z12345',
					Z46K2: 'Z6',
					Z46K3: { Z1K1: 'Z16', Z16K1: 'Z600', Z16K2: '()=>true' },
					Z46K4: 'Int'
				} );
				const rowId = 0;
				const type = 'Z46';
				const expected = 'Z12345';
				const result = store.getConverterIdentity( rowId, type );
				expect( result ).toBe( expected );
			} );
		} );

		describe( 'validateGenericType', () => {

			it( 'unset reference is not valid', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z9',
					Z9K1: ''
				} );

				const actual = store.validateGenericType( 0 );
				const expected = [ { rowId: 0, isValid: false } ];

				expect( actual ).toEqual( expected );
			} );

			it( 'set reference is valid', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z9',
					Z9K1: 'Z6'
				} );

				const actual = store.validateGenericType( 0 );
				const expected = [ { rowId: 0, isValid: true } ];

				expect( actual ).toEqual( expected );
			} );

			it( 'unset function call is not valid', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z7',
					Z7K1: ''
				} );

				const actual = store.validateGenericType( 0 );
				const expected = [ { rowId: 0, isValid: false } ];

				expect( actual ).toEqual( expected );
			} );

			it( 'unset function call argument is not valid', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z7',
					Z7K1: 'Z881', // rowId 0
					Z881K1: '' // rowId 7
				} );

				const actual = store.validateGenericType( 0 );
				const expected = [ { rowId: 0, isValid: true }, { rowId: 7, isValid: false } ];

				expect( actual ).toEqual( expected );
			} );

			it( 'nested function call argument is not valid', () => {
				store.zobject = zobjectToRows( {
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

				const actual = store.validateGenericType( 0 );
				const expected = [
					{ rowId: 0, isValid: true },
					{ rowId: 7, isValid: true },
					{ rowId: 14, isValid: false }
				];

				expect( actual ).toEqual( expected );
			} );
		} );
	} );

	describe( 'Actions', () => {
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
				store.setZObject( zobject );
				expect( store.zobject ).toEqual( zobject );
			} );
		} );

		describe( 'initializeView', () => {
			it( 'calls initializeCreateNewPage when creating new page', async () => {
				store.initializeCreateNewPage = jest.fn();

				mockMWGetConfig( {
					wgWikiLambda: {
						zlang: 'en',
						zlangZid: 'Z1002',
						createNewPage: true,
						runFunction: false,
						zId: null
					}
				} );

				await store.initializeView();

				expect( store.initializeCreateNewPage ).toHaveBeenCalled();
			} );

			it( 'calls initializeEvaluateFunction when opening the function evaluator', async () => {
				store.initializeEvaluateFunction = jest.fn();

				mockMWGetConfig( {
					wgWikiLambda: {
						zlang: 'en',
						zlangZid: 'Z1002',
						createNewPage: false,
						runFunction: true,
						zId: null
					}
				} );

				await store.initializeView();

				expect( store.initializeEvaluateFunction ).toHaveBeenCalled();
			} );

			it( 'calls initializeEvaluateFunction when no info available', async () => {
				store.initializeEvaluateFunction = jest.fn();
				mockMWGetConfig( {
					wgWikiLambda: {
						zlang: 'en',
						zlangZid: 'Z1002',
						createNewPage: false,
						runFunction: false,
						zId: null
					}
				} );

				await store.initializeView();

				expect( store.initializeEvaluateFunction ).toHaveBeenCalled();
			} );

			it( 'calls initializeRootZObject when viewing or editing an object', async () => {
				store.initializeRootZObject = jest.fn();
				mockMWGetConfig( {
					wgWikiLambda: {
						zlang: 'en',
						zlangZid: 'Z1002',
						createNewPage: false,
						runFunction: false,
						zId: 'Z10000'
					}
				} );

				await store.initializeView();

				expect( store.initializeRootZObject ).toHaveBeenCalledWith( 'Z10000' );
			} );

			it( 'Initialize ZObject, create new page', async () => {
				store.fetchZids = jest.fn().mockResolvedValue();
				const setInitializedSpy = jest.spyOn( store, 'setInitialized' );
				const setCreateNewPageSpy = jest.spyOn( store, 'setCreateNewPage' );
				const setCurrentZidSpy = jest.spyOn( store, 'setCurrentZid' );
				const pushRowSpy = jest.spyOn( store, 'pushRow' );
				const changeTypeSpy = jest.spyOn( store, 'changeType' );

				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				Object.defineProperty( store, 'getStoredObject', {
					value: () => ( { Z2K2: { Z1K1: 'Z4', Z4K2: [ 'Z3' ] } } )
				} );

				const expectedChangeTypePayload = { id: 0, type: Constants.Z_PERSISTENTOBJECT };
				const expectedRootObject = { id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT };

				await store.initializeCreateNewPage();

				expect( setCreateNewPageSpy ).toHaveBeenCalledWith( true );
				expect( setCurrentZidSpy ).toHaveBeenCalledWith( 'Z0' );
				expect( pushRowSpy ).toHaveBeenCalledWith( expectedRootObject );
				expect( changeTypeSpy ).toHaveBeenCalledTimes( 1 );
				expect( changeTypeSpy ).toHaveBeenNthCalledWith( 1, expect.objectContaining( expectedChangeTypePayload ) );
				expect( setInitializedSpy ).toHaveBeenCalledWith( true );
			} );

			it( 'Initialize ZObject, create new page, initial value for Z2K2', async () => {
				store.fetchZids = jest.fn().mockResolvedValue();
				const setInitializedSpy = jest.spyOn( store, 'setInitialized' );
				const setCreateNewPageSpy = jest.spyOn( store, 'setCreateNewPage' );
				const setCurrentZidSpy = jest.spyOn( store, 'setCurrentZid' );
				const pushRowSpy = jest.spyOn( store, 'pushRow' );
				const changeTypeSpy = jest.spyOn( store, 'changeType' );

				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						zid: Constants.Z_BOOLEAN,
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				store.zobject = zobjectToRows( blankPersistentObject );
				Object.defineProperty( store, 'getStoredObject', {
					value: () => ( { Z2K2: { Z1K1: 'Z4', Z4K2: [ 'Z3' ] } } )
				} );

				const expectedChangeTypePayload = { id: 0, type: Constants.Z_PERSISTENTOBJECT };
				const expectedRootObject = { id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT };
				const expectedZ2K2ChangeTypePayload = { id: 7, type: Constants.Z_BOOLEAN, literal: true };

				await store.initializeCreateNewPage();

				expect( setCreateNewPageSpy ).toHaveBeenCalledWith( true );
				expect( setCurrentZidSpy ).toHaveBeenCalledWith( 'Z0' );
				expect( pushRowSpy ).toHaveBeenCalledWith( expectedRootObject );
				expect( changeTypeSpy ).toHaveBeenCalledTimes( 2 );
				expect( changeTypeSpy ).toHaveBeenNthCalledWith( 1, expect.objectContaining( expectedChangeTypePayload ) );
				expect( changeTypeSpy ).toHaveBeenNthCalledWith( 2, expect.objectContaining( expectedZ2K2ChangeTypePayload ) );

				expect( setInitializedSpy ).toHaveBeenCalledWith( true );
			} );

			it( 'Initialize ZObject, create new page, non-ZID value as initial', async () => {
				store.fetchZids = jest.fn().mockResolvedValue();
				const changeTypeSpy = jest.spyOn( store, 'changeType' );
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						zid: 'banana',
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				store.zobject = zobjectToRows( blankPersistentObject );
				Object.defineProperty( store, 'getStoredObject', {
					value: () => undefined
				} );

				const expectedZ2K2ChangeTypePayload = { id: 7, type: 'banana' };

				await store.initializeCreateNewPage();

				expect( changeTypeSpy ).not.toHaveBeenCalledWith( expectedZ2K2ChangeTypePayload );
			} );

			it( 'Initialize ZObject, create new page, non-type value as initial', async () => {
				store.fetchZids = jest.fn().mockResolvedValue();
				const changeTypeSpy = jest.spyOn( store, 'changeType' );
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						zid: 'Z801',
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				store.zobject = zobjectToRows( blankPersistentObject );
				Object.defineProperty( store, 'getStoredObject', {
					value: () => ( { Z2K2: { Z1K1: 'Z8' } } )
				} );

				const expectedZ2K2ChangeTypePayload = { id: 3, type: 'Z801' };

				await store.initializeCreateNewPage();

				expect( changeTypeSpy ).not.toHaveBeenCalledWith( expectedZ2K2ChangeTypePayload );
			} );

			it( 'Initialize ZObject, create new page, lowercase ZID', async () => {
				store.fetchZids = jest.fn().mockResolvedValue();
				const changeTypeSpy = jest.spyOn( store, 'changeType' );
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						zid: 'z8',
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				store.zobject = zobjectToRows( blankPersistentObject );
				Object.defineProperty( store, 'getStoredObject', {
					value: () => ( { Z2K2: { Z1K1: 'Z8' } } )
				} );

				const expectedZ2K2ChangeTypePayload = { id: 7, type: Constants.Z_FUNCTION };

				await store.initializeCreateNewPage();

				expect( changeTypeSpy ).not.toHaveBeenCalledWith( expectedZ2K2ChangeTypePayload );
			} );

			it( 'Initialize ZObject, create new page, ZObject key passed as initial', async () => {
				store.fetchZids = jest.fn().mockResolvedValue();
				const changeTypeSpy = jest.spyOn( store, 'changeType' );
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						zid: 'Z14K1',
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				store.zobject = zobjectToRows( blankPersistentObject );

				const expectedZ2K2ChangeTypePayload = { id: 7, type: 'Z14K1' };

				await store.initializeCreateNewPage();

				expect( changeTypeSpy ).not.toHaveBeenCalledWith( expectedZ2K2ChangeTypePayload );
			} );

			it( 'Initialize ZObject, create new page, quasi-valid ZID', async () => {
				store.fetchZids = jest.fn().mockResolvedValue();
				const changeTypeSpy = jest.spyOn( store, 'changeType' );
				mw.Uri.mockImplementationOnce( () => ( {
					query: {
						zid: 'Z8s',
						action: Constants.ACTIONS.EDIT,
						title: 'Z0'
					}
				} ) );
				store.zobject = zobjectToRows( blankPersistentObject );

				const expectedZ2K2ChangeTypePayload = { id: 7, type: 'Z8s' };

				await store.initializeCreateNewPage();

				expect( changeTypeSpy ).not.toHaveBeenCalledWith( expectedZ2K2ChangeTypePayload );
			} );

			it( 'initialize ZObject for an old revision', async () => {
				store.fetchZids = jest.fn().mockResolvedValue();
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

				await store.initializeRootZObject( 'Z10001' );

				expect( getMock ).toHaveBeenCalledWith( expectedPayload );
			} );

			it( 'initialize ZObject without revision', async () => {
				store.fetchZids = jest.fn().mockResolvedValue();
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

				await store.initializeRootZObject( 'Z10001' );

				expect( getMock ).toHaveBeenCalledWith( expectedPayload );
			} );

			describe( 'initializeRootZObject', () => {
				beforeEach( () => {
					Object.defineProperty( store, 'getViewMode', {
						value: false
					} );
				} );

				it( 'initializes empty description and alias fields', async () => {
					store.setCurrentZid = jest.fn();
					store.saveMultilingualDataCopy = jest.fn();
					store.setZObject = jest.fn();
					store.setInitialized = jest.fn();
					store.fetchZids = jest.fn().mockResolvedValue();
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

					const expectedFetchZidsPayload = {
						zids: [ 'Z1', 'Z2', 'Z6', 'Z1234', 'Z12', 'Z11', 'Z1002', 'Z32', 'Z31' ]
					};

					await store.initializeRootZObject( 'Z1234' );

					expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z1234' );
					expect( store.saveMultilingualDataCopy ).toHaveBeenCalledWith( expectedZObjectJson );
					expect( store.setZObject ).toHaveBeenCalledWith( expect.anything() );
					expect( store.setInitialized ).toHaveBeenCalledWith( true );
					expect( store.fetchZids ).toHaveBeenCalledWith( expectedFetchZidsPayload );
				} );

				describe( 'For users with type editing permissions', () => {
					beforeEach( () => {
						Object.defineProperty( store, 'userCanEditTypes', {
							value: true
						} );
					} );

					it( 'initializes undefined type functions', async () => {
						store.setCurrentZid = jest.fn();
						store.saveMultilingualDataCopy = jest.fn();
						store.setZObject = jest.fn();
						store.setInitialized = jest.fn();
						store.fetchZids = jest.fn().mockResolvedValue();
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

						await store.initializeRootZObject( 'Z1234' );

						expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z1234' );
						expect( store.saveMultilingualDataCopy ).toHaveBeenCalledWith( expectedZObjectJson );
						expect( store.setZObject ).toHaveBeenCalledWith( expect.anything() );
						expect( store.setInitialized ).toHaveBeenCalledWith( true );
					} );

					it( 'initializes undefined identity flags for every key', async () => {
						store.setCurrentZid = jest.fn();
						store.saveMultilingualDataCopy = jest.fn();
						store.setZObject = jest.fn();
						store.setInitialized = jest.fn();
						store.fetchZids = jest.fn().mockResolvedValue();
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

						await store.initializeRootZObject( 'Z1234' );

						expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z1234' );
						expect( store.saveMultilingualDataCopy ).toHaveBeenCalledWith( expectedZObjectJson );
						expect( store.setZObject ).toHaveBeenCalledWith( expect.anything() );
						expect( store.setInitialized ).toHaveBeenCalledWith( true );
					} );

					it( 'initializes undefined converter lists for type editor', async () => {
						store.setCurrentZid = jest.fn();
						store.saveMultilingualDataCopy = jest.fn();
						store.setZObject = jest.fn();
						store.setInitialized = jest.fn();
						store.fetchZids = jest.fn().mockResolvedValue();
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

						await store.initializeRootZObject( 'Z1234' );

						expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z1234' );
						expect( store.saveMultilingualDataCopy ).toHaveBeenCalledWith( expectedZObjectJson );
						expect( store.setZObject ).toHaveBeenCalledWith( expect.anything() );
						expect( store.setInitialized ).toHaveBeenCalledWith( true );
					} );
				} );

				describe( 'For users without type editing permissions', () => {
					beforeEach( () => {
						Object.defineProperty( store, 'userCanEditTypes', {
							value: false
						} );
					} );

					it( 'does not initialize undefined keys and type keys to falsy values', async () => {
						store.setCurrentZid = jest.fn();
						store.saveMultilingualDataCopy = jest.fn();
						store.setZObject = jest.fn();
						store.setInitialized = jest.fn();
						store.fetchZids = jest.fn().mockResolvedValue();
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

						await store.initializeRootZObject( 'Z1234' );

						expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z1234' );
						expect( store.saveMultilingualDataCopy ).toHaveBeenCalledWith( Z1234 );
						expect( store.setZObject ).toHaveBeenCalledWith( expect.anything() );
						expect( store.setInitialized ).toHaveBeenCalledWith( true );
					} );
				} );
			} );

			it( 'Initialize evaluate function call page', async () => {
				store.setCurrentZid = jest.fn();
				store.pushRow = jest.fn();
				store.changeType = jest.fn().mockResolvedValue();
				store.setInitialized = jest.fn();
				const expectedChangeTypePayload = { id: 0, type: Constants.Z_FUNCTION_CALL };
				const expectedRootObject = { id: 0, key: undefined, parent: undefined, value: Constants.ROW_VALUE_OBJECT };
				Object.defineProperty( store, 'getStoredObject', {
					value: () => ( { Z1K1: 'test', Z2K1: 'test' } )
				} );

				await store.initializeEvaluateFunction();

				expect( store.setCurrentZid ).toHaveBeenCalledWith( 'Z0' );
				expect( store.pushRow ).toHaveBeenCalledWith( expectedRootObject );
				expect( store.changeType ).toHaveBeenCalledWith( expectedChangeTypePayload );
				expect( store.setInitialized ).toHaveBeenCalledWith( true );
			} );
		} );

		describe( 'recalculateTypedListKeys', () => {
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
				store.zobject = tableDataToRowObjects( initialList );

				store.recalculateTypedListKeys( 1 );
				expect( store.zobject ).toEqual( initialList );
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

				store.zobject = tableDataToRowObjects( initialList );

				store.recalculateTypedListKeys( 1 );

				initialList[ 5 ].key = '1';
				initialList[ 8 ].key = '2';
				expect( store.zobject ).toEqual( initialList );
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
				store.zobject = tableDataToRowObjects( tableData );
			} );

			it( 'does nothing if rowId is undefined', () => {
				const rowId = undefined;
				store.removeRow( rowId );
				expect( store.zobject ).toEqual( tableData );
			} );

			it( 'does nothing if rowId is not found', () => {
				const rowId = 30;
				store.removeRow( rowId );
				expect( store.zobject ).toEqual( tableData );
			} );

			it( 'removes the row Id and no children', () => {
				const rowId = 19;
				store.removeRow( rowId );

				const parentRow = store.zobject.find( ( row ) => row.id === rowId );
				expect( parentRow ).toBe( undefined );

				const children = [ 20, 21, 22, 23, 24, 25, 26, 27, 28 ];
				const childRows = store.zobject.filter( ( row ) => children.includes( row.id ) );
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
				store.zobject = tableDataToRowObjects( tableData );
			} );

			it( 'does nothing if rowId is undefined', () => {
				const rowId = undefined;
				store.removeRowChildren( { rowId } );
				expect( store.zobject ).toEqual( tableData );
			} );

			it( 'does nothing if rowId is not found', () => {
				const rowId = 30;
				store.removeRowChildren( { rowId } );
				expect( store.zobject ).toEqual( tableData );
			} );

			it( 'removes the child rows if removeParent is set to false', () => {
				const rowId = 19;
				const children = [ 20, 21, 22, 23, 24, 25, 26, 27, 28 ];

				store.removeRowChildren( { rowId } );

				const parentRow = store.zobject.find( ( row ) => row.id === rowId );
				expect( parentRow.id ).toBe( rowId );

				const childRows = store.zobject.filter( ( row ) => children.includes( row.id ) );
				expect( childRows.length ).toBe( 0 );
			} );

			it( 'removes the child and parent rows if removeParent is set to true', () => {
				const rowId = 19;
				const children = [ 20, 21, 22, 23, 24, 25, 26, 27, 28 ];

				store.removeRowChildren( { rowId, removeParent: true } );

				const parentRow = store.zobject.find( ( row ) => row.id === rowId );
				expect( parentRow ).toBe( undefined );

				const childRows = store.zobject.filter( ( row ) => children.includes( row.id ) );
				expect( childRows.length ).toBe( 0 );
			} );
		} );

		describe( 'recalculateKeys', () => {
			beforeEach( () => {
				Object.defineProperty( store, 'getCurrentZObjectId', {
					value: 'Z999'
				} );
			} );

			it( 'does not change arguments that are correctly numbered', () => {
				const argList = {
					Z8K1: [ 'Z17',
						{
							Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K1',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						},
						{
							Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K2',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ] }
						}
					]
				};
				store.zobject = zobjectToRows( argList );

				store.recalculateKeys( { listRowId: 1, key: 'Z17K2' } );

				expect( store.getRowById( 14 ).value ).toEqual( 'Z999K1' );
				expect( store.getRowById( 32 ).value ).toEqual( 'Z999K2' );
			} );

			it( 'renumbers argument keys to sequential numbers', () => {
				const argList = {
					Z8K1: [ 'Z17',
						{
							Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K2',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
						},
						{
							Z1K1: 'Z17', Z17K1: 'Z6', Z17K2: 'Z999K7',
							Z17K3: { Z1K1: 'Z12', Z12K1: [ 'Z11', { Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'label' } ] }
						}
					]
				};
				store.zobject = zobjectToRows( argList );

				store.recalculateKeys( { listRowId: 1, key: 'Z17K2' } );

				expect( store.getRowById( 14 ).value ).toEqual( 'Z999K1' );
				expect( store.getRowById( 32 ).value ).toEqual( 'Z999K2' );
			} );

			it( 'renumbers type keys', () => {
				const type = {
					Z1K1: 'Z4',
					Z4K1: [ 'Z3',
						{
							Z1K1: 'Z3',
							Z3K1: 'Z6',
							Z3K2: 'Z999K6',
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
							Z3K2: 'Z999K3',
							Z3K3: {
								Z1K1: 'Z12',
								Z12K1: [ 'Z11',
									{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'two' }
								]
							}
						}
					]
				};
				store.zobject = zobjectToRows( type );

				store.recalculateKeys( { listRowId: 4, key: 'Z3K2' } );

				expect( store.getRowById( 17 ).value ).toEqual( 'Z999K1' );
				expect( store.getRowById( 45 ).value ).toEqual( 'Z999K2' );
			} );
		} );

		describe( 'injectZObjectFromRowId', () => {
			beforeEach( () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z2',
					Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
					Z2K2: '',
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [ 'Z11' ]
					}
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
					{ id: 18, key: 'Z1K1', parent: 7, value: 'Z6' },
					{ id: 19, key: 'Z6K1', parent: 7, value: 'stringness' }
				];

				store.injectZObjectFromRowId( {
					rowId: 7,
					value: zObject
				} );

				expect( store.zobject ).toEqual( expected );
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

				store.injectZObjectFromRowId( {
					rowId: 7,
					value: zObject
				} );

				expect( store.zobject ).toEqual( expected );
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

				store.injectZObjectFromRowId( {
					rowId: 7,
					value: zObject
				} );

				expect( store.zobject ).toEqual( expected );
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

				store.injectZObjectFromRowId( {
					rowId: 0,
					value: zObject
				} );

				expect( store.zobject ).toEqual( expected );
			} );
		} );

		describe( 'injectKeyValueFromRowId', () => {
			beforeEach( () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z7',
					Z7K1: 'Z881'
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
					{ id: 7, key: 'Z881K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 8, key: 'Z1K1', parent: 7, value: 'Z9' },
					{ id: 9, key: 'Z9K1', parent: 7, value: 'Z6' }
				];

				store.injectKeyValueFromRowId( {
					rowId: 0,
					key: 'Z881K1',
					value: 'Z6'
				} );

				expect( store.zobject ).toEqual( expected );
			} );
		} );

		describe( 'pushValuesToList', () => {
			beforeEach( () => {
				store.zobject = zobjectToRows( { Z2K2: [ 'Z1' ] } );
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

				store.pushValuesToList( payload );
				expect( store.zobject ).toEqual( expected );
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

				store.pushValuesToList( payload );
				expect( store.zobject ).toEqual( expected );
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

				store.pushValuesToList( payload );
				expect( store.zobject ).toEqual( expected );
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

				store.pushValuesToList( payload );
				expect( store.zobject ).toEqual( expected );
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

				store.pushValuesToList( payload );
				expect( store.zobject ).toEqual( expected );
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

				store.pushValuesToList( payload );
				expect( store.zobject ).toEqual( expected );
			} );
		} );

		describe( 'setZFunctionCallArguments', () => {
			beforeEach( () => {
				store.objects = mockStoredObjects;
				store.zobject = zobjectToRows( {
					Z1K1: 'Z7',
					Z7K1: 'Z882',
					Z882K1: 'Z6',
					Z882K2: 'Z1'
				} );
				store.removeRowChildren = jest.fn();
				store.injectKeyValueFromRowId = jest.fn();
				store.fetchZids = jest.fn().mockResolvedValue();
			} );

			it( 'unsets current args and sets none if functionId is null or undefined', () => {
				store.setZFunctionCallArguments( {
					parentId: 0,
					functionZid: null
				} );

				expect( store.removeRowChildren ).toHaveBeenCalledWith( { rowId: 7, removeParent: true } );
				expect( store.removeRowChildren ).toHaveBeenCalledWith( { rowId: 10, removeParent: true } );
				expect( store.injectKeyValueFromRowId ).not.toHaveBeenCalled();
				expect( store.fetchZids ).not.toHaveBeenCalled();
			} );

			it( 'unsets current args and sets one function argument for the function Typed list', () => {
				store.setZFunctionCallArguments( {
					parentId: 0,
					functionZid: 'Z881'
				} );

				expect( store.removeRowChildren ).toHaveBeenCalledWith( { rowId: 7, removeParent: true } );
				expect( store.removeRowChildren ).toHaveBeenCalledWith( { rowId: 10, removeParent: true } );

				const expectedArg = {
					rowId: 0,
					key: 'Z881K1',
					value: { Z1K1: 'Z9', Z9K1: '' }
				};
				expect( store.injectKeyValueFromRowId ).toHaveBeenCalledWith( expectedArg );

				const expectedZids = { zids: [ 'Z881', 'Z1', 'Z9' ] };
				expect( store.fetchZids ).toHaveBeenCalledWith( expectedZids );
			} );

			it( 'sets three function arguments for the function If', () => {
				store.setZFunctionCallArguments( {
					parentId: 0,
					functionZid: 'Z802'
				} );

				expect( store.removeRowChildren ).toHaveBeenCalledWith( { rowId: 7, removeParent: true } );
				expect( store.removeRowChildren ).toHaveBeenCalledWith( { rowId: 10, removeParent: true } );

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
				expect( store.injectKeyValueFromRowId ).toHaveBeenCalledWith( expectedArgs[ 0 ] );
				expect( store.injectKeyValueFromRowId ).toHaveBeenCalledWith( expectedArgs[ 1 ] );
				expect( store.injectKeyValueFromRowId ).toHaveBeenCalledWith( expectedArgs[ 2 ] );

				const expectedZids = { zids: [ 'Z802', 'Z1', 'Z40', 'Z9' ] };
				expect( store.fetchZids ).toHaveBeenCalledWith( expectedZids );
			} );

			it( 'makes no changes when the new function Id is the same as the old', () => {
				store.setZFunctionCallArguments( {
					parentId: 0,
					functionZid: Constants.Z_TYPED_PAIR
				} );

				expect( store.removeRowChildren ).not.toHaveBeenCalled();
				expect( store.injectKeyValueFromRowId ).not.toHaveBeenCalled();
				expect( store.fetchZids ).not.toHaveBeenCalled();
			} );

			it( 'sets only the second argument when its parent is a tester result validation call', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z20',
					Z20K3: {
						Z1K1: 'Z7',
						Z7K1: 'Z882'
					}
				} );
				const functionZid = 'Z882';
				store.setZFunctionCallArguments( {
					parentId: 4,
					functionZid
				} );

				expect( store.removeRowChildren ).not.toHaveBeenCalled();
				const expectedArg = {
					rowId: 4,
					key: 'Z882K2',
					value: { Z1K1: 'Z9', Z9K1: '' }
				};
				expect( store.injectKeyValueFromRowId ).toHaveBeenCalledWith( expectedArg );
				const expectZids = { zids: [ 'Z882', 'Z1', 'Z9' ] };
				expect( store.fetchZids ).toHaveBeenCalledWith( expectZids );
			} );
		} );

		describe( 'setZImplementationContentType', () => {

			beforeEach( () => {
				store.removeRowChildren = jest.fn();
				store.injectKeyValueFromRowId = jest.fn();
			} );

			it( 'unsets composition (Z14K2) and sets code (Z14K3)', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K2: {
						Z1K1: 'Z7',
						Z7K1: 'Z10002',
						Z10002K1: 'uno',
						Z10002K2: 'dos'
					}
				} );
				store.setZImplementationContentType( {
					parentId: 0,
					key: 'Z14K3'
				} );

				expect( store.removeRowChildren ).toHaveBeenCalledWith( { rowId: 7, removeParent: true } );

				const expectedKey = {
					rowId: 0,
					key: 'Z14K3',
					value: { Z1K1: 'Z16', Z16K1: { Z1K1: 'Z9', Z9K1: '' }, Z16K2: '' }
				};
				expect( store.injectKeyValueFromRowId ).toHaveBeenCalledWith( expectedKey );
			} );

			it( 'unsets code (Z14K3) and sets composition (Z14K2)', () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z14',
					Z14K1: 'Z10001',
					Z14K3: {
						Z1K1: 'Z16',
						Z16K1: 'Z600',
						Z16K2: '() => "hello world";'
					}
				} );
				store.setZImplementationContentType( {
					parentId: 0,
					key: 'Z14K2'
				} );

				expect( store.removeRowChildren ).toHaveBeenCalledWith( { rowId: 7, removeParent: true } );

				const expectedKey = {
					rowId: 0,
					key: 'Z14K2',
					value: { Z1K1: 'Z7', Z7K1: { Z1K1: 'Z9', Z9K1: '' } }
				};
				expect( store.injectKeyValueFromRowId ).toHaveBeenCalledWith( expectedKey );
			} );
		} );

		describe( 'setValueByRowIdAndPath', () => {
			beforeEach( () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z2',
					Z2K2: [
						'Z6',
						'Foo'
					]
				} );
			} );

			describe( 'when value is a string', () => {
				it( 'should dispatch an action', () => {
					store.setValueByRowId = jest.fn();
					const payload = {
						rowId: 8,
						keyPath: [ Constants.Z_STRING_VALUE ],
						value: 'Test String'
					};

					store.setValueByRowIdAndPath( payload );

					expect( store.setValueByRowId ).toHaveBeenCalledWith( { rowId: 10, value: 'Test String' } );
				} );
			} );

			describe( 'when value is an array', () => {
				it( 'should dispatch an action', () => {
					store.injectZObjectFromRowId = jest.fn();
					const payload = {
						rowId: 4,
						keyPath: [ '1', Constants.Z_STRING_VALUE ],
						value: [ Constants.Z_STRING ]
					};

					store.setValueByRowIdAndPath( payload );

					expect( store.injectZObjectFromRowId ).toHaveBeenCalledWith( { append: false, rowId: 10, value: [ Constants.Z_STRING ] } );
				} );

				describe( 'when append has been set', () => {
					it( 'should dispatch the injectZObjectFromRowId action with an object containing an append value that matches the set append value', () => {
						store.injectZObjectFromRowId = jest.fn();
						const payload = {
							rowId: 4,
							keyPath: [ '1', Constants.Z_STRING_VALUE ],
							value: [ 'Test String' ],
							append: true
						};

						store.setValueByRowIdAndPath( payload );

						expect( store.injectZObjectFromRowId ).toHaveBeenCalledWith( { append: true, rowId: 10, value: [ 'Test String' ] } );
					} );
				} );

				describe( 'when the row could not be found', () => {
					beforeEach( () => {
						store.setValueByRowId = jest.fn();
					} );

					it( 'does nothing if the row is invalid', () => {
						const payload = {
							rowId: null,
							keyPath: [ Constants.Z_STRING_VALUE ],
							value: 'Test String'
						};

						store.setValueByRowIdAndPath( payload );

						expect( store.setValueByRowId ).not.toHaveBeenCalled();
					} );

					it( 'does nothing if the row is not found', () => {
						const payload = {
							rowId: 100,
							keyPath: [ Constants.Z_STRING_VALUE ],
							value: 'Test String'
						};

						store.setValueByRowIdAndPath( payload );

						expect( store.setValueByRowId ).not.toHaveBeenCalled();
					} );

					it( 'does nothing if the path is not correct', () => {
						const payload = {
							rowId: 8,
							keyPath: [ Constants.Z_MONOLINGUALSTRING_VALUE ],
							value: 'Test String'
						};

						store.setValueByRowIdAndPath( payload );

						expect( store.setValueByRowId ).not.toHaveBeenCalled();
					} );
				} );
			} );
		} );

		describe( 'setValueByRowId', () => {
			beforeEach( () => {
				store.zobject = zobjectToRows( {
					Z1K1: 'Z2',
					Z2K2: [
						'Z6',
						'Foo'
					]
				} );
				store.setValueByRowIndex = jest.fn();
			} );

			describe( 'when rowId is valid', () => {
				it( 'should call the setValueByRowIndex mutation with the correct rowIndex and value', () => {
					const payload = {
						rowId: 10,
						value: 'Test String'
					};

					store.setValueByRowId( payload );

					expect( store.setValueByRowIndex ).toHaveBeenCalledWith( { index: 10, value: 'Test String' } );
				} );
			} );

			describe( 'when rowId is invalid', () => {
				it( 'should not call setValueByRowIndex mutation', () => {
					const payload = {
						rowId: null,
						value: 'Test String'
					};

					store.setValueByRowId( payload );

					expect( store.setValueByRowIndex ).not.toHaveBeenCalled();
				} );
			} );
		} );

		describe( 'removeItemFromTypedList', () => {
			it( 'should do nothing if rowId does not exist', () => {
				store.removeRowChildren = jest.fn();
				const payload = { rowId: 4 };
				Object.defineProperty( store, 'getRowById', {
					value: jest.fn().mockReturnValue( undefined )
				} );

				store.removeItemFromTypedList( payload );

				expect( store.removeRowChildren ).not.toHaveBeenCalled();
			} );

			it( 'should dispatch the removeRowChildren action with row id', () => {
				store.removeRowChildren = jest.fn();
				const payload = { rowId: 4 };
				Object.defineProperty( store, 'getRowById', {
					value: jest.fn().mockReturnValue( { id: 4, parent: 3 } )
				} );

				store.removeItemFromTypedList( payload );

				expect( store.removeRowChildren ).toHaveBeenCalledWith( { rowId: 4, removeParent: true } );
			} );

			it( 'should dispatch the recalculateTypedListKeys action with parent id', () => {
				store.recalculateTypedListKeys = jest.fn();
				const payload = { rowId: 4 };
				Object.defineProperty( store, 'getRowById', {
					value: jest.fn().mockReturnValue( { id: 4, parent: 3 } )
				} );

				store.removeItemFromTypedList( payload );

				expect( store.recalculateTypedListKeys ).toHaveBeenCalledWith( 3 );
			} );
		} );

		describe( 'removeItemsFromTypedList', () => {
			it( 'should dispatch a removeRowChildren action for each item in the list', () => {
				store.removeRowChildren = jest.fn();
				const payload = { parentRowId: 4, listItems: [ 11, 14 ] };

				store.removeItemsFromTypedList( payload );

				expect( store.removeRowChildren ).toHaveBeenCalledWith( { rowId: 11, removeParent: true } );
				expect( store.removeRowChildren ).toHaveBeenCalledWith( { rowId: 14, removeParent: true } );
			} );

			it( 'should dispatch the recalculateTypedListKeys actions with parent id', () => {
				store.recalculateTypedListKeys = jest.fn();
				const payload = { parentRowId: 4, listItems: [ 11, 14 ] };

				store.removeItemsFromTypedList( payload );

				expect( store.recalculateTypedListKeys ).toHaveBeenCalledWith( 4 );
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

				store.zobject = listRows;
			} );

			it( 'moves an item one position earlier in the list', () => {
				expect( store.zobject[ 1 ].key ).toBe( '0' );
				expect( store.zobject[ 4 ].key ).toBe( '1' );
				expect( store.zobject[ 7 ].key ).toBe( '2' );
				expect( store.zobject[ 10 ].key ).toBe( '3' );
				expect( store.zobject[ 13 ].key ).toBe( '4' );

				const payload = {
					parentRowId: 0,
					key: '2',
					offset: -1
				};
				store.moveItemInTypedList( payload );

				expect( store.zobject[ 1 ].key ).toBe( '0' );
				expect( store.zobject[ 7 ].key ).toBe( '1' );
				expect( store.zobject[ 4 ].key ).toBe( '2' );
				expect( store.zobject[ 10 ].key ).toBe( '3' );
				expect( store.zobject[ 13 ].key ).toBe( '4' );
			} );

			it( 'moves an item one position later in the list', () => {
				expect( store.zobject[ 1 ].key ).toBe( '0' );
				expect( store.zobject[ 4 ].key ).toBe( '1' );
				expect( store.zobject[ 7 ].key ).toBe( '2' );
				expect( store.zobject[ 10 ].key ).toBe( '3' );
				expect( store.zobject[ 13 ].key ).toBe( '4' );

				const payload = {
					parentRowId: 0,
					key: '3',
					offset: 1
				};
				store.moveItemInTypedList( payload );

				expect( store.zobject[ 1 ].key ).toBe( '0' );
				expect( store.zobject[ 4 ].key ).toBe( '1' );
				expect( store.zobject[ 7 ].key ).toBe( '2' );
				expect( store.zobject[ 13 ].key ).toBe( '3' );
				expect( store.zobject[ 10 ].key ).toBe( '4' );
			} );
		} );
	} );

} );
