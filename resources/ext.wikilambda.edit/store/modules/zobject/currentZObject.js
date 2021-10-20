var Constants = require( '../../../Constants.js' ),
	typeUtils = require( '../../../mixins/typeUtils.js' ).methods;

module.exports = {
	getters: {
		getZObjectAsJson: function ( state, getters, rootState, rootGetters ) {
			/**
			 * Return the complete zObject as a JSON
			 *
			 * @return {Array} zObjectJson
			 */

			return rootGetters.getZObjectAsJsonById( 0, rootState.zobjectModule.zobject[ 0 ].value === 'array' );
		},
		/**
		 * Return the root ZObjectId, equivalend to the Z_REFERENCE_ID of Z_PERSISTENTOBJECT_ID
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @param {Object} rootState
		 * @param {Object} rootGetters
		 * @return {string} currentZObjectId
		 */
		getCurrentZObjectId: function ( state, getters, rootState, rootGetters ) {
			var persistentObjectId =
				typeUtils.findKeyInArray( Constants.Z_PERSISTENTOBJECT_ID, rootState.zobjectModule.zobject ).id,
				persistenObjectChildren = rootGetters.getZObjectChildrenById( persistentObjectId ),
				persistentObjectValue = typeUtils.findKeyInArray( Constants.Z_STRING_VALUE, persistenObjectChildren );

			return persistentObjectValue.value || Constants.NEW_ZID_PLACEHOLDER;
		},
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
		isCurrentZObjectExecutable: function ( state, getters ) {
			return [ Constants.Z_FUNCTION, Constants.Z_IMPLEMENTATION ].indexOf( getters.getCurrentZObjectType ) !== -1;
		},
		currentZObjectHasLabel: function ( state, getters ) {
			var zobject = getters.getZObjectAsJson;

			return zobject &&
				zobject[ Constants.Z_PERSISTENTOBJECT_LABEL ][
					Constants.Z_MULTILINGUALSTRING_VALUE ].filter(
					function ( value ) {
						return value[ Constants.Z_MONOLINGUALSTRING_VALUE ][
							Constants.Z_STRING_VALUE ];
					} ).length > 0;
		},
		currentZFunctionHasInputs: function ( state, getters ) {
			if ( getters.getCurrentZObjectType !== Constants.Z_FUNCTION ) {
				return false;
			}

			var zobject = getters.getZObjectAsJson;

			return zobject &&
				zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ][
					Constants.Z_FUNCTION_ARGUMENTS ].filter(
					function ( arg ) {
						return arg[ Constants.Z_ARGUMENT_TYPE ][ Constants.Z_REFERENCE_ID ] &&
							arg[ Constants.Z_ARGUMENT_LABEL ][ Constants.Z_MULTILINGUALSTRING_VALUE ].filter(
								function ( label ) {
									return label[ Constants.Z_MONOLINGUALSTRING_VALUE ][
										Constants.Z_STRING_VALUE ] !== '';
								} ).length > 0;
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
				getters.currentZObjectHasLabel,
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
			if ( zObjectLabels.Z12K1 ) {
				zObjectLabels.Z12K1.forEach( function ( label ) {
					languageList.push( label.Z11K1.Z9K1 );
				} );
			}

			return languageList.map( function ( languageCode ) {
				return {
					Z1K1: 'Z9',
					Z9K1: languageCode
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
