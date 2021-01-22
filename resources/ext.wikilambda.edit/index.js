/*!
 * WikiLambda Vue editor initialisation code
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
( function () {
	var Vue = require( 'vue' ),
		store = require( './store/index.js' ),
		ZObjectEditor = require( './components/ZObjectEditor.vue' ),
		ZObjectViewer = require( './components/ZObjectViewer.vue' );

	// eslint-disable-next-line no-new
	new Vue( {
		el: '#ext-wikilambda-editor',
		store: store,
		render: function ( h ) {
			return h( ZObjectEditor );
		}
	} );

	// eslint-disable-next-line no-new
	new Vue( {
		el: '#ext-wikilambda-view',
		store: store,
		render: function ( h ) {
			return h( ZObjectViewer );
		}
	} );
}() );
