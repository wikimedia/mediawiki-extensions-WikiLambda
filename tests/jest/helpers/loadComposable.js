var Vue = require( 'vue' );

module.exports = function loadComposable( composable ) {
	let result;
	const app = Vue.createApp( {
		setup() {
			result = composable();
			// suppress missing template warning
			return () => {};
		}
	} );
	app.mount( document.createElement( 'div' ) );
	// return the result and the app instance
	// for testing provide / unmount
	return [ result, app ];
};
