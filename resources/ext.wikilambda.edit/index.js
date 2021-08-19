/*!
 * WikiLambda Vue editor initialisation code
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var SdButton = require( './components/base/Button.vue' );

( function () {
	var Vue = require( 'vue' ),
		store = require( './store/index.js' ),
		App = require( './components/App.vue' );

	Vue.component( 'sd-button', SdButton );

	// eslint-disable-next-line no-new
	new Vue( {
		el: '#ext-wikilambda-app',
		store: store,
		render: function ( h ) {
			return h( App );
		},
		provide: function () {
			return {
				viewmode: store.getters.getViewMode
			};
		}
	} );
}() );
