var zImplementationsModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zImplementations.js' ),
	mockImplementationOne = [ {
		Z1K1: 'Z14',
		Z14K1: {
			Z1K1: 'Z9',
			Z9K1: ''
		},
		Z14K2: {
			Z1K1: 'Z7',
			Z7K1: ''
		},
		Z14K3: undefined
	} ],
	mockImplementationTwo = [ {
		Z1K1: 'Z14',
		Z14K1: {
			Z1K1: 'Z9',
			Z9K1: ''
		},
		Z14K2: {
			Z1K1: 'Z7',
			Z7K1: ''
		},
		Z14K3: ''
	} ],
	mockApiResponse = {
		batchcomplete: '',
		query: {
			wikilambdafn_search: [
				{
					page_namespace: 0,
					zid: 'Z901'
				},
				{
					page_namespace: 0,
					zid: 'Z10001'
				},
				{
					page_namespace: 0,
					zid: 'Z10003'
				},
				{
					page_namespace: 0,
					zid: 'Z10004'
				},
				{
					page_namespace: 0,
					zid: 'Z10005'
				},
				{
					page_namespace: 0,
					zid: 'Z10006'
				}
			]
		}
	},
	state,
	context,
	getMock,
	getResolveMock;

describe( 'zImplementations Vuex module ', function () {
	beforeEach( function () {
		getResolveMock = jest.fn( function ( thenFunction ) {
			return thenFunction( mockApiResponse );
		} );

		getMock = jest.fn( function () {
			return {
				then: getResolveMock
			};
		} );

		state = JSON.parse( JSON.stringify( zImplementationsModule.state ) );

		context = $.extend( {}, {
			// eslint-disable-next-line no-unused-vars
			commit: jest.fn( function ( mutationType, payload ) {
				return;
			} ),
			dispatch: jest.fn(),
			getters: {}
		} );

		mw.Api = jest.fn( function () {
			return {
				get: getMock
			};
		} );
	} );

	describe( 'Getters', function () {
		it( 'Returns empty list if there are no implementations', function () {
			expect( zImplementationsModule.getters.getAllZImplementations( state ) ).toEqual( [] );
		} );
		it( 'Returns a list of only attached implementations', function () {
			state.zAttachedImplementations = mockImplementationOne;
			state.zUnattachedImplementations = mockImplementationTwo;
			expect(
				zImplementationsModule.getters.getAttachedZImplementations( state )
			).toEqual( mockImplementationOne );
		} );
		it( 'Returns a list of only unattached implementations', function () {
			state.zAttachedImplementations = mockImplementationOne;
			state.zUnattachedImplementations = mockImplementationTwo;
			expect(
				zImplementationsModule.getters.getUnattachedZImplementations( state )
			).toEqual( mockImplementationTwo );
		} );
		it( 'Returns a list of all implementations', function () {
			state.zUnattachedImplementations = mockImplementationTwo;
			state.zAttachedImplementations = mockImplementationOne;
			expect(
				zImplementationsModule.getters.getAllZImplementations( state )
			).toEqual( mockImplementationOne.concat( mockImplementationTwo ) );
		} );
	} );
	describe( 'Actions', function () {
		describe( 'fetchUnattachedZImplementations', function () {
			beforeEach( function () {
				context.state = {
					zobject: [
						{ id: 0, value: 'object' }
					]
				};
				context.rootState = {
					zobjectModule: context.state
				};
				context.dispatch = jest.fn( function ( zFunctionId ) {
					// eslint-disable-next-line compat/compat
					return new Promise( function ( resolve ) {
						zImplementationsModule.actions.fetchUnattachedZImplementations( context, zFunctionId );
						resolve();
					} );
				} );
			} );

			it( 'Calls api.get for unattached zImplementations', function () {
				var zFunctionId = 'Z801';
				return zImplementationsModule.actions.fetchUnattachedZImplementations(
					context,
					zFunctionId
				).then( function () {
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdafn_search',
						format: 'json',
						wikilambdafn_zfunction_id: 'Z801',
						wikilambdafn_type: 'Z14'
					} );
				} );
			} );
		} );
		it( 'calls attached and unattached actions', function () {
			var payload = {
				zFunctionId: 'Z801',
				id: 7
			};

			zImplementationsModule.actions.fetchZImplementations( context, payload );
			expect( context.dispatch ).toHaveBeenCalledWith( 'fetchUnattachedZImplementations', 'Z801' );
			expect( context.dispatch ).toHaveBeenCalledWith( 'fetchAttachedZImplementations', 7 );
		} );
	} );

} );
