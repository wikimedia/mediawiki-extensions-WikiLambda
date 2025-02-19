/*!
 * WikiLambda Vue editor: Pinia store for Visual Editor function call configuration
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

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
		initializeVEFunctionCallEditor: function ( payload ) {
			this.setVEFunctionId( payload.functionId );
			this.setVEFunctionParams( payload.functionParams );
			this.setSuggestedFunctions( payload.suggestedFunctions );
			// Fetch selected function
			this.fetchZids( { zids: [ payload.functionId ] } );
		}
	}
};
