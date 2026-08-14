/**
 * WikiLambda Vue editor: Error handling utils
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../Constants.js' );
const { hybridToCanonical } = require( './schemata.js' );
const { isLocalKey, isValidZidFormat } = require( './typeUtils.js' );

const errorUtils = {
	/**
	 * Returns the global key that identifies an error value key.
	 * The value of an error is an instance of the generic type Z885/Errortype to
	 * type, so its keys can arrive in local form (K1, K2…). The labels are stored
	 * with the global keys of the error type (Z592K1, Z592K2…), so add the error
	 * type to the local keys. Keys that are already global stay unchanged.
	 *
	 * @param {string} key
	 * @param {string|Object} errorType
	 * @return {string}
	 */
	getGlobalErrorKey: function ( key, errorType ) {
		return ( isLocalKey( key ) && isValidZidFormat( errorType ) ) ?
			`${ errorType }${ key }` :
			key;
	},

	/**
	 * Extract error information and nested error children form a parent error/Z5 object.
	 * Returns an object with the following structure/error description:
	 * * errorType: zid of the error type/Z50 object
	 * * errorMessage: string built with the error type label and the string arguments
	 * * children: nested errors found in the error value
	 * * stringArgs: string arguments found in the error value, with their keys
	 *   in global form (Z592K1) even if the error value uses local keys (K1)
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
					stringArgs.push( { key: errorUtils.getGlobalErrorKey( key, errorType ), value } );
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
	},

	/**
	 * Extract the data of every warning/Z5 raised by a function call, given
	 * the value of the 'warnings' key of its metadata. This value is a typed
	 * list of errors: the first item gives the type of the list, so this
	 * method removes it. This method also removes each item that is not a
	 * well formed error.
	 *
	 * @param {Mixed} value
	 * @return {Array} of objects, with the structure returned by extractErrorData
	 */
	extractWarningsData: function ( value ) {
		const warnings = Array.isArray( value ) ? value.slice( 1 ) : [ value ];
		return warnings
			.map( ( warning ) => errorUtils.extractErrorData( warning ) )
			.filter( ( data ) => !!data );
	},

	/**
	 * Sanitize a string for safe HTML rendering.
	 * Escapes dangerous characters for HTML injection: & < > " ' / ` =
	 * Safer than DOM cleanup option.
	 *
	 * @param {string} input
	 * @return {string}
	 */
	escapeHtml: function ( input ) {
		if ( input === null || input === undefined ) {
			return '';
		}
		const s = ( typeof input === 'string' ) ? input : String( input );
		const replacement = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
			'/': '&#x2F;',
			'`': '&#x60;',
			'=': '&#x3D;'
		};
		return s.replace( /[&<>"'`=/]/g, ( char ) => replacement[ char ] );
	}
};

module.exports = errorUtils;
