/*!
 * WikiLambda unit test suite for the programmging Languages Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var programmingLanguagesModule = require( '../../../../resources/ext.wikilambda.edit/store/modules/programmingLanguages.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' ),
	mockZProgrammingLanguages = [
		{
			Z1K1: Constants.Z_PERSISTENTOBJECT,
			Z2K1: 'Z600',
			Z2K2: {
				Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
				Z61K1: 'javascript',
				Z61K2: 'JavaScript'
			}
		},
		{
			Z1K1: Constants.Z_PERSISTENTOBJECT,
			Z2K1: 'Z610',
			Z2K2: {
				Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
				Z61K1: 'python',
				Z61K2: 'Python'
			}
		}
	],
	state;

describe( 'Programming Languages Vuex module', function () {
	beforeEach( function () {
		state = JSON.parse( JSON.stringify( programmingLanguagesModule.state ) );
	} );
	describe( 'Getters', function () {
		it( 'Returns empty list if no programming languages are defined in the state', function () {
			expect( programmingLanguagesModule.getters.getAllProgrammingLangs( state ) ).toEqual( [] );
		} );
		it( 'Returns a list of programming languages', function () {
			state.allZProgrammingLangs = mockZProgrammingLanguages;
			expect(
				programmingLanguagesModule.getters.getAllProgrammingLangs( state )
			).toEqual( mockZProgrammingLanguages );
		} );
	} );

	describe( 'Mutations', function () {
		it( 'Updates the state', function () {
			programmingLanguagesModule.mutations.setAllZProgrammingLangs( state, mockZProgrammingLanguages );

			expect( state.allZProgrammingLangs ).toEqual( mockZProgrammingLanguages );
		} );
	} );
} );
