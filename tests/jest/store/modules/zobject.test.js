/* eslint-disable no-undef */
/*!
 * WikiLambda unit test suite for the zobject Vuex module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var fs = require( 'fs' ),
	path = require( 'path' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	zobjectModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobject.js' ),
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
	zobjectTree = [
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
		{ key: 'Z9K1', value: 'Z11', parent: 9, id: 11 },
		{ key: '1', value: 'object', parent: 8, id: 12 },
		{ key: 'Z1K1', value: 'Z11', parent: 12, id: 13 },
		{ key: 'Z11K1', value: 'Z1002', parent: 12, id: 14 },
		{ key: 'Z11K2', value: '', parent: 12, id: 15 },
		{ key: 'Z1K1', value: 'Z6', parent: 3, id: 16 },
		{ key: 'Z6K1', value: '', parent: 3, id: 17 }
	],
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
			// eslint-disable-next-line compat/compat
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
						id: ''
					};
				} ),
				getZObjectChildrenById: jest.fn( function () {
					return {
						id: ''
					};
				} ),
				getAllItemsFromListById: jest.fn( function () {
					return {
						id: ''
					};
				} )
			}
		} );

		mw.Api = jest.fn( function () {
			return {
				post: postMock,
				postWithEditToken: postWithEditTokenMock
			};
		} );
		mw.Title = jest.fn( function () {
			return {
				getUrl: jest.fn()
			};
		} );
	} );

	describe( 'Getters', function () {
		describe( 'getZObjectById', function () {
			it( 'Returns current zObject by its ID', function () {
				var result = { id: 1, key: 'Z1K1', value: 'Z2', parent: 0 };
				state.zobject = zobjectTree;

				expect( zobjectModule.getters.getZObjectById( state )( 1 ) ).toEqual( result );
			} );
		} );

		describe( 'getZObjectIndexById', function () {
			it( 'Returns current zObject by its index', function () {
				var result = 10;
				state.zobject = zobjectTree;

				expect( zobjectModule.getters.getZObjectIndexById( state )( 10 ) ).toEqual( result );
			} );
		} );

		describe( 'getZObjectChildrenById', function () {
			it( 'Returns empty array if zobject has no children when calling getZObjectChildrenById', function () {
				var result = [];
				state.zobject = zobjectTree;

				expect( zobjectModule.getters.getZObjectChildrenById( state )( 10 ) ).toEqual( result );
			} );

			it( 'Returns zobject children when calling getZObjectChildrenById', function () {
				var result = [
					{ key: 'Z1K1', value: 'Z9', parent: 2, id: 4 },
					{ key: 'Z9K1', value: 'Z0', parent: 2, id: 5 }
				];
				state.zobject = zobjectTree;

				expect( zobjectModule.getters.getZObjectChildrenById( state )( 2 ) ).toEqual( result );
			} );
		} );

		describe( 'getAllItemsFromListById', function () {

			it( 'Returns all items in list when calling getAllItemsFromListById', function () {
				var result = [
					{ id: 12, key: '1', value: 'object', parent: 8 }
				];
				state.zobject = zobjectTree;
				var getters = {
					getZObjectChildrenById: zobjectModule.getters.getZObjectChildrenById( state )
				};

				expect( zobjectModule.getters.getAllItemsFromListById( state, getters )( 8 ) ).toEqual( result );
			} );

			it( 'Returns empty array if list contains single item(type) when calling getAllItemsFromListById', function () {
				var result = [];
				state.zobject = [
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
				];
				var getters = {
					getZObjectChildrenById: zobjectModule.getters.getZObjectChildrenById( state )
				};

				expect( zobjectModule.getters.getAllItemsFromListById( state, getters )( 8 ) ).toEqual( result );
			} );
		} );

		describe( 'getListTypeById', function () {

			it( 'Returns list type when calling getListTypeById', function () {
				var result = { key: '0', value: 'object', parent: 8, id: 9 };
				state.zobject = zobjectTree;

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
				state.zobject = zobjectTree;

				expect( zobjectModule.getters.getNextKey( state, { getCurrentZObjectId: 'Z0' } ) ).toEqual( 'Z0K1' );
			} );
		} );

		describe( 'getLatestObjectIndex', function () {
			it( 'Returns latest index for a key', function () {
				state.zobject = zobjectTree.concat( [ { key: 'Z6K1', value: 'Z0K4', parent: 0, id: 18 } ] );

				expect( zobjectModule.getters.getLatestObjectIndex( state )( 'Z0' ) ).toEqual( 4 );
			} );

			it( 'Returns 0 when no key is found for passed ZID', function () {
				state.zobject = zobjectTree.concat( [ { key: 'Z6K1', value: 'Z42K4', parent: 0, id: 18 } ] );

				expect( zobjectModule.getters.getLatestObjectIndex( state )( 'Z0' ) ).toEqual( 0 );
			} );

			it( 'Skip items with no value', function () {
				state.zobject = [ { key: 'Z6K1', parent: 0, id: 18 } ];

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
				state.zobject = zobjectTree;
				const zobjectHighestId = 17;

				expect( zobjectModule.getters.getNextObjectId( state ) ).toEqual( zobjectHighestId + 1 );
			} );
		} );

		describe( 'isNewZObject', function () {
			it( 'Returns true if the value of the current ZObject is Z0', function () {
				state.zobject = zobjectTree;

				expect( zobjectModule.modules.currentZObject.getters.isNewZObject( state, { getCurrentZObjectId: 'Z0' } ) ).toEqual( true );
			} );

			it( 'Returns false if the value of the current ZObject is not Z0', function () {
				state.zobject = zobjectTree;

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
				state.zobject = zobjectTree.concat( [
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
				] );
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
	} );

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
				zobject: zobjectTree
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

		it( 'Initialize ZObject, create new page, initial value for Z2K2', function () {
			var expectedChangeTypePayload = { id: 0, type: Constants.Z_PERSISTENTOBJECT },
				expectedZ2K2ChangeTypePayload = { id: 3, type: Constants.Z_BOOLEAN },
				expectedRootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };
			context.state = {
				zobject: zobjectTree
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
				zobject: zobjectTree
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
				zobject: zobjectTree
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
				zobject: zobjectTree
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
				zobject: zobjectTree
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

		it( 'Initialize ZObject with Z7 call function when no zids or createNewPage is set', function () {
			var expectedChangeTypePayload = { id: 0, type: Constants.Z_FUNCTION_CALL },
				expectedRootObject = { id: 0, key: undefined, parent: undefined, value: 'object' };
			context.state = {
				zobject: zobjectTree
			};
			context.getters.getZkeys = {
				Z1234: { Z1K1: 'test', Z2K1: 'test' }
			};
			mw.config = {
				get: jest.fn( function () {
					return {
						createNewPage: false
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
				zobject: zobjectTree
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
				zobject: zobjectTree
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
				zobject: zobjectFunction.ZObjectTree
			};
			zobjectModule.actions.submitZObject( context, { summary: 'A summary', shouldUnattachImplentationAndTester: true } );

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

		it( 'Inject arbitrary JSON into zobject', function () {
			context.state = {
				zobject: zobjectTree
			};
			context.getters.getZObjectChildrenById = zobjectModule.getters.getZObjectChildrenById( context.state );
			context.getters.getZObjectIndexById = zobjectModule.getters.getZObjectIndexById( context.state );
			context.getters.getZObjectById = zobjectModule.getters.getZObjectById( context.state );
			// eslint-disable-next-line max-len
			context.getters.getZObjectTypeById = zobjectModule.getters.getZObjectTypeById( context.state, context.getters );
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

			zobjectModule.actions.injectZObject( context, {
				zobject: 'Z6',
				key: 'Z2K2',
				id: 3,
				parent: 0
			} );

			expect( context.state.zobject ).toEqual( zobjectTree );
		} );

		it( 'Reset the root ZObject by ID', function () {
			context.state = {
				zobject: zobjectTree
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
				zobject: zobjectTree
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

		describe( 'Add ZObjects', function () {
			beforeEach( function () {
				context.state = {
					zobject: [
						{ id: 0, value: 'object' }
					]
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
				context.getters.getNextKey =
					zobjectModule.getters.getNextKey(
						context.state,
						context.getters,
						{ zobjectModule: context.state },
						context.getters );
				context.getters.getZkeys = {};
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

			it( 'adds a valid ZPersistentObject', function () {
				zobjectModule.modules.addZObjects.actions.addZPersistentObject( context, 0 );

				expect( zobjectModule
					.modules
					.currentZObject
					.getters
					.getZObjectAsJson( context.state, context.getters, context.rootState, context.getters ) ).toEqual(
					{ Z1K1: { Z1K1: 'Z9', Z9K1: 'Z2' },
						Z2K1: { Z1K1: 'Z6', Z6K1: 'Z0' },
						Z2K2: undefined,
						Z2K3: { Z1K1: {
							Z1K1: 'Z9', Z9K1: 'Z12'
						}, Z12K1: [ {
							Z1K1: 'Z9',
							Z9K1: 'Z11'
						} ] },
						Z2K4: { Z1K1: {
							Z1K1: 'Z9', Z9K1: 'Z32'
						}, Z32K1: [ { Z1K1: 'Z9', Z9K1: 'Z31' } ] }
					} );
			} );

			it( 'adds a valid ZMultilingualString', function () {
				zobjectModule.modules.addZObjects.actions.addZMultilingualString( context, { id: 0, lang: 'Z1004', value: 'test label' } );

				expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson( context.state, context.getters, context.rootState, context.getters ) ).toEqual( { Z1K1: { Z1K1: 'Z6', Z6K1: 'test label', Z9K1: 'Z1004' }, Z12K1: [ {
					Z1K1: 'Z9',
					Z9K1: 'Z11'
				}, {
					Z11K1: undefined, // 'object'
					Z11K2: undefined, // 'object'
					Z1K1: 'Z11'
				} ] } );
			} );

			it( 'adds a valid empty ZString', function () {
				zobjectModule.modules.addZObjects.actions.addZString( context, { id: 0 } );

				expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson( context.state, context.getters, context.rootState, context.getters ) ).toEqual( { Z1K1: 'Z6', Z6K1: '' } );
			} );

			it( 'adds a valid prefilled ZString', function () {
				zobjectModule.modules.addZObjects.actions.addZString( context, { id: 0, value: 'Hello world' } );

				expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson( context.state, context.getters, context.rootState, context.getters ) ).toEqual( { Z1K1: 'Z6', Z6K1: 'Hello world' } );
			} );

			it( 'adds a valid ZList', function () {
				zobjectModule.modules.addZObjects.actions.addZTypedList( context, { id: 0 } );

				expect( context.state.zobject ).toEqual( [
					{ id: 0, value: 'array' },
					{
						id: 1,
						key: '0',
						parent: 0,
						value: 'object'
					},
					{
						id: 2,
						key: 'Z1K1',
						parent: 1,
						value: 'Z9'
					},
					{
						id: 3,
						key: 'Z9K1',
						parent: 1,
						value: 'Z1'
					}
				] );

				expect( zobjectModule
					.modules
					.currentZObject
					.getters
					.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters
					)
				).toEqual( [ {
					Z1K1: 'Z9',
					Z9K1: 'Z1'
				} ] );
			} );

			it( 'adds a valid empty ZReference', function () {
				zobjectModule.modules.addZObjects.actions.addZReference( context, { id: 0 } );

				expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson( context.state, context.getters, context.rootState, context.getters ) ).toEqual( { Z1K1: 'Z9', Z9K1: '' } );
			} );

			it( 'adds a valid prefilled ZReference', function () {
				zobjectModule.modules.addZObjects.actions.addZReference( context, { id: 0, value: 'Z1' } );

				expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson( context.state, context.getters, context.rootState, context.getters ) ).toEqual( { Z1K1: 'Z9', Z9K1: 'Z1' } );
			} );

			it( 'adds a valid ZArgument', function () {
				zobjectModule.modules.addZObjects.actions.addZArgument( context, { id: 0 } );

				expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson( context.state, context.getters, context.rootState, context.getters ) ).toEqual( { Z1K1: 'Z17', Z17K1: { Z1K1: 'Z9', Z9K1: '' }, Z17K2: { Z1K1: 'Z6', Z6K1: 'Z0K1' }, Z17K3: { Z1K1: 'Z12', Z12K1: [ {
					Z1K1: 'Z9',
					Z9K1: 'Z11'
				} ] } } );
			} );

			it( 'adds a valid ZFunctionCall', function () {
				zobjectModule.modules.addZObjects.actions.addZFunctionCall( context, { id: 0 } );

				expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson( context.state, context.getters, context.rootState, context.getters ) ).toEqual( { Z1K1: 'Z7', Z7K1: '' } );
			} );

			it( 'adds a valid ZImplementation', function () {
				zobjectModule.modules.addZObjects.actions.addZImplementation( context, 0 );

				expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson( context.state, context.getters, context.rootState, context.rootGetters ) ).toEqual( { Z1K1: 'Z14', Z14K1: { Z1K1: 'Z9', Z9K1: '' }, Z14K2: { Z1K1: 'Z7', Z7K1: '' }, Z14K3: undefined } );
			} );

			it( 'adds a valid ZFunction', function () {
				zobjectModule.modules.addZObjects.actions.addZFunction( context, 0 );

				expect( zobjectModule
					.modules
					.currentZObject
					.getters
					.getZObjectAsJson( context.state, context.getters, context.rootState, context.getters ) ).toEqual( {
					Z1K1: 'Z8',
					Z8K1: [
						{
							Z1K1: 'Z9',
							Z9K1: 'Z17'
						},
						{
							Z1K1: 'Z17',
							Z17K1: {
								Z1K1: 'Z9',
								Z9K1: ''
							},
							Z17K2: {
								Z1K1: 'Z6',
								Z6K1: 'Z0K1'
							},
							Z17K3: {
								Z1K1: 'Z12',
								Z12K1: [
									{
										Z1K1: 'Z9',
										Z9K1: 'Z11'
									}
								]
							}
						}
					],
					Z8K2: {
						Z1K1: 'Z9',
						Z9K1: ''
					},
					Z8K3: [
						{
							Z1K1: 'Z9',
							Z9K1: 'Z20'
						}
					],
					Z8K4: [
						{
							Z1K1: 'Z9',
							Z9K1: 'Z14'
						}
					],
					Z8K5: {
						Z1K1: 'Z9',
						Z9K1: 'Z0'
					}
				} );
			} );
		} );
		describe( 'Attach and detach testers and implementations', function () {
			beforeEach( function () {
				context.state = {
					zobject: zobjectTree.concat( [
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
					] )
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
						}
					};
				} );
			} );

			it( 'attaches given testers', function () {
				zobjectModule.actions.attachZTesters( context,
					{ functionId: 0, testerZIds: [ 'Z777', 'Z888' ] } );

				expect( context.state.zobject ).toContainEqual(
					{ key: '4', value: 'object', parent: 18, id: 36 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: '5', value: 'object', parent: 18, id: 37 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 36, id: 38 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_REFERENCE_ID, value: 'Z777', parent: 36, id: 39 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 37, id: 40 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_REFERENCE_ID, value: 'Z888', parent: 37, id: 41 } );

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

				expect( context.state.zobject ).toContainEqual(
					{ key: '4', value: 'object', parent: 19, id: 36 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: '5', value: 'object', parent: 19, id: 37 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 36, id: 38 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_REFERENCE_ID, value: 'Z777', parent: 36, id: 39 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_OBJECT_TYPE, value: Constants.Z_REFERENCE, parent: 37, id: 40 } );
				expect( context.state.zobject ).toContainEqual(
					{ key: Constants.Z_REFERENCE_ID, value: 'Z888', parent: 37, id: 41 } );

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
		} );
	} );
} );
