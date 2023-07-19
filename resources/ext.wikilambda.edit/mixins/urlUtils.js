/*!
 * WikiLambda Vue URL manipulation utilities code
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
module.exports = exports = {
	methods: {
		getParameterByName: function ( name ) {
			const uri = mw.Uri();
			return uri.query[ name ] || null;
		}
	}
};
