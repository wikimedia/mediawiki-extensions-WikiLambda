/*!
 * WikiLambda Vue editor: Pinia store for Visual Editor function call configuration
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
const { isValidZidFormat } = require( '../../mixins/typeUtils.js' ).methods;

module.exports = {
	state: {
		veFunctionId: null,
		veFunctionParams: [],
		suggestedFunctions: []
	},

	getters: {
		/**
		 * FIXME add doc and tests
		 *
		 * @param {Object} state
		 * @return {string|null}
		 */
		getVEFunctionId: function ( state ) {
			return state.veFunctionId;
		},
		/**
		 * FIXME add doc and tests
		 *
		 * @param {Object} state
		 * @return {Array}
		 */
		getVEFunctionParams: function ( state ) {
			return state.veFunctionParams;
		},
		/**
		 * FIXME add doc and tests
		 *
		 * @param {Object} state
		 * @return {Array}
		 */
		getSuggestedFunctions: function ( state ) {
			return state.suggestedFunctions;
		},
		/**
		 * Returns whether the current wikitext function ID
		 * is a known valid function ID.
		 *
		 * @param {Object} state
		 * @return {boolean}
		 */
		validateVEFunctionId: function ( state ) {
			// Return false if:
			// * Function ID is falsy;
			// * ID is not a valid ZID;
			if ( !state.veFunctionId || !isValidZidFormat( state.veFunctionId ) ) {
				return false;
			}

			// Return false if:
			// * ZID is not yet fetched;
			// * ZID returned not found;
			const fetchedObject = this.getFetchedObject( state.veFunctionId );
			if ( !fetchedObject || !fetchedObject.success ) {
				return false;
			}

			// Return false if:
			// * Object fetched is not a function
			const objectType = fetchedObject.data[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_OBJECT_TYPE ];
			return objectType === Constants.Z_FUNCTION;
		},
		/**
		 * Returns whether the current wikitext function params
		 * are valid with respect to the selected function signature
		 *
		 * @param {Object} state
		 * @return {boolean}
		 */
		validateVEFunctionParams: function () {
			// TODO Validate input params
			return true;
		}
	},

	actions: {
		/**
		 * FIXME add doc and tests
		 *
		 * @param {string|null} functionId
		 */
		setVEFunctionId: function ( functionId = null ) {
			this.veFunctionId = functionId;
		},
		/**
		 * FIXME add doc and tests
		 *
		 * @param {Array} functionParams
		 */
		setVEFunctionParams: function ( functionParams = [] ) {
			this.veFunctionParams = functionParams;
		},
		/**
		 * FIXME add doc and tests
		 *
		 * @param {number} index
		 * @param {string} param
		 */
		setVEFunctionParam: function ( index, param ) {
			this.veFunctionParams[ index ] = param;
		},
		/**
		 * FIXME add doc and tests
		 *
		 * @param {Array} zids
		 */
		setSuggestedFunctions: function ( zids ) {
			this.suggestedFunctions = zids;
			// Fetch will only go through once
			this.fetchZids( { zids } );
		},
		/**
		 * FIXME add doc and tests
		 *
		 * @param {Object} payload
		 * @param {string} payload.functionId
		 * @param {Array} payload.functionParams
		 * @param {Array} payload.suggestedFunctions
		 */
		initializeVEFunctionCallEditor: function ( payload = {} ) {
			this.setVEFunctionId( payload.functionId );
			this.setVEFunctionParams( payload.functionParams );
			this.setSuggestedFunctions( payload.suggestedFunctions );
			// Fetch selected function
			if ( payload.functionId ) {
				this.fetchZids( { zids: [ payload.functionId ] } );
			}
		}
	}
};
