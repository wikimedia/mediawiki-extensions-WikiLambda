var Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	zobjectModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobject.js' ),
	zobject = {
		Z1K1: 'Z2',
		Z2K1: 'Z0',
		Z2K2: '',
		Z2K3: { Z1K1: 'Z12', Z12K1: [] }
	},
	zobjectTree = [
		{ id: 0, key: undefined, value: 'object', parent: undefined },
		{ id: 1, key: 'Z1K1', value: 'Z2', parent: 0 },
		{ id: 2, key: 'Z2K1', value: 'Z0', parent: 0 },
		{ id: 3, key: 'Z2K2', value: 'object', parent: 0 },
		{ id: 4, key: 'Z2K3', value: 'object', parent: 0 },
		{ id: 5, key: 'Z1K1', value: 'Z6', parent: 3 },
		{ id: 6, key: 'Z6K1', value: '', parent: 3 },
		{ id: 10, key: 'Z1K1', value: 'Z12', parent: 4 },
		{ id: 11, key: 'Z12K1', value: 'array', parent: 4 }
	],
	state,
	context,
	postMock,
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
				post: postMock
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
			var result = 7;
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
				{ id: 10, key: 'Z1K1', value: 'Z12', parent: 4 },
				{ id: 11, key: 'Z12K1', value: 'array', parent: 4 }
			];
			state.zobject = zobjectTree;

			expect( zobjectModule.getters.getZObjectChildrenById( state )( 4 ) ).toEqual( result );
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
			var expectedZObject = {
				Z1K1: 'Z2',
				Z2K1: 'Z0',
				Z2K2: '',
				Z2K3: { Z1K1: 'Z12', Z12K1: [] }
			};
			context.getters.isCreateNewPage = true;
			context.state = {
				zobject: zobjectTree
			};
			zobjectModule.actions.submitZObject( context, 'A summary' );

			expect( mw.Api ).toHaveBeenCalledTimes( 1 );
			expect( postMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				summary: 'A summary',
				zobject: JSON.stringify( expectedZObject )
			} );
			expect( context.commit ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'Save existing zobject', function () {
			var expectedZObject = {
				Z1K1: 'Z2',
				Z2K1: 'Z0',
				Z2K2: '',
				Z2K3: { Z1K1: 'Z12', Z12K1: [] }
			};
			context.getters.isCreateNewPage = false;
			context.getters.getCurrentZObjectId = 'Z0';
			context.state = {
				zobject: zobjectTree
			};
			zobjectModule.actions.submitZObject( context, 'A summary' );

			expect( mw.Api ).toHaveBeenCalledTimes( 1 );
			expect( postMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				summary: 'A summary',
				zid: 'Z0',
				zobject: JSON.stringify( expectedZObject )
			} );
			expect( context.commit ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'Inject arbitrary JSON into zobject', function () {
			var updatedZObjectTree = [
				{ id: 0, key: undefined, value: 'object', parent: undefined },
				{ id: 1, key: 'Z1K1', value: 'Z2', parent: 0 },
				{ id: 2, key: 'Z2K1', value: 'Z0', parent: 0 },
				{ id: 3, key: 'Z2K2', value: 'object', parent: 0 },
				{ id: 4, key: 'Z2K3', value: 'object', parent: 0 },
				{ id: 10, key: 'Z1K1', value: 'Z12', parent: 4 },
				{ id: 11, key: 'Z12K1', value: 'array', parent: 4 },
				{ id: 12, key: 'Z1K1', value: 'Z9', parent: 3 },
				{ id: 13, key: 'Z9K1', value: 'Z6', parent: 3 }
			];
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
			} );

			zobjectModule.actions.injectZObject( context, {
				zobject: 'Z6',
				key: 'Z2K2',
				id: 3,
				parent: 0
			} );

			expect( context.state.zobject ).toEqual( updatedZObjectTree );
		} );
	} );
} );
