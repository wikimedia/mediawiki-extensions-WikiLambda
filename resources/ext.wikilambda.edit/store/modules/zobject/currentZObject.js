/*!
 * WikiLambda Vuex code to manipulate the current ZObject.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
var Constants = require( '../../../Constants.js' );

/**
 * Adds languages found in the zObject name labels to the given langsList.
 *
 * @param {Object} getters
 * @param {Array} langsList
 */
function addLanguagesFromNameLabels( getters, langsList ) {
	var zObjectLabels = getters.getZObjectAsJson[ Constants.Z_PERSISTENTOBJECT_LABEL ];
	// Don't break if the labels are set to {}
	if ( zObjectLabels[ Constants.Z_MULTILINGUALSTRING_VALUE ] ) {
		zObjectLabels[ Constants.Z_MULTILINGUALSTRING_VALUE ].forEach( function ( label ) {
			if ( label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] ) {
				var lang = label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_REFERENCE_ID ];
				if ( langsList.indexOf( lang ) === -1 ) {
					langsList.push(
						label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_REFERENCE_ID ]
					);
				}
			}
		} );
	}
}

/**
 * Adds languages found in the zObject argument labels to the given langsList.
 *
 * @param {Object} getters
 * @param {Array} langsList
 */
function addLanguagesFromArgumentLabels( getters, langsList ) {
	if ( getters.getZObjectAsJson[ Constants.Z_PERSISTENTOBJECT_VALUE ] ) {
		var zArguments =
		getters.getZObjectAsJson[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ];
		if ( zArguments ) {
			zArguments.forEach( function ( arg ) {
				// Don't break if the labels are set to {}
				if ( arg[ Constants.Z_ARGUMENT_LABEL ] &&
						arg[ Constants.Z_ARGUMENT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ] ) {
					arg[ Constants.Z_ARGUMENT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ].forEach(
						function ( label ) {
							if ( label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ] ) {
								var lang =
								label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_REFERENCE_ID ];
								if ( langsList.indexOf( lang ) === -1 ) {
									langsList.push(
										label[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ][ Constants.Z_REFERENCE_ID ]
									);
								}
							}
						} );
				}
			} );
		}
	}
}

/**
 * Adds languages found in the zObject alias name labels to the given langsList.
 *
 * @param {Object} getters
 * @param {Array} langsList
 */
function addLanguagesFromAliasLabels( getters, langsList ) {
	var zAliases = getters.getZObjectAsJson[ Constants.Z_PERSISTENTOBJECT_ALIASES ];

	// Don't break if the labels are set to {}
	if ( zAliases[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ] ) {
		zAliases[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ].forEach( function ( alias ) {
			if ( alias[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ] ) {
				var lang = alias[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ][ Constants.Z_REFERENCE_ID ];
				if ( langsList.indexOf( lang ) === -1 ) {
					langsList.push(
						alias[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ][ Constants.Z_REFERENCE_ID ]
					);
				}
			}
		} );
	}
}

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
		// TODO: use this check for ZFunction warnings
		currentZFunctionHasValidInputs: function ( state, getters ) {
			if ( getters.getCurrentZObjectType !== Constants.Z_FUNCTION ) {
				return false;
			}

			var zobject = getters.getZObjectAsJson;
			if ( !zobject || !zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ] ) {
				return false;
			}
			var argumentList = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ];
			// Remove argument type
			argumentList.shift();
			return argumentList.length > 0 && argumentList.every(
				function ( arg ) {
					var argumentTypeIsSet = !!arg[ Constants.Z_ARGUMENT_TYPE ] &&
						!!arg[ Constants.Z_ARGUMENT_TYPE ][ Constants.Z_REFERENCE_ID ],
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
			);
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
		currentZObjectLanguages: function ( state, getters ) {
			var languageList = [];

			if ( !getters.getZObjectAsJson ) {
				return;
			}

			addLanguagesFromNameLabels( getters, languageList );
			addLanguagesFromArgumentLabels( getters, languageList );
			addLanguagesFromAliasLabels( getters, languageList );

			return languageList.map( function ( languageCode ) {
				return {
					Z1K1: Constants.Z_REFERENCE,
					[ Constants.Z_REFERENCE_ID ]: languageCode
				};
			} ) || [];
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
