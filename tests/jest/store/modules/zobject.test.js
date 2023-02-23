/*!
 * WikiLambda unit test suite for the zobject Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var fs = require( 'fs' ),
	path = require( 'path' ),
	tableDataToRowObjects = require( '../../helpers/zObjectTableHelpers.js' ).tableDataToRowObjects,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	Row = require( '../../../../resources/ext.wikilambda.edit/store/classes/Row.js' ),
	zobjectModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobject.js' ),
	mockApiZkeys = require( '../../fixtures/mocks.js' ).mockApiZkeys,
	zobject = {
		Z1K1: 'Z2',
		Z2K1: 'Z0',
		Z2K2: '',
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [
				'Z11'
			]
		}
	},
	zobjectTree = Object.freeze( [
		{ id: 0, value: Constants.ROW_VALUE_OBJECT },
		{ key: 'Z1K1', value: 'Z2', parent: 0, id: 1 },
		{ key: 'Z2K1', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 2 },
		{ key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 3 },
		{ key: 'Z1K1', value: 'Z9', parent: 2, id: 4 },
		{ key: 'Z9K1', value: 'Z0', parent: 2, id: 5 },
		{ key: 'Z2K3', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 6 },
		{ key: 'Z1K1', value: 'Z12', parent: 6, id: 7 },
		{ key: 'Z12K1', value: Constants.ROW_VALUE_ARRAY, parent: 6, id: 8 },
		{ key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 8, id: 9 },
		{ key: 'Z1K1', value: 'Z9', parent: 9, id: 10 },
		{ key: 'Z9K1', value: 'Z11', parent: 9, id: 11 },
		{ key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 8, id: 12 },
		{ key: 'Z1K1', value: 'Z11', parent: 12, id: 13 },
		{ key: 'Z11K1', value: 'Z1002', parent: 12, id: 14 },
		{ key: 'Z11K2', value: '', parent: 12, id: 15 },
		{ key: 'Z1K1', value: 'Z6', parent: 3, id: 16 },
		{ key: 'Z6K1', value: '', parent: 3, id: 17 }
	] ),
	state,
	context,
	postMock,
	postWithEditTokenMock,
	getMock,
	getResolveMock;

describe( 'zobject Vuex module', function () {
	beforeEach( function () {
		// eslint-disable-next-line no-unused-vars
		postMock = jest.fn( function ( payload ) {
			return {
				// eslint-disable-next-line no-unused-vars
				then: jest.fn( function ( responsePayload ) {
					return {
						catch: jest.fn()
					};
				} )
			};
		} );
		// eslint-disable-next-line no-unused-vars
		postWithEditTokenMock = jest.fn( function ( payload ) {
			return new Promise( function ( resolve ) {
				resolve( {
					wikilambda_edit: {
						page: 'sample'
					}
				} );
			} );
		} );

		state = $.extend( {}, zobjectModule.state );
		getResolveMock = jest.fn( function ( thenFunction ) {
			return thenFunction();
		} );
		context = $.extend( {}, {
			// eslint-disable-next-line no-unused-vars
			commit: jest.fn( function ( mutationType, payload ) {
				return;
			} ),
			// eslint-disable-next-line no-unused-vars
			dispatch: jest.fn( function ( actionType, payload ) {
				return {
					then: getResolveMock
				};
			} ),
			getters: {
				getNestedZObjectById: jest.fn( function () {
					return {
						id: 17
					};
				} ),
				getZObjectChildrenById: jest.fn( function () {
					return [];
				} ),
				getAllItemsFromListById: jest.fn( function () {
					return [];
				} )
			}
		} );

		mw.Api = jest.fn( function () {
			return {
				post: postMock,
				postWithEditToken: postWithEditTokenMock
			};
		} );
	} );

	// TODO (T328428): Add tests for new getters:
	// * [x] getRowById
	// * [x] getZObjectKeyByRowId
	// * [x] getZObjectValueByRowId
	// * [x] getChildrenByParentRowId
	// * [x] getRowByKeyPath
	// * [x] getZObjectTerminalValue
	// * [x] getZObjectFunctionCallFunctionId
	// * [x] getZObjectFunctionCallArguments
	// * [x] getZFunctionArgumentDeclarations
	// * [ ] getZStringTerminalValue
	// * [ ] getZReferenceTerminalValue
	// * [ ] getZMonolingualTextValue
	// * [ ] getZMonolingualLangValue
	// * [ ] getZCodeLanguage
	// * [ ] getZCode
	// * [ ] getZComposition
	// * [ ] getZCodeId
	// * [ ] getZCodeFunction
	// * [ ] getZBooleanValue
	// * [ ] getZObjectTypeByRowId
	// * [ ] getDepthByRowId
	// * [ ] getParentRowId
	// * [ ] getNextRowId
	// * [ ] isInsideComposition
	// * [ ] getZTypeStringRepresentation

	describe( 'Getters', function () {
		describe( 'getZObjectById', function () {
			it( 'Returns current zObject by its ID', function () {
				var result = { id: 1, key: 'Z1K1', value: 'Z2', parent: 0 };
				state.zobject = tableDataToRowObjects( zobjectTree );

				expect( zobjectModule.getters.getZObjectById( state )( 1 ) ).toEqual( result );
			} );
		} );

		describe( 'getZObjectIndexById', function () {
			it( 'Returns current zObject by its index', function () {
				var result = 10;
				state.zobject = tableDataToRowObjects( zobjectTree );

				expect( zobjectModule.getters.getZObjectIndexById( state )( 10 ) ).toEqual( result );
			} );
		} );

		describe( 'getZObjectChildrenById', function () {
			it( 'Returns empty array if zobject has no children when calling getZObjectChildrenById', function () {
				var result = [];
				state.zobject = tableDataToRowObjects( zobjectTree );

				expect( zobjectModule.getters.getZObjectChildrenById( state )( 10 ) ).toEqual( result );
			} );

			it( 'Returns zobject children when calling getZObjectChildrenById', function () {
				var result = [
					{ key: 'Z1K1', value: 'Z9', parent: 2, id: 4 },
					{ key: 'Z9K1', value: 'Z0', parent: 2, id: 5 }
				];
				state.zobject = tableDataToRowObjects( zobjectTree );

				expect( zobjectModule.getters.getZObjectChildrenById( state )( 2 ) ).toEqual( result );
			} );
		} );

		describe( 'currentZObjectLanguages', function () {
			it( 'Returns all languages found across name labels, argument labels and alias labels without any duplicates', function () {
				var result = [ { [ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE, [ Constants.Z_REFERENCE_ID ]: 'Z1002' },
					{ [ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE, [ Constants.Z_REFERENCE_ID ]: 'Z1004' },
					{ [ Constants.Z_OBJECT_TYPE ]: Constants.Z_REFERENCE, [ Constants.Z_REFERENCE_ID ]: 'Z1005' } ];

				var getters = {
					getZObjectAsJson: JSON.parse( fs.readFileSync( path.join( __dirname, './zobject/zFunctionWithMultipleLanguages.json' ) ) ),
					getZObjectAsJsonById: zobjectModule.getters.getZObjectAsJsonById( state )
				};
				expect( zobjectModule.modules.currentZObject.getters.currentZObjectLanguages( state, getters ) )
					.toEqual( result );
			} );
		} );

		describe( 'getAllItemsFromListById', function () {

			it( 'Returns all items in list when calling getAllItemsFromListById', function () {
				var result = [
					{ id: 12, key: '1', value: 'object', parent: 8 }
				];
				state.zobject = tableDataToRowObjects( zobjectTree );
				var getters = {
					getZObjectChildrenById: zobjectModule.getters.getZObjectChildrenById( state )
				};

				expect( zobjectModule.getters.getAllItemsFromListById( state, getters )( 8 ) ).toEqual( result );
			} );

			it( 'Returns empty array if list contains single item(type) when calling getAllItemsFromListById', function () {
				var result = [];
				state.zobject = tableDataToRowObjects( [
					{ id: 0, value: 'object' },
					{ key: 'Z1K1', value: 'Z2', parent: 0, id: 1 },
					{ key: 'Z2K1', value: 'object', parent: 0, id: 2 },
					{ key: 'Z2K2', value: 'object', parent: 0, id: 3 },
					{ key: 'Z1K1', value: 'Z9', parent: 2, id: 4 },
					{ key: 'Z9K1', value: 'Z0', parent: 2, id: 5 },
					{ key: 'Z2K3', value: 'object', parent: 0, id: 6 },
					{ key: 'Z1K1', value: 'Z12', parent: 6, id: 7 },
					{ key: 'Z12K1', value: 'array', parent: 6, id: 8 },
					{ key: '0', value: 'object', parent: 8, id: 9 },
					{ key: 'Z1K1', value: 'Z9', parent: 9, id: 10 },
					{ key: 'Z9K1', value: 'Z11', parent: 9, id: 11 }
				] );
				var getters = {
					getZObjectChildrenById: zobjectModule.getters.getZObjectChildrenById( state )
				};

				expect( zobjectModule.getters.getAllItemsFromListById( state, getters )( 8 ) ).toEqual( result );
			} );
		} );

		describe( 'getListTypeById', function () {

			it( 'Returns list type when calling getListTypeById', function () {
				var result = { key: '0', value: 'object', parent: 8, id: 9 };
				state.zobject = tableDataToRowObjects( zobjectTree );

				expect( zobjectModule.getters.getListTypeById( state )( 8 ) ).toEqual( result );
			} );

		} );

		describe( 'isCreateNewPage', function () {
			it( 'Returns whether the current state has `createNewPage`', function () {
				expect( zobjectModule.getters.isCreateNewPage( state ) ).toBe( true );
			} );
		} );

		describe( 'getZObjectMessage', function () {
			it( 'Returns the current zobjectMessage', function () {
				expect( zobjectModule.getters.getZObjectMessage( state ) ).toEqual( {
					type: 'error',
					text: null
				} );

				state.zobjectMessage = {
					type: 'notice',
					text: 'Something noticeable'
				};

				expect( zobjectModule.getters.getZObjectMessage( state ) ).toEqual( {
					type: 'notice',
					text: 'Something noticeable'
				} );
			} );
		} );

		describe( 'getNextKey', function () {
			it( 'Returns next ID for a key or argument', function () {
				state.zobject = tableDataToRowObjects( zobjectTree );

				expect( zobjectModule.getters.getNextKey( state, { getCurrentZObjectId: 'Z0' } ) ).toEqual( 'Z0K1' );
			} );
		} );

		describe( 'getLatestObjectIndex', function () {
			it( 'Returns latest index for a key', function () {
				state.zobject = tableDataToRowObjects( zobjectTree ).concat( [ new Row( 18, 'Z6K1', 'Z0K4', 0 ) ] );

				expect( zobjectModule.getters.getLatestObjectIndex( state )( 'Z0' ) ).toEqual( 4 );
			} );

			it( 'Returns 0 when no key is found for passed ZID', function () {
				state.zobject = tableDataToRowObjects( zobjectTree ).concat( [ new Row( 18, 'Z6K1', 'Z42K4', 0 ) ] );

				expect( zobjectModule.getters.getLatestObjectIndex( state )( 'Z0' ) ).toEqual( 0 );
			} );

			it( 'Skip items with no value', function () {
				state.zobject = [ new Row( 18, 'Z6K1', undefined, 0 ) ];

				expect( zobjectModule.getters.getLatestObjectIndex( state )( 'Z0' ) ).toEqual( 0 );
			} );
		} );

		describe( 'getNextObjectId', function () {
			it( 'Returns 0 if ZObject does not exist', function () {
				state.zobject = null;

				expect( zobjectModule.getters.getNextObjectId( state ) ).toEqual( 0 );
			} );

			it( 'Returns 0 if ZObject is an empty array', function () {
				state.zobject = [];

				expect( zobjectModule.getters.getNextObjectId( state ) ).toEqual( 0 );
			} );

			it( 'Returns the increment of the hightest object id', function () {
				state.zobject = tableDataToRowObjects( zobjectTree );
				const zobjectHighestId = 17;

				expect( zobjectModule.getters.getNextObjectId( state ) ).toEqual( zobjectHighestId + 1 );
			} );
		} );

		describe( 'isNewZObject', function () {
			it( 'Returns true if the value of the current ZObject is Z0', function () {
				state.zobject = tableDataToRowObjects( zobjectTree );

				expect( zobjectModule.modules.currentZObject.getters.isNewZObject( state, { getCurrentZObjectId: 'Z0' } ) ).toEqual( true );
			} );

			it( 'Returns false if the value of the current ZObject is not Z0', function () {
				state.zobject = tableDataToRowObjects( zobjectTree );

				expect( zobjectModule.modules.currentZObject.getters.isNewZObject( state, { getCurrentZObjectId: 'Z4' } ) ).toEqual( false );
			} );
		} );

		describe( 'currentZFunctionHasValidInputs', () => {
			var zObjectAsjson;
			beforeEach( () => {
				zObjectAsjson = JSON.parse( fs.readFileSync( path.join( __dirname, './zobject/zFunction.json' ) ) );
			} );

			it( 'returns true if all requirements met', () => {
				expect( zobjectModule.modules.currentZObject.getters.currentZFunctionHasValidInputs( state, {
					getCurrentZObjectType: Constants.Z_FUNCTION,
					getZObjectAsJson: zObjectAsjson } ) ).toEqual( true );
			} );

			it( 'returns false if current object not a function', () => {
				expect( zobjectModule.modules.currentZObject.getters.currentZFunctionHasValidInputs( state, {
					getCurrentZObjectType: Constants.Z_STRING,
					getZObjectAsJson: zObjectAsjson } ) ).toEqual( false );
			} );

			it( ' returns false if an input has an empty type', () => {
				zObjectAsjson[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ][ 1 ][
					Constants.Z_ARGUMENT_TYPE ][ Constants.Z_REFERENCE_ID ] = '';

				expect( zobjectModule.modules.currentZObject.getters.currentZFunctionHasValidInputs( state, {
					getCurrentZObjectType: Constants.Z_FUNCTION,
					getZObjectAsJson: zObjectAsjson } ) ).toEqual( false );
			} );

			it( ' returns false if an input has only an empty label', () => {
				zObjectAsjson[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ][ 1 ][
					Constants.Z_ARGUMENT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ][ 0 ][
					Constants.Z_MONOLINGUALSTRING_VALUE ][ Constants.Z_STRING_VALUE ] = '';

				expect( zobjectModule.modules.currentZObject.getters.currentZFunctionHasValidInputs( state, {
					getCurrentZObjectType: Constants.Z_FUNCTION,
					getZObjectAsJson: zObjectAsjson } ) ).toEqual( false );
			} );

			it( ' returns false if an input has no label', () => {
				zObjectAsjson[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ][ 1 ][
					Constants.Z_ARGUMENT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ] = [];

				expect( zobjectModule.modules.currentZObject.getters.currentZFunctionHasValidInputs( state, {
					getCurrentZObjectType: Constants.Z_FUNCTION,
					getZObjectAsJson: zObjectAsjson } ) ).toEqual( false );
			} );

			it( ' returns false if there are no inputs', () => {
				zObjectAsjson[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ] =
					[ Constants.Z_ARGUMENT ];

				expect( zobjectModule.modules.currentZObject.getters.currentZFunctionHasValidInputs( state, {
					getCurrentZObjectType: Constants.Z_FUNCTION,
					getZObjectAsJson: zObjectAsjson } ) ).toEqual( false );
			} );
		} );

		describe( 'getAttachedZTesters and getAttachedZImplementations', function () {
			var getters;
			beforeEach( function () {
				state.zobject = tableDataToRowObjects( zobjectTree.concat( [
					{ key: Constants.Z_FUNCTION_TESTERS, value: 'array', parent: 3, id: 18 },
					{ key: Constants.Z_FUNCTION_IMPLEMENTATIONS, value: 'array', parent: 3, id: 19 },
					{ key: '0', value: 'object', parent: 18, id: 20 },
					{ key: '1', value: 'object', parent: 18, id: 21 },
					{ key: '2', value: 'object', parent: 18, id: 22 },
					{ key: '0', value: 'object', parent: 19, id: 23 },
					{ key: '1', value: 'object', parent: 19, id: 24 },
					{ key: '2', value: 'object', parent: 19, id: 25 },
					{ key: Constants.Z_REFERENCE_ID, value: Constants.Z_TESTER, parent: 20, id: 26 },
					{ key: Constants.Z_REFERENCE_ID, value: 'Z111', parent: 21, id: 27 }, // tester 1
					{ key: Constants.Z_REFERENCE_ID, value: 'Z222', parent: 22, id: 28 }, // tester 2
					{ key: Constants.Z_REFERENCE_ID, value: Constants.Z_IMPLEMENTATION, parent: 23, id: 29 },
					{ key: Constants.Z_REFERENCE_ID, value: 'Z333', parent: 24, id: 30 }, // impl 1
					{ key: Constants.Z_REFERENCE_ID, value: 'Z444', parent: 25, id: 31 } // impl 2
				] ) );
				getters = {};
				getters.getZObjectChildrenById = zobjectModule.getters.getZObjectChildrenById( state, getters );
				getters.getNestedZObjectById = zobjectModule.getters.getNestedZObjectById( state, getters );
			} );
			it( 'return attached ZTesters', function () {
				expect( zobjectModule.getters.getAttachedZTesters( state, getters )( 0 ) )
					.toEqual( [ 'Z111', 'Z222' ] );
			} );
			it( 'return attached ZImplementations', function () {
				expect( zobjectModule.getters.getAttachedZImplementations( state, getters )( 0 ) )
					.toEqual( [ 'Z333', 'Z444' ] );
			} );
		} );

		describe( 'getIsZObjectDirty', function () {
			it( 'returns the default isZObjectDirty false', function () {
				expect( zobjectModule.getters.getIsZObjectDirty( state ) )
					.toEqual( false );
			} );

			it( 'returns isZObjectDirty from the updated state', function () {
				state.isZObjectDirty = true;

				expect( zobjectModule.getters.getIsZObjectDirty( state ) )
					.toEqual( true );
			} );
		} );

		describe( 'getZObjectTypeById', () => {
			var getters;
			beforeEach( function () {
				getters = {};
				getters.getZObjectChildrenById = zobjectModule.getters.getZObjectChildrenById( state, getters );
				getters.getZObjectById = zobjectModule.getters.getZObjectById( state, getters );
			} );
			it( 'when object is a call to a function that does not return a type, returns Z_FUNCTION_CALL', () => {
				state.zobject = tableDataToRowObjects( [
					{ value: Constants.ROW_VALUE_OBJECT, id: 0 },
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_FUNCTION_CALL, parent: 0, id: 1 },
					{ key: Constants.Z_FUNCTION_CALL_FUNCTION, value: 'Z12345', parent: 0, id: 2 }
				] );
				getters.getZkeys = {
					Z12345: {
						[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION,
							[ Constants.Z_FUNCTION_RETURN_TYPE ]: Constants.Z_STRING
						}
					}
				};

				expect( zobjectModule.getters.getZObjectTypeById( state, getters )( 0 ) )
					.toEqual( Constants.Z_FUNCTION_CALL );
			} );
			it( 'when object is a call to a function that returns a type, returns FUNCTION_CALL_TO_TYPE', () => {
				state.zobject = tableDataToRowObjects( [
					{ value: Constants.ROW_VALUE_OBJECT, id: 0 },
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_FUNCTION_CALL, parent: 0, id: 1 },
					{ key: Constants.Z_FUNCTION_CALL_FUNCTION, value: Constants.Z_TYPED_PAIR, parent: 0, id: 2 }
				] );
				getters.getZkeys = {
					[ Constants.Z_TYPED_PAIR ]: {
						[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION,
							[ Constants.Z_FUNCTION_RETURN_TYPE ]: Constants.Z_TYPE
						}
					}
				};

				expect( zobjectModule.getters.getZObjectTypeById( state, getters )( 0 ) )
					.toEqual( Constants.Z_FUNCTION_CALL_TO_TYPE );
			} );
			it( `when object has as its type a call to a function that returns a type, and that returned type has a
				dedicated UI component, returns that type`, () => {
				state.zobject = tableDataToRowObjects( [
					{ value: Constants.ROW_VALUE_OBJECT, id: 0 },
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 1 },
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_FUNCTION_CALL, parent: 1, id: 2 },
					{ key: Constants.Z_FUNCTION_CALL_FUNCTION, value: Constants.Z_TYPED_PAIR, parent: 1, id: 3 }
				] );

				expect( zobjectModule.getters.getZObjectTypeById( state, getters )( 0 ) )
					.toEqual( Constants.Z_TYPED_PAIR );
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
			var getters;
			beforeEach( function () {
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
			var getters;
			beforeEach( function () {
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
			var getters;
			beforeEach( function () {
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
			var getters;
			beforeEach( function () {
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
				state.zobject = tableDataToRowObjects( zobjectTree );
				const keyPath = [ 'Z2K2', 'Z6K1' ];
				const rowId = 0;
				const expected = { key: 'Z6K1', value: '', parent: 3, id: 17 };
				expect( zobjectModule.getters.getRowByKeyPath( state, getters )( keyPath, rowId ) ).toEqual( expected );
			} );

			it( 'returns correct row when keyPath is complex, walks through objects and lists, and starts from non-root row', () => {
				state.zobject = tableDataToRowObjects( zobjectTree );
				const keyPath = [ 'Z12K1', '1', 'Z11K2' ];
				const rowId = 6;
				const expected = { key: 'Z11K2', value: '', parent: 12, id: 15 };
				expect( zobjectModule.getters.getRowByKeyPath( state, getters )( keyPath, rowId ) ).toEqual( expected );
			} );
		} );

		describe( 'getZObjectTerminalValue', () => {
			var getters;
			beforeEach( function () {
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
			var getters;
			beforeEach( function () {
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
			var getters;
			beforeEach( function () {
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

		describe( 'getZFunctionArgumentDeclarations', function () {
			var getters = {};
			beforeEach( function () {
				state.zKeys = mockApiZkeys;
				getters.getPersistedObject = function ( key ) {
					return state.zKeys[ key ];
				};
			} );

			it( 'Returns undefined when the zid has not been fetched ', function () {
				expect( zobjectModule.getters.getZFunctionArgumentDeclarations( state, getters )( 'Z999999' ) ).toEqual( undefined );
			} );
			it( 'Returns undefined when the zid is not a function', function () {
				expect( zobjectModule.getters.getZFunctionArgumentDeclarations( state, getters )( 'Z32' ) ).toEqual( undefined );
			} );
			it( 'Returns one argument with a one-argument function', function () {
				const args = zobjectModule.getters.getZFunctionArgumentDeclarations( state, getters )( 'Z881' );
				expect( args ).toHaveLength( 1 );
				expect( args[ 0 ].Z17K2 ).toEqual( 'Z881K1' );
			} );
			it( 'Returns all arguments with a three-argument function', function () {
				const args = zobjectModule.getters.getZFunctionArgumentDeclarations( state, getters )( 'Z802' );
				expect( args ).toHaveLength( 3 );
				expect( args[ 0 ].Z17K2 ).toEqual( 'Z802K1' );
				expect( args[ 1 ].Z17K2 ).toEqual( 'Z802K2' );
				expect( args[ 2 ].Z17K2 ).toEqual( 'Z802K3' );
			} );
		} );
	} );

	describe( 'Mutations', function () {
		describe( 'setZObject', function () {
			it( 'Updates the zobject', function () {
				zobjectModule.mutations.setZObject( state, zobject );

				expect( state.zobject ).toEqual( zobject );
			} );
		} );

		describe( 'setCreateNewPage', function () {
			it( 'Sets `createNewPage` to provided value', function () {
				expect( state.createNewPage ).toBe( true );

				zobjectModule.mutations.setCreateNewPage( state, false );

				expect( state.createNewPage ).toBe( false );
			} );
		} );

		describe( 'setMessage', function () {
			it( 'Sets message to provided value', function () {
				var message = {
					type: 'error',
					text: 'An error occurred'
				};

				zobjectModule.mutations.setMessage( state, message );

				expect( state.zobjectMessage ).toEqual( message );
			} );

			it( 'Sets message to default when no payload is found', function () {
				zobjectModule.mutations.setMessage( state );

				expect( state.zobjectMessage ).toEqual( {
					type: 'notice',
					text: null
				} );
			} );
		} );

		describe( 'setIsZObjectDirty', function () {
			it( 'Updates the isZObjectDirty value', function () {
				zobjectModule.mutations.setIsZObjectDirty( state, true );

				expect( state.isZObjectDirty ).toEqual( true );
			} );
		} );
	} );

	// TODO (T328428): Add tests for new actions:
	// * [x] injectZObjectFromRowId
	// * [x] injectKeyValueFromRowId
	// * [ ] setZFunctionCallArguments
	// * [ ] setValueByRowIdAndPath
	// * [ ] setValueByRowId
	// * [ ] removeItemFromTypedList
	// * [ ] removeAllItemsFromTypedList

	describe( 'Actions', function () {
		var defaultHref = window.location.href;
		beforeEach( function () {
			delete window.location;
			window.location = {
				href: defaultHref
			};
		} );
		afterAll( function () {
			delete window.location;
			window.location = {
				href: defaultHref
			};
		} );

		it( 'Initialize ZObject, create new page', function () {
			var expectedChangeTypePayload = { id: 0, type: Constants.Z_PERSISTENTOBJECT },
				expectedRootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };
			context.state = {
				zobject: tableDataToRowObjects( zobjectTree )
			};
			mw.config = {
				get: jest.fn( function () {
					return {
						createNewPage: true
					};
				} )
			};
			zobjectModule.actions.initializeZObject( context );

			expect( context.commit ).toHaveBeenCalledTimes( 4 );
			expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
			expect( context.commit ).toHaveBeenCalledWith( 'setCreateNewPage', true );
			expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z0' );
			expect( context.commit ).toHaveBeenCalledWith( 'addZObject', expectedRootObject );
			expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', expectedChangeTypePayload );
			expect( context.commit ).toHaveBeenCalledWith( 'setZObjectInitialized', true );
			expect( context.state.zobject ).toEqual( zobjectTree );
		} );

		it( 'Dispatches isZObjectDirty', function () {
			const isZObjectDirty = true;
			zobjectModule.actions.setIsZObjectDirty( context, isZObjectDirty );

			expect( context.commit ).toHaveBeenCalledTimes( 1 );
			expect( context.commit ).toHaveBeenCalledWith( 'setIsZObjectDirty', isZObjectDirty );
		} );

		it( 'Dispatches errors for an invalid zFunction', function () {
			context.getters.currentZFunctionHasOutput = false;
			context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;

			const mockError = {
				errorMessage: 'wikilambda-missing-function-output-error-message',
				errorState: true,
				errorType: 'error',
				internalId: 17
			};

			const isValid = zobjectModule.actions.validateZObject( context );
			expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
			expect( context.dispatch ).toHaveBeenCalledWith( 'setError', mockError );
			expect( isValid ).toEqual( false );
		} );

		it( 'Dispatches errors for a zImplementation with no function and no code defined', function () {
			context.getters.getCurrentZObjectType = Constants.Z_IMPLEMENTATION;
			context.state = {
				zobject: tableDataToRowObjects( [
					{ id: 0, value: 'object' },
					{ key: 'Z2K2', value: 'object', parent: 0, id: 7 },
					{ key: 'Z14K1', value: 'object', parent: 7, id: 35 },
					{ key: 'Z9K1', value: '', parent: 35, id: 37 },
					{ key: 'Z14K3', value: 'object', parent: 7, id: 54 }
				] )
			};
			context.getters.getZObjectAsJson = {
				Z2K2: {
					Z1K1: Constants.Z_IMPLEMENTATION,
					Z14K1: {
						Z1K1: Constants.Z_REFERENCE,
						Z9K1: ''
					},
					Z14K3: {
						Z16K2: {
							Z1K1: Constants.Z_STRING,
							Z6K1: undefined
						}
					}
				}
			};
			context.getters.getZObjectChildrenById = zobjectModule.getters.getZObjectChildrenById( context.state );

			const mockErrorNoFunction = {
				errorMessage: 'wikilambda-zobject-missing-attached-function',
				errorState: true,
				errorType: 'error',
				internalId: 37
			};

			const mockErrorNoCode = {
				internalId: 54,
				errorState: true,
				errorMessage: 'wikilambda-zimplementation-code-missing',
				errorType: Constants.errorTypes.ERROR
			};

			const isValid = zobjectModule.actions.validateZObject( context );
			expect( context.dispatch ).toHaveBeenCalledTimes( 2 );
			expect( context.dispatch ).toHaveBeenNthCalledWith( 1, 'setError', mockErrorNoFunction );
			expect( context.dispatch ).toHaveBeenNthCalledWith( 2, 'setError', mockErrorNoCode );
			expect( isValid ).toEqual( false );
		} );

		it( 'Dispatches errors for an invalid zTester', function () {
			context.getters.getCurrentZObjectType = Constants.Z_TESTER;
			context.state = {
				zobject: tableDataToRowObjects( [
					{ id: 0, value: 'object' },
					{ key: 'Z2K2', value: 'object', parent: 0, id: 7 },
					{ key: 'Z20K1', value: 'object', parent: 7, id: 35 },
					{ key: 'Z9K1', value: '', parent: 35, id: 37 },
					{ key: 'Z20K2', value: 'object', parent: 7, id: 38 },
					{ key: 'Z20K3', value: 'object', parent: 7, id: 41 }
				] )
			};
			context.getters.getZObjectAsJson = {
				Z2K2: {
					Z1K1: Constants.Z_TESTER,
					Z20K1: {
						Z1K1: Constants.Z_REFERENCE,
						Z9K1: ''
					},
					Z20K2: {
						Z1K1: Constants.Z_FUNCTION_CALL,
						Z7K1: ''
					},
					Z20K3: {
						Z1K1: Constants.Z_FUNCTION_CALL,
						Z7K1: ''
					}
				}
			};

			context.getters.getZObjectChildrenById = zobjectModule.getters.getZObjectChildrenById( context.state );

			const mockErrorNoFunction = {
				internalId: 37,
				errorMessage: 'wikilambda-zobject-missing-attached-function',
				errorState: true,
				errorType: 'error'
			};

			const mockErrorNoFunctionCall = {
				internalId: 38,
				errorState: true,
				errorMessage: 'wikilambda-zobject-missing-attached-function',
				errorType: Constants.errorTypes.ERROR
			};

			const mockErrorNoResultValidation = {
				internalId: 41,
				errorState: true,
				errorMessage: 'wikilambda-zobject-missing-attached-function',
				errorType: Constants.errorTypes.ERROR
			};

			const isValid = zobjectModule.actions.validateZObject( context );
			expect( context.dispatch ).toHaveBeenCalledTimes( 3 );
			expect( context.dispatch ).toHaveBeenNthCalledWith( 1, 'setError', mockErrorNoFunction );
			expect( context.dispatch ).toHaveBeenNthCalledWith( 2, 'setError', mockErrorNoFunctionCall );
			expect( context.dispatch ).toHaveBeenNthCalledWith( 3, 'setError', mockErrorNoResultValidation );
			expect( isValid ).toEqual( false );
		} );

		it( 'Does not dispatch errors for a valid zFunction', function () {
			context.getters.currentZFunctionHasOutput = true;
			context.getters.getCurrentZObjectType = Constants.Z_FUNCTION;

			const isValid = zobjectModule.actions.validateZObject( context );
			expect( context.dispatch ).not.toHaveBeenCalled();
			expect( isValid ).toEqual( true );
		} );

		it( 'Initialize ZObject, create new page, initial value for Z2K2', function () {
			var expectedChangeTypePayload = { id: 0, type: Constants.Z_PERSISTENTOBJECT },
				expectedZ2K2ChangeTypePayload = { id: 3, type: Constants.Z_BOOLEAN },
				expectedRootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };
			context.state = {
				zobject: tableDataToRowObjects( zobjectTree )
			};
			context.rootGetters = {
				getZkeys: {
					Z40: {
						Z2K2: {
							Z1K1: 'Z4'
						}
					}
				}
			};
			delete window.location;
			window.location = {
				href: 'http://localhost:8080/wiki/Special:CreateZObject?zid=Z40'
			};
			mw.config = {
				get: jest.fn( function () {
					return {
						createNewPage: true
					};
				} )
			};
			zobjectModule.actions.initializeZObject( context );

			expect( context.commit ).toHaveBeenCalledTimes( 4 );
			expect( context.dispatch ).toHaveBeenCalledTimes( 3 );
			expect( context.commit ).toHaveBeenCalledWith( 'setCreateNewPage', true );
			expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z0' );
			expect( context.commit ).toHaveBeenCalledWith( 'addZObject', expectedRootObject );
			expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', expectedChangeTypePayload );
			expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
			expect( context.commit ).toHaveBeenCalledWith( 'setZObjectInitialized', true );
		} );

		it( 'Initialize ZObject, create new page, non-ZID value as initial', function () {
			var expectedZ2K2ChangeTypePayload = { id: 3, type: 'banana' };
			context.state = {
				zobject: tableDataToRowObjects( zobjectTree )
			};
			delete window.location;
			window.location = {
				href: 'http://localhost:8080/wiki/Special:CreateZObject?zid=banana'
			};
			mw.config = {
				get: jest.fn( function () {
					return {
						createNewPage: true
					};
				} )
			};
			zobjectModule.actions.initializeZObject( context );

			expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
		} );

		it( 'Initialize ZObject, create new page, lowercase ZID', function () {
			var expectedZ2K2ChangeTypePayload = { id: 3, type: Constants.Z_REFERENCE };
			context.state = {
				zobject: tableDataToRowObjects( zobjectTree )
			};
			delete window.location;
			window.location = {
				href: 'http://localhost:8080/wiki/Special:CreateZObject?zid=z9'
			};
			mw.config = {
				get: jest.fn( function () {
					return {
						createNewPage: true
					};
				} )
			};
			zobjectModule.actions.initializeZObject( context );

			expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
		} );

		it( 'Initialize ZObject, create new page, ZObject key passed as initial', function () {
			var expectedZ2K2ChangeTypePayload = { id: 3, type: Constants.Z_REFERENCE_ID };
			context.state = {
				zobject: tableDataToRowObjects( zobjectTree )
			};
			delete window.location;
			window.location = {
				href: 'http://localhost:8080/wiki/Special:CreateZObject?zid=Z9K1'
			};
			mw.config = {
				get: jest.fn( function () {
					return {
						createNewPage: true
					};
				} )
			};
			zobjectModule.actions.initializeZObject( context );

			expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
		} );

		it( 'Initialize ZObject, create new page, quasi-valid ZID', function () {
			var expectedZ2K2ChangeTypePayload = { id: 3, type: 'Z9s' };
			context.state = {
				zobject: tableDataToRowObjects( zobjectTree )
			};
			delete window.location;
			window.location = {
				href: 'http://localhost:8080/wiki/Special:CreateZObject?zid=Z9s'
			};
			mw.config = {
				get: jest.fn( function () {
					return {
						createNewPage: true
					};
				} )
			};
			zobjectModule.actions.initializeZObject( context );

			expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
		} );

		it( 'Initialize ZObject, existing zobject page', function () {
			mw.config = {
				get: jest.fn( function () {
					return {
						createNewPage: false,
						zId: 'Z1234'
					};
				} )
			};
			zobjectModule.actions.initializeZObject( context );

			expect( context.commit ).toHaveBeenCalledTimes( 2 );
			expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
			expect( context.commit ).toHaveBeenCalledWith( 'setCreateNewPage', false );
			expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z1234' );
			expect( context.dispatch ).toHaveBeenCalledWith( 'initializeRootZObject', 'Z1234' );
		} );

		it( 'Initialize Root ZObject', function () {
			// Root ZObject
			const Z1234 = {
				Z1K1: 'Z2',
				Z2K1: 'Z1234',
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
					Z32K1: [
						'Z31',
						{
							Z1K1: 'Z31',
							Z31K1: 'Z1002',
							Z31K2: [ 'Z6' ]
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
			getResolveMock = jest.fn( function ( thenFunction ) {
				return thenFunction( mockApiResponse );
			} );
			getMock = jest.fn( function () {
				return { then: getResolveMock };
			} );
			mw.Api = jest.fn( function () {
				return { get: getMock };
			} );

			// Expected data
			const expectedFetchZKeysPayload = {
				zids: [ 'Z1', 'Z9', 'Z2', 'Z6', 'Z1234', 'Z12', 'Z11', 'Z1002', 'Z32', 'Z31' ]
			};
			const expectedSetZObjectPayload = [
				{ id: 0, key: undefined, value: 'object', parent: undefined },
				{ id: 1, key: 'Z1K1', value: 'object', parent: 0 },
				{ id: 2, key: 'Z1K1', value: 'Z9', parent: 1 },
				{ id: 3, key: 'Z9K1', value: 'Z2', parent: 1 },
				{ id: 4, key: 'Z2K1', value: 'object', parent: 0 },
				{ id: 5, key: 'Z1K1', value: 'Z6', parent: 4 },
				{ id: 6, key: 'Z6K1', value: 'Z1234', parent: 4 },
				{ id: 7, key: 'Z2K2', value: 'object', parent: 0 },
				{ id: 8, key: 'Z1K1', value: 'Z6', parent: 7 },
				{ id: 9, key: 'Z6K1', value: 'test', parent: 7 },
				{ id: 10, key: 'Z2K3', value: 'object', parent: 0 },
				{ id: 11, key: 'Z1K1', value: 'object', parent: 10 },
				{ id: 12, key: 'Z1K1', value: 'Z9', parent: 11 },
				{ id: 13, key: 'Z9K1', value: 'Z12', parent: 11 },
				{ id: 14, key: 'Z12K1', value: 'array', parent: 10 },
				{ id: 15, key: '0', value: 'object', parent: 14 },
				{ id: 16, key: 'Z1K1', value: 'Z9', parent: 15 },
				{ id: 17, key: 'Z9K1', value: 'Z11', parent: 15 },
				{ id: 18, key: '1', value: 'object', parent: 14 },
				{ id: 19, key: 'Z1K1', value: 'object', parent: 18 },
				{ id: 20, key: 'Z1K1', value: 'Z9', parent: 19 },
				{ id: 21, key: 'Z9K1', value: 'Z11', parent: 19 },
				{ id: 22, key: 'Z11K1', value: 'object', parent: 18 },
				{ id: 23, key: 'Z1K1', value: 'Z9', parent: 22 },
				{ id: 24, key: 'Z9K1', value: 'Z1002', parent: 22 },
				{ id: 25, key: 'Z11K2', value: 'object', parent: 18 },
				{ id: 26, key: 'Z1K1', value: 'Z6', parent: 25 },
				{ id: 27, key: 'Z6K1', value: 'test', parent: 25 },
				{ id: 28, key: 'Z2K4', value: 'object', parent: 0 },
				{ id: 29, key: 'Z1K1', value: 'object', parent: 28 },
				{ id: 30, key: 'Z1K1', value: 'Z9', parent: 29 },
				{ id: 31, key: 'Z9K1', value: 'Z32', parent: 29 },
				{ id: 32, key: 'Z32K1', value: 'array', parent: 28 },
				{ id: 33, key: '0', value: 'object', parent: 32 },
				{ id: 34, key: 'Z1K1', value: 'Z9', parent: 33 },
				{ id: 35, key: 'Z9K1', value: 'Z31', parent: 33 },
				{ id: 36, key: '1', value: 'object', parent: 32 },
				{ id: 37, key: 'Z1K1', value: 'object', parent: 36 },
				{ id: 38, key: 'Z1K1', value: 'Z9', parent: 37 },
				{ id: 39, key: 'Z9K1', value: 'Z31', parent: 37 },
				{ id: 40, key: 'Z31K1', value: 'object', parent: 36 },
				{ id: 41, key: 'Z1K1', value: 'Z9', parent: 40 },
				{ id: 42, key: 'Z9K1', value: 'Z1002', parent: 40 },
				{ id: 43, key: 'Z31K2', value: 'array', parent: 36 },
				{ id: 44, key: '0', value: 'object', parent: 43 },
				{ id: 45, key: 'Z1K1', value: 'Z9', parent: 44 },
				{ id: 46, key: 'Z9K1', value: 'Z6', parent: 44 }
			];

			zobjectModule.actions.initializeRootZObject( context, 'Z1234' );

			expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
			expect( context.commit ).toHaveBeenCalledTimes( 2 );
			expect( context.commit ).toHaveBeenCalledWith( 'setZObject', expectedSetZObjectPayload );
			expect( context.commit ).toHaveBeenCalledWith( 'setZObjectInitialized', true );
			expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZKeys', expectedFetchZKeysPayload );
		} );

		it( 'Initialize ZObject with Z7 call function when createNewPage is false and evaluateFunctionCall ' +
			'is true', function () {
			var expectedChangeTypePayload = { id: 0, type: Constants.Z_FUNCTION_CALL },
				expectedRootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };
			context.state = {
				zobject: tableDataToRowObjects( zobjectTree )
			};
			context.getters.getZkeys = {
				Z1234: { Z1K1: 'test', Z2K1: 'test' }
			};
			mw.config = {
				get: jest.fn( function () {
					return {
						createNewPage: false,
						evaluateFunctionCall: true
					};
				} )
			};
			zobjectModule.actions.initializeZObject( context );

			expect( context.commit ).toHaveBeenCalledTimes( 4 );
			expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
			expect( context.commit ).toHaveBeenCalledWith( 'setCreateNewPage', false );
			expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z0' );
			expect( context.commit ).toHaveBeenCalledWith( 'addZObject', expectedRootObject );
			expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', expectedChangeTypePayload );
			expect( context.commit ).toHaveBeenCalledWith( 'setZObjectInitialized', true );
		} );

		it( 'Save new zobject', function () {
			context.getters.isCreateNewPage = true;
			context.getters.getCurrentZObjectId = 'Z0';
			context.state = {
				zobject: tableDataToRowObjects( zobjectTree )
			};
			zobjectModule.actions.submitZObject( context, { summary: 'A summary' } );

			expect( mw.Api ).toHaveBeenCalledTimes( 1 );
			expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				summary: 'A summary',
				zid: undefined,
				zobject: JSON.stringify( zobject )
			} );
			expect( context.commit ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'Save existing zobject', function () {
			context.getters.isCreateNewPage = false;
			context.getters.getCurrentZObjectId = 'Z0';
			context.state = {
				zobject: tableDataToRowObjects( zobjectTree )
			};
			zobjectModule.actions.submitZObject( context, { summary: 'A summary' } );

			expect( mw.Api ).toHaveBeenCalledTimes( 1 );
			expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				summary: 'A summary',
				zid: 'Z0',
				zobject: JSON.stringify( zobject )
			} );
			expect( context.commit ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'Remove zImplementation and zTester from zObject and Save existing zobject', function () {
			context.getters.isCreateNewPage = false;
			context.getters.getCurrentZObjectId = 'Z0';
			const zobjectFunction = JSON.parse( fs.readFileSync( path.join( __dirname, './zobject/getZFunction.json' ) ) );
			context.state = {
				zobject: tableDataToRowObjects( zobjectFunction.ZObjectTree )
			};
			zobjectModule.actions.submitZObject( context, { summary: 'A summary', shouldUnattachImplementationAndTester: true } );

			expect( mw.Api ).toHaveBeenCalledTimes( 1 );

			zobjectFunction.ZObject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_TESTERS ] =
			[ Constants.Z_TESTER ];
			zobjectFunction.ZObject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_IMPLEMENTATIONS ] =
			[ Constants.Z_IMPLEMENTATION ];

			expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				summary: 'A summary',
				zid: 'Z0',
				zobject: JSON.stringify( zobjectFunction.ZObject )
			} );
			expect( context.commit ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'Reset the root ZObject by ID', function () {
			context.state = {
				zobject: tableDataToRowObjects( zobjectTree )
			};
			context.getters.getZObjectChildrenById = zobjectModule.getters.getZObjectChildrenById( context.state );

			context.dispatch = jest.fn();

			zobjectModule.actions.resetZObject( context, 0 );

			expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', {
				id: 0,
				type: 'Z2'
			} );
		} );

		it( 'Reset a given ZObject by ID', function () {
			context.state = {
				zobject: tableDataToRowObjects( zobjectTree )
			};
			context.getters.getZObjectChildrenById = zobjectModule.getters.getZObjectChildrenById( context.state );

			context.dispatch = jest.fn();

			zobjectModule.actions.resetZObject( context, 3 );

			expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', {
				id: 3,
				type: 'Z6'
			} );
		} );

		// In the event that a ZList item is removed, the indeces of the remaining items need to be updated.
		// This is to prevent a null value from appearing in the generated JSON array.
		it( 'Recalculate an existing ZList\'s keys to remove missing indeces', function () {
			context.state = {
				zobject: [
					{ id: 0, value: 'object' },
					{ key: 'Z1K1', value: 'Z2', parent: 0, id: 1 },
					{ key: 'Z2K1', value: 'object', parent: 0, id: 2 },
					{ key: 'Z2K2', value: 'array', parent: 0, id: 3 },
					{ key: 'Z1K1', value: 'Z9', parent: 2, id: 4 },
					{ key: 'Z9K1', value: 'Z0', parent: 2, id: 5 },
					{ key: 'Z2K3', value: 'object', parent: 0, id: 6 },
					{ key: 'Z1K1', value: 'Z12', parent: 6, id: 7 },
					{ key: 'Z12K1', value: 'array', parent: 6, id: 8 },
					{ key: '0', value: 'object', parent: 8, id: 9 },
					{ key: 'Z1K1', value: 'Z11', parent: 9, id: 10 },
					{ key: 'Z11K1', value: 'object', parent: 9, id: 11 },
					{ key: 'Z1K1', value: 'Z9', parent: 11, id: 12 },
					{ key: 'Z9K1', value: 'Z1002', parent: 11, id: 13 },
					{ key: 'Z11K2', value: 'object', parent: 9, id: 14 },
					{ key: 'Z1K1', value: 'Z6', parent: 14, id: 15 },
					{ key: 'Z6K1', value: '', parent: 14, id: 16 },
					{ key: '0', value: 'object', parent: 3, id: 17 },
					{ key: 'Z1K1', value: 'Z6', parent: 17, id: 18 },
					{ key: 'Z6K1', value: 'first', parent: 17, id: 19 },
					{ key: '1', value: 'object', parent: 3, id: 20 },
					{ key: 'Z1K1', value: 'Z6', parent: 20, id: 21 },
					{ key: 'Z6K1', value: 'second', parent: 20, id: 22 }
				]
			};
			context.getters.getZObjectChildrenById = zobjectModule.getters.getZObjectChildrenById( context.state );
			context.getters.getZObjectIndexById = zobjectModule.getters.getZObjectIndexById( context.state );
			context.getters.getZObjectAsJsonById = zobjectModule.getters.getZObjectAsJsonById( context.state );
			context.commit = jest.fn( function ( mutationType, payload ) {
				zobjectModule.mutations[ mutationType ]( context.state, payload );
			} );
			context.dispatch = jest.fn( function ( actionType, payload ) {
				zobjectModule.actions[ actionType ]( context, payload );

				return {
					then: function ( fn ) {
						return fn();
					}
				};
			} );

			// Remove index 0 from the ZList
			zobjectModule.actions.removeZObject( context, 17 );

			// Perform recalculate
			zobjectModule.actions.recalculateZListIndex( context, 3 );

			// Validate that recalculate correctly updated the index
			expect( zobjectModule.getters.getZObjectById( context.state )( 20 ) ).toEqual( { key: '0', value: 'object', parent: 3, id: 20 } );
			expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson( context.state, context.getters, { zobjectModule: context.state }, context.getters ).Z2K2 ).toEqual( [ { Z1K1: 'Z6', Z6K1: 'second' } ] );
		} );

		it( 'Recalculate an existing ZArgumentList with the correct key values', function () {
			context.state = {
				zobject: [
					{ id: 0, value: 'object' },
					{ key: 'Z1K1', value: 'Z2', parent: 0, id: 1 },
					{ key: 'Z2K1', value: 'object', parent: 0, id: 2 },
					{ key: 'Z2K2', value: 'object', parent: 0, id: 3 },
					{ key: 'Z1K1', value: 'Z6', parent: 2, id: 4 },
					{ key: 'Z6K1', value: 'Z10006', parent: 2, id: 5 },
					{ key: 'Z2K2', value: 'object', parent: 0, id: 6 },
					{ key: 'Z1K1', value: 'Z8', parent: 6, id: 7 },
					{ key: 'Z8K1', value: 'array', parent: 6, id: 8 },
					{ key: '0', value: 'Z17', parent: 8, id: 9 },
					{ key: '1', value: 'object', parent: 8, id: 10 },
					{ key: 'Z1K1', value: 'Z17', parent: 10, id: 11 },
					{ key: 'Z17K1', value: 'Z6', parent: 10, id: 12 },
					{ key: 'Z17K2', value: 'object', parent: 10, id: 13 },
					{ key: 'Z1K1', value: 'Z6', parent: 13, id: 14 },
					{ key: 'Z6K1', value: 'Z10006K1', parent: 13, id: 15 },
					{ key: 'Z17K3', value: 'object', parent: 10, id: 16 },
					{ key: 'Z1K1', value: 'Z12', parent: 16, id: 17 },
					{ key: 'Z12K1', value: 'array', parent: 16, id: 18 },
					{ key: '2', value: 'object', parent: 8, id: 19 },
					{ key: 'Z1K1', value: 'Z17', parent: 19, id: 20 },
					{ key: 'Z17K1', value: 'Z6', parent: 19, id: 21 },
					{ key: 'Z17K2', value: 'object', parent: 19, id: 22 },
					{ key: 'Z1K1', value: 'Z6', parent: 22, id: 23 },
					{ key: 'Z6K1', value: 'Z10006K2', parent: 22, id: 24 },
					{ key: 'Z17K3', value: 'object', parent: 19, id: 25 },
					{ key: '3', value: 'object', parent: 8, id: 26 },
					{ key: 'Z1K1', value: 'Z17', parent: 26, id: 27 },
					{ key: 'Z17K1', value: 'Z6', parent: 26, id: 28 },
					{ key: 'Z17K2', value: 'object', parent: 26, id: 29 },
					{ key: 'Z1K1', value: 'Z6', parent: 29, id: 30 },
					{ key: 'Z6K1', value: 'Z10006K3', parent: 29, id: 31 },
					{ key: 'Z17K3', value: 'object', parent: 26, id: 32 }
				]
			};
			context.getters = {
				getCurrentZObjectId: 'Z10006',
				// List that is passed once second item has been removed.
				getAllItemsFromListById: jest.fn().mockReturnValue( [ { key: '1', value: 'object', parent: 8, id: 10 }, { key: '3', value: 'object', parent: 8, id: 26 } ] ),
				getZObjectChildrenById: zobjectModule.getters.getZObjectChildrenById( context.state ),
				getZObjectIndexById: zobjectModule.getters.getZObjectIndexById( context.state )
			};
			context.commit = jest.fn( function ( mutationType, payload ) {
				zobjectModule.mutations[ mutationType ]( context.state, payload );
			} );
			context.dispatch = jest.fn( function ( actionType, payload ) {
				zobjectModule.actions[ actionType ]( context, payload );

				return {
					then: function ( fn ) {
						return fn();
					}
				};
			} );
			// Remove second item from ZArgumentList.
			zobjectModule.actions.removeZObject( context, 22 );
			// Perform recalculate
			zobjectModule.actions.recalculateZArgumentList( context, 8 );
			// Third list item, has now become second list item.
			expect( zobjectModule.getters.getZObjectById( context.state )( 26 ) ).toEqual( { key: '1', value: 'object', parent: 8, id: 26 } );
			expect( zobjectModule.getters.getZObjectById( context.state )( 31 ) ).toEqual( { key: 'Z6K1', value: 'Z10006K2', parent: 29, id: 31 } );
		} );

		describe( 'changeType', function () {
			beforeEach( function () {
				context.state = {
					zobject: tableDataToRowObjects( [ { id: 0, value: Constants.ROW_VALUE_OBJECT } ] ),
					zKeys: mockApiZkeys
				};
				context.rootState = {
					zobjectModule: context.state
				};
				Object.keys( zobjectModule.getters ).forEach( function ( key ) {
					context.getters[ key ] =
						zobjectModule.getters[ key ](
							context.state, context.getters,
							{ zobjectModule: context.state },
							context.getters );
				} );
				Object.keys( zobjectModule.modules.currentZObject.getters ).forEach( function ( key ) {
					context.getters[ key ] =
						zobjectModule.modules.currentZObject.getters[ key ](
							context.state,
							context.getters,
							{ zobjectModule: context.state },
							context.getters );
				} );
				Object.keys( zobjectModule.modules.addZObjects.getters ).forEach( function ( key ) {
					context.getters[ key ] =
						zobjectModule.modules.addZObjects.getters[ key ](
							context.state,
							context.getters,
							{ zobjectModule: context.state },
							context.getters );
				} );
				context.getters.getNextKey = zobjectModule.getters.getNextKey(
					context.state,
					context.getters,
					{ zobjectModule: context.state },
					context.getters
				);
				context.getters.getPersistedObject = function ( key ) {
					return context.state.zKeys[ key ];
				};
				context.getters.getZkeys = {};
				context.getters.getUserZlangZID = 'Z1003';
				context.commit = jest.fn( function ( mutationType, payload ) {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				} );
				context.dispatch = jest.fn( function ( actionType, payload ) {
					if ( actionType === 'fetchZKeys' ) {
						return {
							then: function ( fn ) {
								return fn();
							}
						};
					}
					var maybeFn = zobjectModule.actions[ actionType ];
					if ( typeof maybeFn === 'function' ) {
						maybeFn( context, payload );
					} else {
						maybeFn = zobjectModule.modules.addZObjects.actions[ actionType ];
						if ( typeof maybeFn === 'function' ) {
							maybeFn( context, payload );
						}
					}
					return {
						then: function ( fn ) {
							return fn();
						}
					};
				} );

				context.rootGetters = $.extend( context.getters, {
					getZkeys: JSON.parse( fs.readFileSync( path.join( __dirname, './zobject/getZkeys.json' ) ) )
				} );

				context.rootState.i18n = jest.fn( function () {
					return 'mocked';
				} );
			} );

			describe( 'add linkable type when non-literal is prioritized', function () {

				it( 'adds a link to a type', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 2, key: 'Z1K1', value: 'Z6', parent: 1 },
						{ id: 3, key: 'Z6K1', value: 'initial value', parent: 1 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_TYPE, link: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: { Z1K1: 'Z9', Z9K1: '' }
					} );
				} );

				it( 'adds a link to a function', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 2, key: 'Z1K1', value: 'Z6', parent: 1 },
						{ id: 3, key: 'Z6K1', value: 'initial value', parent: 1 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_FUNCTION, link: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: { Z1K1: 'Z9', Z9K1: '' }
					} );
				} );

				it( 'adds a literal monolingual string', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 2, key: 'Z1K1', value: 'Z6', parent: 1 },
						{ id: 3, key: 'Z6K1', value: 'initial value', parent: 1 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_MONOLINGUALSTRING, link: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
							Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' },
							Z11K2: { Z1K1: 'Z6', Z6K1: '' }
						}
					} );
				} );
			} );

			describe( 'add ZPersistentObject', function () {
				it( 'adds a valid ZPersistentObject', function () {
					const payload = { id: 0, type: Constants.Z_PERSISTENTOBJECT };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z2' },
						Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
						Z2K2: undefined,
						Z2K3: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' },
							Z12K1: [
								{ Z1K1: 'Z9', Z9K1: 'Z11' },
								{
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
									Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' },
									Z11K2: { Z1K1: 'Z6', Z6K1: '' }
								}
							]
						},
						Z2K4: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z32' },
							Z32K1: [ { Z1K1: 'Z9', Z9K1: 'Z31' } ]
						}
					} );
				} );
			} );

			describe( 'add ZMonolingualString', function () {
				it( 'adds a valid ZMonolingualString with empty values', function () {
					const payload = { id: 0, type: Constants.Z_MONOLINGUALSTRING };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
						Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' },
						Z11K2: { Z1K1: 'Z6', Z6K1: '' }
					} );
				} );

				it( 'adds a valid ZMonolingualString with initial values', function () {
					const payload = { id: 0, type: Constants.Z_MONOLINGUALSTRING, lang: 'Z1004', value: 'test label' };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
						Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
						Z11K2: { Z1K1: 'Z6', Z6K1: 'test label' }
					} );
				} );

				it( 'adds a valid ZMonolingualString and clears existing values', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 2, key: 'Z1K1', value: 'Z9', parent: 1 },
						{ id: 3, key: 'Z9K1', value: 'Z11', parent: 1 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_MONOLINGUALSTRING, lang: 'Z1004', value: 'test label' };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
							Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
							Z11K2: { Z1K1: 'Z6', Z6K1: 'test label' }
						}
					} );
				} );

				it( 'appends a valid ZMonolingualString to a list', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z12K1', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z11', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_MONOLINGUALSTRING, lang: 'Z1004', value: 'test label', append: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z12K1: [
							{ Z1K1: 'Z9', Z9K1: 'Z11' },
							{
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
								Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
								Z11K2: { Z1K1: 'Z6', Z6K1: 'test label' }
							}
						]
					} );
				} );
			} );

			describe( 'add ZMultilingualString', function () {
				it( 'adds a valid ZMultilingualString with empty values', function () {
					const payload = { id: 0, type: Constants.Z_MULTILINGUALSTRING };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' },
						Z12K1: [
							{ Z1K1: 'Z9', Z9K1: 'Z11' }
						]
					} );
				} );

				it( 'adds a valid ZMultilingualString with empty monolingual', function () {
					const payload = { id: 0, type: Constants.Z_MULTILINGUALSTRING, value: '' };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' },
						Z12K1: [
							{ Z1K1: 'Z9', Z9K1: 'Z11' },
							{
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
								Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1003' },
								Z11K2: { Z1K1: 'Z6', Z6K1: '' }
							}
						]
					} );
				} );
				it( 'adds a valid ZMultilingualString with initial values', function () {
					const payload = { id: 0, type: Constants.Z_MULTILINGUALSTRING, lang: 'Z1004', value: 'test label' };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' },
						Z12K1: [
							{ Z1K1: 'Z9', Z9K1: 'Z11' },
							{
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
								Z11K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
								Z11K2: { Z1K1: 'Z6', Z6K1: 'test label' }
							}
						]
					} );
				} );
			} );

			describe( 'add ZString', function () {
				it( 'adds a valid empty ZString', function () {
					const payload = { id: 0, type: Constants.Z_STRING };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( { Z1K1: 'Z6', Z6K1: '' } );
				} );

				it( 'adds a valid prefilled ZString', function () {
					const payload = { id: 0, type: Constants.Z_STRING, value: 'Hello world' };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( { Z1K1: 'Z6', Z6K1: 'Hello world' } );
				} );

				it( 'adds a valid ZString and clears existing values', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 2, key: 'Z1K1', value: 'Z9', parent: 1 },
						{ id: 3, key: 'Z9K1', value: 'Z11', parent: 1 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_STRING, value: 'Hello world' };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: { Z1K1: 'Z6', Z6K1: 'Hello world' }
					} );
				} );

				it( 'appends a valid ZString to a list', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_STRING, value: 'Hello world', append: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: [
							{ Z1K1: 'Z9', Z9K1: 'Z1' },
							{ Z1K1: 'Z6', Z6K1: 'Hello world' }
						]
					} );
				} );
			} );

			describe( 'add ZReference', function () {
				it( 'adds a valid empty ZReference', function () {
					const payload = { id: 0, type: Constants.Z_REFERENCE };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( { Z1K1: 'Z9', Z9K1: '' } );
				} );

				it( 'adds a valid prefilled ZReference', function () {
					const payload = { id: 0, type: Constants.Z_REFERENCE, value: 'Z1' };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( { Z1K1: 'Z9', Z9K1: 'Z1' } );
				} );

				it( 'adds a valid ZReference and clears existing values', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 2, key: 'Z1K1', value: 'Z6', parent: 1 },
						{ id: 3, key: 'Z6K1', value: 'Bye', parent: 1 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_REFERENCE, value: 'Z1' };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: { Z1K1: 'Z9', Z9K1: 'Z1' }
					} );
				} );

				it( 'appends a valid ZReference to a list', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z4', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_REFERENCE, value: 'Z11', append: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: [
							{ Z1K1: 'Z9', Z9K1: 'Z4' },
							{ Z1K1: 'Z9', Z9K1: 'Z11' }
						]
					} );
				} );
			} );

			describe( 'add ZArgument', function () {
				it( 'adds a valid ZArgument', function () {
					const payload = { id: 0, type: Constants.Z_ARGUMENT };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z17' },
						Z17K1: { Z1K1: 'Z9', Z9K1: '' },
						Z17K2: { Z1K1: 'Z6', Z6K1: 'Z0K1' },
						Z17K3: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' },
							Z12K1: [
								{ Z1K1: 'Z9', Z9K1: 'Z11' }
							]
						}
					} );
				} );

				it( 'adds a valid ZArgument with initial values', function () {
					const payload = { id: 0, type: Constants.Z_ARGUMENT, value: 'Z1000K2' };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z17' },
						Z17K1: { Z1K1: 'Z9', Z9K1: '' },
						Z17K2: { Z1K1: 'Z6', Z6K1: 'Z1000K2' },
						Z17K3: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' },
							Z12K1: [
								{ Z1K1: 'Z9', Z9K1: 'Z11' }
							]
						}
					} );
				} );

				it( 'appends a valid ZArgument to a list', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z8K1', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z17', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_ARGUMENT, value: 'Z1000K2', append: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z8K1: [
							{ Z1K1: 'Z9', Z9K1: 'Z17' },
							{
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z17' },
								Z17K1: { Z1K1: 'Z9', Z9K1: '' },
								Z17K2: { Z1K1: 'Z6', Z6K1: 'Z1000K2' },
								Z17K3: {
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' },
									Z12K1: [
										{ Z1K1: 'Z9', Z9K1: 'Z11' }
									]
								}
							}
						]
					} );
				} );
			} );

			describe( 'add ZFunctionCall', function () {
				it( 'adds a valid empty ZFunctionCall', function () {
					const payload = { id: 0, type: Constants.Z_FUNCTION_CALL };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: '' }
					} );
				} );

				it( 'adds a valid ZFunctionCall with initial values', function () {
					const payload = { id: 0, type: Constants.Z_FUNCTION_CALL, value: 'Z10001' };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
						Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10001' }
					} );
				} );

				it( 'appends a valid ZFunctionCall to a list', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_FUNCTION_CALL, value: 'Z10001', append: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: [
							{ Z1K1: 'Z9', Z9K1: 'Z1' },
							{
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
								Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10001' }
							}
						]
					} );
				} );
			} );

			describe( 'add ZImplementation', function () {
				it( 'adds a valid ZImplementation', function () {
					const payload = { id: 0, type: Constants.Z_IMPLEMENTATION };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z14' },
						Z14K1: { Z1K1: 'Z9', Z9K1: '' },
						Z14K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
							Z7K1: { Z1K1: 'Z9', Z9K1: '' }
						}
					} );
				} );

				it( 'adds a valid ZImplementation for a given function Zid', function () {
					const payload = { id: 0, type: Constants.Z_IMPLEMENTATION };
					window.location = {
						href: 'http://localhost:8080/wiki/Special:CreateZObject?zid=Z14&Z14K1=Z10001'
					};
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z14' },
						Z14K1: { Z1K1: 'Z9', Z9K1: 'Z10001' },
						Z14K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
							Z7K1: { Z1K1: 'Z9', Z9K1: '' }
						}
					} );
				} );
			} );

			describe( 'add ZFunction', function () {
				it( 'adds a valid ZFunction', function () {
					const payload = { id: 0, type: Constants.Z_FUNCTION };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z8' },
						Z8K1: [
							{ Z1K1: 'Z9', Z9K1: 'Z17' },
							{
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z17' },
								Z17K1: { Z1K1: 'Z9', Z9K1: '' },
								Z17K2: { Z1K1: 'Z6', Z6K1: 'Z0K1' },
								Z17K3: {
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' },
									Z12K1: [
										{ Z1K1: 'Z9', Z9K1: 'Z11' }
									]
								}
							}
						],
						Z8K2: { Z1K1: 'Z9', Z9K1: '' },
						Z8K3: [ { Z1K1: 'Z9', Z9K1: 'Z20' } ],
						Z8K4: [ { Z1K1: 'Z9', Z9K1: 'Z14' } ],
						Z8K5: { Z1K1: 'Z9', Z9K1: 'Z0' }
					} );
				} );

				it( 'adds a valid ZFunction with set zid', function () {
					const payload = { id: 0, type: Constants.Z_FUNCTION };
					context.getters.getCurrentZObjectId = 'Z10000';
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z8' },
						Z8K1: [
							{ Z1K1: 'Z9', Z9K1: 'Z17' },
							{
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z17' },
								Z17K1: { Z1K1: 'Z9', Z9K1: '' },
								Z17K2: { Z1K1: 'Z6', Z6K1: 'Z10000K1' },
								Z17K3: {
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' },
									Z12K1: [
										{ Z1K1: 'Z9', Z9K1: 'Z11' }
									]
								}
							}
						],
						Z8K2: { Z1K1: 'Z9', Z9K1: '' },
						Z8K3: [ { Z1K1: 'Z9', Z9K1: 'Z20' } ],
						Z8K4: [ { Z1K1: 'Z9', Z9K1: 'Z14' } ],
						Z8K5: { Z1K1: 'Z9', Z9K1: 'Z10000' }
					} );
				} );
			} );

			describe( 'add ZType', function () {
				it( 'adds a valid ZType', function () {
					const payload = { id: 0, type: Constants.Z_TYPE };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z4' },
						Z4K1: { Z1K1: 'Z9', Z9K1: 'Z0' },
						Z4K2: [ { Z1K1: 'Z9', Z9K1: 'Z3' } ],
						Z4K3: { Z1K1: 'Z9', Z9K1: 'Z101' }
					} );
				} );

				it( 'appends a valid ZType to a list', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z4', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_TYPE, append: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: [
							{ Z1K1: 'Z9', Z9K1: 'Z4' },
							{
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z4' },
								Z4K1: { Z1K1: 'Z9', Z9K1: 'Z0' },
								Z4K2: [ { Z1K1: 'Z9', Z9K1: 'Z3' } ],
								Z4K3: { Z1K1: 'Z9', Z9K1: 'Z101' }
							}
						]
					} );
				} );
			} );

			describe( 'add ZTypedList', function () {
				it( 'adds a valid ZTypedList', function () {
					const payload = { id: 0, type: Constants.Z_TYPED_LIST };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( [ { Z1K1: 'Z9', Z9K1: 'Z1' } ] );
				} );

				it( 'adds a valid ZTypedList of a given type', function () {
					const payload = { id: 0, type: Constants.Z_TYPED_LIST, value: 'Z11' };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( [ { Z1K1: 'Z9', Z9K1: 'Z11' } ] );
				} );

				// FIXME append a list to a list does concat instead. This is because the common use case is
				// append a list of zids into the tester or implementation list.
				it( 'appends a valid ZTypedList to a list', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_TYPED_LIST, value: 'Z6', append: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: [
							{ Z1K1: 'Z9', Z9K1: 'Z1' },
							{ Z1K1: 'Z9', Z9K1: 'Z6' }
						]
					} );
				} );
			} );

			describe( 'add ZTypedPair', function () {
				it( 'adds a valid ZTypedPair with empty values', function () {
					const payload = { id: 0, type: Constants.Z_TYPED_PAIR };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
							Z7K1: { Z1K1: 'Z9', Z9K1: 'Z882' },
							Z882K1: { Z1K1: 'Z9', Z9K1: '' },
							Z882K2: { Z1K1: 'Z9', Z9K1: '' }
						},
						K1: undefined,
						K2: undefined
					} );
				} );

				it( 'adds a valid ZTypedPair with initial types', function () {
					const payload = { id: 0, type: Constants.Z_TYPED_PAIR, values: [ 'Z6', 'Z11' ] };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
							Z7K1: { Z1K1: 'Z9', Z9K1: 'Z882' },
							Z882K1: { Z1K1: 'Z9', Z9K1: 'Z6' },
							Z882K2: { Z1K1: 'Z9', Z9K1: 'Z11' }
						},
						K1: { Z1K1: 'Z6', Z6K1: '' },
						K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z11' },
							Z11K1: { Z1K1: 'Z9', Z9K1: '' },
							Z11K2: { Z1K1: 'Z6', Z6K1: '' }
						}
					} );
				} );

				it( 'appends a valid ZTypedPair to a list', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_TYPED_PAIR, values: [ 'Z6', 'Z6' ], append: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: [
							{ Z1K1: 'Z9', Z9K1: 'Z1' },
							{
								Z1K1: {
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
									Z7K1: { Z1K1: 'Z9', Z9K1: 'Z882' },
									Z882K1: { Z1K1: 'Z9', Z9K1: 'Z6' },
									Z882K2: { Z1K1: 'Z9', Z9K1: 'Z6' }
								},
								K1: { Z1K1: 'Z6', Z6K1: '' },
								K2: { Z1K1: 'Z6', Z6K1: '' }
							}
						]
					} );
				} );
			} );

			describe( 'add ZTypedMap', function () {
				it( 'adds a valid ZTypedMap with empty values', function () {
					const payload = { id: 0, type: Constants.Z_TYPED_MAP };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
							Z7K1: { Z1K1: 'Z9', Z9K1: 'Z883' },
							Z883K1: { Z1K1: 'Z9', Z9K1: '' },
							Z883K2: { Z1K1: 'Z9', Z9K1: '' }
						}
					} );
				} );

				it( 'adds a valid ZTypedMap with initial types', function () {
					const payload = { id: 0, type: Constants.Z_TYPED_MAP, values: [ 'Z6', 'Z1' ] };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
							Z7K1: { Z1K1: 'Z9', Z9K1: 'Z883' },
							Z883K1: { Z1K1: 'Z9', Z9K1: 'Z6' },
							Z883K2: { Z1K1: 'Z9', Z9K1: 'Z1' }
						}
					} );
				} );

				it( 'appends a valid ZTypedMap to a list', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_TYPED_MAP, values: [ 'Z6', 'Z1' ], append: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: [
							{ Z1K1: 'Z9', Z9K1: 'Z1' },
							{
								Z1K1: {
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
									Z7K1: { Z1K1: 'Z9', Z9K1: 'Z883' },
									Z883K1: { Z1K1: 'Z9', Z9K1: 'Z6' },
									Z883K2: { Z1K1: 'Z9', Z9K1: 'Z1' }
								}
							}
						]
					} );
				} );
			} );

			describe( 'add GenericObject', function () {
				it( 'adds a valid object of known type', function () {
					const payload = { id: 0, type: Constants.Z_KEY };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z3' },
						Z3K1: { Z1K1: 'Z9', Z9K1: '' },
						Z3K2: { Z1K1: 'Z6', Z6K1: '' },
						Z3K3: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' },
							Z12K1: [
								{ Z1K1: 'Z9', Z9K1: 'Z11' }
							]
						}
					} );
				} );

				it( 'adds a valid object of known type with typed lists', function () {
					const payload = { id: 0, type: Constants.Z_MULTILINGUALSTRINGSET };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z32' },
						Z32K1: [ { Z1K1: 'Z9', Z9K1: 'Z31' } ]
					} );
				} );

				it( 'adds a valid object of known type with typed lists and referred keys', function () {
					const payload = { id: 0, type: Constants.Z_MONOLINGUALSTRINGSET };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z31' },
						Z31K1: { Z1K1: 'Z9', Z9K1: '' },
						Z31K2: [ { Z1K1: 'Z9', Z9K1: 'Z6' } ]
					} );
				} );

				it( 'adds a valid object of an unknown type', function () {
					const payload = { id: 0, type: 'Z10000' };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z10000' }
					} );
				} );

				it( 'adds a valid object of a type defined by a function call', function () {
					const payload = { id: 0, type: { Z1K1: 'Z7', Z7K1: 'Z10001', Z10001K1: 'Z6' } };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
							Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10001' },
							Z10001K1: { Z1K1: 'Z9', Z9K1: 'Z6' }
						}
					} );
				} );

				it( 'appends a valid generic object to a list', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: 'Z10002', append: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: [
							{ Z1K1: 'Z9', Z9K1: 'Z1' },
							{
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z10002' }
							}
						]
					} );
				} );

				it( 'appends a valid generic object typed by a function call to a list', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z1', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: { Z1K1: 'Z7', Z7K1: 'Z10003', Z10003K1: 'Z6' }, append: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z2K2: [
							{ Z1K1: 'Z9', Z9K1: 'Z1' },
							{
								Z1K1: {
									Z1K1: { Z1K1: 'Z9', Z9K1: 'Z7' },
									Z7K1: { Z1K1: 'Z9', Z9K1: 'Z10003' },
									Z10003K1: { Z1K1: 'Z9', Z9K1: 'Z6' }
								}
							}
						]
					} );
				} );
			} );
		} );

		describe( 'Attach and detach testers and implementations', function () {
			beforeEach( function () {
				context.state = {
					zobject: tableDataToRowObjects( zobjectTree.concat( [
						{ key: Constants.Z_FUNCTION_TESTERS, value: 'array', parent: 3, id: 18 },
						{ key: Constants.Z_FUNCTION_IMPLEMENTATIONS, value: 'array', parent: 3, id: 19 },
						{ key: '0', value: 'object', parent: 18, id: 20 },
						{ key: '1', value: 'object', parent: 18, id: 21 },
						{ key: '2', value: 'object', parent: 18, id: 22 },
						{ key: '3', value: 'object', parent: 18, id: 23 },
						{ key: '0', value: 'object', parent: 19, id: 24 },
						{ key: '1', value: 'object', parent: 19, id: 25 },
						{ key: '2', value: 'object', parent: 19, id: 26 },
						{ key: '3', value: 'object', parent: 19, id: 27 },
						{ key: Constants.Z_REFERENCE_ID, value: Constants.Z_TESTER, parent: 20, id: 28 },
						{ key: Constants.Z_REFERENCE_ID, value: 'Z111', parent: 21, id: 29 }, // existing tester 1
						{ key: Constants.Z_REFERENCE_ID, value: 'Z222', parent: 22, id: 30 }, // existing tester 2
						{ key: Constants.Z_REFERENCE_ID, value: 'Z333', parent: 23, id: 31 }, // existing tester 3
						{ key: Constants.Z_REFERENCE_ID, value: Constants.Z_IMPLEMENTATION, parent: 24, id: 32 },
						{ key: Constants.Z_REFERENCE_ID, value: 'Z444', parent: 25, id: 33 }, // existing impl 1
						{ key: Constants.Z_REFERENCE_ID, value: 'Z555', parent: 26, id: 34 }, // existing impl 2
						{ key: Constants.Z_REFERENCE_ID, value: 'Z666', parent: 27, id: 35 } // existing impl 3
					] ) )
				};
				context.rootState = {
					zobjectModule: context.state
				};
				Object.keys( zobjectModule.getters ).forEach( function ( key ) {
					context.getters[ key ] =
						zobjectModule.getters[ key ](
							context.state, context.getters,
							{ zobjectModule: context.state },
							context.getters );
				} );
				context.commit = jest.fn( function ( mutationType, payload ) {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				} );
				context.dispatch = jest.fn( function ( actionType, payload ) {
					var maybeFn = zobjectModule.actions[ actionType ];
					var result;
					if ( typeof maybeFn === 'function' ) {
						result = maybeFn( context, payload );
					} else {
						maybeFn = zobjectModule.modules.addZObjects.actions[ actionType ];

						if ( typeof maybeFn === 'function' ) {
							result = maybeFn( context, payload );
						}
					}

					return {
						then: function ( fn ) {
							return fn( result );
						},
						catch: function () {
							return 'error';
						}
					};
				} );
			} );

			it( 'attaches given testers', function () {
				zobjectModule.actions.attachZTesters( context,
					{ functionId: 0, testerZIds: [ 'Z777', 'Z888' ] } );

				// Contains first item:
				expect( context.state.zobject ).toContainEqual(
					{ key: '4', value: 'object', parent: 18, id: 36 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 36, id: 37 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_REFERENCE_ID, value: 'Z777', parent: 36, id: 38 } );

				// Contains second item:
				expect( context.state.zobject ).toContainEqual(
					{ key: '5', value: 'object', parent: 18, id: 39 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 39, id: 40 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_REFERENCE_ID, value: 'Z888', parent: 39, id: 41 } );

				expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
			} );

			it( 'detaches given testers', function () {
				zobjectModule.actions.detachZTesters( context,
					{ functionId: 0, testerZIds: [ 'Z111', 'Z333' ] } );

				const listChildren = context.state.zobject.filter( ( item ) => item.parent === 18 );
				expect( listChildren ).toHaveLength( 2 );
				expect( listChildren ).toContainEqual( { key: '0', value: 'object', parent: 18, id: 20 } );
				expect( listChildren ).toContainEqual( { key: '1', value: 'object', parent: 18, id: 22 } );

				expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
			} );

			it( 'attaches given implementations', function () {
				zobjectModule.actions.attachZImplementations( context,
					{ functionId: 0, implementationZIds: [ 'Z777', 'Z888' ] } );

				// Contains first item:
				expect( context.state.zobject ).toContainEqual(
					{ key: '4', value: 'object', parent: 19, id: 36 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 36, id: 37 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_REFERENCE_ID, value: 'Z777', parent: 36, id: 38 } );

				// Contains second item:
				expect( context.state.zobject ).toContainEqual(
					{ key: '5', value: 'object', parent: 19, id: 39 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 39, id: 40 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_REFERENCE_ID, value: 'Z888', parent: 39, id: 41 } );

				expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
			} );

			it( 'detaches given implementations', function () {
				zobjectModule.actions.detachZImplementations( context,
					{ functionId: 0, implementationZIds: [ 'Z444', 'Z666' ] } );

				const listChildren = context.state.zobject.filter( ( item ) => item.parent === 19 );
				expect( listChildren ).toHaveLength( 2 );
				expect( listChildren ).toContainEqual( { key: '0', value: 'object', parent: 19, id: 24 } );
				expect( listChildren ).toContainEqual( { key: '1', value: 'object', parent: 19, id: 26 } );

				expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
			} );

			describe( 'Revert zObject to previous state if api fails', function () {
				const initialZObject = tableDataToRowObjects( zobjectTree.concat( [
					{ key: Constants.Z_FUNCTION_TESTERS, value: 'array', parent: 3, id: 18 },
					{ key: Constants.Z_FUNCTION_IMPLEMENTATIONS, value: 'array', parent: 3, id: 19 },
					{ key: '0', value: 'object', parent: 18, id: 20 },
					{ key: '1', value: 'object', parent: 18, id: 21 },
					{ key: '2', value: 'object', parent: 18, id: 22 },
					{ key: '3', value: 'object', parent: 18, id: 23 },
					{ key: '0', value: 'object', parent: 19, id: 24 },
					{ key: '1', value: 'object', parent: 19, id: 25 },
					{ key: '2', value: 'object', parent: 19, id: 26 },
					{ key: '3', value: 'object', parent: 19, id: 27 },
					{ key: Constants.Z_REFERENCE_ID, value: Constants.Z_TESTER, parent: 20, id: 28 },
					{ key: Constants.Z_REFERENCE_ID, value: 'Z111', parent: 21, id: 29 }, // existing tester 1
					{ key: Constants.Z_REFERENCE_ID, value: 'Z222', parent: 22, id: 30 }, // existing tester 2
					{ key: Constants.Z_REFERENCE_ID, value: 'Z333', parent: 23, id: 31 }, // existing tester 3
					{ key: Constants.Z_REFERENCE_ID, value: Constants.Z_IMPLEMENTATION, parent: 24, id: 32 },
					{ key: Constants.Z_REFERENCE_ID, value: 'Z444', parent: 25, id: 33 }, // existing impl 1
					{ key: Constants.Z_REFERENCE_ID, value: 'Z555', parent: 26, id: 34 }, // existing impl 2
					{ key: Constants.Z_REFERENCE_ID, value: 'Z666', parent: 27, id: 35 } // existing impl 3
				] ) );
				beforeEach( function () {
					context.state = {
						zobject: initialZObject
					};
					context.rootState = {
						zobjectModule: context.state
					};
					Object.keys( zobjectModule.getters ).forEach( function ( key ) {
						context.getters[ key ] =
							zobjectModule.getters[ key ](
								context.state, context.getters,
								{ zobjectModule: context.state },
								context.getters );
					} );
					context.commit = jest.fn( function ( mutationType, payload ) {
						zobjectModule.mutations[ mutationType ]( context.state, payload );
					} );
					context.dispatch = jest.fn( function ( actionType, payload ) {
						return {
							then: function ( fn ) {
								if ( actionType === 'submitZObject' ) {
									throw fn();
								}

								return fn( payload );
							},
							catch: function ( fn ) {
								return fn( 'error' );
							}
						};
					} );
				} );

				it( 'attachZTesters', async function () {
					try {
						zobjectModule.actions.attachZTesters( context,
							{ functionId: 0, testerZIds: [ 'Z777', 'Z888' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
						expect( context.commit ).toHaveBeenCalledWith( 'setZObject', initialZObject );
					}
				} );

				it( 'detachZTesters', function () {
					try {
						zobjectModule.actions.detachZTesters( context,
							{ functionId: 0, testerZIds: [ 'Z111', 'Z333' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
						expect( context.commit ).toHaveBeenCalledWith( 'setZObject', initialZObject );
					}
				} );

				it( 'attachZImplementations', async function () {
					try {
						zobjectModule.actions.attachZImplementations( context,
							{ functionId: 0, implementationZIds: [ 'Z777', 'Z888' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
						expect( context.commit ).toHaveBeenCalledWith( 'setZObject', initialZObject );
					}
				} );

				it( 'detachZImplementations', function () {
					try {
						zobjectModule.actions.detachZImplementations( context,
							{ functionId: 0, implementationZIds: [ 'Z444', 'Z666' ] } );
					} catch ( error ) {
						expect( error ).toEqual( 'error' );
						expect( context.dispatch ).toHaveBeenCalledWith( 'submitZObject', '' );
						expect( context.commit ).toHaveBeenCalledWith( 'setZObject', initialZObject );
					}
				} );
			} );
		} );

		describe( 'Modifies typed lists', function () {

			it( 'Removes invalid items from a list', function () {
				context.state = {};

				context.state.zobject = tableDataToRowObjects( [
					{ id: 7, key: Constants.Z_PERSISTENTOBJECT_VALUE, parent: 0, value: 'array' },
					{ id: 8, key: '0', parent: 7, value: 'object' },
					{ id: 9, key: Constants.Z_OBJECT_TYPE, parent: 8, value: Constants.Z_REFERENCE },
					{ id: 10, key: Constants.Z_STRING_VALUE, parent: 8, value: Constants.Z_STRING },
					{ id: 11, key: '1', parent: 7, value: 'object' },
					{ id: 12, key: Constants.Z_OBJECT_TYPE, parent: 11, value: Constants.Z_STRING },
					{ id: 13, key: Constants.Z_STRING_VALUE, parent: 11, value: 'alabama' },
					{ id: 14, key: '2', parent: 7, value: 'object' },
					{ id: 15, key: Constants.Z_OBJECT_TYPE, parent: 14, value: Constants.Z_STRING },
					{ id: 16, key: Constants.Z_STRING_VALUE, parent: 14, value: 'arizona' },
					{ id: 17, key: '3', parent: 7, value: 'object' },
					{ id: 18, key: Constants.Z_OBJECT_TYPE, parent: 17, value: Constants.Z_STRING },
					{ id: 19, key: Constants.Z_STRING_VALUE, parent: 17, value: 'alaska' },
					{ id: 20, key: '4', parent: 7, value: 'object' },
					{ id: 21, key: Constants.Z_OBJECT_TYPE, parent: 20, value: Constants.Z_STRING },
					{ id: 22, key: Constants.Z_STRING_VALUE, parent: 20, value: 'arkansas' }
				] );
				context.getters.getInvalidListItems = [ 13, 16, 19, 22 ];

				zobjectModule.actions.submitZObject( context, { summary: 'A summary' } );

				expect( context.dispatch ).toHaveBeenNthCalledWith( 1, 'removeAllItemsFromTypedList', [ 13, 16, 19, 22 ] );
				expect( context.dispatch ).toHaveBeenNthCalledWith( 2, 'setListItemsForRemoval', { listItems: [ ] } );
			} );
		} );

		describe( 'injectZObjectFromRowId', function () {
			beforeEach( function () {
				context.state = {
					zobject: tableDataToRowObjects( zobjectTree )
				};
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
				context.getters.getZObjectChildrenById = zobjectModule.getters.getZObjectChildrenById( context.state );
				context.getters.getZObjectIndexById = zobjectModule.getters.getZObjectIndexById( context.state );

				context.commit = jest.fn( function ( mutationType, payload ) {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				} );
				context.dispatch = jest.fn( function ( actionType, payload ) {
					zobjectModule.actions[ actionType ]( context, payload );
					return {
						then: function ( fn ) {
							return fn();
						}
					};
				} );
			} );

			it( 'injects string zobject value', function () {
				const zObject = 'stringness';
				const expected = [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ key: 'Z1K1', value: 'Z2', parent: 0, id: 1 },
					{ key: 'Z2K1', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 2 },
					{ key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 3 },
					{ key: 'Z1K1', value: 'Z9', parent: 2, id: 4 },
					{ key: 'Z9K1', value: 'Z0', parent: 2, id: 5 },
					{ key: 'Z2K3', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 6 },
					{ key: 'Z1K1', value: 'Z12', parent: 6, id: 7 },
					{ key: 'Z12K1', value: Constants.ROW_VALUE_ARRAY, parent: 6, id: 8 },
					{ key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 8, id: 9 },
					{ key: 'Z1K1', value: 'Z9', parent: 9, id: 10 },
					{ key: 'Z9K1', value: 'Z11', parent: 9, id: 11 },
					{ key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 8, id: 12 },
					{ key: 'Z1K1', value: 'Z11', parent: 12, id: 13 },
					{ key: 'Z11K1', value: 'Z1002', parent: 12, id: 14 },
					{ key: 'Z11K2', value: '', parent: 12, id: 15 },
					{ key: 'Z1K1', value: 'Z6', parent: 3, id: 18 },
					{ key: 'Z6K1', value: 'stringness', parent: 3, id: 19 }
				];

				zobjectModule.actions.injectZObjectFromRowId( context, {
					rowId: 3,
					value: zObject
				} );

				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'injects array of strings into zobject value', function () {
				const zObject = [ 'Z6', 'stringful', 'stringlord' ];
				const expected = [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ key: 'Z1K1', value: 'Z2', parent: 0, id: 1 },
					{ key: 'Z2K1', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 2 },
					{ key: 'Z2K2', value: Constants.ROW_VALUE_ARRAY, parent: 0, id: 3 },
					{ key: 'Z1K1', value: 'Z9', parent: 2, id: 4 },
					{ key: 'Z9K1', value: 'Z0', parent: 2, id: 5 },
					{ key: 'Z2K3', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 6 },
					{ key: 'Z1K1', value: 'Z12', parent: 6, id: 7 },
					{ key: 'Z12K1', value: Constants.ROW_VALUE_ARRAY, parent: 6, id: 8 },
					{ key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 8, id: 9 },
					{ key: 'Z1K1', value: 'Z9', parent: 9, id: 10 },
					{ key: 'Z9K1', value: 'Z11', parent: 9, id: 11 },
					{ key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 8, id: 12 },
					{ key: 'Z1K1', value: 'Z11', parent: 12, id: 13 },
					{ key: 'Z11K1', value: 'Z1002', parent: 12, id: 14 },
					{ key: 'Z11K2', value: '', parent: 12, id: 15 },

					{ id: 18, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 3 },
					{ id: 19, key: 'Z1K1', value: 'Z9', parent: 18 },
					{ id: 20, key: 'Z9K1', value: 'Z6', parent: 18 },
					{ id: 21, key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 3 },
					{ id: 22, key: 'Z1K1', value: 'Z6', parent: 21 },
					{ id: 23, key: 'Z6K1', value: 'stringful', parent: 21 },
					{ id: 24, key: '2', value: Constants.ROW_VALUE_OBJECT, parent: 3 },
					{ id: 25, key: 'Z1K1', value: 'Z6', parent: 24 },
					{ id: 26, key: 'Z6K1', value: 'stringlord', parent: 24 }
				];

				zobjectModule.actions.injectZObjectFromRowId( context, {
					rowId: 3,
					value: zObject
				} );

				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'injects zobject into zobject value', function () {
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
					{ key: 'Z1K1', value: 'Z2', parent: 0, id: 1 },
					{ key: 'Z2K1', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 2 },
					{ key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 3 },
					{ key: 'Z1K1', value: 'Z9', parent: 2, id: 4 },
					{ key: 'Z9K1', value: 'Z0', parent: 2, id: 5 },
					{ key: 'Z2K3', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 6 },
					{ key: 'Z1K1', value: 'Z12', parent: 6, id: 7 },
					{ key: 'Z12K1', value: Constants.ROW_VALUE_ARRAY, parent: 6, id: 8 },
					{ key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 8, id: 9 },
					{ key: 'Z1K1', value: 'Z9', parent: 9, id: 10 },
					{ key: 'Z9K1', value: 'Z11', parent: 9, id: 11 },
					{ key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 8, id: 12 },
					{ key: 'Z1K1', value: 'Z11', parent: 12, id: 13 },
					{ key: 'Z11K1', value: 'Z1002', parent: 12, id: 14 },
					{ key: 'Z11K2', value: '', parent: 12, id: 15 },

					{ id: 18, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 3 },
					{ id: 19, key: 'Z1K1', value: 'Z9', parent: 18 },
					{ id: 20, key: 'Z9K1', value: 'Z11', parent: 18 },
					{ id: 21, key: 'Z11K1', value: Constants.ROW_VALUE_OBJECT, parent: 3 },
					{ id: 22, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 21 },
					{ id: 23, key: 'Z1K1', value: 'Z9', parent: 22 },
					{ id: 24, key: 'Z9K1', value: 'Z60', parent: 22 },
					{ id: 25, key: 'Z60K1', value: Constants.ROW_VALUE_OBJECT, parent: 21 },
					{ id: 26, key: 'Z1K1', value: 'Z6', parent: 25 },
					{ id: 27, key: 'Z6K1', value: 'pang', parent: 25 },
					{ id: 28, key: 'Z11K2', value: Constants.ROW_VALUE_OBJECT, parent: 3 },
					{ id: 29, key: 'Z1K1', value: 'Z6', parent: 28 },
					{ id: 30, key: 'Z6K1', value: 'Gñeee', parent: 28 }
				];

				zobjectModule.actions.injectZObjectFromRowId( context, {
					rowId: 3,
					value: zObject
				} );

				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'injects zobject into root', function () {
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

		describe( 'injectKeyValueFromRowId', function () {
			beforeEach( function () {
				context.state = {
					zobject: tableDataToRowObjects( zobjectTree )
				};
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
				context.commit = jest.fn( function ( mutationType, payload ) {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				} );
			} );

			it( 'injects another key-value without removing the current ones', function () {
				const expected = [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ key: 'Z1K1', value: 'Z2', parent: 0, id: 1 },
					{ key: 'Z2K1', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 2 },
					{ key: 'Z2K2', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 3 },
					{ key: 'Z1K1', value: 'Z9', parent: 2, id: 4 },
					{ key: 'Z9K1', value: 'Z0', parent: 2, id: 5 },
					{ key: 'Z2K3', value: Constants.ROW_VALUE_OBJECT, parent: 0, id: 6 },
					{ key: 'Z1K1', value: 'Z12', parent: 6, id: 7 },
					{ key: 'Z12K1', value: Constants.ROW_VALUE_ARRAY, parent: 6, id: 8 },
					{ key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 8, id: 9 },
					{ key: 'Z1K1', value: 'Z9', parent: 9, id: 10 },
					{ key: 'Z9K1', value: 'Z11', parent: 9, id: 11 },
					{ key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 8, id: 12 },
					{ key: 'Z1K1', value: 'Z11', parent: 12, id: 13 },
					{ key: 'Z11K1', value: 'Z1002', parent: 12, id: 14 },
					{ key: 'Z11K2', value: '', parent: 12, id: 15 },
					{ key: 'Z1K1', value: 'Z6', parent: 3, id: 16 },
					{ key: 'Z6K1', value: '', parent: 3, id: 17 },

					{ key: 'Z6K2', value: Constants.ROW_VALUE_OBJECT, parent: 3, id: 18 },
					{ key: 'Z1K1', value: 'Z6', parent: 18, id: 19 },
					{ key: 'Z6K1', value: 'another key', parent: 18, id: 20 }
				];

				zobjectModule.actions.injectKeyValueFromRowId( context, {
					rowId: 3,
					key: 'Z6K2',
					value: 'another key'
				} );

				expect( context.state.zobject ).toEqual( expected );
			} );
		} );

		describe( 'setZFunctionCallArguments', function () {
			beforeEach( function () {
				context.state = {
					zKeys: mockApiZkeys,
					zobject: tableDataToRowObjects( [
						{ id: 0, value: Constants.ROW_VALUE_OBJECT },
						{ id: 1, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 2, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 1 },
						{ id: 3, key: 'Z9K1', value: Constants.Z_FUNCTION_CALL, parent: 1 },
						{ id: 4, key: 'Z7K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 5, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 4 },
						// Function Zid:
						{ id: 6, key: 'Z9K1', value: Constants.Z_TYPED_LIST, parent: 4 },
						// Old arguments:
						{ id: 7, key: Constants.Z_TYPED_PAIR_TYPE1, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 8, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 7 },
						{ id: 9, key: 'Z9K1', value: Constants.Z_STRING, parent: 7 },
						{ id: 10, key: Constants.Z_TYPED_PAIR_TYPE2, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 11, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
						{ id: 12, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 11 },
						{ id: 13, key: 'Z9K1', value: Constants.Z_FUNCTION_CALL, parent: 11 },
						{ id: 14, key: 'Z7K1', value: Constants.ROW_VALUE_OBJECT, parent: 10 },
						{ id: 15, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 14 },
						{ id: 16, key: 'Z9K1', value: 'Z100001', parent: 14 }
					] )
				};
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
				context.getters.getZObjectIndexById = zobjectModule.getters.getZObjectIndexById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters
					.getChildrenByParentRowId( context.state );
				context.getters.getZObjectChildrenById = zobjectModule.getters.getZObjectChildrenById( context.state );
				context.getters.getZFunctionArgumentDeclarations = zobjectModule.getters
					.getZFunctionArgumentDeclarations( context.state, context.getters );
				context.getters.getZFunctionCallArguments = zobjectModule.getters
					.getZFunctionCallArguments( context.state, context.getters );
				context.getters.getPersistedObject = function ( key ) {
					return context.state.zKeys[ key ];
				};
				context.commit = jest.fn( function ( mutationType, payload ) {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				} );
				context.dispatch = jest.fn( function ( actionType, payload ) {
					zobjectModule.actions[ actionType ]( context, payload );
					return {
						then: function ( fn ) {
							return fn();
						}
					};
				} );
				Object.keys( zobjectModule.modules.addZObjects.getters ).forEach( function ( key ) {
					context.getters[ key ] =
						zobjectModule.modules.addZObjects.getters[ key ](
							context.state,
							context.getters,
							{ zobjectModule: context.state },
							context.getters );
				} );
			} );

			it( 'sets one function argument for the function Typed list', function () {
				const expected = [
					{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
					{ id: 1, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 2, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 1 },
					{ id: 3, key: 'Z9K1', value: Constants.Z_FUNCTION_CALL, parent: 1 },
					{ id: 4, key: 'Z7K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 5, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 4 },
					// Function Zid:
					{ id: 6, key: 'Z9K1', value: Constants.Z_TYPED_LIST, parent: 4 },
					// New arguments:
					{ id: 17, key: Constants.Z_TYPED_LIST_TYPE, parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 18, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 17 },
					{ id: 19, key: 'Z9K1', value: '', parent: 17 }
				];
				zobjectModule.actions.setZFunctionCallArguments( context, {
					parentId: 0,
					functionZid: 'Z881'
				} );
				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'sets three function arguments for the function If', function () {
				const functionZid = 'Z802';
				const functionZidRow = context.state.zobject.find( ( row ) => ( row.id === 6 ) );
				functionZidRow.value = functionZid;
				const expected = [
					{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
					{ id: 1, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 2, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 1 },
					{ id: 3, key: 'Z9K1', value: Constants.Z_FUNCTION_CALL, parent: 1 },
					{ id: 4, key: 'Z7K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 5, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 4 },
					// Function Zid:
					{ id: 6, key: 'Z9K1', value: functionZid, parent: 4 },
					// New arguments:
					{ id: 17, key: 'Z802K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 18, key: 'Z1K1', parent: 17, value: Constants.Z_REFERENCE },
					{ id: 19, key: 'Z9K1', parent: 17, value: '' },
					{ id: 17, key: 'Z802K2', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 18, key: 'Z1K1', parent: 17, value: Constants.ROW_VALUE_OBJECT },
					{ id: 19, key: 'Z1K1', parent: 18, value: Constants.Z_REFERENCE },
					{ id: 20, key: 'Z9K1', parent: 18, value: '' },
					{ id: 17, key: 'Z802K3', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 18, key: 'Z1K1', parent: 17, value: Constants.ROW_VALUE_OBJECT },
					{ id: 19, key: 'Z1K1', parent: 18, value: Constants.Z_REFERENCE },
					{ id: 20, key: 'Z9K1', parent: 18, value: '' }
				];
				zobjectModule.actions.setZFunctionCallArguments( context, {
					parentId: 0,
					functionZid
				} );
				expect( context.state.zobject ).toEqual( expected );
			} );
		} );
	} );
} );
