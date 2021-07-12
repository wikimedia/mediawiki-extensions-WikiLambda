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
			return {
				// eslint-disable-next-line no-unused-vars
				then: jest.fn( function ( responsePayload ) {
					return {
						catch: jest.fn()
					};
				} )
			};
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
		} );
		it( 'Initialize ZObject, existing zobject page', function () {
			var expectedSetZObjectPayload = [ { id: 0, key: undefined, parent: undefined, value: 'object' }, { id: 1, key: 'Z1K1', parent: 0, value: 'object' }, { id: 2, key: 'Z1K1', parent: 1, value: 'Z6' }, { id: 3, key: 'Z6K1', parent: 1, value: 'test' }, { id: 4, key: 'Z1K2', parent: 0, value: 'object' }, { id: 5, key: 'Z1K1', parent: 4, value: 'Z6' }, { id: 6, key: 'Z6K1', parent: 4, value: 'test' } ];
			context.state = {
				zobject: zobjectTree
			};
			context.getters.getZkeys = {
				Z1234: { Z1K1: 'test', Z1K2: 'test' }
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
			expect( context.dispatch ).toHaveBeenCalledTimes( 1 );
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

		describe( 'Add ZObjects', function () {
			beforeEach( function () {
				context.state = {
					zobject: [
						{ id: 0, value: 'object' }
					]
				};
				Object.keys( zobjectModule.getters ).forEach( function ( key ) {
					context.getters[ key ] = zobjectModule.getters[ key ]( context.state, context.getters );
				} );
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

					zobjectModule.actions[ actionType ]( context, payload );

					return {
						then: function ( fn ) {
							return fn();
						}
					};
				} );

				context.rootGetters = {
					getZkeys: JSON.parse( fs.readFileSync( path.join( __dirname, './zobject/getZkeys.json' ) ) )
				};
			} );

			it( 'adds a valid ZPersistentObject', function () {
				zobjectModule.actions.addZPersistentObject( context, 0 );

				expect( zobjectModule.getters.getZObjectAsJson( context.state ) ).toEqual( { Z1K1: 'Z2', Z2K1: { Z1K1: 'Z9', Z9K1: 'Z0' }, Z2K2: undefined, Z2K3: { Z1K1: 'Z12', Z12K1: [] } } );
			} );

			it( 'adds a valid ZMultilingualString', function () {
				zobjectModule.actions.addZMultilingualString( context, 0 );

				expect( zobjectModule.getters.getZObjectAsJson( context.state ) ).toEqual( { Z1K1: 'Z12', Z12K1: [] } );
			} );

			it( 'adds a valid empty ZString', function () {
				zobjectModule.actions.addZString( context, { id: 0 } );

				expect( zobjectModule.getters.getZObjectAsJson( context.state ) ).toEqual( { Z1K1: 'Z6', Z6K1: '' } );
			} );

			it( 'adds a valid prefilled ZString', function () {
				zobjectModule.actions.addZString( context, { id: 0, value: 'Hello world' } );

				expect( zobjectModule.getters.getZObjectAsJson( context.state ) ).toEqual( { Z1K1: 'Z6', Z6K1: 'Hello world' } );
			} );

			it( 'adds a valid ZList', function () {
				zobjectModule.actions.addZList( context, 0 );

				expect( context.state.zobject ).toEqual( [
					{ id: 0, value: 'array' }
				] );

				expect( zobjectModule.getters.getZObjectAsJson( context.state ) ).toEqual( [] );
			} );

			it( 'adds a valid empty ZReference', function () {
				zobjectModule.actions.addZReference( context, { id: 0 } );

				expect( zobjectModule.getters.getZObjectAsJson( context.state ) ).toEqual( { Z1K1: 'Z9', Z9K1: '' } );
			} );

			it( 'adds a valid prefilled ZReference', function () {
				zobjectModule.actions.addZReference( context, { id: 0, value: 'Z1' } );

				expect( zobjectModule.getters.getZObjectAsJson( context.state ) ).toEqual( { Z1K1: 'Z9', Z9K1: 'Z1' } );
			} );

			it( 'adds a valid ZArgument', function () {
				zobjectModule.actions.addZArgument( context, 0 );

				expect( zobjectModule.getters.getZObjectAsJson( context.state ) ).toEqual( { Z1K1: 'Z17', Z17K1: { Z1K1: 'Z9', Z9K1: '' }, Z17K2: { Z1K1: 'Z6', Z6K1: 'Z0K1' }, Z17K3: { Z1K1: 'Z12', Z12K1: [] } } );
			} );

			it( 'adds a valid ZFunctionCall', function () {
				zobjectModule.actions.addZFunctionCall( context, 0 );

				expect( zobjectModule.getters.getZObjectAsJson( context.state ) ).toEqual( { Z1K1: 'Z7', Z7K1: '' } );
			} );

			it( 'adds a valid ZImplementation', function () {
				zobjectModule.actions.addZImplementation( context, 0 );

				expect( zobjectModule.getters.getZObjectAsJson( context.state ) ).toEqual( { Z1K1: 'Z14', Z14K1: { Z1K1: 'Z9', Z9K1: '' }, Z14K2: undefined, Z14K3: { Z1K1: 'Z16', Z16K1: { Z1K1: 'Z61', Z61K1: { Z1K1: 'Z6', Z6K1: '' } }, Z16K2: { Z1K1: 'Z6', Z6K1: '' } } } );
			} );

			it( 'adds a valid ZFunction', function () {
				zobjectModule.actions.addZFunction( context, 0 );

				expect( zobjectModule.getters.getZObjectAsJson( context.state ) ).toEqual( {
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
