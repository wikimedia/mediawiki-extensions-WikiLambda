/*!
 * WikiLambda Vuex code to manipulate the current ZObject.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var Constants = require( '../../../Constants.js' );

module.exports = exports = {
	state: {
		currentZid: Constants.NEW_ZID_PLACEHOLDER
	},
	mutations: {
		/**
		 * Set the value of the current Zid
		 *
		 * @param {Object} state
		 * @param {string} currentZid
		 */
		setCurrentZid: function ( state, currentZid ) {
			state.currentZid = currentZid;
		}
	},
	getters: {
		/**
		 * Return the complete zObject as a JSON
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @param {Object} rootState
		 * @param {Object} rootGetters
		 * @return {Array} zObjectJson
		 */
		getZObjectAsJson: function ( state, getters, rootState, rootGetters ) {
			return rootGetters.getZObjectAsJsonById( 0, rootState.zobjectModule.zobject[ 0 ].value === 'array' );
		},
		/**
		 * Return the root ZObjectId, equivalend to the Z_REFERENCE_ID of Z_PERSISTENTOBJECT_ID
		 *
		 * @param {Object} state
		 * @return {string} currentZObjectId
		 */
		getCurrentZObjectId: function ( state ) {
			return state.currentZid || Constants.NEW_ZID_PLACEHOLDER;
		},
		/**
		 * Return the root ZObjectId type
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {string} currentZObjectTypeId
		 */
		getCurrentZObjectType: function ( state, getters ) {
			var zobject = getters.getZObjectAsJson,
				type;

			if ( zobject && zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ] ) {
				type = zobject[
					Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_OBJECT_TYPE ];

				if ( typeof type === 'object' ) {
					type = type[ Constants.Z_REFERENCE_ID ];
				}
			}

			return type || false;
		},
		/**
		 * Return a boolean value indicating if the current zObject is executable.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {boolean}
		 */
		isCurrentZObjectExecutable: function ( state, getters ) {
			return [ Constants.Z_FUNCTION, Constants.Z_IMPLEMENTATION ].indexOf( getters.getCurrentZObjectType ) !== -1;
		},
		/**
		 * Return a boolean value indicating if the current Z Object has a label
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {boolean}
		 */
		currentZObjectIsValid: function ( state, getters ) {
			// TODO (T315099): we need a better way to surface errors to the user
			// (ex: you can't save because this is an implementation and there is no function defined)
			const zobject = getters.getZObjectAsJson;
			const zobjectType = getters.getCurrentZObjectType;

			const hasLabels = zobject &&
				zobject[ Constants.Z_PERSISTENTOBJECT_LABEL ][
					Constants.Z_MULTILINGUALSTRING_VALUE ].filter(
					function ( value ) {
						return value[ Constants.Z_MONOLINGUALSTRING_VALUE ] &&
							value[ Constants.Z_MONOLINGUALSTRING_VALUE ][
								Constants.Z_STRING_VALUE ];
					} ).length > 0;

			// if the new zObject is an implementation, a function is required to save
			if ( zobjectType === Constants.Z_IMPLEMENTATION ) {
				const hasFunction = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_IMPLEMENTATION_FUNCTION ][ Constants.Z_REFERENCE_ID ] !== '';
				return hasLabels && hasFunction;
			}

			// if the new zObject is a tester, a function is required to save
			if ( zobjectType === Constants.Z_TESTER ) {
				const hasFunction = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TESTER_FUNCTION ][ Constants.Z_REFERENCE_ID ] !== '';
				return hasLabels && hasFunction;
			}
			return hasLabels;
		},
		currentZFunctionHasInputs: function ( state, getters ) {
			if ( getters.getCurrentZObjectType !== Constants.Z_FUNCTION ) {
				return false;
			}

			var zobject = getters.getZObjectAsJson;
			if ( !zobject || !zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ] ||
				zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ] <= 1 ) {
				return false;
			}
			var argumentList = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ];
			// Remove argument type
			argumentList.shift();

			return argumentList.filter(
				function ( arg ) {
					var argumentTypeIsSet = !!arg[ Constants.Z_ARGUMENT_TYPE ],
						argumentMonolingualStringIsSet =
							arg[ Constants.Z_ARGUMENT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ]
								.filter(
									function ( label ) {
										return label[ Constants.Z_MONOLINGUALSTRING_VALUE ] &&
											label[ Constants.Z_MONOLINGUALSTRING_VALUE ][
												Constants.Z_STRING_VALUE ] !== '';
									} ).length > 0;

					return argumentTypeIsSet && argumentMonolingualStringIsSet;
				}
			).length > 0;
		},
		currentZFunctionHasOutput: function ( state, getters ) {
			if ( getters.getCurrentZObjectType !== Constants.Z_FUNCTION ) {
				return false;
			}

			var zobject = getters.getZObjectAsJson;

			return zobject &&
				!!zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_RETURN_TYPE ][ Constants.Z_REFERENCE_ID ];
		},
		currentZFunctionHasTesters: function ( state, getters ) {
			if ( getters.getCurrentZObjectType !== Constants.Z_FUNCTION ) {
				return false;
			}

			var zobject = getters.getZObjectAsJson;

			return zobject &&
				zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_TESTERS ].length > 0;
		},
		currentZFunctionHasImplementations: function ( state, getters ) {
			if ( getters.getCurrentZObjectType !== Constants.Z_FUNCTION ) {
				return false;
			}

			var zobject = getters.getZObjectAsJson;

			return zobject &&
				zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_IMPLEMENTATIONS ].length > 0;
		},
		currentZFunctionCompletionPercentage: function ( state, getters ) {
			var requiredSteps = [
				getters.currentZObjectIsValid,
				getters.currentZFunctionHasInputs,
				getters.currentZFunctionHasOutput,
				getters.currentZFunctionHasTesters,
				getters.currentZFunctionHasImplementations
			];

			return Math.round( requiredSteps.filter(
				function ( step ) {
					return step;
				}
			).length / requiredSteps.length * 100 );
		},
		currentZObjectLanguages: function ( state, getters ) {
			var languageList = [],
				zObjectLabels;

			if ( !getters.getZObjectAsJson ) {
				return;
			}

			zObjectLabels = getters.getZObjectAsJson[ Constants.Z_PERSISTENTOBJECT_LABEL ];

			// Don't break if the labels are set to {}
			if ( zObjectLabels[ Constants.Z_MULTILINGUALSTRING_VALUE ] ) {
				zObjectLabels[ Constants.Z_MULTILINGUALSTRING_VALUE ].forEach( function ( label ) {
					if ( label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] ) {
						languageList.push(
							label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_REFERENCE_ID ]
						);
					}
				} );
			}

			return languageList.map( function ( languageCode ) {
				return {
					Z1K1: Constants.Z_REFERENCE,
					[ Constants.Z_REFERENCE_ID ]: languageCode
				};
			} );
		},
		/**
		 * Return the boolean value, equivalend to if currentZObjectId is placeholder
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {boolean} isNewZObject
		 */
		isNewZObject: function ( state, getters ) {
			return getters.getCurrentZObjectId === Constants.NEW_ZID_PLACEHOLDER;
		}
	}
};
