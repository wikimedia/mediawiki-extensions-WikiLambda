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
				},
				{
					page_namespace: 0,
					zid: 'Z8012'
				},
				{
					page_namespace: 0,
					zid: 'Z8013'
				}
			]
		}
	},
	getMock,
	getResolveMock,
	context;

describe( 'zTesters Vuex module ', function () {
	beforeEach( function () {
		getResolveMock = jest.fn( function ( thenFunction ) {
			return thenFunction( mockApiResponse );
		} );

		getMock = jest.fn( function () {
			return {
				then: getResolveMock
			};
		} );

		state = JSON.parse( JSON.stringify( zTestersModule.state ) );

		context = $.extend( {}, {
			// eslint-disable-next-line no-unused-vars
			commit: jest.fn( function ( mutationType, payload ) {
				return;
			} ),
			dispatch: jest.fn(),
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
	describe( 'Getters', function () {
		it( 'Returns empty list if there are no testers', function () {
			expect( zTestersModule.getters.getAllZTesters( state ) ).toEqual( [] );
		} );
		it( 'Returns only an attached zTester', function () {
			state.zAttachedTesters = mockZTesters[ 0 ];
			state.zUnattachedTesters = mockZTesters[ 1 ];
			expect( zTestersModule.getters.getAttachedZTesters( state ) ).toEqual( mockZTesters[ 0 ] );
		} );
		it( 'Returns only an unattached zTester', function () {
			state.zAttachedTesters = mockZTesters[ 0 ];
			state.zUnattachedTesters = mockZTesters[ 1 ];
			expect( zTestersModule.getters.getUnattachedZTesters( state ) ).toEqual( mockZTesters[ 1 ] );
		} );
		it( 'Returns all zTesters', function () {
			state.zAttachedTesters = [ mockZTesters[ 0 ] ];
			state.zUnattachedTesters = [ mockZTesters[ 1 ] ];
			expect( zTestersModule.getters.getAllZTesters( state ) ).toEqual( mockZTesters );
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
				context.dispatch = jest.fn( function ( zFunctionId ) {
					// eslint-disable-next-line compat/compat
					return new Promise( function ( resolve ) {
						zTestersModule.actions.fetchUnattachedZTesters( context, zFunctionId );
						resolve();
					} );
				} );
			} );
			it( 'Calls api.get for unattached zTesters', function () {
				var zFunctionId = 'Z801';
				return zTestersModule.actions.fetchUnattachedZTesters(
					context,
					zFunctionId
				).then( function () {
					expect( getMock ).toHaveBeenCalledWith( {
						action: 'query',
						list: 'wikilambdafn_search',
						format: 'json',
						wikilambdafn_zfunction_id: 'Z801',
						wikilambdafn_type: 'Z20'
					} );
				} );
			} );
		} );
		it( 'calls attached and unattached actions', function () {
			var payload = {
				zFunctionId: 'Z801',
				id: 7
			};

			zTestersModule.actions.fetchZTesters( context, payload );
			expect( context.dispatch ).toHaveBeenCalledWith( 'fetchUnattachedZTesters', 'Z801' );
			expect( context.dispatch ).toHaveBeenCalledWith( 'fetchAttachedZTesters', 7 );
		} );
	} );
} );
