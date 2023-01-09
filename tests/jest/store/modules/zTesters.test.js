var zTestersModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zTesters.js' ),
	createGettersWithFunctionsMock = require( '../../helpers/getterHelpers.js' ).createGettersWithFunctionsMock,
	state,
	mockZTesters = [ {
		Z1K1: 'Z2',
		Z2K1: 'Z20',
		Z2K2: {
			Z1K1: 'Z4',
			Z4K1: 'Z20',
			Z4K2: [
				{
					Z1K1: 'Z3',
					Z3K1: 'Z8',
					Z3K2: 'Z20K1',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'function'
							}
						]
					}
				},
				{
					Z1K1: 'Z3',
					Z3K1: 'Z7',
					Z3K2: 'Z20K2',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'call'
							}
						]
					}
				},
				{
					Z1K1: 'Z3',
					Z3K1: 'Z7',
					Z3K2: 'Z20K3',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'result validation'
							}
						]
					}
				}
			],
			Z4K3: 'Z120'
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [
				{
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'Tester'
				}
			]
		}
	},
	{
		Z1K1: 'Z2',
		Z2K1: 'Z20',
		Z2K2: {
			Z1K1: 'Z4',
			Z4K1: 'Z20',
			Z4K2: [
				{
					Z1K1: 'Z3',
					Z3K1: 'Z8',
					Z3K2: 'Z20K1',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'function'
							}
						]
					}
				},
				{
					Z1K1: 'Z3',
					Z3K1: 'Z7',
					Z3K2: 'Z20K2',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'call'
							}
						]
					}
				},
				{
					Z1K1: 'Z3',
					Z3K1: 'Z7',
					Z3K2: 'Z20K3',
					Z3K3: {
						Z1K1: 'Z12',
						Z12K1: [
							{
								Z1K1: 'Z11',
								Z11K1: 'Z1002',
								Z11K2: 'result validation'
							}
						]
					}
				}
			],
			Z4K3: 'Z120'
		},
		Z2K3: {
			Z1K1: 'Z12',
			Z12K1: [
				{
					Z1K1: 'Z11',
					Z11K1: 'Z1002',
					Z11K2: 'Tester'
				}
			]
		}
	} ],
	mockApiResponse = {
		batchcomplete: '',
		query: {
			wikilambdafn_search: [
				{
					page_namespace: 0,
					zid: 'Z8010'
				},
				{
					page_namespace: 0,
					zid: 'Z8011'
				}
			]
		}
	},
	mockPaginatedItems = { 1: 'page 1', 2: 'page 2' },
	commitMock,
	getMock,
	getResolveMock,
	context,
	getters;

describe( 'zTesters Vuex module ', function () {
	beforeEach( function () {
		commitMock = jest.fn( function () {
			return;
		} );

		getResolveMock = jest.fn( function ( thenFunction ) {
			return thenFunction( mockApiResponse );
		} );

		getMock = jest.fn( function () {
			return {
				then: getResolveMock
			};
		} );

		getters = {
			paginateList: jest.fn( () => mockPaginatedItems )
		};

		state = JSON.parse( JSON.stringify( zTestersModule.state ) );

		context = $.extend( {}, {
			commit: commitMock,
			dispatch: jest.fn( function () {
				return {
					then: function ( thenFunction ) {
						return thenFunction();
					}
				};
			} ),
			getters: {
				getZObjectChildrenById: createGettersWithFunctionsMock( [ 'Z123123' ] )
			}
		} );

		mw.Api = jest.fn( function () {
			return {
				get: getMock
			};
		} );

	} );
	describe( 'Getters', () => {
		describe( 'getZTesters', () => {
			it( 'returns empty list if there are no testers', function () {
				expect( zTestersModule.getters.getZTesters( state ) ).toEqual( [] );
			} );
			it( 'returns zTesters if they exist', function () {
				state.zTesters = mockZTesters;
				expect( zTestersModule.getters.getZTesters( state ) ).toEqual( mockZTesters );
			} );
		} );
		describe( 'getPaginatedTesters', () => {
			it( 'returns paginated testers', function () {
				state.zTesters = mockZTesters;
				expect( zTestersModule.getters.getPaginatedTesters( state, getters ) )
					.toEqual( mockPaginatedItems );
				expect( getters.paginateList ).toHaveBeenCalledWith( mockZTesters );
			} );
		} );
	} );
	describe( 'Mutations', () => {
		describe( 'setZTesters', () => {
			it( 'sets testers in the state', function () {
				zTestersModule.mutations.setZTesters( state, mockZTesters );
				expect( state.zTesters ).toEqual( mockZTesters );
			} );
		} );
	} );
	describe( 'Actions', function () {
		describe( 'fetchUnattachedZTesters', function () {
			beforeEach( function () {
				context.state = {
					zobject: [
						{ id: 0, value: 'object' }
					]
				};
				context.rootState = {
					zobjectModule: context.state
				};
			} );
			it( 'Calls api.get for zTesters and sets response in state', function () {
				var zFunctionId = 'Z801';
				return zTestersModule.actions.fetchZTesters(
					context,
					zFunctionId
				).then( function () {
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdafn_search',
						format: 'json',
						wikilambdafn_zfunction_id: 'Z801',
						wikilambdafn_type: 'Z20',
						wikilambdafn_limit: 100
					} );
					expect( commitMock ).toHaveBeenCalledWith( 'setZTesters', [ 'Z8010', 'Z8011' ] );
				} );
			} );
		} );
	} );
} );
