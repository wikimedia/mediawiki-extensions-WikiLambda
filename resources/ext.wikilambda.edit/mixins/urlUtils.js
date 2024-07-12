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
		},
		/**
		 * Function to remove the hash from the URL silently
		 */
		removeHashFromURL: function () {
			// Get the current URL without the hash
			const url = window.location.href.split( '#' )[ 0 ];
			// Use replaceState to update the URL
			history.replaceState( null, '', url );
		},
		/**
		 * Check if the link href is the current path
		 *
		 * @param {string} linkHref
		 * @return {boolean}
		 */
		isLinkCurrentPath: function ( linkHref ) {
			const linkUrl = new URL( linkHref, window.location.origin );
			return linkUrl.pathname === window.location.pathname;
		}
	}
};
