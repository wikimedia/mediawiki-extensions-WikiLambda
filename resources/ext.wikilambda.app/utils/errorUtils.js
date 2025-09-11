/**
 * WikiLambda Vue editor: Error handling utils
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../Constants.js' );
const { hybridToCanonical } = require( './schemata.js' );

const errorUtils = {
	/**
	 * Extract error information and nested error children form a parent error/Z5 object.
	 * Returns an object with the following structure/error description:
	 * * errorType: zid of the error type/Z50 object
	 * * errorMessage: string built with the error type label and the string arguments
	 * * children: nested errors found in the error value
	 * * stringArgs: string arguments found in the error value
	 * Children contains an array which can have zero or N items of this same structure.
	 *
	 * @param {Object} zobject
	 * @return {Array} of objects
	 */
	extractErrorData: function ( zobject ) {
		/**
		 * @param {Object} error object
		 * @return {Object|undefined}
		 */
		const extractNestedErrors = ( error ) => {
			// If this object is null or not an error; exit
			if ( !error || error.Z1K1 !== Constants.Z_ERROR ) {
				return undefined;
			}

			// Gather error type from Z5K1/error type
			const errorType = error[ Constants.Z_ERROR_TYPE ];

			// Gather keys from Z5K2/value, excluding Z1K1
			const errorKeys = Object
				.keys( error[ Constants.Z_ERROR_VALUE ] )
				.filter( ( key ) => key !== Constants.Z_OBJECT_TYPE );

			// Gather string arguments and nested errors separately, and ignore all the rest
			const stringArgs = [];
			const children = [];

			for ( const key of errorKeys ) {
				const value = error[ Constants.Z_ERROR_VALUE ][ key ];
				// value is a string: add it to string arguments
				if ( typeof value === 'string' ) {
					stringArgs.push( { key, value } );
					continue;
				}
				// value is an array of errors: extract nested errors for each one
				if ( Array.isArray( value ) && value[ 0 ] === Constants.Z_ERROR ) {
					for ( const item of value.slice( 1 ) ) {
						const suberrorItem = extractNestedErrors( item );
						if ( suberrorItem ) {
							children.push( suberrorItem );
						}
					}
					continue;
				}
				// else; extract nested error
				const suberror = extractNestedErrors( value );
				if ( suberror ) {
					children.push( suberror );
				}
			}

			return { errorType, children, stringArgs };
		};

		// Canonicalize whole error (just in case) before extracting its data
		const canonicalError = hybridToCanonical( zobject );
		return extractNestedErrors( canonicalError );
	}
};

module.exports = errorUtils;
