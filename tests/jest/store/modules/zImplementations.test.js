var zImplementationsModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zImplementations.js' ),
	mockImplementations = [
		{
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
		},
		{
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
		}
	],
	mockApiResponse = {
		batchcomplete: '',
		query: {
			wikilambdafn_search: [
				{
					page_namespace: 0,
					zid: 'Z10001'
				},
				{
					page_namespace: 0,
					zid: 'Z10002'
				}
			]
		}
	},
	mockPaginatedItems = { 1: 'page 1', 2: 'page 2' },
	state,
	context,
	commitMock,
	getMock,
	getResolveMock,
	getters;

describe( 'zImplementations Vuex module ', () => {
	beforeEach( () => {
		commitMock = jest.fn( () => {
			return;
		} );

		getResolveMock = jest.fn( ( thenFunction ) => {
			return thenFunction( mockApiResponse );
		} );

		getMock = jest.fn( () => {
			return {
				then: getResolveMock
			};
		} );

		getters = {
			paginateList: jest.fn( () => mockPaginatedItems )
		};

		state = JSON.parse( JSON.stringify( zImplementationsModule.state ) );

		context = $.extend( {}, {
			commit: commitMock,
			dispatch: jest.fn( () => {
				return {
					then: ( thenFunction ) => {
						return thenFunction();
					}
				};
			} )

		} );

		mw.Api = jest.fn( () => {
			return {
				get: getMock
			};
		} );
	} );

	describe( 'Getters', () => {
		describe( 'getZImplementations', () => {
			it( 'returns empty list if there are no implementations', function () {
				expect( zImplementationsModule.getters.getZImplementations( state ) ).toEqual( [] );
			} );
			it( 'returns a non-empty list if there are implementations', function () {
				state.zImplementations = mockImplementations;
				expect(
					zImplementationsModule.getters.getZImplementations( state )
				).toEqual( mockImplementations );
			} );
		} );
		describe( 'getPaginatedImplementations', () => {
			it( 'returns paginated implementations', function () {
				state.zImplementations = mockImplementations;
				expect( zImplementationsModule.getters.getPaginatedImplementations( state, getters ) )
					.toEqual( mockPaginatedItems );
				expect( getters.paginateList ).toHaveBeenCalledWith( mockImplementations );
			} );
		} );
	} );
	describe( 'Mutations', () => {
		describe( 'setZImplementations', () => {
			it( 'sets implementations in the state', function () {
				zImplementationsModule.mutations.setZImplementations( state, mockImplementations );
				expect( state.zImplementations ).toEqual( mockImplementations );
			} );
		} );
	} );
	describe( 'Actions', () => {
		describe( 'fetchZImplementations', () => {
			beforeEach( () => {
				context.state = {
					zobject: [
						{ id: 0, value: 'object' }
					]
				};
				context.rootState = {
					zobjectModule: context.state
				};
			} );

			it( 'Calls api.get for zImplementations and sets response in state', () => {
				var zFunctionId = 'Z801';
				return zImplementationsModule.actions.fetchZImplementations(
					context,
					zFunctionId
				).then( () => {
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdafn_search',
						format: 'json',
						wikilambdafn_zfunction_id: 'Z801',
						wikilambdafn_type: 'Z14'
					} );
					expect( commitMock ).toHaveBeenCalledWith( 'setZImplementations', [ 'Z10001', 'Z10002' ] );
				} );
			} );
		} );
	} );
} );
