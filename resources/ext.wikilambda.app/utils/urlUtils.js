/*!
 * WikiLambda Vue URL manipulation utilities code
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const urlUtils = {
	/**
	 * Normalize a base URL into an absolute URL string.
	 *
	 * Accepts protocol-relative URLs (e.g. //wikifunctions.org) and
	 * prefixes them with the current page protocol when available.
	 *
	 * @param {string|undefined} baseUrl
	 * @return {string|undefined}
	 */
	normalizeBaseUrl: function ( baseUrl ) {
		if ( !baseUrl || typeof baseUrl !== 'string' || !baseUrl.startsWith( '//' ) ) {
			return baseUrl;
		}
		const protocol = typeof window !== 'undefined' && window.location && window.location.protocol ?
			window.location.protocol :
			'https:';
		return `${ protocol }${ baseUrl }`;

	},

	/**
	 * Extract an entity ID from a pasted URL.
	 *
	 * Users often paste a link instead of typing an ID, for example
	 * https://www.wikifunctions.org/wiki/Z801,
	 * https://www.wikifunctions.org/view/fr/Z801 or
	 * https://www.wikidata.org/wiki/Lexeme:L29564#S1
	 *
	 * Only URLs are examined, so a search by label is not affected. The
	 * caller decides whether the returned string is an ID that it accepts.
	 *
	 * @param {string} input
	 * @return {string|null} The ID in the URL, or null if there is none
	 */
	extractIdFromUrl: function ( input ) {
		if ( typeof input !== 'string' ) {
			return null;
		}

		// Anything that is not a URL is a search term; leave it alone
		const trimmed = input.trim();
		if ( !/^(https?:)?\/\//.test( trimmed ) ) {
			return null;
		}

		try {
			const url = new URL( urlUtils.normalizeBaseUrl( trimmed ) );

			// The page title is either the last part of the path, as in
			// /wiki/Z801 and /view/fr/Z801, or the title parameter, as in
			// /w/index.php?title=Z801
			const segments = url.pathname.split( '/' ).filter( ( segment ) => !!segment );
			const title = url.searchParams.get( 'title' ) || segments[ segments.length - 1 ];
			if ( !title ) {
				return null;
			}

			// Remove the namespace, if there is one, as in Lexeme:L29564
			const id = decodeURIComponent( title ).replace( /^[^:]+:/, '' );

			// Wikidata puts the Lexeme form or sense in the fragment, so the
			// sense S1 of the Lexeme L29564 is at Lexeme:L29564#S1
			const fragment = url.hash.slice( 1 );
			return /^[FS]\d+$/.test( fragment ) ? `${ id }-${ fragment }` : id;
		} catch ( error ) {
			return null;
		}
	},

	/**
	 * Generate a URL for viewing a ZObject.
	 *
	 * @param {Object} payload - The options for generating the URL.
	 * @param {string} payload.langCode - The language code.
	 * @param {string} payload.zid - The ZObject ID.
	 * @param {Object} [payload.params] - Optional query parameters.
	 * @param {string} [payload.baseUrl] - Optional base URL to prepend.
	 * @return {string} - The generated URL.
	 */
	generateViewUrl: function ( { langCode, zid, params = {}, baseUrl = undefined } ) {
		const path = `/view/${ langCode }/${ zid }`;
		const query = new URLSearchParams( params ).toString();
		const queryString = query ? `?${ query }` : '';
		const url = `${ path }${ queryString }`;

		const configuredBaseUrl = mw.config.get( 'wgWikifunctionsBaseUrl' );
		const targetBaseUrl = urlUtils.normalizeBaseUrl( baseUrl || configuredBaseUrl );

		if ( targetBaseUrl ) {
			// Ensure no double slashes when joining
			return new URL( url, targetBaseUrl ).toString();
		}

		// Return relative path
		return url;
	},

	/**
	 * Generate a URL for editing a ZObject.
	 *
	 * @param {Object} payload - The options for generating the URL.
	 * @param {string} payload.langCode - The language code.
	 * @param {string} payload.zid - The ZObject ID.
	 * @param {Object} [payload.params] - Optional query parameters.
	 * @param {string} [payload.hash] - Optional hash to append.
	 * @param {string} [payload.baseUrl] - Optional base URL to prepend.
	 * @return {string} - The generated URL.
	 */
	generateEditUrl: function ( { langCode, zid, params = {}, hash = undefined, baseUrl = undefined } ) {
		const path = `/wiki/${ zid }`;
		const query = new URLSearchParams( params ).toString();
		const baseQuery = `?uselang=${ langCode }&action=edit`;
		const queryString = query ? `${ baseQuery }&${ query }` : baseQuery;
		// The App will automatically scroll to the hash
		const hashString = hash ? `#${ hash }` : '';
		const url = `${ path }${ queryString }${ hashString }`;

		const configuredBaseUrl = mw.config.get( 'wgWikifunctionsBaseUrl' );
		const targetBaseUrl = urlUtils.normalizeBaseUrl( baseUrl || configuredBaseUrl );
		if ( targetBaseUrl ) {
			return new URL( url, targetBaseUrl ).toString();
		}
		return url;
	},

	/**
	 * Get a parameter by name from the URL
	 *
	 * @param {string} name
	 * @return {string|null}
	 */
	getParameterByName: function ( name ) {
		return new URL( window.location.href ).searchParams.get( name );
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
	 * Convert URLSearchParams to a regular object
	 *
	 * @param {URLSearchParams} searchParams - The URLSearchParams object to convert.
	 * @return {Object} - An object representation of the search parameters.
	 */
	searchParamsToObject: function ( searchParams ) {
		const result = {};
		searchParams.forEach( ( value, key ) => {
			result[ key ] = value;
		} );
		return result;
	},

	/**
	 * Function to get query parameters from the current URL
	 *
	 * @param {string} url
	 * @return {Object} - An object containing the query parameters from the current URL.
	 */
	getQueryParamsFromUrl: function ( url ) {
		const searchParams = new URL( url ).searchParams;
		return this.searchParamsToObject( searchParams );
	},

	/**
	 * Generate a shareable URL for a function call.
	 * The URL appends the encoded function call to the current page URL.
	 *
	 * @param {Object} canonicalFunctionCall - The function call object in canonical form.
	 * @return {string} - The generated shareable URL with encoded function call.
	 */
	generateShareUrl: function ( canonicalFunctionCall ) {
		// Convert to JSON (URLSearchParams will handle encoding)
		const jsonString = JSON.stringify( canonicalFunctionCall );

		// Use the current page URL (without existing query params)
		const url = new URL( window.location.href );
		// Clear existing query params
		url.search = '';
		// Add the call parameter (URLSearchParams.set will encode it)
		url.searchParams.set( 'call', jsonString );

		return url.toString();
	},
	/**
	 * Build title of an Abstract Wiki page given the namespace
	 * and the Wikidata Item Id (qid), where namespace can be
	 * empty or non-empty string
	 *
	 * @param {string} ns
	 * @param {string} qid
	 * @return {string}
	 */
	buildAbstractWikiTitle: function ( ns, qid ) {
		return ns ? `${ ns }:${ qid }` : qid;
	}
};

module.exports = urlUtils;
