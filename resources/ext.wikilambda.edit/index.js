/*!
 * WikiLambda Vue editor initialisation code
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Vue = require( 'vue' ),
	VueRouter = require( '../lib/vue-router/vue-router.common.js' ),
	SdButton = require( './components/base/Button.vue' ),
	router = require( './router.js' ),
	store = require( './store/index.js' ),
	App = require( './components/App.vue' );

Vue.component( 'sd-button', SdButton );
Vue.use( VueRouter );

// eslint-disable-next-line no-new
new Vue( {
	el: '#ext-wikilambda-app',
	store: store,
	router: router,
	render: function ( h ) {
		return h( App );
	},
	provide: function () {
		return {
			viewmode: store.getters.getViewMode
		};
	}
} );
