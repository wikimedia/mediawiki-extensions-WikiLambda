/*!
 * WikiLambda Vue editor initialisation code
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createMwApp } = require( 'vue' ),
	store = require( './store/index.js' ),
	App = require( './components/App.vue' );

window.vueInstance = createMwApp( Object.assign( {
	provide: function () {
		return {
			viewmode: store.getters.getViewMode
		};
	}
}, App ) )
	.use( store )
	.mount( '#ext-wikilambda-app' );
