/*!
 * WikiLambda unit test suite for the zobject Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var tableDataToRowObjects = require( '../../helpers/zObjectTableHelpers.js' ).tableDataToRowObjects,
	zobjectToRows = require( '../../helpers/zObjectTableHelpers.js' ).zobjectToRows,
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	zobjectModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobject.js' ),
	errorModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/errors.js' ),
	libraryModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/library.js' ),
	zFunctionModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zFunction.js' ),
	mockApiZids = require( '../../fixtures/mocks.js' ).mockApiZids,
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

	describe( 'currentZObject module', () => {

		const currentZObject = zobjectModule.modules.currentZObject;
		var getters;

		describe( 'Getters', () => {

			describe( 'isNewZObject', () => {
				it( 'returns true if the value of the current ZObject is Z0', () => {
					state.zobject = tableDataToRowObjects( zobjectTree );
					expect( currentZObject.getters.isNewZObject( state, { getCurrentZObjectId: 'Z0' } ) )
						.toEqual( true );
				} );

				it( 'returns false if the value of the current ZObject is not Z0', () => {
					state.zobject = tableDataToRowObjects( zobjectTree );
					expect( currentZObject.getters.isNewZObject( state, { getCurrentZObjectId: 'Z4' } ) )
						.toEqual( false );
				} );
			} );

			describe( 'isDirty', () => {
				it( 'returns true when page has unsaved edits', () => {
					state.dirty = true;
					expect( currentZObject.getters.isDirty( state ) ).toEqual( true );
				} );

				it( 'returns false when page has no unsaved edits', () => {
					state.dirty = false;
					expect( currentZObject.getters.isDirty( state ) ).toEqual( false );
				} );
			} );

			describe( 'isMainObject', () => {
				beforeEach( () => {
					getters = {};
					getters.getRowById = zobjectModule.getters.getRowById( state );
				} );

				it( 'returns false if rowId does not exist', () => {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, parent: undefined, key: 'foo', value: 'bar' }
					] );
					expect( currentZObject.getters.isMainObject( state, getters )( 1 ) ).toBe( false );
				} );

				it( 'return true if rowId is the main oldest ancestor', () => {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, parent: undefined, key: 'foo', value: 'bar' }
					] );
					expect( currentZObject.getters.isMainObject( state, getters )( 0 ) ).toBe( true );
				} );

				it( 'return false if rowId is a detached oldest ancestor', () => {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, parent: undefined, key: 'foo', value: 'bar' },
						{ id: 2, parent: undefined, key: 'foo', value: 'bar' }
					] );
					expect( currentZObject.getters.isMainObject( state, getters )( 2 ) ).toBe( false );
				} );

				it( 'return true if rowId is child of the main oldest ancestor', () => {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, parent: undefined, key: 'foo', value: 'bar' },
						{ id: 1, parent: 0, key: 'foo', value: 'bar' },
						{ id: 2, parent: 1, key: 'foo', value: 'bar' }
					] );
					expect( currentZObject.getters.isMainObject( state, getters )( 2 ) ).toBe( true );
				} );

				it( 'return false if rowId is child of a detached oldest ancestor', () => {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, parent: undefined, key: 'foo', value: 'bar' },
						{ id: 1, parent: 0, key: 'foo', value: 'bar' },
						{ id: 2, parent: undefined, key: 'foo', value: 'bar' },
						{ id: 3, parent: 2, key: 'foo', value: 'bar' },
						{ id: 4, parent: 3, key: 'foo', value: 'bar' }
					] );
					expect( currentZObject.getters.isMainObject( state, getters )( 4 ) ).toBe( false );
				} );
			} );

			describe( 'getCurrentZObjectId', () => {
				it( 'returns current persisted Zid being edited or viewed', () => {
					state.currentZid = 'Z10001';
					expect( currentZObject.getters.getCurrentZObjectId( state ) ).toEqual( 'Z10001' );
				} );

				it( 'returns null Zid (Z0) if new page', () => {
					state.currentZid = undefined;
					expect( currentZObject.getters.getCurrentZObjectId( state ) ).toEqual( 'Z0' );
				} );
			} );

			describe( 'getCurrentZObjectType', () => {
				it( 'returns the type of the persisted content', () => {
					state.zobject = zobjectToRows( { Z2K2: { Z1K1: 'Z6' } } );
					getters = {};
					getters.getZObjectTypeByRowId = jest.fn();
					getters.getZPersistentContentRowId = jest.fn( () => 1 );

					currentZObject.getters.getCurrentZObjectType( state, getters );

					expect( getters.getZObjectTypeByRowId ).toHaveBeenCalledWith( 1 );
				} );
			} );

			describe( 'getCurrentZImplementationType', () => {
				it( 'returns the implementation type of the persisted content', () => {
					state.zobject = zobjectToRows( { Z2K2: { Z1K1: 'Z6' } } );
					getters = {};
					getters.getZImplementationContentType = jest.fn();
					getters.getZPersistentContentRowId = jest.fn( () => 1 );

					currentZObject.getters.getCurrentZImplementationType( state, getters );

					expect( getters.getZImplementationContentType ).toHaveBeenCalledWith( 1 );
				} );
			} );

			describe( 'validateGenericType', () => {
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
					getters.validateGenericType = currentZObject.getters.validateGenericType( state, getters );
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

			describe( 'currentZFunctionInvalidOutput', () => {
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
					getters.validateGenericType = currentZObject.getters.validateGenericType( state, getters );

					getters.getZFunctionOutput = zFunctionModule.getters.getZFunctionOutput( state, getters );
				} );

				it( 'returns empty array when output is filled reference', () => {
					state.zobject = zobjectToRows( { Z2K2: {
						Z8K2: 'Z6'
					} } );

					const invalidOutput = currentZObject.getters.currentZFunctionInvalidOutput( state, getters );
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

					const invalidOutput = currentZObject.getters.currentZFunctionInvalidOutput( state, getters );
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

					const invalidOutput = currentZObject.getters.currentZFunctionInvalidOutput( state, getters );
					const expected = [];
					expect( invalidOutput ).toEqual( expected );
				} );

				it( 'returns error when output is empty reference', () => {
					state.zobject = zobjectToRows( { Z2K2: {
						Z8K2: '' // rowId 2
					} } );

					const invalidOutput = currentZObject.getters.currentZFunctionInvalidOutput( state, getters );
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

					const invalidOutput = currentZObject.getters.currentZFunctionInvalidOutput( state, getters );
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

					const invalidOutput = currentZObject.getters.currentZFunctionInvalidOutput( state, getters );
					const expected = [ 9, 19 ];
					expect( invalidOutput ).toEqual( expected );
				} );
			} );

			describe( 'currentZFunctionInvalidInputs', () => {
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
					getters.validateGenericType = currentZObject.getters.validateGenericType( state, getters );

					getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( state, getters );
					getters.getZMonolingualTextValue = zobjectModule.getters.getZMonolingualTextValue( state, getters );
					getters.getZFunctionInputs = zFunctionModule.getters.getZFunctionInputs( state, getters );
				} );

				it( 'returns empty array when no inputs', () => {
					state.zobject = zobjectToRows( { Z2K2: { Z8K1: [ 'Z17' ] } } );

					const invalidInputs = currentZObject.getters.currentZFunctionInvalidInputs( state, getters );
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

					const invalidInputs = currentZObject.getters.currentZFunctionInvalidInputs( state, getters );
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

					const invalidInputs = currentZObject.getters.currentZFunctionInvalidInputs( state, getters );
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

					const invalidInputs = currentZObject.getters.currentZFunctionInvalidInputs( state, getters );
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

					const invalidInputs = currentZObject.getters.currentZFunctionInvalidInputs( state, getters );
					// Expect first and second inputs to be invalid
					const expected = [ 10, 38 ];
					expect( invalidInputs ).toEqual( expected );
				} );
			} );

			describe( 'getMultilingualDataCopy', () => {
				it( 'returns the multilingual data copy', () => {
					const multilingualDataCopy = {
						names: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] },
						aliases: { Z1K1: 'Z32', Z12K1: [ 'Z31' ] },
						descriptions: { Z1K1: 'Z12', Z12K1: [ 'Z11' ] }
					};
					state.multilingualDataCopy = multilingualDataCopy;
					expect( currentZObject.getters.getMultilingualDataCopy( state ) )
						.toEqual( multilingualDataCopy );
				} );
			} );
		} );

		describe( 'Actions', () => {
			describe( 'setDirty', () => {
				it( 'Sets dirty to true', () => {
					context.state = {
						dirty: false
					};
					currentZObject.actions.setDirty( context );
					expect( context.commit ).toHaveBeenCalledWith( 'setDirty', true );
				} );

				it( 'Sets dirty to false', () => {
					context.state = {
						dirty: false
					};
					currentZObject.actions.setDirty( context, false );
					expect( context.commit ).toHaveBeenCalledWith( 'setDirty', false );
				} );
			} );

			describe( 'resetMultilingualData', () => {
				it( 'resets the multilingual data of the current object to the saved copy', () => {
					const multilingualDataCopy = {
						names: { Z1K1: 'Z12', Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1002', Z11K2: 'original name' }
						] },
						aliases: { Z1K1: 'Z32', Z12K1: [ 'Z31',
							{ Z1K1: 'Z31', Z31K1: 'Z1003', Z31K2: [ 'original alias' ] }
						] },
						descriptions: { Z1K1: 'Z12', Z12K1: [ 'Z11',
							{ Z1K1: 'Z11', Z11K1: 'Z1004', Z11K2: 'original description' }
						] }
					};

					context.state = {
						multilingualDataCopy: multilingualDataCopy,
						zobject: tableDataToRowObjects( [
							{ id: 0, key: undefined, parent: undefined, value: 'object' },
							{ id: 1, key: 'Z2K3', parent: 0, value: 'object' },
							{ id: 2, key: 'Z1K1', parent: 1, value: 'Z6' },
							{ id: 3, key: 'Z6K1', parent: 1, value: '' },
							{ id: 4, key: 'Z2K4', parent: 0, value: 'object' },
							{ id: 5, key: 'Z1K1', parent: 4, value: 'Z6' },
							{ id: 6, key: 'Z6K1', parent: 4, value: '' },
							{ id: 7, key: 'Z2K5', parent: 0, value: 'object' },
							{ id: 8, key: 'Z1K1', parent: 7, value: 'Z6' },
							{ id: 9, key: 'Z6K1', parent: 7, value: '' }
						] )
					};

					context.getters = {};
					context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
					context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
					context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state, context.getters );
					context.getters.getMultilingualDataCopy = currentZObject.getters.getMultilingualDataCopy( context.state );

					currentZObject.actions.resetMultilingualData( context );

					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', {
						rowId: 1,
						value: multilingualDataCopy.names
					} );

					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', {
						rowId: 4,
						value: multilingualDataCopy.aliases
					} );

					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', {
						rowId: 7,
						value: multilingualDataCopy.descriptions
					} );
				} );
			} );
		} );
	} );

	describe( 'Getters', function () {
		describe( 'getRowIndexById', function () {
			it( 'Returns current zObject by its index', function () {
				var result = 10;
				state.zobject = tableDataToRowObjects( zobjectTree );

				expect( zobjectModule.getters.getRowIndexById( state )( 10 ) ).toEqual( result );
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

		describe( 'isCreateNewPage', function () {
			it( 'Returns whether the current state has `createNewPage` default value', function () {
				expect( zobjectModule.getters.isCreateNewPage( state ) ).toBe( false );
			} );
		} );

		describe( 'getNextKey', function () {
			it( 'Returns next ID for a key or argument', function () {
				state.zobject = tableDataToRowObjects( zobjectTree );

				expect( zobjectModule.getters.getNextKey( state, { getCurrentZObjectId: 'Z0' } ) ).toEqual( 'Z0K1' );
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

		describe( 'getZObjectTypeById', () => {
			var getters;
			beforeEach( function () {
				getters = {};
				getters.getZObjectChildrenById = zobjectModule.getters.getZObjectChildrenById( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state, getters );
			} );
			it( 'when object is a call to a function that does not return a type, returns Z_FUNCTION_CALL', () => {
				state.zobject = tableDataToRowObjects( [
					{ value: Constants.ROW_VALUE_OBJECT, id: 0 },
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_FUNCTION_CALL, parent: 0, id: 1 },
					{ key: Constants.Z_FUNCTION_CALL_FUNCTION, value: 'Z12345', parent: 0, id: 2 }
				] );
				getters.getStoredObject = function () {
					return {
						[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION,
							[ Constants.Z_FUNCTION_RETURN_TYPE ]: Constants.Z_STRING
						}
					};
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
				getters.getStoredObject = function () {
					return {
						[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION,
							[ Constants.Z_FUNCTION_RETURN_TYPE ]: Constants.Z_TYPE
						}
					};
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
				const expected = { key: 'Z6K1', value: '', parent: 3, id: 17 };
				expect( zobjectModule.getters.getRowByKeyPath( state, getters )( keyPath ) ).toEqual( expected );
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

		describe( 'getTypedListItemType', function () {
			var getters;
			beforeEach( function () {
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

			it( 'returns undefined when the rowId is undefined', function () {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				expect( zobjectModule.getters.getTypedListItemType( state, getters )( rowId ) ).toEqual( expected );
			} );

			it( 'returns undefined when the row does not exist', function () {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				expect( zobjectModule.getters.getTypedListItemType( state, getters )( rowId ) ).toEqual( expected );
			} );

			it( 'returns undefined when the row is not the start of a typed list', function () {
				state.zobject = zobjectToRows( {
					Z1K1: Constants.Z_STRING,
					Z6K1: 'stringiform'
				} );
				const rowId = 0;
				const expected = undefined;
				expect( zobjectModule.getters.getTypedListItemType( state, getters )( rowId ) ).toEqual( expected );
			} );

			it( 'returns type when it is defined as a reference', function () {
				state.zobject = zobjectToRows( {
					Z2K2: [ 'Z6', 'first string', 'second string' ]
				} );
				const rowId = 1;
				const expected = 'Z6';
				expect( zobjectModule.getters.getTypedListItemType( state, getters )( rowId ) ).toEqual( expected );
			} );

			it( 'returns type when it is defined as a function call', function () {
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
			var getters;
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
			var getters;
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
				var getters;
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
				var getters;
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
		} );

		describe( 'ZMultilingualString', () => {
			describe( 'getZMultilingualLanguageList', function () {
				var getters;
				beforeEach( function () {
					getters = {};
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getZMonolingualLangValue = zobjectModule.getters.getZMonolingualLangValue( state, getters );
					getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
					getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue(
						state, getters );
					getters.getLanguageIsoCodeOfZLang = function ( key ) {
						return key === 'Z1002' ? 'en' : 'es';
					};
				} );

				it( 'returns empty array when the row is not found', function () {
					state.zobject = [];
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZMultilingualLanguageList( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty list when the multilingual string is empty', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
						{ id: 10, key: 'Z2K3', value: 'object', parent: 0 },
						{ id: 11, key: 'Z1K1', value: 'object', parent: 10 },
						{ id: 12, key: 'Z1K1', value: 'Z9', parent: 11 },
						{ id: 13, key: 'Z9K1', value: 'Z12', parent: 11 },
						{ id: 14, key: 'Z12K1', value: 'array', parent: 10 },
						{ id: 15, key: '0', value: 'object', parent: 14 },
						{ id: 16, key: 'Z1K1', value: 'Z9', parent: 15 },
						{ id: 17, key: 'Z9K1', value: 'Z11', parent: 15 }
					] );
					const rowId = 14;
					const expected = [];
					const metadata = zobjectModule.getters.getZMultilingualLanguageList( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with one item', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
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
						{ id: 27, key: 'Z6K1', value: 'test', parent: 25 }
					] );
					const rowId = 14;
					const expected = [ {
						langZid: 'Z1002',
						langIsoCode: 'en',
						rowId: 18
					} ];
					const metadata = zobjectModule.getters.getZMultilingualLanguageList( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with two items', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
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
						{ id: 27, key: 'Z6K1', value: 'in english', parent: 25 },
						{ id: 28, key: '2', value: 'object', parent: 14 },
						{ id: 29, key: 'Z1K1', value: 'object', parent: 28 },
						{ id: 30, key: 'Z1K1', value: 'Z9', parent: 29 },
						{ id: 31, key: 'Z9K1', value: 'Z11', parent: 29 },
						{ id: 32, key: 'Z11K1', value: 'object', parent: 28 },
						{ id: 33, key: 'Z1K1', value: 'Z9', parent: 32 },
						{ id: 34, key: 'Z9K1', value: 'Z1003', parent: 32 },
						{ id: 35, key: 'Z11K2', value: 'object', parent: 28 },
						{ id: 36, key: 'Z1K1', value: 'Z6', parent: 35 },
						{ id: 37, key: 'Z6K1', value: 'en español', parent: 35 }
					] );
					const rowId = 14;
					const expected = [
						{ langZid: 'Z1002', langIsoCode: 'en', rowId: 18 },
						{ langZid: 'Z1003', langIsoCode: 'es', rowId: 28 }
					];
					const metadata = zobjectModule.getters.getZMultilingualLanguageList( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );
		} );

		describe( 'ZMonolingualStringSet', () => {
			describe( 'getZMonolingualStringsetValues', () => {
				var getters;
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

				it( 'returns an empty array when ZMonolingualStringset has an empty array', () => {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
						{ id: 36, key: 'Z2K2', value: 'object', parent: 0 },
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
					] );
					const rowId = 36;
					const expected = [];
					const returned = zobjectModule.getters.getZMonolingualStringsetValues( state, getters )( rowId );
					expect( returned ).toStrictEqual( expected );
				} );

				it( 'returns an array with one item', () => {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
						{ id: 36, key: 'Z2K2', value: 'object', parent: 0 },
						{ id: 37, key: 'Z1K1', value: 'object', parent: 36 },
						{ id: 38, key: 'Z1K1', value: 'Z9', parent: 37 },
						{ id: 39, key: 'Z9K1', value: 'Z31', parent: 37 },
						{ id: 40, key: 'Z31K1', value: 'object', parent: 36 },
						{ id: 41, key: 'Z1K1', value: 'Z9', parent: 40 },
						{ id: 42, key: 'Z9K1', value: 'Z1002', parent: 40 },
						{ id: 43, key: 'Z31K2', value: 'array', parent: 36 },
						{ id: 44, key: '0', value: 'object', parent: 43 },
						{ id: 45, key: 'Z1K1', value: 'Z9', parent: 44 },
						{ id: 46, key: 'Z9K1', value: 'Z6', parent: 44 },
						{ id: 47, key: '1', value: 'object', parent: 43 },
						{ id: 48, key: 'Z1K1', value: 'Z6', parent: 47 },
						{ id: 49, key: 'Z6K1', value: 'one', parent: 47 }
					] );
					const rowId = 36;
					const expected = [ { rowId: 47, value: 'one' } ];
					const returned = zobjectModule.getters.getZMonolingualStringsetValues( state, getters )( rowId );
					expect( returned ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZMonolingualStringsetLang', () => {
				var getters;
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

				it( 'returns language zid of ZMonolingualStringset', () => {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
						{ id: 36, key: 'Z2K2', value: 'object', parent: 0 },
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
					] );
					const rowId = 36;
					const expected = 'Z1002';
					const returned = zobjectModule.getters.getZMonolingualStringsetLang( state, getters )( rowId );
					expect( returned ).toStrictEqual( expected );
				} );
			} );
		} );

		describe( 'ZPersistentObject', () => {
			describe( 'getZPersistentContentRowId', function () {
				var getters;
				beforeEach( function () {
					getters = {};
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				} );

				it( 'returns undefined when the rowId is undefined', function () {
					state.zobject = [];
					const rowId = undefined;
					const expectedRowId = undefined;
					const contentRowId = zobjectModule.getters.getZPersistentContentRowId( state, getters )( rowId );
					expect( contentRowId ).toBe( expectedRowId );
				} );

				it( 'returns undefined when the row does not exist', function () {
					state.zobject = [];
					const rowId = 0;
					const expectedRowId = undefined;
					const contentRowId = zobjectModule.getters.getZPersistentContentRowId( state, getters )( rowId );
					expect( contentRowId ).toBe( expectedRowId );
				} );

				it( 'returns row where persistent object content starts (key Z2K2)', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
						{ id: 18, key: 'Z2K2', parent: 0, value: 'object' },
						{ id: 19, key: 'Z1K1', parent: 18, value: 'object' },
						{ id: 20, key: 'Z1K1', parent: 19, value: 'Z9' },
						{ id: 21, key: 'Z9K1', parent: 19, value: 'Z11' }
					] );
					const rowId = 0;
					const expectedRowId = 18;
					const contentRowId = zobjectModule.getters.getZPersistentContentRowId( state, getters )( rowId );
					expect( contentRowId ).toBe( expectedRowId );
				} );

				it( 'returns row where persistent object content starts (key Z2K2) with input rowId', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 17, value: 'object' },
						{ id: 18, key: 'Z2K2', parent: 17, value: 'object' },
						{ id: 19, key: 'Z1K1', parent: 18, value: 'object' },
						{ id: 20, key: 'Z1K1', parent: 19, value: 'Z9' },
						{ id: 21, key: 'Z9K1', parent: 19, value: 'Z11' }
					] );
					const rowId = 17;
					const expectedRowId = 18;
					const contentRowId = zobjectModule.getters.getZPersistentContentRowId( state, getters )( rowId );
					expect( contentRowId ).toBe( expectedRowId );
				} );
			} );

			describe( 'getZPersistentNameLangs', function () {
				var getters;
				beforeEach( function () {
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
					getters.getLanguageIsoCodeOfZLang = function () {
						return 'en';
					};
				} );

				it( 'returns empty array when the row is not found', function () {
					state.zobject = [];
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZPersistentNameLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty list when the name multilingual string is empty', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
						{ id: 10, key: 'Z2K3', value: 'object', parent: 0 },
						{ id: 11, key: 'Z1K1', value: 'object', parent: 10 },
						{ id: 12, key: 'Z1K1', value: 'Z9', parent: 11 },
						{ id: 13, key: 'Z9K1', value: 'Z12', parent: 11 },
						{ id: 14, key: 'Z12K1', value: 'array', parent: 10 },
						{ id: 15, key: '0', value: 'object', parent: 14 },
						{ id: 16, key: 'Z1K1', value: 'Z9', parent: 15 },
						{ id: 17, key: 'Z9K1', value: 'Z11', parent: 15 }
					] );
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZPersistentNameLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with one item', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
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
						{ id: 27, key: 'Z6K1', value: 'test', parent: 25 }
					] );
					const rowId = 0;
					const expected = [ {
						langZid: 'Z1002',
						langIsoCode: 'en',
						rowId: 18
					} ];
					const metadata = zobjectModule.getters.getZPersistentNameLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZPersistentName', function () {
				var getters;
				beforeEach( function () {
					getters = {};
					getters.getZPersistentNameLangs = zobjectModule.getters.getZPersistentNameLangs( state, getters );
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
					getters.getLanguageIsoCodeOfZLang = function ( key ) {
						return key === 'Z1002' ? 'en' : 'es';
					};
					mw.language.getFallbackLanguageChain = jest.fn( function () {
						return [ 'es', 'en' ];
					} );
				} );

				it( 'returns metadata in user language', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
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
						{ id: 27, key: 'Z6K1', value: 'in english', parent: 25 },
						{ id: 28, key: '2', value: 'object', parent: 14 },
						{ id: 29, key: 'Z1K1', value: 'object', parent: 28 },
						{ id: 30, key: 'Z1K1', value: 'Z9', parent: 29 },
						{ id: 31, key: 'Z9K1', value: 'Z11', parent: 29 },
						{ id: 32, key: 'Z11K1', value: 'object', parent: 28 },
						{ id: 33, key: 'Z1K1', value: 'Z9', parent: 32 },
						{ id: 34, key: 'Z9K1', value: 'Z1003', parent: 32 },
						{ id: 35, key: 'Z11K2', value: 'object', parent: 28 },
						{ id: 36, key: 'Z1K1', value: 'Z6', parent: 35 },
						{ id: 37, key: 'Z6K1', value: 'en español', parent: 35 }
					] );
					const expected = {
						langZid: 'Z1003',
						langIsoCode: 'es',
						rowId: 28
					};
					const metadata = zobjectModule.getters.getZPersistentName( state, getters )();
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns metadata in fallback language', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
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
						{ id: 27, key: 'Z6K1', value: 'test', parent: 25 }
					] );
					const expected = {
						langZid: 'Z1002',
						langIsoCode: 'en',
						rowId: 18
					};
					const metadata = zobjectModule.getters.getZPersistentName( state, getters )();
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns undefined if unavailable language is explicitly requested', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
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
						{ id: 27, key: 'Z6K1', value: 'test', parent: 25 }
					] );
					const langZid = 'Z1004';
					const expected = undefined;
					const metadata = zobjectModule.getters.getZPersistentName( state, getters )( langZid );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns given language if passed as parameter', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
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
						{ id: 27, key: 'Z6K1', value: 'in english', parent: 25 },
						{ id: 28, key: '2', value: 'object', parent: 14 },
						{ id: 29, key: 'Z1K1', value: 'object', parent: 28 },
						{ id: 30, key: 'Z1K1', value: 'Z9', parent: 29 },
						{ id: 31, key: 'Z9K1', value: 'Z11', parent: 29 },
						{ id: 32, key: 'Z11K1', value: 'object', parent: 28 },
						{ id: 33, key: 'Z1K1', value: 'Z9', parent: 32 },
						{ id: 34, key: 'Z9K1', value: 'Z1003', parent: 32 },
						{ id: 35, key: 'Z11K2', value: 'object', parent: 28 },
						{ id: 36, key: 'Z1K1', value: 'Z6', parent: 35 },
						{ id: 37, key: 'Z6K1', value: 'en español', parent: 35 }
					] );
					const langZid = 'Z1002';
					const expected = {
						langZid: 'Z1002',
						langIsoCode: 'en',
						rowId: 18
					};
					const metadata = zobjectModule.getters.getZPersistentName( state, getters )( langZid );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZPersistentDescriptionLangs', function () {
				var getters;
				beforeEach( function () {
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
					getters.getLanguageIsoCodeOfZLang = function () {
						return 'en';
					};
				} );

				it( 'returns empty array when the row is not found', function () {
					state.zobject = [];
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZPersistentDescriptionLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty list when the description multilingual string is empty', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
						{ id: 10, key: 'Z2K5', value: 'object', parent: 0 },
						{ id: 11, key: 'Z1K1', value: 'object', parent: 10 },
						{ id: 12, key: 'Z1K1', value: 'Z9', parent: 11 },
						{ id: 13, key: 'Z9K1', value: 'Z12', parent: 11 },
						{ id: 14, key: 'Z12K1', value: 'array', parent: 10 },
						{ id: 15, key: '0', value: 'object', parent: 14 },
						{ id: 16, key: 'Z1K1', value: 'Z9', parent: 15 },
						{ id: 17, key: 'Z9K1', value: 'Z11', parent: 15 }
					] );
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZPersistentDescriptionLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with one item', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
						{ id: 10, key: 'Z2K5', value: 'object', parent: 0 },
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
						{ id: 27, key: 'Z6K1', value: 'test', parent: 25 }
					] );
					const rowId = 0;
					const expected = [ {
						langZid: 'Z1002',
						langIsoCode: 'en',
						rowId: 18
					} ];
					const metadata = zobjectModule.getters.getZPersistentDescriptionLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZPersistentDescription', function () {
				var getters;
				beforeEach( function () {
					getters = {};
					getters.getZPersistentDescriptionLangs = zobjectModule.getters
						.getZPersistentDescriptionLangs( state, getters );
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
					getters.getLanguageIsoCodeOfZLang = function ( key ) {
						return key === 'Z1002' ? 'en' : 'es';
					};
					mw.language.getFallbackLanguageChain = jest.fn( function () {
						return [ 'es', 'en' ];
					} );
				} );

				it( 'returns metadata in user language', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
						{ id: 10, key: 'Z2K5', value: 'object', parent: 0 },
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
						{ id: 27, key: 'Z6K1', value: 'in english', parent: 25 },
						{ id: 28, key: '2', value: 'object', parent: 14 },
						{ id: 29, key: 'Z1K1', value: 'object', parent: 28 },
						{ id: 30, key: 'Z1K1', value: 'Z9', parent: 29 },
						{ id: 31, key: 'Z9K1', value: 'Z11', parent: 29 },
						{ id: 32, key: 'Z11K1', value: 'object', parent: 28 },
						{ id: 33, key: 'Z1K1', value: 'Z9', parent: 32 },
						{ id: 34, key: 'Z9K1', value: 'Z1003', parent: 32 },
						{ id: 35, key: 'Z11K2', value: 'object', parent: 28 },
						{ id: 36, key: 'Z1K1', value: 'Z6', parent: 35 },
						{ id: 37, key: 'Z6K1', value: 'en español', parent: 35 }
					] );
					const expected = {
						langZid: 'Z1003',
						langIsoCode: 'es',
						rowId: 28
					};
					const metadata = zobjectModule.getters.getZPersistentDescription( state, getters )();
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns metadata in fallback language', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
						{ id: 10, key: 'Z2K5', value: 'object', parent: 0 },
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
						{ id: 27, key: 'Z6K1', value: 'test', parent: 25 }
					] );
					const expected = {
						langZid: 'Z1002',
						langIsoCode: 'en',
						rowId: 18
					};
					const metadata = zobjectModule.getters.getZPersistentDescription( state, getters )();
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns undefined if unavailable language is explicitly requested', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
						{ id: 10, key: 'Z2K5', value: 'object', parent: 0 },
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
						{ id: 27, key: 'Z6K1', value: 'test', parent: 25 }
					] );
					const langZid = 'Z1004';
					const expected = undefined;
					const metadata = zobjectModule.getters.getZPersistentDescription( state, getters )( langZid );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns given language if passed as parameter', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
						{ id: 10, key: 'Z2K5', value: 'object', parent: 0 },
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
						{ id: 27, key: 'Z6K1', value: 'in english', parent: 25 },
						{ id: 28, key: '2', value: 'object', parent: 14 },
						{ id: 29, key: 'Z1K1', value: 'object', parent: 28 },
						{ id: 30, key: 'Z1K1', value: 'Z9', parent: 29 },
						{ id: 31, key: 'Z9K1', value: 'Z11', parent: 29 },
						{ id: 32, key: 'Z11K1', value: 'object', parent: 28 },
						{ id: 33, key: 'Z1K1', value: 'Z9', parent: 32 },
						{ id: 34, key: 'Z9K1', value: 'Z1003', parent: 32 },
						{ id: 35, key: 'Z11K2', value: 'object', parent: 28 },
						{ id: 36, key: 'Z1K1', value: 'Z6', parent: 35 },
						{ id: 37, key: 'Z6K1', value: 'en español', parent: 35 }
					] );
					const langZid = 'Z1002';
					const expected = {
						langZid: 'Z1002',
						langIsoCode: 'en',
						rowId: 18
					};
					const metadata = zobjectModule.getters.getZPersistentDescription( state, getters )( langZid );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZPersistentAliasLangs', function () {
				var getters;
				beforeEach( function () {
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
					getters.getLanguageIsoCodeOfZLang = function () {
						return 'en';
					};
				} );

				it( 'returns empty array when the row is not found', function () {
					state.zobject = [];
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZPersistentAliasLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns empty list when the description multilingual string is empty', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
						{ id: 28, key: 'Z2K4', value: 'object', parent: 0 },
						{ id: 29, key: 'Z1K1', value: 'object', parent: 28 },
						{ id: 30, key: 'Z1K1', value: 'Z9', parent: 29 },
						{ id: 31, key: 'Z9K1', value: 'Z32', parent: 29 },
						{ id: 32, key: 'Z32K1', value: 'array', parent: 28 },
						{ id: 33, key: '0', value: 'object', parent: 32 },
						{ id: 34, key: 'Z1K1', value: 'Z9', parent: 33 },
						{ id: 35, key: 'Z9K1', value: 'Z31', parent: 33 }
					] );
					const rowId = 0;
					const expected = [];
					const metadata = zobjectModule.getters.getZPersistentAliasLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns list with one item', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
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
					] );
					const rowId = 0;
					const expected = [ {
						langZid: 'Z1002',
						langIsoCode: 'en',
						rowId: 36
					} ];
					const metadata = zobjectModule.getters.getZPersistentAliasLangs( state, getters )( rowId );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );

			describe( 'getZPersistentAlias', function () {
				var getters;
				beforeEach( function () {
					getters = {};
					getters.getZPersistentAliasLangs = zobjectModule.getters.getZPersistentAliasLangs( state, getters );
					getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
					getters.getRowById = zobjectModule.getters.getRowById( state );
					getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
					getters.getZMonolingualStringsetLang = zobjectModule.getters
						.getZMonolingualStringsetLang( state, getters );
					getters.getZObjectTypeByRowId = zobjectModule.getters.getZObjectTypeByRowId( state, getters );
					getters.getZReferenceTerminalValue = zobjectModule.getters
						.getZReferenceTerminalValue( state, getters );
					getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
					getters.getLanguageIsoCodeOfZLang = function () {
						return 'en';
					};
					mw.language.getFallbackLanguageChain = jest.fn( function () {
						return [ 'es', 'en' ];
					} );
				} );

				it( 'returns metadata in user language or fallback', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
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
					] );
					const expected = {
						langZid: 'Z1002',
						langIsoCode: 'en',
						rowId: 36
					};
					const metadata = zobjectModule.getters.getZPersistentAlias( state, getters )();
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns undefined if unavailable language is explicitly requested', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
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
					] );
					const langZid = 'Z1004';
					const expected = undefined;
					const metadata = zobjectModule.getters.getZPersistentAlias( state, getters )( langZid );
					expect( metadata ).toStrictEqual( expected );
				} );

				it( 'returns given language if passed as parameter', function () {
					state.zobject = tableDataToRowObjects( [
						{ id: 0, value: 'object' },
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
						{ id: 42, key: 'Z9K1', value: 'Z1005', parent: 40 },
						{ id: 43, key: 'Z31K2', value: 'array', parent: 36 },
						{ id: 44, key: '0', value: 'object', parent: 43 },
						{ id: 45, key: 'Z1K1', value: 'Z9', parent: 44 },
						{ id: 46, key: 'Z9K1', value: 'Z6', parent: 44 }
					] );
					const langZid = 'Z1005';
					const expected = {
						langZid: 'Z1005',
						langIsoCode: 'en',
						rowId: 36
					};
					const metadata = zobjectModule.getters.getZPersistentAlias( state, getters )( langZid );
					expect( metadata ).toStrictEqual( expected );
				} );
			} );

			describe( 'getMetadataLanguages', function () {
				it( 'returns empty list', function () {
					getters.getZPersistentNameLangs = jest.fn( function () {
						return [];
					} );
					getters.getZPersistentDescriptionLangs = jest.fn( function () {
						return [];
					} );
					getters.getZPersistentAliasLangs = jest.fn( function () {
						return [];
					} );
					const expected = [];
					const languages = zobjectModule.getters.getMetadataLanguages( state, getters )();
					expect( languages ).toStrictEqual( expected );
				} );

				it( 'returns set of non repeated languages', function () {
					getters.getZPersistentNameLangs = jest.fn( function () {
						return [
							{ langZid: 'Z1002', langIsoCode: 'en', rowId: 1 }
						];
					} );
					getters.getZPersistentDescriptionLangs = jest.fn( function () {
						return [
							{ langZid: 'Z1003', langIsoCode: 'en', rowId: 1 },
							{ langZid: 'Z1004', langIsoCode: 'fr', rowId: 2 }
						];
					} );
					getters.getZPersistentAliasLangs = jest.fn( function () {
						return [
							{ langZid: 'Z1005', langIsoCode: 'ru', rowId: 1 }
						];
					} );
					const expected = [ 'Z1002', 'Z1003', 'Z1004', 'Z1005' ];
					const languages = zobjectModule.getters.getMetadataLanguages( state, getters )();
					expect( languages ).toStrictEqual( expected );
				} );

				it( 'returns set of repeated languages', function () {
					getters.getZPersistentNameLangs = jest.fn( function () {
						return [
							{ langZid: 'Z1002', langIsoCode: 'en', rowId: 1 },
							{ langZid: 'Z1003', langIsoCode: 'es', rowId: 2 }
						];
					} );
					getters.getZPersistentDescriptionLangs = jest.fn( function () {
						return [
							{ langZid: 'Z1002', langIsoCode: 'en', rowId: 1 },
							{ langZid: 'Z1003', langIsoCode: 'es', rowId: 2 }
						];
					} );
					getters.getZPersistentAliasLangs = jest.fn( function () {
						return [
							{ langZid: 'Z1002', langIsoCode: 'en', rowId: 1 },
							{ langZid: 'Z1003', langIsoCode: 'es', rowId: 2 }
						];
					} );
					const expected = [ 'Z1002', 'Z1003' ];
					const languages = zobjectModule.getters.getMetadataLanguages( state, getters )();
					expect( languages ).toStrictEqual( expected );
				} );
			} );
		} );

		describe( 'getZImplementationFunctionRowId', function () {
			var getters;
			beforeEach( function () {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
			} );

			it( 'returns undefined when the rowId is undefined', function () {
				state.zobject = [];
				const rowId = undefined;
				const expectedRowId = undefined;
				const functionRowId = zobjectModule.getters.getZImplementationFunctionRowId( state, getters )( rowId );
				expect( functionRowId ).toBe( expectedRowId );
			} );

			it( 'returns undefined when the row does not exist', function () {
				state.zobject = [];
				const rowId = 0;
				const expectedRowId = undefined;
				const functionRowId = zobjectModule.getters.getZImplementationFunctionRowId( state, getters )( rowId );
				expect( functionRowId ).toBe( expectedRowId );
			} );

			it( 'returns row where target function object starts (key Z14K1)', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' }
				] );
				const rowId = 4;
				const expectedRowId = 8;
				const functionRowId = zobjectModule.getters.getZImplementationFunctionRowId( state, getters )( rowId );
				expect( functionRowId ).toBe( expectedRowId );
			} );
		} );

		describe( 'getZImplementationFunctionZid', function () {
			var getters;
			beforeEach( function () {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZImplementationFunctionRowId = zobjectModule.getters
					.getZImplementationFunctionRowId( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
				getters.getZReferenceTerminalValue = zobjectModule.getters.getZReferenceTerminalValue( state, getters );
			} );

			it( 'returns undefined when the rowId is undefined', function () {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const functionZid = zobjectModule.getters.getZImplementationFunctionZid( state, getters )( rowId );
				expect( functionZid ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', function () {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const functionZid = zobjectModule.getters.getZImplementationFunctionZid( state, getters )( rowId );
				expect( functionZid ).toBe( expected );
			} );

			it( 'returns row where target function object starts (key Z14K1)', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' }
				] );
				const rowId = 4;
				const expected = 'Z10001';
				const functionZid = zobjectModule.getters.getZImplementationFunctionZid( state, getters )( rowId );
				expect( functionZid ).toBe( expected );
			} );
		} );

		describe( 'getZImplementationContentType', function () {
			var getters;
			beforeEach( function () {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
			} );

			it( 'returns undefined when the rowId is undefined', function () {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const contentType = zobjectModule.getters.getZImplementationContentType( state, getters )( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', function () {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const contentType = zobjectModule.getters.getZImplementationContentType( state, getters )( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns composition (key Z14K2)', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 11, key: 'Z14K2', parent: 4, value: 'object' },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z7' },
					{ id: 15, key: 'Z7K1', parent: 11, value: 'object' },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'Z9' },
					{ id: 17, key: 'Z9K1', parent: 15, value: 'Z10002' }
				] );
				const rowId = 4;
				const expected = 'Z14K2';
				const contentType = zobjectModule.getters.getZImplementationContentType( state, getters )( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns code (key Z14K3)', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 11, key: 'Z14K3', parent: 4, value: 'object' },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z16' },
					{ id: 15, key: 'Z16K1', parent: 11, value: 'object' },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'object' },
					{ id: 17, key: 'Z1K1', parent: 16, value: 'Z9' },
					{ id: 18, key: 'Z9K1', parent: 16, value: 'Z61' },
					{ id: 19, key: 'Z61K1', parent: 15, value: 'object' },
					{ id: 20, key: 'Z1K1', parent: 19, value: 'Z6' },
					{ id: 21, key: 'Z6K1', parent: 19, value: 'python' },
					{ id: 22, key: 'Z16K2', parent: 11, value: 'object' },
					{ id: 23, key: 'Z1K1', parent: 22, value: 'Z6' },
					{ id: 24, key: 'Z6K1', parent: 22, value: 'def Z10001:' }
				] );
				const rowId = 4;
				const expected = 'Z14K3';
				const contentType = zobjectModule.getters.getZImplementationContentType( state, getters )( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns builtin (key Z14K4)', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 11, key: 'Z14K4', parent: 4, value: 'object' },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'Z6' },
					{ id: 13, key: 'Z6K1', parent: 11, value: 'BUILTIN' }
				] );
				const rowId = 4;
				const expected = 'Z14K4';
				const contentType = zobjectModule.getters.getZImplementationContentType( state, getters )( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns undefined if no key is found', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' }
				] );
				const rowId = 4;
				const expected = undefined;
				const contentType = zobjectModule.getters.getZImplementationContentType( state, getters )( rowId );
				expect( contentType ).toBe( expected );
			} );

			it( 'returns the valid key when all are present but their values are undefined', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 11, key: 'Z14K2', parent: 4, value: undefined },
					{ id: 12, key: 'Z14K3', parent: 4, value: undefined },
					{ id: 13, key: 'Z14K4', parent: 4, value: 'object' },
					{ id: 14, key: 'Z1K1', parent: 13, value: 'Z6' },
					{ id: 15, key: 'Z6K1', parent: 13, value: 'BUILTIN' }
				] );
				const rowId = 4;
				const expected = 'Z14K4';
				const contentType = zobjectModule.getters.getZImplementationContentType( state, getters )( rowId );
				expect( contentType ).toBe( expected );
			} );
		} );

		describe( 'getZImplementationContentRowId', function () {
			var getters;
			beforeEach( function () {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
			} );

			it( 'returns undefined when the rowId and key are undefined', function () {
				state.zobject = [];
				const rowId = undefined;
				const key = undefined;
				const expected = undefined;
				const contentRowId = zobjectModule.getters
					.getZImplementationContentRowId( state, getters )( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', function () {
				state.zobject = [];
				const rowId = 0;
				const key = 'Z14K2';
				const expected = undefined;
				const contentRowId = zobjectModule.getters
					.getZImplementationContentRowId( state, getters )( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );

			it( 'returns composition when available (key Z14K2)', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 11, key: 'Z14K2', parent: 4, value: 'object' },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z7' },
					{ id: 15, key: 'Z7K1', parent: 11, value: 'object' },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'Z9' },
					{ id: 17, key: 'Z9K1', parent: 15, value: 'Z10002' }
				] );
				const rowId = 4;
				const key = 'Z14K2';
				const expected = 11;
				const contentRowId = zobjectModule.getters
					.getZImplementationContentRowId( state, getters )( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );

			it( 'returns code when available (key Z14K3)', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 11, key: 'Z14K3', parent: 4, value: 'object' },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z16' },
					{ id: 15, key: 'Z16K1', parent: 11, value: 'object' },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'object' },
					{ id: 17, key: 'Z1K1', parent: 16, value: 'Z9' },
					{ id: 18, key: 'Z9K1', parent: 16, value: 'Z61' },
					{ id: 19, key: 'Z61K1', parent: 15, value: 'object' },
					{ id: 20, key: 'Z1K1', parent: 19, value: 'Z6' },
					{ id: 21, key: 'Z6K1', parent: 19, value: 'python' },
					{ id: 22, key: 'Z16K2', parent: 11, value: 'object' },
					{ id: 23, key: 'Z1K1', parent: 22, value: 'Z6' },
					{ id: 24, key: 'Z6K1', parent: 22, value: 'def Z10001:' }
				] );
				const rowId = 4;
				const key = 'Z14K3';
				const expected = 11;
				const contentRowId = zobjectModule.getters
					.getZImplementationContentRowId( state, getters )( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );

			it( 'returns undefined if given key is not', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 11, key: 'Z14K2', parent: 4, value: 'object' },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z7' },
					{ id: 15, key: 'Z7K1', parent: 11, value: 'object' },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'Z9' },
					{ id: 17, key: 'Z9K1', parent: 15, value: 'Z10002' }
				] );
				const rowId = 4;
				const key = 'Z14K3';
				const expected = undefined;
				const contentRowId = zobjectModule.getters
					.getZImplementationContentRowId( state, getters )( rowId, key );
				expect( contentRowId ).toBe( expected );
			} );
		} );

		describe( 'getZCodeProgrammingLanguage', function () {
			var getters;
			beforeEach( function () {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
			} );

			it( 'returns undefined when the rowId is undefined', function () {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const lang = zobjectModule.getters.getZCodeProgrammingLanguage( state, getters )( rowId );
				expect( lang ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', function () {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const lang = zobjectModule.getters.getZCodeProgrammingLanguage( state, getters )( rowId );
				expect( lang ).toBe( expected );
			} );

			it( 'returns literal that identifies the programing language', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 11, key: 'Z14K3', parent: 4, value: 'object' },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z16' },
					{ id: 15, key: 'Z16K1', parent: 11, value: 'object' },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'object' },
					{ id: 17, key: 'Z1K1', parent: 16, value: 'Z9' },
					{ id: 18, key: 'Z9K1', parent: 16, value: 'Z61' },
					{ id: 19, key: 'Z61K1', parent: 15, value: 'object' },
					{ id: 20, key: 'Z1K1', parent: 19, value: 'Z6' },
					{ id: 21, key: 'Z6K1', parent: 19, value: 'python' },
					{ id: 22, key: 'Z16K2', parent: 11, value: 'object' },
					{ id: 23, key: 'Z1K1', parent: 22, value: 'Z6' },
					{ id: 24, key: 'Z6K1', parent: 22, value: 'def Z10001:' }
				] );
				const rowId = 11;
				const expected = 'python';
				const lang = zobjectModule.getters.getZCodeProgrammingLanguage( state, getters )( rowId );
				expect( lang ).toBe( expected );
			} );
		} );

		describe( 'getZCodeString', function () {
			var getters;
			beforeEach( function () {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
			} );

			it( 'returns undefined when the rowId is undefined', function () {
				state.zobject = [];
				const rowId = undefined;
				const expected = undefined;
				const lang = zobjectModule.getters.getZCodeString( state, getters )( rowId );
				expect( lang ).toBe( expected );
			} );

			it( 'returns undefined when the row does not exist', function () {
				state.zobject = [];
				const rowId = 0;
				const expected = undefined;
				const lang = zobjectModule.getters.getZCodeString( state, getters )( rowId );
				expect( lang ).toBe( expected );
			} );

			it( 'returns string value of the code', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 11, key: 'Z14K3', parent: 4, value: 'object' },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z16' },
					{ id: 15, key: 'Z16K1', parent: 11, value: 'object' },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'object' },
					{ id: 17, key: 'Z1K1', parent: 16, value: 'Z9' },
					{ id: 18, key: 'Z9K1', parent: 16, value: 'Z61' },
					{ id: 19, key: 'Z61K1', parent: 15, value: 'object' },
					{ id: 20, key: 'Z1K1', parent: 19, value: 'Z6' },
					{ id: 21, key: 'Z6K1', parent: 19, value: 'python' },
					{ id: 22, key: 'Z16K2', parent: 11, value: 'object' },
					{ id: 23, key: 'Z1K1', parent: 22, value: 'Z6' },
					{ id: 24, key: 'Z6K1', parent: 22, value: 'def Z10001:' }
				] );
				const rowId = 11;
				const expected = 'def Z10001:';
				const lang = zobjectModule.getters.getZCodeString( state, getters )( rowId );
				expect( lang ).toBe( expected );
			} );
		} );

		describe( 'isInsideComposition', function () {
			var getters;
			beforeEach( function () {
				getters = {};
				getters.getRowById = zobjectModule.getters.getRowById( state );
			} );

			it( 'returns false when the rowId is undefined', function () {
				state.zobject = [];
				const rowId = undefined;
				const expected = false;
				const result = zobjectModule.getters.isInsideComposition( state, getters )( rowId );
				expect( result ).toBe( expected );
			} );

			it( 'returns false when the rowId is not found', function () {
				state.zobject = [];
				const rowId = 10;
				const expected = false;
				const result = zobjectModule.getters.isInsideComposition( state, getters )( rowId );
				expect( result ).toBe( expected );
			} );

			it( 'returns false when the row is zero (root)', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' }
				] );
				const rowId = 0;
				const expected = false;
				const result = zobjectModule.getters.isInsideComposition( state, getters )( rowId );
				expect( result ).toBe( expected );
			} );

			it( 'returns false when no parent has composition/Z14K2 key', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 11, key: 'Z14K3', parent: 4, value: 'object' },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z16' },
					{ id: 15, key: 'Z16K1', parent: 11, value: 'object' },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'object' },
					{ id: 17, key: 'Z1K1', parent: 16, value: 'Z9' },
					{ id: 18, key: 'Z9K1', parent: 16, value: 'Z61' },
					{ id: 19, key: 'Z61K1', parent: 15, value: 'object' },
					{ id: 20, key: 'Z1K1', parent: 19, value: 'Z6' },
					{ id: 21, key: 'Z6K1', parent: 19, value: 'python' },
					{ id: 22, key: 'Z16K2', parent: 11, value: 'object' },
					{ id: 23, key: 'Z1K1', parent: 22, value: 'Z6' },
					{ id: 24, key: 'Z6K1', parent: 22, value: 'def Z10001:' }
				] );
				const rowId = 24;
				const expected = false;
				const result = zobjectModule.getters.isInsideComposition( state, getters )( rowId );
				expect( result ).toBe( expected );
			} );

			it( 'returns true when a parent has composition/Z14K2 key', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 11, key: 'Z14K2', parent: 4, value: 'object' },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z7' },
					{ id: 15, key: 'Z7K1', parent: 11, value: 'object' },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'Z9' },
					{ id: 17, key: 'Z9K1', parent: 15, value: 'Z10002' },
					{ id: 18, key: 'Z10002K1', parent: 11, value: 'object' },
					{ id: 19, key: 'Z1K1', parent: 18, value: 'Z6' },
					{ id: 20, key: 'Z6K1', parent: 18, value: 'uno' },
					{ id: 21, key: 'Z10002K2', parent: 11, value: 'object' },
					{ id: 22, key: 'Z1K1', parent: 21, value: 'Z6' },
					{ id: 23, key: 'Z6K1', parent: 21, value: 'dos' }
				] );
				const rowId = 23;
				const expected = true;
				const result = zobjectModule.getters.isInsideComposition( state, getters )( rowId );
				expect( result ).toBe( expected );
			} );
		} );

		describe( 'getZBooleanValue', function () {
			beforeEach( function () {
				context.state = { };

				context.state.zobject = tableDataToRowObjects(
					[
						{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 2, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 1 },
						{ id: 3, key: Constants.Z_REFERENCE_ID, value: Constants.Z_PERSISTENTOBJECT, parent: 1 },
						{
							id: 4,
							key: Constants.Z_PERSISTENTOBJECT_ID,
							value: Constants.ROW_VALUE_OBJECT,
							parent: 0
						},
						{ id: 5, key: Constants.Z_OBJECT_TYPE, value: Constants.ROW_VALUE_ARRAY, parent: 4 },
						{ id: 6, key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 5 },
						{ id: 7, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_BOOLEAN, parent: 6 },
						{ id: 8, key: Constants.Z_BOOLEAN_IDENTITY, value: Constants.Z_BOOLEAN_TRUE, parent: 6 },
						{ id: 9, key: '2', value: Constants.ROW_VALUE_OBJECT, parent: 5 },
						{ id: 10, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_BOOLEAN, parent: 9 },
						{ id: 11, key: Constants.Z_BOOLEAN_IDENTITY, value: Constants.Z_BOOLEAN_FALSE, parent: 9 }
					]
				);

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

			it( 'returns Z41(true) when the boolean value is true', function () {
				// rowId of the parent of the boolean value
				const rowId = 6;
				const expected = Constants.Z_BOOLEAN_TRUE;
				const result = context.getters.getZBooleanValue( rowId );

				expect( result ).toBe( expected );
			} );

			it( 'returns Z42(false) when the boolean value is true', function () {
				// rowId of the parent of the boolean value
				const rowId = 9;
				const expected = Constants.Z_BOOLEAN_FALSE;
				const result = context.getters.getZBooleanValue( rowId );
				expect( result ).toBe( expected );
			} );

			it( 'returns undefined when the rowId is NOT a boolean', function () {
				const rowId = 2;
				const result = context.getters.getZBooleanValue( rowId );

				expect( result ).toBeUndefined();
			} );

			it( 'returns undefined when the rowId does NOT exist', function () {
				const rowId = 100;
				const result = context.getters.getZBooleanValue( rowId );

				expect( result ).toBeUndefined();
			} );
		} );

		describe( 'getZObjectTypeByRowId', function () {
			var getters;

			beforeEach( function () {
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

			it( 'should return the type of the object in a list', function () {
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
		} );

		describe( 'getDepthByRowId', function () {
			beforeEach( function () {
				context.state = { };

				context.state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 10, key: Constants.Z_PERSISTENTOBJECT_LABEL, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 11, key: Constants.Z_OBJECT_TYPE, value: Constants.ROW_VALUE_OBJECT, parent: 10 },
					{ id: 12, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 11 },
					{ id: 13, key: Constants.Z_REFERENCE_ID, value: Constants.Z_MULTILINGUALSTRING, parent: 11 },
					{ id: 14, key: Constants.Z_MULTILINGUALSTRING_VALUE, value: Constants.ROW_VALUE_ARRAY, parent: 10 },
					{ id: 15, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 14 },
					{ id: 16, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 15 },
					{ id: 17, key: Constants.Z_REFERENCE_ID, value: Constants.Z_MONOLINGUALSTRING, parent: 15 },
					{ id: 18, key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 14 },
					{ id: 19, key: Constants.Z_OBJECT_TYPE, value: Constants.ROW_VALUE_OBJECT, parent: 18 },
					{ id: 20, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 19 },
					{ id: 21, key: Constants.Z_REFERENCE_ID, value: Constants.Z_MONOLINGUALSTRING, parent: 19 },
					{ id: 22, key: Constants.Z_MONOLINGUALSTRING_LANGUAGE, value: Constants.ROW_VALUE_OBJECT, parent: 18 },
					{ id: 23, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 22 },
					{ id: 24, key: Constants.Z_REFERENCE_ID, value: Constants.Z_NATURAL_LANGUAGE_ENGLISH, parent: 22 },
					{ id: 25, key: Constants.Z_MONOLINGUALSTRING_VALUE, value: Constants.ROW_VALUE_OBJECT, parent: 18 },
					{ id: 26, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 25 },
					{ id: 27, key: Constants.Z_STRING_VALUE, value: 'test', parent: 25 }
				] );

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
				const rowId = 10;

				expect( context.getters.getDepthByRowId( rowId ) ).toBe( 1 );
			} );

			it( 'should return the correct depth for nested parents', () => {
				const rowId = 27;

				expect( context.getters.getDepthByRowId( rowId ) ).toBe( 5 );
			} );
		} );

		describe( 'getParentRowId', function () {
			beforeEach( function () {
				context.state = { };

				context.state.zobject = tableDataToRowObjects(
					[
						{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 2, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 1 },
						{ id: 3, key: Constants.Z_REFERENCE_ID, value: Constants.Z_PERSISTENTOBJECT, parent: 1 },
						{
							id: 4,
							key: Constants.Z_PERSISTENTOBJECT_ID,
							value: Constants.ROW_VALUE_OBJECT,
							parent: 1
						}
					]
				);

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
				const rowId = 1;

				expect( context.getters.getParentRowId( rowId ) ).toBeUndefined();
			} );
		} );

		describe( 'getNextRowId', function () {
			beforeEach( function () {
				context.state = { };

				context.state.zobject = tableDataToRowObjects(
					[
						{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 2, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 1 },
						{ id: 3, key: Constants.Z_REFERENCE_ID, value: Constants.Z_PERSISTENTOBJECT, parent: 1 },
						{
							id: 4,
							key: Constants.Z_PERSISTENTOBJECT_ID,
							value: Constants.ROW_VALUE_OBJECT,
							parent: 1
						}
					]
				);
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId;
			} );

			it( 'should return 0 if zobject is empty', () => {
				expect( context.getters.getNextRowId( [] ) ).toBe( 0 );
			} );

			it( 'should return the next available rowId', () => {
				expect( context.getters.getNextRowId( context.state ) ).toBe( 5 );
			} );
		} );

		describe( 'getMapValueByKey', function () {
			var getters;
			beforeEach( function () {
				getters = {};
				getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( state, getters );
				getters.getRowById = zobjectModule.getters.getRowById( state );
				getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( state );
				getters.getZStringTerminalValue = zobjectModule.getters.getZStringTerminalValue( state, getters );
				getters.getZObjectTerminalValue = zobjectModule.getters.getZObjectTerminalValue( state, getters );
			} );

			it( 'returns undefined when map row not found', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' }
				] );
				const rowId = 1;
				const key = 'errors';
				const expected = undefined;
				const result = zobjectModule.getters.getMapValueByKey( state, getters )( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns undefined when row is not a map', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'Z6' },
					{ id: 2, key: 'Z6K1', parent: 0, value: 'not a map' }
				] );
				const rowId = 0;
				const key = 'errors';
				const expected = undefined;
				const result = zobjectModule.getters.getMapValueByKey( state, getters )( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns undefined when map is empty', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z22K2', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'object' },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'object' },
					{ id: 4, key: 'Z1K1', parent: 3, value: 'Z9' },
					{ id: 5, key: 'Z9K1', parent: 3, value: 'Z7' },
					{ id: 6, key: 'Z7K1', parent: 2, value: 'object' },
					{ id: 7, key: 'Z1K1', parent: 6, value: 'Z9' },
					{ id: 8, key: 'Z9K1', parent: 6, value: 'Z883' },
					{ id: 9, key: 'Z883K1', parent: 2, value: 'object' },
					{ id: 10, key: 'Z1K1', parent: 9, value: 'Z9' },
					{ id: 11, key: 'Z9K1', parent: 9, value: 'Z6' },
					{ id: 12, key: 'Z883K2', parent: 2, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z1' },
					{ id: 15, key: 'K1', parent: 1, value: 'array' },
					{ id: 16, key: '0', parent: 15, value: 'object' },
					{ id: 17, key: 'Z1K1', parent: 16, value: 'object' },
					{ id: 18, key: 'Z1K1', parent: 17, value: 'Z9' },
					{ id: 19, key: 'Z9K1', parent: 17, value: 'Z7' },
					{ id: 20, key: 'Z7K1', parent: 16, value: 'object' },
					{ id: 21, key: 'Z1K1', parent: 20, value: 'Z9' },
					{ id: 22, key: 'Z9K1', parent: 20, value: 'Z882' },
					{ id: 23, key: 'Z882K1', parent: 16, value: 'object' },
					{ id: 24, key: 'Z1K1', parent: 23, value: 'Z9' },
					{ id: 25, key: 'Z9K1', parent: 23, value: 'Z6' },
					{ id: 26, key: 'Z882K2', parent: 16, value: 'object' },
					{ id: 27, key: 'Z1K1', parent: 26, value: 'Z9' },
					{ id: 28, key: 'Z9K1', parent: 26, value: 'Z1' }
				] );
				const rowId = 1;
				const key = 'errors';
				const expected = undefined;
				const result = zobjectModule.getters.getMapValueByKey( state, getters )( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns undefined when map item has no key', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z22K2', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'object' },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'object' },
					{ id: 4, key: 'Z1K1', parent: 3, value: 'Z9' },
					{ id: 5, key: 'Z9K1', parent: 3, value: 'Z7' },
					{ id: 6, key: 'Z7K1', parent: 2, value: 'object' },
					{ id: 7, key: 'Z1K1', parent: 6, value: 'Z9' },
					{ id: 8, key: 'Z9K1', parent: 6, value: 'Z883' },
					{ id: 9, key: 'Z883K1', parent: 2, value: 'object' },
					{ id: 10, key: 'Z1K1', parent: 9, value: 'Z9' },
					{ id: 11, key: 'Z9K1', parent: 9, value: 'Z6' },
					{ id: 12, key: 'Z883K2', parent: 2, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z1' },
					{ id: 15, key: 'K1', parent: 1, value: 'array' },
					{ id: 16, key: '0', parent: 15, value: 'object' },
					{ id: 17, key: 'Z1K1', parent: 16, value: 'object' },
					{ id: 18, key: 'Z1K1', parent: 17, value: 'Z9' },
					{ id: 19, key: 'Z9K1', parent: 17, value: 'Z7' },
					{ id: 20, key: 'Z7K1', parent: 16, value: 'object' },
					{ id: 21, key: 'Z1K1', parent: 20, value: 'Z9' },
					{ id: 22, key: 'Z9K1', parent: 20, value: 'Z882' },
					{ id: 23, key: 'Z882K1', parent: 16, value: 'object' },
					{ id: 24, key: 'Z1K1', parent: 23, value: 'Z9' },
					{ id: 25, key: 'Z9K1', parent: 23, value: 'Z6' },
					{ id: 26, key: 'Z882K2', parent: 16, value: 'object' },
					{ id: 27, key: 'Z1K1', parent: 26, value: 'Z9' },
					{ id: 28, key: 'Z9K1', parent: 26, value: 'Z1' },
					{ id: 29, key: '1', parent: 15, value: 'object' },
					{ id: 30, key: 'Z1K1', parent: 29, value: 'object' },
					{ id: 31, key: 'Z1K1', parent: 30, value: 'object' },
					{ id: 32, key: 'Z1K1', parent: 31, value: 'Z9' },
					{ id: 33, key: 'Z9K1', parent: 31, value: 'Z7' },
					{ id: 34, key: 'Z7K1', parent: 30, value: 'object' },
					{ id: 35, key: 'Z1K1', parent: 34, value: 'Z9' },
					{ id: 36, key: 'Z9K1', parent: 34, value: 'Z882' },
					{ id: 37, key: 'Z883K1', parent: 30, value: 'object' },
					{ id: 38, key: 'Z1K1', parent: 37, value: 'Z9' },
					{ id: 39, key: 'Z9K1', parent: 37, value: 'Z6' },
					{ id: 40, key: 'Z883K2', parent: 30, value: 'object' },
					{ id: 41, key: 'Z1K1', parent: 40, value: 'Z9' },
					{ id: 42, key: 'Z9K1', parent: 40, value: 'Z1' }
				] );
				const rowId = 1;
				const key = 'errors';
				const expected = undefined;
				const result = zobjectModule.getters.getMapValueByKey( state, getters )( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns undefined when key not found', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z22K2', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'object' },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'object' },
					{ id: 4, key: 'Z1K1', parent: 3, value: 'Z9' },
					{ id: 5, key: 'Z9K1', parent: 3, value: 'Z7' },
					{ id: 6, key: 'Z7K1', parent: 2, value: 'object' },
					{ id: 7, key: 'Z1K1', parent: 6, value: 'Z9' },
					{ id: 8, key: 'Z9K1', parent: 6, value: 'Z883' },
					{ id: 9, key: 'Z883K1', parent: 2, value: 'object' },
					{ id: 10, key: 'Z1K1', parent: 9, value: 'Z9' },
					{ id: 11, key: 'Z9K1', parent: 9, value: 'Z6' },
					{ id: 12, key: 'Z883K2', parent: 2, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z1' },
					{ id: 15, key: 'K1', parent: 1, value: 'array' },
					{ id: 16, key: '0', parent: 15, value: 'object' },
					{ id: 17, key: 'Z1K1', parent: 16, value: 'object' },
					{ id: 18, key: 'Z1K1', parent: 17, value: 'Z9' },
					{ id: 19, key: 'Z9K1', parent: 17, value: 'Z7' },
					{ id: 20, key: 'Z7K1', parent: 16, value: 'object' },
					{ id: 21, key: 'Z1K1', parent: 20, value: 'Z9' },
					{ id: 22, key: 'Z9K1', parent: 20, value: 'Z882' },
					{ id: 23, key: 'Z882K1', parent: 16, value: 'object' },
					{ id: 24, key: 'Z1K1', parent: 23, value: 'Z9' },
					{ id: 25, key: 'Z9K1', parent: 23, value: 'Z6' },
					{ id: 26, key: 'Z882K2', parent: 16, value: 'object' },
					{ id: 27, key: 'Z1K1', parent: 26, value: 'Z9' },
					{ id: 28, key: 'Z9K1', parent: 26, value: 'Z1' },
					{ id: 29, key: '1', parent: 15, value: 'object' },
					{ id: 30, key: 'Z1K1', parent: 29, value: 'object' },
					{ id: 31, key: 'Z1K1', parent: 30, value: 'object' },
					{ id: 32, key: 'Z1K1', parent: 31, value: 'Z9' },
					{ id: 33, key: 'Z9K1', parent: 31, value: 'Z7' },
					{ id: 34, key: 'Z7K1', parent: 30, value: 'object' },
					{ id: 35, key: 'Z1K1', parent: 34, value: 'Z9' },
					{ id: 36, key: 'Z9K1', parent: 34, value: 'Z882' },
					{ id: 37, key: 'Z883K1', parent: 30, value: 'object' },
					{ id: 38, key: 'Z1K1', parent: 37, value: 'Z9' },
					{ id: 39, key: 'Z9K1', parent: 37, value: 'Z6' },
					{ id: 40, key: 'Z883K2', parent: 30, value: 'object' },
					{ id: 41, key: 'Z1K1', parent: 40, value: 'Z9' },
					{ id: 42, key: 'Z9K1', parent: 40, value: 'Z1' },
					{ id: 43, key: 'K1', parent: 29, value: 'object' },
					{ id: 44, key: 'Z1K1', parent: 43, value: 'Z6' },
					{ id: 45, key: 'Z6K1', parent: 43, value: 'errors' },
					{ id: 46, key: 'K2', parent: 29, value: 'object' },
					{ id: 47, key: 'Z1K1', parent: 46, value: 'Z6' },
					{ id: 48, key: 'Z6K1', parent: 46, value: 'some error' }
				] );
				const rowId = 1;
				const key = 'xenarthans';
				const expected = undefined;
				const result = zobjectModule.getters.getMapValueByKey( state, getters )( rowId, key );
				expect( result ).toEqual( expected );
			} );

			it( 'returns value given a map key', function () {
				state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z22K2', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'object' },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'object' },
					{ id: 4, key: 'Z1K1', parent: 3, value: 'Z9' },
					{ id: 5, key: 'Z9K1', parent: 3, value: 'Z7' },
					{ id: 6, key: 'Z7K1', parent: 2, value: 'object' },
					{ id: 7, key: 'Z1K1', parent: 6, value: 'Z9' },
					{ id: 8, key: 'Z9K1', parent: 6, value: 'Z883' },
					{ id: 9, key: 'Z883K1', parent: 2, value: 'object' },
					{ id: 10, key: 'Z1K1', parent: 9, value: 'Z9' },
					{ id: 11, key: 'Z9K1', parent: 9, value: 'Z6' },
					{ id: 12, key: 'Z883K2', parent: 2, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z1' },
					{ id: 15, key: 'K1', parent: 1, value: 'array' },
					{ id: 16, key: '0', parent: 15, value: 'object' },
					{ id: 17, key: 'Z1K1', parent: 16, value: 'object' },
					{ id: 18, key: 'Z1K1', parent: 17, value: 'Z9' },
					{ id: 19, key: 'Z9K1', parent: 17, value: 'Z7' },
					{ id: 20, key: 'Z7K1', parent: 16, value: 'object' },
					{ id: 21, key: 'Z1K1', parent: 20, value: 'Z9' },
					{ id: 22, key: 'Z9K1', parent: 20, value: 'Z882' },
					{ id: 23, key: 'Z882K1', parent: 16, value: 'object' },
					{ id: 24, key: 'Z1K1', parent: 23, value: 'Z9' },
					{ id: 25, key: 'Z9K1', parent: 23, value: 'Z6' },
					{ id: 26, key: 'Z882K2', parent: 16, value: 'object' },
					{ id: 27, key: 'Z1K1', parent: 26, value: 'Z9' },
					{ id: 28, key: 'Z9K1', parent: 26, value: 'Z1' },
					{ id: 29, key: '1', parent: 15, value: 'object' },
					{ id: 30, key: 'Z1K1', parent: 29, value: 'object' },
					{ id: 31, key: 'Z1K1', parent: 30, value: 'object' },
					{ id: 32, key: 'Z1K1', parent: 31, value: 'Z9' },
					{ id: 33, key: 'Z9K1', parent: 31, value: 'Z7' },
					{ id: 34, key: 'Z7K1', parent: 30, value: 'object' },
					{ id: 35, key: 'Z1K1', parent: 34, value: 'Z9' },
					{ id: 36, key: 'Z9K1', parent: 34, value: 'Z882' },
					{ id: 37, key: 'Z883K1', parent: 30, value: 'object' },
					{ id: 38, key: 'Z1K1', parent: 37, value: 'Z9' },
					{ id: 39, key: 'Z9K1', parent: 37, value: 'Z6' },
					{ id: 40, key: 'Z883K2', parent: 30, value: 'object' },
					{ id: 41, key: 'Z1K1', parent: 40, value: 'Z9' },
					{ id: 42, key: 'Z9K1', parent: 40, value: 'Z1' },
					{ id: 43, key: 'K1', parent: 29, value: 'object' },
					{ id: 44, key: 'Z1K1', parent: 43, value: 'Z6' },
					{ id: 45, key: 'Z6K1', parent: 43, value: 'errors' },
					{ id: 46, key: 'K2', parent: 29, value: 'object' },
					{ id: 47, key: 'Z1K1', parent: 46, value: 'Z6' },
					{ id: 48, key: 'Z6K1', parent: 46, value: 'some error' }
				] );
				const rowId = 1;
				const key = 'errors';
				const expected = { id: 46, key: 'K2', parent: 29, value: 'object' };
				const result = zobjectModule.getters.getMapValueByKey( state, getters )( rowId, key );
				expect( result ).toEqual( expected );
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
				expect( state.createNewPage ).toBe( false );

				zobjectModule.mutations.setCreateNewPage( state, true );

				expect( state.createNewPage ).toBe( true );
			} );
		} );
	} );

	describe( 'Actions', function () {
		describe( 'initializeView', function () {
			it( 'calls initializeCreateNewPage when creating new page', function () {
				mw.config = {
					get: jest.fn( function () {
						return {
							createNewPage: true,
							runFunction: false,
							zId: null
						};
					} )
				};
				zobjectModule.actions.initializeView( context );
				expect( context.dispatch ).toHaveBeenCalledWith( 'initializeCreateNewPage' );
			} );

			it( 'calls initializeEvaluateFunction when opening the function evaluator', function () {
				mw.config = {
					get: jest.fn( function () {
						return {
							createNewPage: false,
							runFunction: true,
							zId: null
						};
					} )
				};
				zobjectModule.actions.initializeView( context );
				expect( context.dispatch ).toHaveBeenCalledWith( 'initializeEvaluateFunction' );
			} );

			it( 'calls initializeEvaluateFunction when no info available', function () {
				mw.config = {
					get: jest.fn( function () {
						return {
							createNewPage: false,
							runFunction: false,
							zId: null
						};
					} )
				};
				zobjectModule.actions.initializeView( context );
				expect( context.dispatch ).toHaveBeenCalledWith( 'initializeEvaluateFunction' );
			} );

			it( 'calls initializeRootZObject when viewing or editing an object', function () {
				mw.config = {
					get: jest.fn( function () {
						return {
							createNewPage: false,
							runFunction: false,
							zId: 'Z10000'
						};
					} )
				};
				zobjectModule.actions.initializeView( context );
				expect( context.dispatch ).toHaveBeenCalledWith( 'initializeRootZObject', 'Z10000' );
			} );

			it( 'Initialize ZObject, create new page', function () {
				mw.Uri.mockImplementationOnce( () => {
					return {
						query: {
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						}
					};
				} );
				context.state = {
					zobject: tableDataToRowObjects( zobjectTree )
				};
				context.getters = {
					getStoredObject: () => {
						return { Z2K2: { Z1K1: 'Z4' } };
					}
				};

				const expectedChangeTypePayload = { id: 0, type: Constants.Z_PERSISTENTOBJECT };
				const expectedRootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.commit ).toHaveBeenCalledTimes( 4 );
				expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setCreateNewPage', true );
				expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z0' );
				expect( context.commit ).toHaveBeenCalledWith( 'pushRow', expectedRootObject );
				expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', expectedChangeTypePayload );
				expect( context.commit ).toHaveBeenCalledWith( 'setZObjectInitialized', true );
			} );

			it( 'Initialize ZObject, create new page, initial value for Z2K2', function () {
				mw.Uri.mockImplementationOnce( () => {
					return {
						query: {
							zid: Constants.Z_BOOLEAN,
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						}
					};
				} );
				context.state = {
					zobject: tableDataToRowObjects( zobjectTree )
				};
				context.getters = {
					getStoredObject: function () {
						return { Z2K2: { Z1K1: 'Z4' } };
					}
				};

				const expectedChangeTypePayload = { id: 0, type: Constants.Z_PERSISTENTOBJECT };
				const expectedRootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };
				const expectedZ2K2ChangeTypePayload = { id: 3, type: Constants.Z_BOOLEAN };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.commit ).toHaveBeenCalledTimes( 4 );
				expect( context.dispatch ).toHaveBeenCalledTimes( 3 );
				expect( context.commit ).toHaveBeenCalledWith( 'setCreateNewPage', true );
				expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z0' );
				expect( context.commit ).toHaveBeenCalledWith( 'pushRow', expectedRootObject );
				expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', expectedChangeTypePayload );
				expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
				expect( context.commit ).toHaveBeenCalledWith( 'setZObjectInitialized', true );
			} );

			it( 'Initialize ZObject, create new page, non-ZID value as initial', function () {
				mw.Uri.mockImplementationOnce( () => {
					return {
						query: {
							zid: 'banana',
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						}
					};
				} );
				context.state = {
					zobject: tableDataToRowObjects( zobjectTree )
				};
				context.getters = {
					getStoredObject: () => undefined
				};

				const expectedZ2K2ChangeTypePayload = { id: 3, type: 'banana' };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
				expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
			} );

			it( 'Initialize ZObject, create new page, non-type value as initial', function () {
				mw.Uri.mockImplementationOnce( () => {
					return {
						query: {
							zid: 'Z801',
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						}
					};
				} );
				context.state = {
					zobject: tableDataToRowObjects( zobjectTree )
				};
				context.getters = {
					getStoredObject: function () {
						return { Z2K2: { Z1K1: 'Z8' } };
					}
				};

				const expectedZ2K2ChangeTypePayload = { id: 3, type: 'Z801' };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.dispatch ).toHaveBeenCalledTimes( 2 );
				expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
			} );

			it( 'Initialize ZObject, create new page, lowercase ZID', function () {
				mw.Uri.mockImplementationOnce( () => {
					return {
						query: {
							zid: 'z8',
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						}
					};
				} );
				context.state = {
					zobject: tableDataToRowObjects( zobjectTree )
				};
				context.getters = {
					getStoredObject: function () {
						return { Z2K2: { Z1K1: 'Z8' } };
					}
				};

				const expectedZ2K2ChangeTypePayload = { id: 3, type: Constants.Z_FUNCTION };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
			} );

			it( 'Initialize ZObject, create new page, ZObject key passed as initial', function () {
				mw.Uri.mockImplementationOnce( () => {
					return {
						query: {
							zid: 'Z14K1',
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						}
					};
				} );
				context.state = {
					zobject: tableDataToRowObjects( zobjectTree )
				};

				const expectedZ2K2ChangeTypePayload = { id: 3, type: 'Z14K1' };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
			} );

			it( 'Initialize ZObject, create new page, quasi-valid ZID', function () {
				mw.Uri.mockImplementationOnce( () => {
					return {
						query: {
							zid: 'Z8s',
							action: Constants.ACTIONS.EDIT,
							title: 'Z0'
						}
					};
				} );
				context.state = {
					zobject: tableDataToRowObjects( zobjectTree )
				};

				const expectedZ2K2ChangeTypePayload = { id: 3, type: 'Z8s' };

				zobjectModule.actions.initializeCreateNewPage( context );

				expect( context.dispatch ).not.toHaveBeenCalledWith( 'changeType', expectedZ2K2ChangeTypePayload );
			} );

			it( 'initialize ZObject for an old revision', () => {
				getMock = jest.fn( function () {
					return {
						then: () => {},
						catch: () => {}
					};
				} );
				mw.Api = jest.fn( function () {
					return { get: getMock };
				} );
				mw.Uri.mockImplementationOnce( () => {
					return {
						query: {
							title: 'Z10001',
							oldid: '10002'
						}
					};
				} );

				const expectedPayload = {
					action: 'query',
					list: 'wikilambdaload_zobjects',
					format: 'json',
					wikilambdaload_zids: 'Z10001',
					wikilambdaload_revisions: '10002'
				};

				zobjectModule.actions.initializeRootZObject( context, 'Z10001' );

				expect( getMock ).toHaveBeenCalledWith( expectedPayload );
			} );

			it( 'initialize ZObject without revision', () => {
				getMock = jest.fn( function () {
					return {
						then: () => {},
						catch: () => {}
					};
				} );
				mw.Api = jest.fn( function () {
					return { get: getMock };
				} );
				mw.Uri.mockImplementationOnce( () => {
					return {
						query: {
							title: 'Z10001'
						}
					};
				} );

				const expectedPayload = {
					action: 'query',
					list: 'wikilambdaload_zobjects',
					format: 'json',
					wikilambdaload_zids: 'Z10001',
					wikilambdaload_revisions: undefined
				};

				zobjectModule.actions.initializeRootZObject( context, 'Z10001' );

				expect( getMock ).toHaveBeenCalledWith( expectedPayload );
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
					}
				};

				const expectedZObjectJson = {
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
				const expectedFetchZidsPayload = {
					zids: [ 'Z1', 'Z2', 'Z1234', 'Z12', 'Z11', 'Z1002', 'Z32', 'Z31' ]
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
					{ id: 36, key: 'Z2K5', value: 'object', parent: 0 },
					{ id: 37, key: 'Z1K1', value: 'object', parent: 36 },
					{ id: 38, key: 'Z1K1', value: 'Z9', parent: 37 },
					{ id: 39, key: 'Z9K1', value: 'Z12', parent: 37 },
					{ id: 40, key: 'Z12K1', value: 'array', parent: 36 },
					{ id: 41, key: '0', value: 'object', parent: 40 },
					{ id: 42, key: 'Z1K1', value: 'Z9', parent: 41 },
					{ id: 43, key: 'Z9K1', value: 'Z11', parent: 41 }
				];

				zobjectModule.actions.initializeRootZObject( context, 'Z1234' );

				expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledTimes( 4 );
				expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z1234' );
				expect( context.commit ).toHaveBeenCalledWith( 'saveMultilingualDataCopy', expectedZObjectJson );
				expect( context.commit ).toHaveBeenCalledWith( 'setZObject', expectedSetZObjectPayload );
				expect( context.commit ).toHaveBeenCalledWith( 'setZObjectInitialized', true );
				expect( context.dispatch ).toHaveBeenCalledWith( 'fetchZids', expectedFetchZidsPayload );
			} );

			it( 'Initialize evaluate function call page', function () {
				var expectedChangeTypePayload = { id: 0, type: Constants.Z_FUNCTION_CALL },
					expectedRootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };
				context.state = {
					zobject: tableDataToRowObjects( zobjectTree )
				};
				context.getters.getStoredObject = function () {
					return { Z1K1: 'test', Z2K1: 'test' };
				};
				zobjectModule.actions.initializeEvaluateFunction( context );

				expect( context.commit ).toHaveBeenCalledTimes( 3 );
				expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
				expect( context.commit ).toHaveBeenCalledWith( 'setCurrentZid', 'Z0' );
				expect( context.commit ).toHaveBeenCalledWith( 'pushRow', expectedRootObject );
				expect( context.dispatch ).toHaveBeenCalledWith( 'changeType', expectedChangeTypePayload );
				expect( context.commit ).toHaveBeenCalledWith( 'setZObjectInitialized', true );
			} );
		} );

		describe( 'recalculateTypedListKeys', () => {
			// In the event that a ZList item is removed, the indeces of the remaining items need to be updated.
			// This is to prevent a null value from appearing in the generated JSON array.
			it( 'does not change a correct indexed list', () => {
				const initialList = [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z2K2', parent: 0, value: 'array' },
					{ id: 2, key: '0', parent: 1, value: 'object' },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'Z9' },
					{ id: 4, key: 'Z9K1', parent: 2, value: 'Z6' },
					{ id: 5, key: '1', parent: 1, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z6' },
					{ id: 7, key: 'Z6K1', parent: 5, value: 'one' },
					{ id: 8, key: '2', parent: 1, value: 'object' },
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
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z2K2', parent: 0, value: 'array' },
					{ id: 2, key: '0', parent: 1, value: 'object' },
					{ id: 3, key: 'Z1K1', parent: 2, value: 'Z9' },
					{ id: 4, key: 'Z9K1', parent: 2, value: 'Z6' },
					{ id: 5, key: '3', parent: 1, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z6' },
					{ id: 7, key: 'Z6K1', parent: 5, value: 'one' },
					{ id: 8, key: '7', parent: 1, value: 'object' },
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

		describe( 'recalculateArgumentKeys', () => {
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

				context.state = { zobject: zobjectToRows( argList ) };
				context.getters.getCurrentZObjectId = 'Z999';
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId(
					context.state );
				context.commit = jest.fn( ( mutationType, payload ) => {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				} );

				// Recalculate keys
				zobjectModule.actions.recalculateArgumentKeys( context, 1 );

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

				context.state = { zobject: zobjectToRows( argList ) };
				context.getters.getCurrentZObjectId = 'Z999';
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId(
					context.state );
				context.commit = jest.fn( ( mutationType, payload ) => {
					zobjectModule.mutations[ mutationType ]( context.state, payload );
				} );

				// Recalculate keys
				zobjectModule.actions.recalculateArgumentKeys( context, 1 );

				expect( context.getters.getRowById( 14 ).value ).toEqual( 'Z999K1' );
				expect( context.getters.getRowById( 32 ).value ).toEqual( 'Z999K2' );
			} );
		} );

		describe( 'changeType', function () {
			beforeEach( function () {
				// State
				context.state = {
					zobject: tableDataToRowObjects( [ { id: 0, value: Constants.ROW_VALUE_OBJECT } ] ),
					objects: mockApiZids,
					errors: {}
				};
				context.rootState = {
					zobjectModule: context.state
				};
				context.getters.getCurrentZObjectId = 'Z0';
				context.getters.getUserLangZid = 'Z1003';
				context.getters.getStoredObject = ( zid ) => context.state.objects[ zid ];
				// Getters
				Object.keys( zobjectModule.getters ).forEach( ( key ) => {
					context.getters[ key ] =
						zobjectModule.getters[ key ](
							context.state, context.getters,
							{ zobjectModule: context.state },
							context.getters );
				} );
				Object.keys( zobjectModule.modules.addZObjects.getters ).forEach( ( key ) => {
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
					// run zobject and addZObject module actions
					if ( actionType in zobjectModule.actions ) {
						zobjectModule.actions[ actionType ]( context, payload );
					} else if ( actionType in zobjectModule.modules.addZObjects.actions ) {
						zobjectModule.modules.addZObjects.actions[ actionType ]( context.state, payload );
					}
					// return then
					return {
						then: ( fn ) => fn()
					};
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
							Z11K1: { Z1K1: 'Z9', Z9K1: '' },
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
						Z2K2: {
							Z1K1: { Z1K1: 'Z9', Z9K1: '' }
						},
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
						},
						Z2K5: {
							Z1K1: { Z1K1: 'Z9', Z9K1: 'Z12' },
							Z12K1: [
								{ Z1K1: 'Z9', Z9K1: 'Z11' }
							]
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
						Z11K1: { Z1K1: 'Z9', Z9K1: '' },
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

			describe( 'add ZMonolingualStringSet', function () {
				it( 'adds a valid ZMonolingualStringSet with empty values', function () {
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

				it( 'adds a valid ZMonolingualStringSet with initial value', function () {
					const payload = { id: 0, type: Constants.Z_MONOLINGUALSTRINGSET, lang: 'Z1004', value: [ 'test alias' ] };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z31' },
						Z31K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
						Z31K2: [ { Z1K1: 'Z9', Z9K1: 'Z6' }, { Z1K1: 'Z6', Z6K1: 'test alias' } ]
					} );
				} );

				it( 'adds a valid ZMonolingualStringSet with two initial values', function () {
					const payload = { id: 0, type: Constants.Z_MONOLINGUALSTRINGSET, lang: 'Z1004', value: [ 'one', 'two' ] };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z1K1: { Z1K1: 'Z9', Z9K1: 'Z31' },
						Z31K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
						Z31K2: [
							{ Z1K1: 'Z9', Z9K1: 'Z6' },
							{ Z1K1: 'Z6', Z6K1: 'one' },
							{ Z1K1: 'Z6', Z6K1: 'two' }
						]
					} );
				} );

				it( 'appends a valid ZMonolingualStringSet to a ZMultilingualStringSet', function () {
					context.state.zobject = tableDataToRowObjects( [
						{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
						{ id: 1, key: 'Z32K1', value: Constants.ROW_VALUE_ARRAY, parent: 0 },
						{ id: 2, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 1 },
						{ id: 3, key: 'Z1K1', value: 'Z9', parent: 2 },
						{ id: 4, key: 'Z9K1', value: 'Z31', parent: 2 }
					] );
					context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
					const payload = { id: 1, type: Constants.Z_MONOLINGUALSTRINGSET, lang: 'Z1004', value: [ 'test alias' ], append: true };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( {
						Z32K1: [
							{ Z1K1: 'Z9', Z9K1: 'Z31' },
							{
								Z1K1: { Z1K1: 'Z9', Z9K1: 'Z31' },
								Z31K1: { Z1K1: 'Z9', Z9K1: 'Z1004' },
								Z31K2: [ { Z1K1: 'Z9', Z9K1: 'Z6' }, { Z1K1: 'Z6', Z6K1: 'test alias' } ]
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
				beforeEach( () => {
				} );

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
					mw.Uri.mockImplementationOnce( () => {
						return {
							query: {
								zid: Constants.Z_IMPLEMENTATION,
								Z14K1: 'Z10001'
							}
						};
					} );
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
						Z4K3: { Z1K1: 'Z9', Z9K1: 'Z101' },
						Z4K4: { Z1K1: 'Z9', Z9K1: '' },
						Z4K5: { Z1K1: 'Z9', Z9K1: '' },
						Z4K6: { Z1K1: 'Z9', Z9K1: '' },
						Z4K7: [ { Z1K1: 'Z9', Z9K1: 'Z46' } ],
						Z4K8: [ { Z1K1: 'Z9', Z9K1: 'Z64' } ]
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
								Z4K3: { Z1K1: 'Z9', Z9K1: 'Z101' },
								Z4K4: { Z1K1: 'Z9', Z9K1: '' },
								Z4K5: { Z1K1: 'Z9', Z9K1: '' },
								Z4K6: { Z1K1: 'Z9', Z9K1: '' },
								Z4K7: [ { Z1K1: 'Z9', Z9K1: 'Z46' } ],
								Z4K8: [ { Z1K1: 'Z9', Z9K1: 'Z64' } ]
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
							[ { Z1K1: 'Z9', Z9K1: 'Z6' } ]
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

			describe( 'add object of generic type', function () {
				it( 'adds a valid typed list', function () {
					const payload = { id: 0, type: { Z1K1: 'Z7', Z7K1: 'Z881', Z881K1: 'Z6' } };
					zobjectModule.modules.addZObjects.actions.changeType( context, payload );
					expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					) ).toEqual( [
						{ Z1K1: 'Z9', Z9K1: 'Z6' }
					] );
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

				it( 'adds a valid ZTypedPair with empty values', function () {
					const payload = { id: 0, type: { Z1K1: 'Z7', Z7K1: 'Z882', Z882K1: 'Z6', Z882K2: 'Z6' } };
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
							Z882K2: { Z1K1: 'Z9', Z9K1: 'Z6' }
						}
					} );
				} );

				it( 'adds a valid ZTypedMap with empty values', function () {
					const payload = { id: 0, type: { Z1K1: 'Z7', Z7K1: 'Z883', Z883K1: 'Z6', Z883K2: 'Z6' } };
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
							Z883K2: { Z1K1: 'Z9', Z9K1: 'Z6' }
						}
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

		describe( 'clearType', () => {
			beforeEach( () => {
				context.dispatch = jest.fn();
			} );

			it( 'clears all children except Z1K1', () => {
				context.getters.getChildrenByParentRowId = () => [
					{ id: 1, key: 'Z1K1' },
					{ id: 2, key: 'Z11K1' },
					{ id: 3, key: 'Z11K2' }
				];
				zobjectModule.modules.addZObjects.actions.clearType( context, 0 );
				expect( context.dispatch ).toHaveBeenCalledTimes( 4 );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObjectChildren', 2 );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObjectChildren', 3 );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObject', 2 );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObject', 3 );
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
					] ) ),
					errors: {}
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
					// run zobject and addZObject module actions
					var result;
					if ( actionType in zobjectModule.actions ) {
						result = zobjectModule.actions[ actionType ]( context, payload );
					} else if ( actionType in zobjectModule.modules.addZObjects.actions ) {
						result = zobjectModule.modules.addZObjects.actions[ actionType ]( context.state, payload );
					}
					// return then and catch
					return {
						then: ( fn ) => fn( result ),
						catch: () => 'error'
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

		describe( 'injectZObjectFromRowId', function () {
			beforeEach( function () {
				context.state = {
					zobject: tableDataToRowObjects( zobjectTree ),
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

		describe( 'setZFunctionCallArguments', function () {
			beforeEach( function () {
				context.state = {
					objects: mockApiZids,
					zobject: tableDataToRowObjects( [
						{ id: 0, value: Constants.ROW_VALUE_OBJECT },
						{ id: 1, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 2, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 1 },
						{ id: 3, key: 'Z9K1', value: Constants.Z_FUNCTION_CALL, parent: 1 },
						{ id: 4, key: 'Z7K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
						{ id: 5, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 4 },
						// Function Zid:
						{ id: 6, key: 'Z9K1', value: Constants.Z_TYPED_PAIR, parent: 4 },
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
					] ),
					errors: {}
				};
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
				context.getters.getZObjectChildrenById = zobjectModule.getters.getZObjectChildrenById( context.state );
				context.getters.getZFunctionCallArguments = zobjectModule.getters.getZFunctionCallArguments( context.state, context.getters );
				// Getters: library module
				context.getters.getInputsOfFunctionZid = libraryModule.getters.getInputsOfFunctionZid( context.state );
				context.getters.getStoredObject = libraryModule.getters.getStoredObject( context.state );
				// Getters: addZObject module
				Object.keys( zobjectModule.modules.addZObjects.getters ).forEach( function ( key ) {
					context.getters[ key ] =
						zobjectModule.modules.addZObjects.getters[ key ](
							context.state,
							context.getters,
							{ zobjectModule: context.state },
							context.getters );
				} );
				// Mutations
				context.commit = jest.fn( function ( mutationType, payload ) {
					if ( mutationType in zobjectModule.mutations ) {
						zobjectModule.mutations[ mutationType ]( context.state, payload );
					} else if ( mutationType in errorModule.mutations ) {
						errorModule.mutations[ mutationType ]( context.state, payload );
					}
				} );
				// Actions
				context.dispatch = jest.fn( function ( actionType, payload ) {
					if ( actionType in zobjectModule.actions ) {
						zobjectModule.actions[ actionType ]( context, payload );
					}
					return {
						then: ( fn ) => fn()
					};
				} );
			} );

			it( 'unsets the available args and sets none if functionId is null or undefined', function () {
				const expected = [
					{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
					{ id: 1, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 2, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 1 },
					{ id: 3, key: 'Z9K1', value: Constants.Z_FUNCTION_CALL, parent: 1 },
					{ id: 4, key: 'Z7K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 5, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 4 },
					// Function Zid:
					{ id: 6, key: 'Z9K1', value: Constants.Z_TYPED_PAIR, parent: 4 }
				];
				zobjectModule.actions.setZFunctionCallArguments( context, {
					parentId: 0,
					functionZid: null
				} );
				expect( context.state.zobject ).toEqual( expected );
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
					{ id: 6, key: 'Z9K1', value: Constants.Z_TYPED_PAIR, parent: 4 },
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
				const expected = [
					{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
					{ id: 1, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 2, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 1 },
					{ id: 3, key: 'Z9K1', value: Constants.Z_FUNCTION_CALL, parent: 1 },
					{ id: 4, key: 'Z7K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 5, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 4 },
					// Function Zid:
					{ id: 6, key: 'Z9K1', value: Constants.Z_TYPED_PAIR, parent: 4 },
					// New arguments:
					{ id: 17, key: 'Z802K1', parent: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 18, key: 'Z1K1', parent: 17, value: Constants.ROW_VALUE_OBJECT },
					{ id: 19, key: 'Z1K1', parent: 18, value: Constants.Z_REFERENCE },
					{ id: 20, key: 'Z9K1', parent: 18, value: Constants.Z_BOOLEAN },
					{ id: 21, key: 'Z40K1', parent: 17, value: Constants.ROW_VALUE_OBJECT },
					{ id: 22, key: 'Z1K1', parent: 21, value: Constants.Z_REFERENCE },
					{ id: 23, key: 'Z9K1', parent: 21, value: '' },
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
					functionZid: 'Z802'
				} );
				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'makes no changes when the new function Id is the same as the old', function () {
				const expected = [
					{ id: 0, key: undefined, value: Constants.ROW_VALUE_OBJECT, parent: undefined },
					{ id: 1, key: 'Z1K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 2, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 1 },
					{ id: 3, key: 'Z9K1', value: Constants.Z_FUNCTION_CALL, parent: 1 },
					{ id: 4, key: 'Z7K1', value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 5, key: 'Z1K1', value: Constants.Z_REFERENCE, parent: 4 },
					// Function Zid:
					{ id: 6, key: 'Z9K1', value: Constants.Z_TYPED_PAIR, parent: 4 },
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
				];
				zobjectModule.actions.setZFunctionCallArguments( context, {
					parentId: 0,
					functionZid: Constants.Z_TYPED_PAIR
				} );
				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'sets only the second argument when its parent is a tester result validation call', function () {
				context.state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z20' },
					{ id: 4, key: 'Z20K3', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z7' },
					{ id: 8, key: 'Z7K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z882' }
				] );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
				const functionZid = 'Z882';
				const expected = [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z20' },
					{ id: 4, key: 'Z20K3', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z7' },
					{ id: 8, key: 'Z7K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z882' },
					// Only second argument:
					{ id: 11, key: 'Z882K2', parent: 4, value: 'object' },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'Z9' },
					{ id: 13, key: 'Z9K1', parent: 11, value: '' }
				];
				zobjectModule.actions.setZFunctionCallArguments( context, {
					parentId: 4,
					functionZid
				} );
				expect( context.state.zobject ).toEqual( expected );
			} );
		} );

		describe( 'setZImplementationContentType', function () {
			beforeEach( function () {
				context.state = { zobject: [], objects: [], errors: {} };
				// Getters
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
				context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
				context.getters.getZObjectChildrenById = zobjectModule.getters.getZObjectChildrenById( context.state );
				// Getters: library module
				context.getters.getStoredObject = libraryModule.getters.getStoredObject( context.state );
				// Getters: addZObject module
				Object.keys( zobjectModule.modules.addZObjects.getters ).forEach( function ( key ) {
					context.getters[ key ] =
						zobjectModule.modules.addZObjects.getters[ key ](
							context.state,
							context.getters,
							{ zobjectModule: context.state },
							context.getters );
				} );
				// Mutations
				context.commit = jest.fn( function ( mutationType, payload ) {
					if ( mutationType in zobjectModule.mutations ) {
						zobjectModule.mutations[ mutationType ]( context.state, payload );
					} else if ( mutationType in errorModule.mutations ) {
						errorModule.mutations[ mutationType ]( context.state, payload );
					}
				} );
				// Actions
				context.dispatch = jest.fn( function ( actionType, payload ) {
					zobjectModule.actions[ actionType ]( context, payload );
					return {
						then: function ( fn ) {
							return fn();
						}
					};
				} );
			} );

			it( 'unsets composition (Z14K2) and sets code (Z14K3)', function () {
				context.state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 11, key: 'Z14K2', parent: 4, value: 'object' },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z7' },
					{ id: 15, key: 'Z7K1', parent: 11, value: 'object' },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'Z9' },
					{ id: 17, key: 'Z9K1', parent: 15, value: 'Z10002' },
					{ id: 18, key: 'Z10002K1', parent: 11, value: 'object' },
					{ id: 19, key: 'Z1K1', parent: 18, value: 'Z6' },
					{ id: 20, key: 'Z6K1', parent: 18, value: 'uno' },
					{ id: 21, key: 'Z10002K2', parent: 11, value: 'object' },
					{ id: 22, key: 'Z1K1', parent: 21, value: 'Z6' },
					{ id: 23, key: 'Z6K1', parent: 21, value: 'dos' }
				] );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
				const expected = [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 24, key: 'Z14K3', parent: 4, value: 'object' },
					{ id: 25, key: 'Z1K1', parent: 24, value: 'object' },
					{ id: 26, key: 'Z1K1', parent: 25, value: 'Z9' },
					{ id: 27, key: 'Z9K1', parent: 25, value: 'Z16' },
					{ id: 28, key: 'Z16K1', parent: 24, value: 'object' },
					{ id: 29, key: 'Z1K1', parent: 28, value: 'object' },
					{ id: 30, key: 'Z1K1', parent: 29, value: 'Z9' },
					{ id: 31, key: 'Z9K1', parent: 29, value: 'Z61' },
					{ id: 32, key: 'Z61K1', parent: 28, value: 'object' },
					{ id: 33, key: 'Z1K1', parent: 32, value: 'Z6' },
					{ id: 34, key: 'Z6K1', parent: 32, value: '' },
					{ id: 35, key: 'Z16K2', parent: 24, value: 'object' },
					{ id: 36, key: 'Z1K1', parent: 35, value: 'Z6' },
					{ id: 37, key: 'Z6K1', parent: 35, value: '' }
				];
				zobjectModule.actions.setZImplementationContentType( context, {
					parentId: 4,
					key: 'Z14K3'
				} );
				expect( context.state.zobject ).toEqual( expected );
			} );

			it( 'unsets code (Z14K3) and sets composition (Z14K2)', function () {
				context.state.zobject = tableDataToRowObjects( [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 11, key: 'Z14K3', parent: 4, value: 'object' },
					{ id: 12, key: 'Z1K1', parent: 11, value: 'object' },
					{ id: 13, key: 'Z1K1', parent: 12, value: 'Z9' },
					{ id: 14, key: 'Z9K1', parent: 12, value: 'Z16' }
				] );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state );
				const expected = [
					{ id: 0, key: undefined, parent: undefined, value: 'object' },
					{ id: 1, key: 'Z1K1', parent: 0, value: 'object' },
					{ id: 2, key: 'Z1K1', parent: 1, value: 'Z9' },
					{ id: 3, key: 'Z9K1', parent: 1, value: 'Z2' },
					{ id: 4, key: 'Z2K2', parent: 0, value: 'object' },
					{ id: 5, key: 'Z1K1', parent: 4, value: 'object' },
					{ id: 6, key: 'Z1K1', parent: 5, value: 'Z9' },
					{ id: 7, key: 'Z9K1', parent: 5, value: 'Z14' },
					{ id: 8, key: 'Z14K1', parent: 4, value: 'object' },
					{ id: 9, key: 'Z1K1', parent: 8, value: 'Z9' },
					{ id: 10, key: 'Z9K1', parent: 8, value: 'Z10001' },
					{ id: 15, key: 'Z14K2', parent: 4, value: 'object' },
					{ id: 16, key: 'Z1K1', parent: 15, value: 'object' },
					{ id: 17, key: 'Z1K1', parent: 16, value: 'Z9' },
					{ id: 18, key: 'Z9K1', parent: 16, value: 'Z7' },
					{ id: 19, key: 'Z7K1', parent: 15, value: 'object' },
					{ id: 20, key: 'Z1K1', parent: 19, value: 'Z9' },
					{ id: 21, key: 'Z9K1', parent: 19, value: '' }
				];
				zobjectModule.actions.setZImplementationContentType( context, {
					parentId: 4,
					key: 'Z14K2'
				} );
				expect( context.state.zobject ).toEqual( expected );
			} );
		} );

		describe( 'setValueByRowIdAndPath', function () {
			beforeEach( function () {
				context.state = { };

				context.state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 2, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 1 },
					{ id: 3, key: Constants.Z_REFERENCE_ID, value: Constants.Z_PERSISTENTOBJECT, parent: 1 },
					{ id: 4, key: Constants.Z_PERSISTENTOBJECT_VALUE, value: Constants.ROW_VALUE_ARRAY, parent: 0 },
					{ id: 5, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 4 },
					{ id: 6, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 5 },
					{ id: 7, key: Constants.Z_REFERENCE_ID, value: Constants.Z_STRING, parent: 5 },
					{ id: 8, key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 4 },
					{ id: 9, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 8 },
					{ id: 10, key: Constants.Z_STRING_VALUE, value: 'Foo', parent: 8 }
				] );

				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
				context.getters.getRowById = zobjectModule.getters.getRowById( context.state );
				context.getters.getRowByKeyPath = zobjectModule.getters.getRowByKeyPath( context.state, context.getters );
				context.getters.getChildrenByParentRowId = zobjectModule.getters.getChildrenByParentRowId( context.state );
				context.getters.getNextArrayIndex = zobjectModule.getters.getNextArrayIndex( context.state, context.getters );
				context.getters.getNextRowId = zobjectModule.getters.getNextRowId( context.state, context.getters );
				context.dispatch = jest.fn( function ( actionType, payload ) {
					zobjectModule.actions[ actionType ]( context, payload );
					return {
						then: function ( fn ) {
							return fn();
						}
					};
				} );

			} );

			describe( 'when value is a string', function () {
				it( 'should dispatch an action', function () {
					const payload = {
						rowId: 8,
						keyPath: [ Constants.Z_STRING_VALUE ],
						value: 'Test String'
					};

					zobjectModule.actions.setValueByRowIdAndPath( context, payload );

					expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
				} );
				it( 'should dispatch the setValueByRowId action with an object containing rowId and value', function () {
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

			describe( 'when value is an array', function () {

				it( 'should dispatch an action', function () {
					const payload = {
						rowId: 4,
						keyPath: [ '1', Constants.Z_STRING_VALUE ],
						value: [ Constants.Z_STRING ]
					};

					zobjectModule.actions.setValueByRowIdAndPath( context, payload );

					expect( context.dispatch ).toHaveBeenCalled();

				} );
				it( 'should dispatch the injectZObjectFromRowId action with an object containing rowId, value and append as false', function () {
					const expectedStringValue = 'Test String';
					const payload = {
						rowId: 4,
						keyPath: [ '1', Constants.Z_STRING_VALUE ],
						value: [ expectedStringValue ]
					};

					zobjectModule.actions.setValueByRowIdAndPath( context, payload );

					expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', { append: false, rowId: 10, value: [ expectedStringValue ] } );
				} );

				describe( 'when append has been set', function () {
					it( 'should dispatch the injectZObjectFromRowId action with an object containing an append value that matches the set append value', function () {
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

				describe( 'when the row could not be found', function () {
					it( 'should NOT dispatch any actions', function () {
						const payload = {
							rowId: null, // A non-existent row
							keyPath: [ Constants.Z_STRING_VALUE ],
							value: 'Test String'
						};

						zobjectModule.actions.setValueByRowIdAndPath( context, payload );

						expect( context.dispatch ).toHaveBeenCalledTimes( 0 );
					} );
				} );

			} );

		} );

		describe( 'setValueByRowId', function () {
			beforeEach( function () {
				context.state = { };

				context.state.zobject = tableDataToRowObjects( [
					{ id: 0, value: Constants.ROW_VALUE_OBJECT },
					{ id: 1, key: Constants.Z_OBJECT_TYPE, value: Constants.ROW_VALUE_OBJECT, parent: 0 },
					{ id: 2, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 1 },
					{ id: 3, key: Constants.Z_REFERENCE_ID, value: Constants.Z_PERSISTENTOBJECT, parent: 1 },
					{ id: 4, key: Constants.Z_PERSISTENTOBJECT_VALUE, value: Constants.ROW_VALUE_ARRAY, parent: 0 },
					{ id: 5, key: '0', value: Constants.ROW_VALUE_OBJECT, parent: 4 },
					{ id: 6, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 5 },
					{ id: 7, key: Constants.Z_REFERENCE_ID, value: Constants.Z_STRING, parent: 5 },
					{ id: 8, key: '1', value: Constants.ROW_VALUE_OBJECT, parent: 4 },
					{ id: 9, key: Constants.Z_OBJECT_TYPE, value: Constants.Z_STRING, parent: 8 },
					{ id: 10, key: Constants.Z_STRING_VALUE, value: 'Foo', parent: 8 }
				] );

				context.getters.getRowIndexById = zobjectModule.getters.getRowIndexById( context.state );
			} );

			describe( 'when rowId is valid', function () {
				it( 'should call the setValueByRowIndex mutation with the correct rowIndex and value', function () {
					const expectedStringValue = 'Test String';
					const payload = {
						rowId: 10,
						value: expectedStringValue
					};

					zobjectModule.actions.setValueByRowId( context, payload );

					expect( context.commit ).toHaveBeenCalledWith( 'setValueByRowIndex', { index: 10, value: expectedStringValue } );
				} );
			} );

			describe( 'when rowId is invalid', function () {
				it( 'should not call setValueByRowIndex mutation', function () {
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

			it( 'should dispatch the removeZObjectChildren action with row id', () => {
				const payload = { rowId: 4 };
				context.getters.getRowById = jest.fn( () => {
					return { id: 4, parent: 3 };
				} );
				zobjectModule.actions.removeItemFromTypedList( context, payload );

				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObjectChildren', 4 );
			} );

			it( 'should dispatch the removeZObject action with row id', () => {
				const payload = { rowId: 4 };
				context.getters.getRowById = jest.fn( () => {
					return { id: 4, parent: 3 };
				} );
				zobjectModule.actions.removeItemFromTypedList( context, payload );

				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObject', 4 );
			} );

			it( 'should dispatch the recalculateTypedListKeys action with parent id', () => {
				const payload = { rowId: 4 };
				context.getters.getRowById = jest.fn( () => {
					return { id: 4, parent: 3 };
				} );
				zobjectModule.actions.removeItemFromTypedList( context, payload );

				expect( context.dispatch ).toHaveBeenCalledWith( 'recalculateTypedListKeys', 3 );
			} );
		} );

		describe( 'removeItemsFromTypedList', () => {
			it( 'should dispatch a removeZObjectChildren action for each item in the list', () => {
				const payload = { parentRowId: 4, listItems: [ 11, 14 ] };
				zobjectModule.actions.removeItemsFromTypedList( context, payload );

				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObjectChildren', 11 );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObjectChildren', 14 );
			} );

			it( 'should dispatch the removeZObject action for each item in the list', () => {
				const payload = { parentRowId: 4, listItems: [ 11, 14 ] };
				zobjectModule.actions.removeItemsFromTypedList( context, payload );

				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObject', 11 );
				expect( context.dispatch ).toHaveBeenCalledWith( 'removeZObject', 14 );
			} );

			it( 'should dispatch the recalculateTypedListKeys actions with parent id', () => {
				const payload = { parentRowId: 4, listItems: [ 11, 14 ] };
				zobjectModule.actions.removeItemsFromTypedList( context, payload );

				expect( context.dispatch ).toHaveBeenCalledWith( 'recalculateTypedListKeys', 4 );
			} );
		} );

		describe( 'addZObjects does not do an infinite recursion', function () {
			beforeEach( function () {
				context.state = { objects: mockApiZids };
				context.getters.getStoredObject = function ( key ) {
					return context.state.objects[ key ];
				};
				Object.keys( zobjectModule.modules.addZObjects.getters ).forEach( function ( key ) {
					context.getters[ key ] =
						zobjectModule.modules.addZObjects.getters[ key ](
							context.state,
							context.getters,
							{ zobjectModule: context.state },
							context.getters );
				} );
			} );

			it( 'defaults to Z9/Reference when an object has an attribute of its own type', function () {
				const expected = {
					Z1K1: 'Z10528',
					Z10528K1: {
						Z1K1: 'Z9',
						Z9K1: ''
					}
				};
				const payload = { id: 1, type: 'Z10528', link: false };
				// zobjectModule.modules.addZObjects.getters.createObjectByType( context, payload );
				const result = context.getters.createObjectByType( payload );
				expect( result ).toEqual( expected );
			} );

			it( 'defaults to Z9/Reference when mutual reference occurs in an object\'s attribute', function () {
				const expected = {
					Z1K1: 'Z20001',
					Z20001K1: {
						Z1K1: 'Z20002',
						Z20002K1: {
							Z1K1: 'Z20003',
							Z20003K1: {
								Z1K1: 'Z9',
								Z9K1: ''
							}
						}
					}
				};
				const payload = { id: 1, type: 'Z20001', link: false };
				// zobjectModule.modules.addZObjects.getters.createObjectByType( context, payload );
				const result = context.getters.createObjectByType( payload );
				expect( result ).toEqual( expected );
			} );
		} );
	} );
} );
