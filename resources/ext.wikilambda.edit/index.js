/*!
 * WikiLambda Vue editor initialisation code
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Vue = require( 'vue' ),
	router = require( './router.js' ),
	store = require( './store/index.js' ),
	App = require( './components/App.vue' );

window.vueInstance = Vue.createMwApp( $.extend( {
	router: router,
	provide: function () {
		return {
			viewmode: store.getters.getViewMode
		};
	}
}, App ) )
	.use( store )
	.mount( '#ext-wikilambda-app' );
