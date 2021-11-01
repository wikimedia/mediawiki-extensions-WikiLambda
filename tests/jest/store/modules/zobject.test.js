/* eslint-disable no-undef */
/*!
 * WikiLambda unit test suite for the zobject Vuex module
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
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
				{
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: ''
				}
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
		{ key: 'Z1K1', value: 'Z11', parent: 9, id: 10 },
		{ key: 'Z11K1', value: 'Z1002', parent: 9, id: 11 },
		{ key: 'Z11K2', value: '', parent: 9, id: 12 },
		{ key: 'Z1K1', value: 'Z6', parent: 3, id: 13 },
		{ key: 'Z6K1', value: '', parent: 3, id: 14 }
	],
	state,
	context,
	postMock,
	postWithEditTokenMock,
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
				resolve( responsePayload );
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
			getters: {}
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
		it( 'Returns current zObject by its ID', function () {
			var result = { id: 1, key: 'Z1K1', value: 'Z2', parent: 0 };
			state.zobject = zobjectTree;

			expect( zobjectModule.getters.getZObjectById( state )( 1 ) ).toEqual( result );
		} );

		it( 'Returns current zObject by its index', function () {
			var result = 10;
			state.zobject = zobjectTree;

			expect( zobjectModule.getters.getZObjectIndexById( state )( 10 ) ).toEqual( result );
		} );

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

		it( 'Returns whether the current state has `createNewPage`', function () {
			expect( zobjectModule.getters.isCreateNewPage( state ) ).toBe( true );
		} );

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

		it( 'Returns next ID for a key or argument', function () {
			state.zobject = zobjectTree;

			expect( zobjectModule.getters.getNextKey( state, { getCurrentZObjectId: 'Z0' } ) ).toEqual( 'Z0K1' );
		} );

		it( 'Returns true if the value of the current ZObject is Z0', function () {
			state.zobject = zobjectTree;

			expect( zobjectModule.modules.currentZObject.getters.isNewZObject( state, { getCurrentZObjectId: 'Z0' } ) ).toEqual( true );
		} );

		it( 'Returns false if the value of the current ZObject is not Z0', function () {
			state.zobject = zobjectTree;

			expect( zobjectModule.modules.currentZObject.getters.isNewZObject( state, { getCurrentZObjectId: 'Z4' } ) ).toEqual( false );
		} );
	} );

	describe( 'Mutations', function () {
		it( 'Updates the zobject', function () {
			zobjectModule.mutations.setZObject( state, zobject );

			expect( state.zobject ).toEqual( zobject );
		} );

		it( 'Set `createNewPage` to provided value', function () {
			expect( state.createNewPage ).toBe( true );

			zobjectModule.mutations.setCreateNewPage( state, false );

			expect( state.createNewPage ).toBe( false );
		} );

		it( 'Set message to provided value', function () {
			var message = {
				type: 'error',
				text: 'An error occurred'
			};

			zobjectModule.mutations.setMessage( state, message );

			expect( state.zobjectMessage ).toEqual( message );
		} );

		it( 'Set message to default when no payload is found', function () {
			zobjectModule.mutations.setMessage( state );

			expect( state.zobjectMessage ).toEqual( {
				type: 'notice',
				text: null
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

			expect( context.commit ).toHaveBeenCalledTimes( 3 );
			expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
			expect( context.commit ).toHaveBeenCalledWith( 'setCreateNewPage', true );
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

			expect( context.commit ).toHaveBeenCalledTimes( 3 );
			expect( context.dispatch ).toHaveBeenCalledTimes( 3 );
			expect( context.commit ).toHaveBeenCalledWith( 'setCreateNewPage', true );
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
			var expectedSetZObjectPayload = [ { id: 0, key: undefined, parent: undefined, value: 'object' }, { id: 1, key: 'Z1K1', value: 'object', parent: 0 }, { id: 2, key: 'Z1K1', value: 'Z9', parent: 1 }, { id: 3, key: 'Z9K1', value: 'Z2', parent: 1 }, { id: 4, key: 'Z2K1', value: 'object', parent: 0 }, { id: 5, key: 'Z1K1', value: 'Z6', parent: 4 }, { id: 6, key: 'Z6K1', value: 'Z1234', parent: 4 }, { id: 7, key: 'Z2K2', value: 'object', parent: 0 }, { id: 8, key: 'Z1K1', value: 'Z6', parent: 7 }, { id: 9, key: 'Z6K1', value: 'test', parent: 7 }, { id: 10, key: 'Z2K3', value: 'object', parent: 0 }, { id: 11, key: 'Z1K1', value: 'object', parent: 10 }, { id: 12, key: 'Z1K1', value: 'Z9', parent: 11 }, { id: 13, key: 'Z9K1', value: 'Z12', parent: 11 }, { id: 14, key: 'Z12K1', value: 'array', parent: 10 }, { id: 15, key: '0', value: 'object', parent: 14 }, { id: 16, key: 'Z1K1', value: 'object', parent: 15 }, { id: 17, key: 'Z1K1', value: 'Z9', parent: 16 }, { id: 18, key: 'Z9K1', value: 'Z11', parent: 16 }, { id: 19, key: 'Z11K1', value: 'object', parent: 15 }, { id: 20, key: 'Z1K1', value: 'Z9', parent: 19 }, { id: 21, key: 'Z9K1', value: 'Z1002', parent: 19 }, { id: 22, key: 'Z11K2', value: 'object', parent: 15 }, { id: 23, key: 'Z1K1', value: 'Z6', parent: 22 }, { id: 24, key: 'Z6K1', value: 'test', parent: 22 }, { id: 25, key: 'Z2K4', value: 'object', parent: 0 }, { id: 26, key: 'Z1K1', value: 'object', parent: 25 }, { id: 27, key: 'Z1K1', value: 'Z9', parent: 26 }, { id: 28, key: 'Z9K1', value: 'Z32', parent: 26 }, { id: 29, key: 'Z32K1', value: 'array', parent: 25 }, { id: 30, key: '0', value: 'object', parent: 29 }, { id: 31, key: 'Z1K1', value: 'object', parent: 30 }, { id: 32, key: 'Z1K1', value: 'Z9', parent: 31 }, { id: 33, key: 'Z9K1', value: 'Z31', parent: 31 }, { id: 34, key: 'Z31K1', value: 'object', parent: 30 }, { id: 35, key: 'Z1K1', value: 'Z9', parent: 34 }, { id: 36, key: 'Z9K1', value: 'Z1002', parent: 34 }, { id: 37, key: 'Z31K2', value: 'array', parent: 30 } ];
			context.state = {
				zobject: zobjectTree
			};
			context.getters.getZkeys = {
				Z1234: {
					Z1K1: 'Z2',
					Z2K1: 'Z1234',
					Z2K2: 'test',
					Z2K3: {
						Z1K1: 'Z12',
						Z12K1: [
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
							{
								Z1K1: 'Z31',
								Z31K1: 'Z1002',
								Z31K2: []
							}
						]
					}
				}
			};
			mw.config = {
				get: jest.fn( function () {
					return {
						createNewPage: false,
						zId: 'Z1234'
					};
				} )
			};
			zobjectModule.actions.initializeZObject( context );

			expect( context.commit ).toHaveBeenCalledTimes( 3 );
			expect( context.dispatch ).toHaveBeenCalledTimes( 2 );
			expect( context.commit ).toHaveBeenCalledWith( 'setCreateNewPage', false );
			expect( context.commit ).toHaveBeenCalledWith( 'setZObject', expectedSetZObjectPayload );
			expect( context.commit ).toHaveBeenCalledWith( 'setZObjectInitialized', true );
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

			expect( context.commit ).toHaveBeenCalledTimes( 3 );
			expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
			expect( context.commit ).toHaveBeenCalledWith( 'setCreateNewPage', false );
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
			zobjectModule.actions.submitZObject( context, 'A summary' );

			expect( mw.Api ).toHaveBeenCalledTimes( 1 );
			expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				summary: 'A summary',
				zid: undefined,
				zobject: JSON.stringify( zobject )
			} );
			expect( context.commit ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'Save existing zobject', function () {
			context.getters.isCreateNewPage = false;
			context.getters.getCurrentZObjectId = 'Z0';
			context.state = {
				zobject: zobjectTree
			};
			zobjectModule.actions.submitZObject( context, 'A summary' );

			expect( mw.Api ).toHaveBeenCalledTimes( 1 );
			expect( postWithEditTokenMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				summary: 'A summary',
				zid: 'Z0',
				zobject: JSON.stringify( zobject )
			} );
			expect( context.commit ).toHaveBeenCalledTimes( 0 );
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
					{ key: 0, value: 'object', parent: 8, id: 9 },
					{ key: 'Z1K1', value: 'Z11', parent: 9, id: 10 },
					{ key: 'Z11K1', value: 'object', parent: 9, id: 11 },
					{ key: 'Z1K1', value: 'Z9', parent: 11, id: 12 },
					{ key: 'Z9K1', value: 'Z1002', parent: 11, id: 13 },
					{ key: 'Z11K2', value: 'object', parent: 9, id: 14 },
					{ key: 'Z1K1', value: 'Z6', parent: 14, id: 15 },
					{ key: 'Z6K1', value: '', parent: 14, id: 16 },
					{ key: 0, value: 'object', parent: 3, id: 17 },
					{ key: 'Z1K1', value: 'Z6', parent: 17, id: 18 },
					{ key: 'Z6K1', value: 'first', parent: 17, id: 19 },
					{ key: 1, value: 'object', parent: 3, id: 20 },
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
			expect( zobjectModule.getters.getZObjectById( context.state )( 20 ) ).toEqual( { key: 0, value: 'object', parent: 3, id: 20 } );
			expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson( context.state, context.getters, { zobjectModule: context.state }, context.getters ).Z2K2 ).toEqual( [ { Z1K1: 'Z6', Z6K1: 'second' } ] );
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
						}, Z12K1: [] },
						Z2K4: { Z1K1: {
							Z1K1: 'Z9', Z9K1: 'Z32'
						}, Z32K1: [] }
					} );
			} );

			it( 'adds a valid ZMultilingualString', function () {
				zobjectModule.modules.addZObjects.actions.addZMultilingualString( context, { id: 0 } );

				expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson( context.state, context.getters, context.rootState, context.getters ) ).toEqual( { Z1K1: 'Z12', Z12K1: [] } );
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
				zobjectModule.modules.addZObjects.actions.addZList( context, 0 );

				expect( context.state.zobject ).toEqual( [
					{ id: 0, value: 'array' }
				] );

				expect( zobjectModule
					.modules
					.currentZObject
					.getters
					.getZObjectAsJson(
						context.state,
						context.getters,
						context.rootState,
						context.getters ) ).toEqual( [] );
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
				zobjectModule.modules.addZObjects.actions.addZArgument( context, 0 );

				expect( zobjectModule.modules.currentZObject.getters.getZObjectAsJson( context.state, context.getters, context.rootState, context.getters ) ).toEqual( { Z1K1: 'Z17', Z17K1: { Z1K1: 'Z9', Z9K1: '' }, Z17K2: { Z1K1: 'Z6', Z6K1: 'Z0K1' }, Z17K3: { Z1K1: 'Z12', Z12K1: [] } } );
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
								Z12K1: []
							}
						}
					],
					Z8K2: {
						Z1K1: 'Z9',
						Z9K1: ''
					},
					Z8K3: [],
					Z8K4: [],
					Z8K5: {
						Z1K1: 'Z9',
						Z9K1: 'Z0'
					}
				} );
			} );
		} );
	} );
} );
