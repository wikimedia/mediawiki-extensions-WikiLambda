/*!
 * WikiLambda Vue editor initialisation code
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
( function () {
	var Vue = require( 'vue' ),
		store = require( './store/index.js' ),
		ZobjectEditor = require( './ZobjectEditor.vue' ),
		ZobjectViewer = require( './ZobjectViewer.vue' );

	// eslint-disable-next-line no-new
	new Vue( {
		el: '#ext-wikilambda-editor',
		store: store,
		render: function ( h ) {
			return h( ZobjectEditor );
		}
	} );
	// eslint-disable-next-line no-new
	new Vue( {
		el: '#ext-wikilambda-view',
		store: store,
		render: function ( h ) {
			return h( ZobjectViewer );
		}
	} );
}() );
