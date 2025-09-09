/*!
 * WikiLambda Vue editor: Pinia store for Visual Editor function call configuration
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
const { isValidZidFormat } = require( '../../utils/typeUtils.js' );

module.exports = {
	state: {
		veFunctionId: null,
		veFunctionParams: [],
		veFunctionParamsValid: false,
		veFunctionParamsDirty: false,
		searchTerm: '',
		lookupResults: [],
		newParameterSetup: true,
		suggestedFunctions: []
	},

	getters: {
		/**
		 * Returns the current Visual Editor function ID.
		 *
		 * @param {Object} state
		 * @return {string|null}
		 */
		getVEFunctionId: function ( state ) {
			return state.veFunctionId;
		},

		/**
		 * Returns the current Visual Editor function parameters.
		 *
		 * @param {Object} state
		 * @return {Array}
		 */
		getVEFunctionParams: function ( state ) {
			return state.veFunctionParams;
		},

		/**
		 * Returns the list of suggested functions.
		 *
		 * @param {Object} state
		 * @return {Array}
		 */
		getSuggestedFunctions: function ( state ) {
			return state.suggestedFunctions;
		},

		/**
		 * Returns the current search term.
		 *
		 * @param {Object} state
		 * @return {string}
		 */
		getSearchTerm: function ( state ) {
			return state.searchTerm;
		},

		/**
		 * Returns the current lookup results.
		 *
		 * @param {Object} state
		 * @return {Array}
		 */
		getLookupResults: function ( state ) {
			return state.lookupResults;
		},

		/**
		 * Returns whether the current Visual Editor function ID
		 * is valid and corresponds to a known function object.
		 *
		 * @param {Object} state - The state object.
		 * @return {boolean} - True if the function ID is valid, otherwise false.
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
		 * Returns whether the current Visual Editor function parameters
		 * are valid based on the selected function signature.
		 *
		 * @param {Object} state - The state object.
		 * @return {boolean} - True if the parameters are valid, otherwise false.
		 */
		validateVEFunctionParams: function ( state ) {
			return state.veFunctionParamsValid;
		},

		/**
		 * Returns whether the function parameters setup was newly
		 * initialized with blank values. This happens whenever a new
		 * function zid is selected due to:
		 * * this is a new function call insertion, or
		 * * the function call being edited had a non-valid function id
		 *
		 * @param {Object} state
		 * @return {boolean}
		 */
		isNewParameterSetup: function ( state ) {
			return state.newParameterSetup;
		},

		/**
		 * Returns whether the function parameters setup has
		 * had any changes since initialization.
		 *
		 * @param {Object} state
		 * @return {boolean}
		 */
		isParameterSetupDirty: function ( state ) {
			return state.veFunctionParamsDirty;
		}
	},
	actions: {

		/**
		 * Submit an interaction event using Metrics Platform for Visual Editor
		 *
		 * @param {string} action - The action to submit.
		 * @example action: search-change-query, search-choose-function, preview-change-query, function-link-click
		 */
		submitVEInteraction: function ( action ) {
			if ( window.ve && typeof window.ve.track === 'function' ) {
				window.ve.track( 'activity.WikifunctionsCall', {
					action
				} );
			}
		},

		/**
		 * Sets the Visual Editor function ID in the state.
		 *
		 * @param {string|null} functionId - The function ID to set.
		 */
		setVEFunctionId: function ( functionId = null ) {
			this.veFunctionId = functionId;
		},

		/**
		 * Sets the Visual Editor function parameters in the state,
		 * and sets all its related flags to their initial states.
		 *
		 * @param {Array} functionParams - The function parameters to set.
		 */
		setVEFunctionParams: function ( functionParams = [] ) {
			this.veFunctionParams = functionParams;
			// Initialize param setup flags:
			this.veFunctionParamsValid = false;
			this.veFunctionParamsDirty = false;
			this.newParameterSetup = ( functionParams.length === 0 );
		},

		/**
		 * Sets a specific Visual Editor function parameter by index.
		 *
		 * @param {number} index - The index of the parameter to set.
		 * @param {string} param - The parameter value to set.
		 */
		setVEFunctionParam: function ( index, param ) {
			this.veFunctionParams[ index ] = param;
		},

		/**
		 * Sets the validity of the Visual Editor function parameters.
		 *
		 * @param {boolean} isValid - True if valid, otherwise false.
		 */
		setVEFunctionParamsValid: function ( isValid ) {
			this.veFunctionParamsValid = isValid;
		},

		/**
		 * Sets the flag that reflects whether the function parameter
		 * setup has changed from its initial state.
		 */
		setVEFunctionParamsDirty: function () {
			this.veFunctionParamsDirty = true;
		},

		/**
		 * Sets the list of suggested functions in the state.
		 *
		 * @param {Array} zids - Array of function ZIDs to set.
		 */
		setSuggestedFunctions: function ( zids = [] ) {
			this.suggestedFunctions = zids;
			// Fetch will only go through once
			this.fetchZids( { zids } );
		},

		/**
		 * Sets the current Visual Editor function search term.
		 *
		 * @param {string} searchTerm - The search term to set.
		 */
		setSearchTerm: function ( searchTerm = '' ) {
			this.searchTerm = searchTerm;
		},

		/**
		 * Sets the current Visual Editor function lookup results.
		 *
		 * @param {Array} lookupResults - The lookup results to set.
		 */
		setLookupResults: function ( lookupResults = [] ) {
			this.lookupResults = lookupResults;
		},

		/**
		 * Initializes the Visual Editor function call editor with the given payload.
		 *
		 * @param {Object} payload - The initialization payload.
		 * @param {string} payload.functionId - The function ID to initialize with.
		 * @param {Array} payload.functionParams - The function parameters to initialize with.
		 * @param {Array} payload.suggestedFunctions - The suggested functions to initialize with.
		 */
		initializeVEFunctionCallEditor: function ( payload = {} ) {
			// Reset the function selection
			this.setVEFunctionId( payload.functionId );
			this.setVEFunctionParams( payload.functionParams );
			this.setSuggestedFunctions( payload.suggestedFunctions );
			// Also reset the search state
			this.setSearchTerm( '' );
			this.setLookupResults( [] );
		}
	}
};
