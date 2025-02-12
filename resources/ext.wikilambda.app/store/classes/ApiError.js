/*!
 * WikiLambda ApiError class
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
const utils = require( '../../mixins/utilsMixins.js' ).methods;

/**
 * ApiError class contains a set of utilities to transform any kind of
 * errors into a standard object usable by all components of the app.
 *
 * @class
 * @property {string} code
 * @property {Object} response
 */
class ApiError extends Error {

	constructor( code, response ) {
		super();
		this.code = code;
		this.response = response;
	}

	/**
	 * Returns the most accurate and informative error message from the
	 * available error data. When the error is a ZError, returns a message
	 * crafted from its ZError body (if possible).
	 *
	 * If there's no message or response has the wrong structure, returns undefined
	 *
	 * @return {string|undefined}
	 */
	get message() {
		const error = utils.getNestedProperty( this.response, 'error' );
		if ( typeof error !== 'object' ) {
			return undefined;
		}

		// Special treatment for ZErrors
		const errorCode = utils.getNestedProperty( error, 'code' );
		if ( errorCode === 'wikilambda-zerror' ) {
			const errorMessage = this.messageForZError;
			if ( errorMessage ) {
				return errorMessage;
			}
		}

		return this.response.error.message || this.response.error.info;
	}

	/**
	 * Special case for some ZErrors: extract error message from the body
	 * of the ZError object
	 *
	 * @return {string|undefined}
	 */
	get messageForZError() {
		const errorType = utils.getNestedProperty( this.response.error.zerror, Constants.Z_ERROR_TYPE );
		switch ( errorType ) {
			// Z500: Return content of first key (message)
			case Constants.Z_ERRORS.Z_ERROR_UNKNOWN:
				return utils.getNestedProperty( this.response.error.zerror, `${ Constants.Z_ERROR_VALUE }.K1` );

			// Z548: Return content of first key (message)
			case Constants.Z_ERRORS.Z_ERROR_INVALID_JSON:
				return utils.getNestedProperty( this.response.error.zerror, `${ Constants.Z_ERROR_VALUE }.K1` );

			// Z557: Return content of first key (message)
			case Constants.Z_ERRORS.Z_ERROR_USER_CANNOT_EDIT:
				return utils.getNestedProperty( this.response.error.zerror, `${ Constants.Z_ERROR_VALUE }.K1` );

			default:
				return undefined;
		}
	}

	/**
	 * Returns the error message if this was an intentionally raised error in the API (with
	 * dieWithError or dieWithZError) and there's an available error message in the payload.
	 * Else, it returns the string for the i18n message passed as the fallbackCode argument.
	 * If no argument, it returns an even more generic error message (UNKNOWN_ERROR).
	 *
	 * @param {string} fallbackCode valid i18n message code
	 * @return {string} error message
	 */
	messageOrFallback( fallbackCode = null ) {
		return ( this.code === 'http' && this.message ) ?
			this.message :
			mw.message( fallbackCode || Constants.errorCodes.UNKNOWN_ERROR ).text();
	}

	/**
	 * Static method to handle mw.Api rejected promises and convert the rejection
	 * arguments into a more standard ApiError object. Since mw.Api uses jQuery
	 * Deferreds, there can be up to four arguments:
	 *
	 * * jQuery AJAX failures:
	 *   * code string is 'http'
	 *   * arg2 contains an Object like { xhr: JQuery.jqXHR, textStatus: string, exception: string }
	 *
	 * * API failures:
	 *   * code string is 'internal_api_error_' + error type
	 *   * arg2 contains a response Object like { error: { code: string, info: string, ... }, servedby: string }
	 *   * arg3 contains the same as arg2
	 *   * arg4 contains a JQuery.jqXHR object
	 *
	 * Use it as a mw.Api() Promise rejection callback function:
	 *
	 * ```
	 * function callApi () {
	 *   const api = new mw.Api();
	 *   return api
	 *     .post( { action: 'some_action_api' } )
	 *     .then( ( data ) => data )
	 *     .catch( ApiError.fromMwApiRejection );
	 * }
	 *
	 * callApi()
	 *   .then( ( data ) => doSomethingWith( data ) )
	 *   .catch( ( error ) => {
	 *     // error is an ApiError instance
	 *     // print error message returned in the response
	 *     console.log( error.message );
	 *     // print error message, if any; else, the fallback error message
	 *     console.log( error.messageorfallback() );
	 *     // print error message, if any; else, the string passed as argument
	 *     console.log( error.messageorfallback( 'something went wrong' ) );
	 *   } );
	 * ```
	 *
	 * @param {string} code
	 * @param {Object} arg2
	 * @param {Object|undefined} _arg3
	 * @param {Object|undefined} _arg4
	 * @return {ApiError}
	 */
	// eslint-disable-next-line no-unused-vars
	static fromMwApiRejection( code, arg2, _arg3, _arg4 ) {
		let response;
		if ( code === 'http' ) {
			// jQuery AJAX failure:
			// arg2.xhr contains an object of class jQuery.jqXHR
			response = arg2.xhr.responseJSON;
		} else {
			// API failure:
			// arg2 and arg3 contain a response object
			// arg4 contains an object of class jQuery.jqXHR
			response = arg2;
		}
		return new ApiError( code, response );
	}
}

module.exports = exports = ApiError;
