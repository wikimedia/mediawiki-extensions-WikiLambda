/*!
 * WikiLambda unit test suite for the currentZObject Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const tableDataToRowObjects = require( '../../helpers/zObjectTableHelpers.js' ).tableDataToRowObjects,
	zobjectToRows = require( '../../helpers/zObjectTableHelpers.js' ).zobjectToRows,
	zobjectModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobject.js' ),
	zFunctionModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zFunction.js' );

let state,
	getters,
	context;

describe( 'currentZObject Vuex module', () => {
	const currentZObject = zobjectModule.modules.currentZObject;

	beforeEach( () => {
		state = { zobject: [] };
		context = {
			commit: jest.fn(),
			dispatch: jest.fn(),
			getters: {}
		};
	} );

	describe( 'Getters', () => {
		describe( 'isNewZObject', () => {
			it( 'returns true if the value of the current ZObject is Z0', () => {
				getters = {
					getCurrentZObjectId: 'Z0'
				};
				expect( currentZObject.getters.isNewZObject( state, getters ) ).toEqual( true );
			} );

			it( 'returns false if the value of the current ZObject is not Z0', () => {
				getters = {
					getCurrentZObjectId: 'Z4'
				};
				expect( currentZObject.getters.isNewZObject( state, getters ) ).toEqual( false );
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
				getters = {
					getRowById: zobjectModule.getters.getRowById( state )
				};
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
					zobject: zobjectToRows( {
						Z2K3: { // rowId 1
							Z1K1: 'Z12',
							Z12K1: [ 'Z11' ]
						},
						Z2K4: { // rowId 9
							Z1K1: 'Z32',
							Z32K1: [ 'Z31' ]
						},
						Z2K5: { // rowId 17
							Z1K1: 'Z12',
							Z12K1: [ 'Z11' ]
						}
					} )
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
					rowId: 9,
					value: multilingualDataCopy.aliases
				} );

				expect( context.dispatch ).toHaveBeenCalledWith( 'injectZObjectFromRowId', {
					rowId: 17,
					value: multilingualDataCopy.descriptions
				} );
			} );
		} );
	} );
} );
