/*!
 * WikiLambda Vue editor initialisation code
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createMwApp } = require( 'vue' );
const { createPinia } = require( 'pinia' );
const useMainStore = require( './store/index.js' );
const App = require( './components/App.vue' );

const pinia = createPinia();
const store = useMainStore( pinia );
window.vueInstance = createMwApp( Object.assign( {
	provide: function () {
		return {
			viewmode: store.getViewMode
		};
	}
}, App ) )
	.use( pinia )
	.mount( '#ext-wikilambda-app' );
