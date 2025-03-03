/*!
 * WikiLambda Vue editor initialisation code
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createMwApp } = require( 'vue' );
const { createPinia } = require( 'pinia' );

const components = require( './components/index.js' );
const useMainStore = require( './store/index.js' );

// Conditionally mount App.vue:
// If wgWikilambda config variable is available, we want to mount WikiLambda App.
// Else, we just export the components needed from external modules.
if ( mw.config.get( 'wgWikiLambda' ) ) {
	const pinia = createPinia();
	const store = useMainStore( pinia );
	window.vueInstance = createMwApp( Object.assign( {
		provide: function () {
			return {
				viewmode: store.getViewMode
			};
		}
	}, components.App ) )
		.use( pinia )
		.mount( '#ext-wikilambda-app' );
}

module.exports = Object.assign(
	{ useMainStore },
	components
);
