var createLocalVue = require( '@vue/test-utils' ).createLocalVue,
	Vuex = require( 'vuex' );

var localVue = createLocalVue();
localVue.use( Vuex );
// we have to require this after the vue store is attached to the vue instance
var store = require( '../../../resources/ext.wikilambda.edit/store/index.js' );

describe( 'Vuex store (index.js)', function () {
	it( 'should export a function', function () {
		expect( store ).toBeInstanceOf( Vuex.Store );
	} );
}
);
