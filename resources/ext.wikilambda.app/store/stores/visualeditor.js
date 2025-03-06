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
		veEditing: false,
		veFunctionId: null,
		veFunctionParams: [],
		veFunctionParamsValid: false,
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
		 * Returns whether the Visual Editor is currently editing.
		 *
		 * @param {Object} state
		 * @return {boolean}
		 */
		getVEEditing: function ( state ) {
			return state.veEditing;
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
		}
	},
	actions: {
		/**
		 * Sets the Visual Editor function ID in the state.
		 *
		 * @param {string|null} functionId - The function ID to set.
		 */
		setVEFunctionId: function ( functionId = null ) {
			this.veFunctionId = functionId;
		},

		/**
		 * Sets the Visual Editor function parameters in the state.
		 *
		 * @param {Array} functionParams - The function parameters to set.
		 */
		setVEFunctionParams: function ( functionParams = [] ) {
			this.veFunctionParams = functionParams;
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
		 * Sets the editing state of the Visual Editor.
		 *
		 * @param {boolean} isEditing - True if editing, otherwise false.
		 */
		setVEEditing: function ( isEditing ) {
			this.veEditing = isEditing;
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
		 * Initializes the Visual Editor function call editor with the given payload.
		 *
		 * @param {Object} payload - The initialization payload.
		 * @param {string} payload.functionId - The function ID to initialize with.
		 * @param {Array} payload.functionParams - The function parameters to initialize with.
		 * @param {Array} payload.suggestedFunctions - The suggested functions to initialize with.
		 * @param {boolean} payload.isEditing - True if editing, otherwise false.
		 */
		initializeVEFunctionCallEditor: function ( payload = {} ) {
			this.setVEEditing( payload.isEditing );
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
