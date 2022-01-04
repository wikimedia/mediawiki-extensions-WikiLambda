/*!
 * WikiLambda Vue URL manipulation utilities code
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
module.exports = {
	methods: {
		getParameterByName: function ( name ) {
			name = name.replace( /[[]]/g, '\\$&' );
			var regex = new RegExp( '[?&]' + name + '(=([^&#]*)|&|#|$)' ),
				results = regex.exec( window.location.href );
			if ( !results ) {
				return null;
			}

			if ( !results[ 2 ] ) {
				return '';
			}

			return decodeURIComponent( results[ 2 ].replace( /\+/g, ' ' ) );
		}
	}
};
