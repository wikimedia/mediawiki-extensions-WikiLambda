/*!
 * WikiLambda Vue editor: Getters for handling ZObject modes in the UI
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var Constants = require( '../../Constants.js' ),
	modes = Constants.Z_MODE_SELECTOR_MODES;

module.exports = exports = {
	getters: {
		/**
		 * Getters that retrieve possible display mode for a zObject.
		 * This is used by the mode selector.
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 *
		 * @return {Array} modes
		 */
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
			/**
			 * Boolean determining if the current mode selected is valid
			 *
			 * @param {Object} selectedMode
			 *
			 * @return {boolean}
			 */
			return function ( selectedMode ) {
				return modes.some( ( mode ) => mode.key === selectedMode );
			};
		},
		getTypeByMode: function () {
			/**
			 * Gets the type of the zObject by its mode. This is required when reloading
			 * a page with a zObject that may have a selected mode different to the default one.
			 *
			 * @param {Object} payload
			 * @param {string} payload.literalType
			 * @param {string} payload.selectedMode
			 *
			 * @return {string} type
			 */
			return function ( payload ) {
				const modeFound = modes.find( ( mode ) =>
					mode.key === payload.selectedMode && mode.type
				);
				return modeFound ? modeFound.type : payload.literalType;
			};
		},
		getModeByType: function () {
			/**
			 * Gets the default mode for a type.
			 *
			 * @param {string} currentType
			 *
			 * @return {string} mode
			 */
			return function ( currentType ) {
				const modeFound = modes.find( ( mode ) =>
					mode.type === currentType
				);

				return modeFound ? modeFound.key : Constants.Z_KEY_MODES.LITERAL;
			};
		}
	}
};
