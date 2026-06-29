/**
 * WikiLambda Vue editor: miscellaneous utilities
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const miscUtils = {
	/**
	 * Get the text of the edit summary message for when changes are made to a Function
	 *
	 * @param {string} message The key of the message to fetch
	 * @param {string[]} ZIDs The ZIDs of the affected linked Implementations or Testers
	 * @return {string} The rendered message
	 */
	createConnectedItemsChangesSummaryMessage: function ( message, ZIDs ) {
		// Messages that can be used here:
		// * wikilambda-updated-implementations-approved-summary
		// * wikilambda-updated-implementations-deactivated-summary
		// * wikilambda-updated-testers-approved-summary
		// * wikilambda-updated-testers-deactivated-summary
		return mw.message( message ).params( [ mw.language.listToText( ZIDs ) ] ).text();
	},

	/**
	 * Safely retrieves the value of a nested property within an object.
	 *
	 * This function will not throw an error if any part of the path is `null` or `undefined`.
	 *
	 * @param {Object} obj - The object from which to retrieve the property.
	 * @param {string} path - The path to the desired property, specified as a string with dot notation.
	 * @return {string|undefined} - The value of the nested property, or `undefined`
	 * if any part of the path is `null` or `undefined`.
	 *
	 * @example
	 *
	 * const error = {
	 *     error: {
	 *         message: 'Something went wrong!'
	 *     }
	 * };
	 *
	 * const message = getNestedProperty(error, 'error.message');
	 * console.log(message); // Output: 'Something went wrong!'
	 *
	 * const code = getNestedProperty(error, 'error.code');
	 * console.log(code); // Output: undefined
	 *
	 * const nonExistent = getNestedProperty(null, 'error.message');
	 * console.log(nonExistent); // Output: undefined
	 */
	getNestedProperty: function ( obj, path ) {
		return path.split( '.' ).reduce( ( acc, part ) => {
			if ( acc && acc[ part ] !== undefined && acc[ part ] !== null ) {
				return acc[ part ];
			}
			return undefined;
		}, obj );
	},

	/**
	 * Check if two arrays are equal.
	 *
	 * @param {Array} arr1 - The first array to compare.
	 * @param {Array} arr2 - The second array to compare.
	 * @return {boolean} - True if the arrays are equal, false otherwise.
	 */
	arraysAreEqual: function ( arr1, arr2 ) {
		return arr1.length === arr2.length && arr1.every( ( value, index ) => value === arr2[ index ] );
	},

	/**
	 *
	 * Custom throttle implementation.
	 * Ensures a function is called at most once in the specified delay period.
	 *
	 * @param {Function} func - The function to throttle.
	 * @param {number} delay - The delay in milliseconds.
	 * @return {Function} - The throttled function.
	 */
	throttle: function ( func, delay ) {
		let lastCall = 0;

		return function ( ...args ) {
			const now = Date.now();

			if ( now - lastCall >= delay ) {
				lastCall = now;
				func.apply( this, args );
			}
		};
	},

	/**
	 * Helper function: parse or null
	 *
	 * @param {any} value
	 * @return {Object|Array|null}
	 */
	tryJsonParse: function ( value ) {
		try {
			return JSON.parse( value );
		} catch ( error ) {
			return null;
		}
	},

	/**
	 * Computes SHA-256 hash of a string and returns it as a hex string.
	 *
	 * @param {string} input - The string to hash
	 * @return {Promise<string>} Promise resolving to the hex hash string
	 */
	sha256: async function ( input ) {
		const enc = new TextEncoder();
		const data = enc.encode( input );
		return crypto.subtle.digest( 'SHA-256', data ).then( ( hashBuf ) => {
			const hashArr = Array.from( new Uint8Array( hashBuf ) );
			return hashArr.map( ( b ) => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
		} );
	},

	/**
	 * Lightweight JSON standardizer. Walks a nested tree and:
	 * * if array, iterate through its children and recurse
	 * * if dictionary, order keys alphabetically and recurse
	 * * other types, exit and don't recurse
	 *
	 * @param {Object|Array|string} value
	 * @return {Object|Array|string}
	 */
	stabilize: function ( value ) {
		// Iterate and recurse if array
		if ( Array.isArray( value ) ) {
			return value.map( miscUtils.stabilize );
		}
		// For an object, order keys and recurse
		if ( value !== null && typeof value === 'object' ) {
			return Object.keys( value )
				.sort()
				.reduce( ( acc, key ) => {
					acc[ key ] = miscUtils.stabilize( value[ key ] );
					return acc;
				}, {} );
		}
		// Exit if string, number, boolean, null, undefined...
		return value;
	}
};

module.exports = miscUtils;
