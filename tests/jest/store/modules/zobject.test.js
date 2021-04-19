var zobjectModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobject.js' ),
	zobject = {
		Z1K1: 'Z2',
		Z2K1: 'Z0',
		Z2K2: { Z1K1: 'Z6', Z6K1: '' },
		Z2K3: { Z1K1: 'Z12', Z12K1: [] },
		Z2K4: [
			{
				Z1K1: 'Z17',
				Z17K2: { Z1K1: 'Z6', Z6K1: 'Z0K1' },
				Z17K3: {
					Z1K1: [ 'Z12' ],
					Z12K1: [ { Z1K1: 'Z11', Z11K1: 'en', Z11K2: 'Example Label' } ]
				},
				Z17K1: 'Z6'
			}
		]
	},
	state,
	context,
	postMock;

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
		context = $.extend( {}, {
			// eslint-disable-next-line no-unused-vars
			commit: jest.fn( function ( mutationType, payload ) {
				return;
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
		it( 'returns current zObject', function () {
			state.zobject = $.extend( {}, zobject );

			expect( zobjectModule.getters.getCurrentZObject( state ) ).toEqual( zobject );
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
			state.zobject = $.extend( {}, zobject );

			expect( zobjectModule.getters.getNextKey( state ) ).toEqual( 2 );
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
		it( 'Initialize ZObject, set page details', function () {
			zobjectModule.actions.initializeZObject( context );

			expect( context.commit ).toHaveBeenCalledTimes( 2 );
			expect( context.commit ).toHaveBeenCalledWith( 'setCreateNewPage', true );
			expect( context.commit ).toHaveBeenCalledWith( 'setZObject', { Z1K1: 'Z2', Z2K1: 'Z0' } );
		} );

		it( 'Save new zobject', function () {
			context.getters.isCreateNewPage = true;
			context.getters.getCurrentZObject = zobject;
			zobjectModule.actions.submitZObject( context, 'A summary' );

			expect( mw.Api ).toHaveBeenCalledTimes( 1 );
			expect( postMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				summary: 'A summary',
				zobject: JSON.stringify( zobject )
			} );
			expect( context.commit ).toHaveBeenCalledTimes( 0 );
		} );

		it( 'Save existing zobject', function () {
			context.getters.isCreateNewPage = false;
			context.getters.getCurrentZObject = zobject;
			context.getters.getZid = 'Z0';
			zobjectModule.actions.submitZObject( context, 'A summary' );

			expect( mw.Api ).toHaveBeenCalledTimes( 1 );
			expect( postMock ).toHaveBeenCalledWith( {
				action: 'wikilambda_edit',
				summary: 'A summary',
				zid: 'Z0',
				zobject: JSON.stringify( zobject )
			} );
			expect( context.commit ).toHaveBeenCalledTimes( 0 );
		} );
	} );
} );
