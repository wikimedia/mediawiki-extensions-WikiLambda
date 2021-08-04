/*!
 * WikiLambda Vue editor: Getters for handling ZObject modes in the UI
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

var Constants = require( '../../Constants.js' ),
	modes = Constants.Z_MODE_SELECTOR_MODES;

module.exports = {
	getters: {
		getAllModes: function ( state, getters ) {
			return function ( payload ) {
				var typeIsItsOwnIdentity = payload.parentType === payload.literalType;
				// If literal and parents are the same, it means it is its own identity,
				// or if the type is Reference or FunctionCall
				// mode selector it does not have a generic or literal view
				return modes.filter( function ( mode ) {
					// Do not display the argument reference mode if not allowed
					if ( mode.key === Constants.Z_KEY_MODES.ARGUMENT_REF ) {
						return payload.allowZArgumentRefMode;
					}

					// If the parent and literal types are the same, do not display
					// reference or generic
					if ( typeIsItsOwnIdentity ) {
						return mode.type !== null;
					}

					// Do not display the JSON mode if not in expert mode
					if ( mode.key === Constants.Z_KEY_MODES.JSON ) {
						return getters.isExpertMode;
					}

					// Filter out specific modes depending on type
					switch ( payload.literalType ) {
						case Constants.Z_REFERENCE:
						case Constants.Z_FUNCTION_CALL:
							return mode.key !== Constants.Z_KEY_MODES.LITERAL;
						case Constants.Z_STRING:
							return mode.key !== Constants.Z_KEY_MODES.GENERIC_LITERAL;
					}

					return true;
				} );
			};
		},
		getModeIsValid: function () {
			return function ( selectedMode ) {
				var modeIdValid = false;
				modes.forEach( function ( mode ) {
					if ( mode.key === selectedMode ) {
						modeIdValid = true;
					}
				} );
				return modeIdValid;
			};
		},
		getTypeByMode: function () {
			return function ( payload ) {
				var type = payload.literalType;

				modes.forEach( function ( mode ) {
					if ( mode.key === payload.selectedMode && mode.type ) {
						type = mode.type;
					}
				} );

				return type;
			};
		},
		getModeByType: function () {
			return function ( currentType ) {
				var selectedMode = Constants.Z_KEY_MODES.LITERAL;
				modes.forEach( function ( mode ) {
					if ( mode.type === currentType ) {
						selectedMode = mode.key;
					}
				} );

				return selectedMode;
			};
		}
	}
};
