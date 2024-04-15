/*!
 * WikiLambda unit test suite loadComposable helper.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Vue = require( 'vue' );

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
