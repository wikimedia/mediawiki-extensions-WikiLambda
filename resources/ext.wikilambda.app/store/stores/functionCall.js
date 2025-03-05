/*!
 * WikiLambda Vue editor: Handle the request of function calls to the orchestrator. (Pinia)
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
const { performFunctionCall } = require( '../../utils/apiUtils.js' );
const { extractZIDs } = require( '../../utils/schemata.js' );
const { getZStringTerminalValue } = require( '../../utils/zobjectUtils.js' );

module.exports = {
	state: {},

	getters: {
		/**
		 * Returns whether the metadata object from the
		 * response contains any errors. An error is a
		 * map item where the key value is 'errors'.
		 *
		 * @return {boolean}
		 */
		hasMetadataErrors: function () {
			const metadata = this.getZObjectByKeyPath( [
				Constants.STORED_OBJECTS.RESPONSE,
				Constants.Z_RESPONSEENVELOPE_METADATA
			] );
			if ( !metadata ) {
				return undefined;
			}
			const map = metadata[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ].slice( 1 );
			return map.find( ( item ) => getZStringTerminalValue(
				item[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ] ) === 'errors' );
		}
	},

	actions: {
		/**
		 * Calls orchestrator and sets orchestrationResult
		 *
		 * @param {Object} payload
		 * @param {Object} payload.functionCall
		 * @param {Array} payload.resultKeyPath
		 * @return {Promise}
		 */
		callZFunction: function ( { functionCall, resultKeyPath } ) {
			return performFunctionCall( {
				functionCall,
				language: this.getUserLangCode
			} ).then( ( data ) => {
				// Asynchronously collect the necessary labels
				const zids = extractZIDs( data.response );
				this.fetchZids( { zids } );

				// Success, we store the response
				this.setValueByKeyPath( {
					keyPath: resultKeyPath,
					value: data.response
				} );
			} ).catch( ( error ) => {
				// Error, we set response error
				this.setError( {
					errorId: Constants.STORED_OBJECTS.RESPONSE,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessage: error.messageOrFallback( Constants.ERROR_CODES.UNKNOWN_EXEC_ERROR )
				} );
			} );
		}
	}
};
