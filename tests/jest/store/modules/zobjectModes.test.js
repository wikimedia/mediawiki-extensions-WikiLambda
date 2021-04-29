var zobjectModes = require( '../../../../resources/ext.wikilambda.edit/store/modules/zobjectModes.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

describe( 'zobjectModes Vuex module', function () {

	describe( 'Getters', function () {
		describe( 'getAllModes', function () {
			it( 'returns the all modes when type is different than z9, z7', function () {
				var payload = {
					parentType: 'testParentType',
					literalType: 'testLiteralType'
				};
				expect( zobjectModes.getters.getAllModes()( payload ).length ).toBe( 4 );
				expect( Object.keys( zobjectModes.getters.getAllModes()( payload )[ 0 ] ) ).toEqual( [ 'key', 'value', 'label', 'type' ] );
			} );
			it( 'It return just two types when parent and literal type are the same (recursion)', function () {
				var payload = {
					parentType: 'sameType',
					literalType: 'sameType'
				};
				expect( zobjectModes.getters.getAllModes()( payload ).length ).toBe( 2 );
				expect( Object.keys( zobjectModes.getters.getAllModes()( payload )[ 0 ] ) ).toEqual( [ 'key', 'value', 'label', 'type' ] );
			} );
			it( 'It return just two types if the literalType is a reference', function () {
				var payload = {
					parentType: 'sameType',
					literalType: Constants.Z_REFERENCE
				};
				expect( zobjectModes.getters.getAllModes()( payload ).length ).toBe( 2 );
				expect( Object.keys( zobjectModes.getters.getAllModes()( payload )[ 0 ] ) ).toEqual( [ 'key', 'value', 'label', 'type' ] );
			} );
			it( 'It return just two types if the literalType is a Function Call', function () {
				var payload = {
					parentType: 'sameType',
					literalType: Constants.Z_FUNCTION_CALL
				};
				expect( zobjectModes.getters.getAllModes()( payload ).length ).toBe( 2 );
				expect( Object.keys( zobjectModes.getters.getAllModes()( payload )[ 0 ] ) ).toEqual( [ 'key', 'value', 'label', 'type' ] );
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
		describe( 'getModeByType', function () {
			it( 'return the mode of a specified type', function () {
				var currentType = Constants.Z_REFERENCE;
				expect( zobjectModes.getters.getModeByType()( currentType ) ).toBe( Constants.Z_KEY_MODES.REFERENCE );
			} );
			it( 'return the literalMode if the type selected does not have a mode', function () {
				var currentType = 'TypeWithNoMode';
				expect( zobjectModes.getters.getModeByType()( currentType ) ).toBe( Constants.Z_KEY_MODES.LITERAL );
			} );
		} );
	} );
} );
