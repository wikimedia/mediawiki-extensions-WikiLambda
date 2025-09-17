/*!
 * WikiLambda Vue editor: Pinia store for frontend error-related state, actions, mutations and getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );

const { extractErrorData } = require( '../../utils/errorUtils.js' );
const { getValueFromCanonicalZMap } = require( '../../utils/schemata.js' );
const ErrorData = require( '../classes/ErrorData.js' );

module.exports = {
	state: {
		/**
		 * Collection of ErrorData objects by errorId.
		 *
		 * The errorId is an internal string identifier that
		 * uniquely points at a sub-zObject represented by a
		 * component. The root errorId ('main') identifies the
		 * whole object.
		 *
		 * This permits that different app granularity levels
		 * present errors in different ways. For example, a
		 * text field that represents a terminal ZString object
		 * can have an error state. This will be saved in the
		 * error module with the unique internal errorId that
		 * idetifies that sub-object. The component will use
		 * that errorId to grab all the errors associated to
		 * that field.
		 *
		 * Similarly, there can be a number of errors that are
		 * general and page-wide. These errors will be saved
		 * in the state using the root errorId and can be
		 * presented in a top-level component such as the
		 * Publish dialog window.
		 */
		errors: {}
	},

	getters: {
		/**
		 * Returns all the stored error Ids (which are the key paths
		 * to the failed object.
		 *
		 * @param {Object} state
		 * @return {Array}
		 */
		getErrorPaths: function ( state ) {
			return Object.keys( state.errors );
		},

		/**
		 * Returns all the errors for a given errorId.
		 * If error type is passed as second parameter, returns only
		 * the errors of the type ("error" or "warning").
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getErrors: function ( state ) {
			/**
			 * @param {string} errorId
			 * @param {string|undefined} type
			 * @return {Array}
			 */
			const findErrors = ( errorId, type = undefined ) => {
				const allErrors = state.errors[ errorId ] || [];
				return type ? allErrors.filter( ( error ) => error.type === type ) : allErrors;
			};
			return findErrors;
		},

		/**
		 * Returns if there are errors for a given errorId that have a specific message key.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		hasErrorByKey: function ( state ) {
			/**
			 * @param {string} errorId
			 * @param {string} errorMessageKey
			 * @return {boolean}
			 */
			const findErrorByKey = ( errorId, errorMessageKey ) => {
				const allErrors = state.errors[ errorId ] || [];
				return !!allErrors.some( ( error ) => error.messageKey === errorMessageKey );
			};
			return findErrorByKey;
		},

		/**
		 * Returns the errors that are child to this field.
		 * E.g. main.Z2K2.Z14K3.Z16K1 is child to main.Z2K2.Z14K3
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getChildErrorKeys: function ( state ) {
			/**
			 * @param {string} keyPath
			 * @return {Array}
			 */
			const findChildErrors = ( keyPath ) => {
				const errorPaths = Object.keys( state.errors );
				return errorPaths.filter( ( path ) => path.startsWith( keyPath + '.' ) );
			};
			return findChildErrors;
		}
	},

	actions: {
		/**
		 * Builds an ErrorData object and stores it for a given errorId.
		 * Any error that's set for the errorId 'main' is considered page-wide.
		 *
		 * @param {Object} payload
		 * @param {string} payload.errorId
		 * @param {string} payload.errorMessage
		 * @param {string} payload.errorMessageKey
		 * @param {string[]} payload.errorParams
		 * @param {string} payload.errorType literal string: "error" or "warning"
		 */
		setError: function ( payload ) {
			const {
				errorId = Constants.STORED_OBJECTS.MAIN,
				errorMessage,
				errorMessageKey,
				errorParams = [],
				errorType = Constants.ERROR_TYPES.ERROR,
				isPermanent = false
			} = payload;

			const errorData = ErrorData.buildErrorData( {
				errorMessage,
				errorMessageKey,
				errorParams,
				errorType,
				isPermanent
			} );

			this.errors[ errorId ] = this.errors[ errorId ] || [];
			this.errors[ errorId ].push( errorData );
		},

		/**
		 * Extracts the error data from metadata, builds the error message and
		 * runs the callback function to set the error with the available error
		 * message or the fallback message if metadata error wasn't found.
		 *
		 * @param {Object} payload
		 * @param {Object|null} payload.metadata - ZMap with metadata which may contain an errors key
		 * @param {Object} fallbackErrorData - error to set if no errors key is found
		 * @param {Function} errorHandler - function for handling the error when found
		 */
		handleMetadataError: function ( payload ) {
			const {
				metadata,
				fallbackErrorData,
				errorHandler
			} = payload;

			// If metadata is null, apply fallback error and exit
			if ( !metadata ) {
				errorHandler( fallbackErrorData );
				return;
			}

			const error = getValueFromCanonicalZMap( metadata, 'errors' );
			const errorData = extractErrorData( error );

			// If metadata doesn't have error information, apply fallback error and exit
			if ( !errorData ) {
				errorHandler( fallbackErrorData );
				return;
			}

			// If error is Z500/generic and has a string (Z500)K1, show that as error message
			if ( errorData.errorType === Constants.Z_GENERIC_ERROR && errorData.stringArgs.length ) {
				errorHandler( { errorMessage: errorData.stringArgs[ 0 ].value } );
				return;
			}

			// Finally, asynchronously fetch errorType and, if fetched,
			// set its label as error message
			this.fetchZids( { zids: [ errorData.errorType ] } ).then( () => {
				if ( this.getStoredObject( errorData.errorType ) ) {
					errorHandler( { errorMessage: this.getLabelData( errorData.errorType ).label } );
				} else {
					errorHandler( fallbackErrorData );
				}
			} );
		},

		/**
		 * Clears all errors for a given errorId
		 *
		 * @param {string} errorId
		 * @param {boolean} isPermanent
		 */
		clearErrors: function ( errorId, isPermanent = false ) {
			if ( errorId in this.errors ) {
				this.errors[ errorId ] = this.errors[ errorId ]
					.filter( ( error ) => error.isPermanent !== isPermanent );
			}
		},

		/**
		 * Clears all errors for a given errorId that have a specific key
		 *
		 * @param {Object} payload
		 * @param {string} payload.errorId
		 * @param {string} payload.errorMessageKey
		 */
		clearErrorsByKey: function ( payload ) {
			const { errorId, errorMessageKey } = payload;
			if ( errorId in this.errors ) {
				this.errors[ errorId ] = this.errors[ errorId ]
					.filter( ( error ) => error.messageKey !== errorMessageKey );
			}
		},

		/**
		 * Clears field validation errors (doesn't clear global ones)
		 */
		clearValidationErrors: function () {
			for ( const errorId in this.errors ) {
				if ( errorId !== Constants.STORED_OBJECTS.MAIN ) {
					this.errors[ errorId ] = [];
				}
			}
		},

		/**
		 * Clears all errors.
		 *
		 * @param {boolean} isPermanent
		 */
		clearAllErrors: function ( isPermanent = false ) {
			this.clearValidationErrors();
			this.clearErrors( Constants.STORED_OBJECTS.MAIN, isPermanent );
		}
	}
};
