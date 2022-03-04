var Vuex = require( 'vuex' );

var store = require( '../../../resources/ext.wikilambda.edit/store/index.js' );

describe( 'Vuex store (index.js)', function () {
	it( 'should export a function', function () {
		expect( store ).toBeInstanceOf( Vuex.Store );
	} );
}
);
