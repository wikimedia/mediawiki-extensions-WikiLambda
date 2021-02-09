/*!
 * WikiLambda Vue editor initialisation code
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

( function () {
	var Vue = require( 'vue' ),
		store = require( './store/index.js' ),
		App = require( './components/App.vue' );

	// eslint-disable-next-line no-new
	new Vue( {
		el: '#ext-wikilambda-app',
		store: store,
		render: function ( h ) {
			return h( App );
		}
	} );
}() );
