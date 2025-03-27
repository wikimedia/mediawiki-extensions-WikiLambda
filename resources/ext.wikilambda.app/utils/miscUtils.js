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
	}
};

module.exports = miscUtils;
