var Constants = require( '../../Constants.js' ),
	modes = [
		{ key: Constants.Z_KEY_MODES.REFERENCE, value: 'wikilambda-modeselector-reference', label: 'wikilambda-reference', type: Constants.Z_REFERENCE },
		{ key: Constants.Z_KEY_MODES.LITERAL, value: 'wikilambda-modeselector-literal', label: 'wikilambda-literal', type: null },
		{ key: Constants.Z_KEY_MODES.GENERIC_LITERAL, value: 'wikilambda-modeselector-genericliteral', label: 'wikilambda-genericliteral', type: null },
		{ key: Constants.Z_KEY_MODES.FUNCTION_CALL, value: 'wikilambda-modeselector-functioncall', label: 'wikilambda-functioncall', type: Constants.Z_FUNCTION_CALL }
	];

module.exports = {
	getters: {
		getAllModes: function () {
			return modes;
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
		}
	}
};
