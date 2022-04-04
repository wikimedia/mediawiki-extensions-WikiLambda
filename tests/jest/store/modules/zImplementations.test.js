var zImplementationsModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/zImplementations.js' ),
	mockImplementation = [ {
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
	state;

describe( 'zImplementations Vuex module ', function () {
	beforeEach( function () {
		state = JSON.parse( JSON.stringify( zImplementationsModule.state ) );
	} );
	describe( 'Getters', function () {
		it( 'Returns empty list if there are no implementations', function () {
			expect( zImplementationsModule.getters.getZImplementations( state ) ).toEqual( [] );
		} );
		it( 'Returns a list of implementations', function () {
			state.zImplementations = mockImplementation;
			expect( zImplementationsModule.getters.getZImplementations( state ) ).toEqual( mockImplementation );
		} );
	} );

} );
