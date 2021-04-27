var zobjectModes = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobjectModes.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'zobjectModes Vuex module', function () {

	describe( 'Getters', function () {
		describe( 'getAllModes', function () {
			it( 'returns the modes available', function () {
				expect( zobjectModes.getters.getAllModes().length ).toBe( 4 );
				expect( Object.keys( zobjectModes.getters.getAllModes()[ 0 ] ) ).toEqual( [ 'key', 'value', 'label', 'type' ] );
			} );
		} );
		describe( 'getModeIsValid', function () {
			it( 'return true when a valid key is provided', function () {
				expect( zobjectModes.getters.getModeIsValid()( Constants.Z_KEY_MODES.REFERENCE ) ).toBeTruthy();
			} );
			it( 'return false when an invalid key is provided', function () {
				expect( zobjectModes.getters.getModeIsValid()( 'InvalidKey' ) ).toBeFalsy();
			} );
		} );
		describe( 'getTypeByMode', function () {
			it( 'return the type of a specified mode, if the mode has one set', function () {
				var payload = {
					selectedMode: Constants.Z_KEY_MODES.REFERENCE,
					literalType: 'fallBackType'
				};
				expect( zobjectModes.getters.getTypeByMode()( payload ) ).toBe( Constants.Z_REFERENCE );
			} );
			it( 'return the literalType passed if not type is set within the mode', function () {
				var payload = {
					selectedMode: Constants.Z_KEY_MODES.GENERIC_LITERAL,
					literalType: 'fallBackType'
				};
				expect( zobjectModes.getters.getTypeByMode()( payload ) ).toBe( 'fallBackType' );
			} );
		} );
	} );
} );
