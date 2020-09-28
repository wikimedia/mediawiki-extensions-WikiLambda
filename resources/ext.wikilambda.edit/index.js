/*!
 * WikiLambda Vue editor initialisation code
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
( function () {
	var Vue = require( 'vue' ),
		ZobjectEditor = require( './ZobjectEditor.vue' );

	// eslint-disable-next-line no-new
	new Vue( {
		el: '#ext-wikilambda-editor',
		render: function ( h ) {
			return h( ZobjectEditor );
		}
	} );
}() );
