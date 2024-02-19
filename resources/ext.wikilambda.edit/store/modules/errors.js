/*!
 * WikiLambda Vue editor: Store module for frontend error-related state, actions, mutations and getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

module.exports = exports = {
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
		 * the errors of the  type ("error" or "warning").
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
			function getErrorsByRowId( rowId, type = undefined ) {
				const allErrors = state.errors[ rowId ];
				if ( !allErrors ) {
					return [];
				}
				return type ?
					allErrors.filter( ( error ) => error.type === type ) :
					allErrors;
			}
			return getErrorsByRowId;
		}
	},
	actions: {
		/**
		 * Set an error for a given rowId or a generic page-wide error.
		 * Any error that's set to rowId = 0 is considered page-wide.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {number} payload.rowId
		 * @param {string} payload.errorMessage
		 * @param {string} payload.errorCode
		 * @param {string} payload.errorType literal string: "error" or "warning"
		 */
		setError: function ( context, payload ) {
			context.commit( 'setError', payload );
		},

		/**
		 * Clears all errors given a rowId
		 *
		 * @param {Object} context
		 * @param {number} rowId
		 */
		clearErrors: function ( context, rowId = 0 ) {
			context.commit( 'clearErrorsForId', rowId );
		},

		/**
		 * Clears all validation errors
		 *
		 * @param {Object} context
		 */
		clearValidationErrors: function ( context ) {
			context.commit( 'clearValidationErrors' );
		},

		/**
		 * Clears all errors.
		 *
		 * @param {Object} context
		 */
		clearAllErrors: function ( context ) {
			context.commit( 'clearValidationErrors' );
			context.commit( 'clearErrorsForId', 0 );
		}
	},
	mutations: {
		/**
		 * Pushes a new error data into the store
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {number} payload.rowId
		 * @param {string} payload.errorMessage
		 * @param {string} payload.errorCode
		 * @param {string} payload.errorType literal string: "error" or "warning"
		 */
		setError: function ( state, payload ) {
			if ( payload.rowId === undefined ) {
				payload.rowId = 0;
			}
			if ( !( payload.rowId in state.errors ) ) {
				state.errors[ payload.rowId ] = [];
			}
			const errorPayload = {
				message: payload.errorMessage,
				code: payload.errorCode,
				type: payload.errorType
			};
			state.errors[ payload.rowId ].push( errorPayload );
		},

		/**
		 * Sets all errors states to false for a given rowId.
		 *
		 * @param {Object} state
		 * @param {number} rowId
		 */
		clearErrorsForId: function ( state, rowId ) {
			if ( rowId in state.errors ) {
				state.errors[ rowId ] = [];
			}
		},

		/**
		 * Clears all errors from validating concrete fields
		 *
		 * @param {Object} state
		 */
		clearValidationErrors: function ( state ) {
			for ( const rowId in state.errors ) {
				if ( rowId > 0 ) {
					state.errors[ rowId ] = [];
				}
			}
		}
	}
};
