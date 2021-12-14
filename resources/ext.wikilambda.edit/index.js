/*!
 * WikiLambda Vue editor initialisation code
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Vue = require( 'vue' ),
	router = require( './router.js' ),
	store = require( './store/index.js' ),
	App = require( './components/App.vue' );

Vue.createMwApp( $.extend( {
	store: store,
	router: router,
	provide: function () {
		return {
			viewmode: store.getters.getViewMode
		};
	}
}, App ) )
	.mount( '#ext-wikilambda-app' );
