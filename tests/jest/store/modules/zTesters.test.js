var zTestersModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zTesters.js' ),
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
	} ];

describe( 'zTesters Vuex module ', function () {
	beforeEach( function () {
		state = JSON.parse( JSON.stringify( zTestersModule.state ) );
	} );
	describe( 'Getters', function () {
		it( 'Returns empty list if there are no testers', function () {
			expect( zTestersModule.getters.getZTesters( state ) ).toEqual( [] );
		} );
		it( 'Returns a zTester', function () {
			state.zTesters = mockZTesters;
			expect( zTestersModule.getters.getZTesters( state ) ).toEqual( mockZTesters );
		} );
	} );
} );
