var Constants = require( '../../Constants.js' ),
	modes = [
		{ key: Constants.Z_KEY_MODES.REFERENCE, value: 'wikilambda-modeselector-reference', label: 'wikilambda-reference', type: Constants.Z_REFERENCE },
		{ key: Constants.Z_KEY_MODES.FUNCTION_CALL, value: 'wikilambda-modeselector-functioncall', label: 'wikilambda-functioncall', type: Constants.Z_FUNCTION_CALL },
		{ key: Constants.Z_KEY_MODES.LITERAL, value: 'wikilambda-modeselector-literal', label: 'wikilambda-literal', type: null },
		{ key: Constants.Z_KEY_MODES.GENERIC_LITERAL, value: 'wikilambda-modeselector-genericliteral', label: 'wikilambda-genericliteral', type: null }
	],
	TypeWithoutLiteral = [ Constants.Z_REFERENCE, Constants.Z_FUNCTION_CALL ];

module.exports = {
	getters: {
		getAllModes: function () {
			return function ( payload ) {
				var typeIsItsOwnIdentity = payload.parentType === payload.literalType;
				// If literal and parents are the same, it means it is its own identity,
				// or if the type is Reference or FunctionCall
				// mode selector it does not have a generic or literal view
				if ( typeIsItsOwnIdentity || TypeWithoutLiteral.indexOf( payload.literalType ) !== -1 ) {
					return modes.filter( function ( mode ) {
						return mode.type !== null;
					} );
				} else {
					return modes;
				}
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
