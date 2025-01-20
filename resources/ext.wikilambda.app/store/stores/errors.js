/*!
 * WikiLambda Vue editor: Pinia store for frontend error-related state, actions, mutations and getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = {
	state: {
		/**
		 * Collection of errors by rowId.
		 *
		 * The rowId is an internal integer identifier that
		 * uniquely points at a sub-zObject represented by a
		 * component. The root rowId (0) identifies the whole
		 * object.
		 *
		 * This permits that different app granularity levels
		 * present errors in different ways. For example, a
		 * text field that represents a terminal ZString object
		 * can have an error state. This will be saved in the
		 * error module with the unique internal rowId that
		 * idetifies that sub-object. The component will use
		 * that rowId to grab all the errors associated to
		 * that field.
		 *
		 * Similarly, there can be a number of errors that are
		 * general and page-wide. These errors will be saved
		 * in the state using the root rowId (0) and can be
		 * presented in a top-level component such as the
		 * Publish dialog window.
		 *
		 * The error object will have this shape:
		 *
		 * errors: {
		 *  0: [
		 *    { message: "some error message", code: undefined, type: "error" },
		 *    { message: undefined, code: "wikilambda-unknown-warning", type: "warning" },
		 *    ...
		 *  ],
		 *  1: [],
		 *  ...
		 * }
		 */
		errors: {}
	},

	getters: {
		/**
		 * Returns all the stored errors, flattened into an array.
		 *
		 * @param {Object} state
		 * @return {Object}
		 */
		getAllErrors: function ( state ) {
			let allErrors = [];
			for ( const rowId in state.errors ) {
				allErrors = allErrors.concat( state.errors[ rowId ] );
			}
			return allErrors;
		},

		/**
		 * Returns all the errors for a given rowId.
		 * If error type is passed as second parameter, returns only
		 * the errors of the type ("error" or "warning").
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getErrors: function ( state ) {
			/**
			 * @param {number} rowId
			 * @param {string|undefined} type
			 * @return {Array}
			 */
			return ( rowId, type = undefined ) => {
				const allErrors = state.errors[ rowId ];
				if ( !allErrors ) {
					return [];
				}
				if ( type ) {
					return allErrors.filter( ( error ) => error.type === type );
				}
				return allErrors;
			};
		}
	},

	actions: {
		/**
		 * Set an error for a given rowId or a generic page-wide error.
		 * Any error that's set to rowId = 0 is considered page-wide.
		 *
		 * @param {Object} payload
		 * @param {number} payload.rowId
		 * @param {string} payload.errorMessage
		 * @param {string} payload.errorCode
		 * @param {string} payload.errorType literal string: "error" or "warning"
		 */
		setError: function ( payload ) {
			if ( payload.rowId === undefined ) {
				payload.rowId = 0;
			}
			if ( !( payload.rowId in this.errors ) ) {
				this.errors[ payload.rowId ] = [];
			}
			const errorPayload = {
				message: payload.errorMessage,
				code: payload.errorCode,
				type: payload.errorType
			};
			this.errors[ payload.rowId ].push( errorPayload );
		},

		/**
		 * Clears all errors for a given rowId
		 *
		 * @param {number} rowId
		 */
		clearErrors: function ( rowId = 0 ) {
			if ( rowId in this.errors ) {
				this.errors[ rowId ] = [];
			}
		},

		/**
		 * Clears field validation errors (doesn't clear global ones)
		 */
		clearValidationErrors: function () {
			for ( const rowId in this.errors ) {
				if ( rowId > 0 ) {
					this.errors[ rowId ] = [];
				}
			}
		},

		/**
		 * Clears all errors.
		 */
		clearAllErrors: function () {
			this.clearValidationErrors();
			this.clearErrors( 0 );
		}
	}
};
