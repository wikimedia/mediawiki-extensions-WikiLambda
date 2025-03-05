/*!
 * WikiLambda Vue editor: Pinia store for frontend error-related state, actions, mutations and getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );

module.exports = {
	state: {
		/**
		 * Collection of errors by errorId.
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
		 *
		 * The error object will have this shape:
		 *
		 * errors: {
		 *  main: [
		 *    { message: "some error message", code: undefined, type: "error" },
		 *    { message: undefined, code: "wikilambda-unknown-warning", type: "warning" },
		 *    ...
		 *  ],
		 *  main.Z2K2.Z8K1: [],
		 *  ...
		 * }
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
		 * Returns if there are errors for a given errorId that have a specific code.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		hasErrorByCode: function ( state ) {
			/**
			 * @param {string} errorId
			 * @param {string} code
			 * @return {boolean}
			 */
			const findErrorByCode = ( errorId, code ) => {
				const allErrors = state.errors[ errorId ] || [];
				return !!allErrors.some( ( error ) => error.code === code );
			};
			return findErrorByCode;
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
		 * Set an error for a given errorId.
		 * Any error that's set for the errorId 'main' is considered page-wide.
		 *
		 * @param {Object} payload
		 * @param {string} payload.errorId
		 * @param {string} payload.errorMessage
		 * @param {string} payload.errorCode
		 * @param {string} payload.errorType literal string: "error" or "warning"
		 */
		setError: function ( payload ) {
			const {
				errorId = Constants.STORED_OBJECTS.MAIN,
				errorMessage,
				errorCode,
				errorType
			} = payload;

			this.errors[ errorId ] = this.errors[ errorId ] || [];
			this.errors[ errorId ].push( { message: errorMessage, code: errorCode, type: errorType } );
		},

		/**
		 * Clears all errors for a given errorId
		 *
		 * @param {string} errorId
		 */
		clearErrors: function ( errorId ) {
			if ( errorId in this.errors ) {
				this.errors[ errorId ] = [];
			}
		},

		/**
		 * Clears all errors for a given errorId that have a specific code
		 *
		 * @param {Object} payload
		 * @param {string} payload.errorId
		 * @param {string} payload.errorCode
		 */
		clearErrorsByCode: function ( payload ) {
			const { errorId, code } = payload;
			if ( errorId in this.errors ) {
				this.errors[ errorId ] = this.errors[ errorId ]
					.filter( ( error ) => error.code !== code );
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
		 */
		clearAllErrors: function () {
			this.clearValidationErrors();
			this.clearErrors( Constants.STORED_OBJECTS.MAIN );
		}
	}
};
