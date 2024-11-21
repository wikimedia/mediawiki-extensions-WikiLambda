/*!
 * WikiLambda unit test suite for the programmging Languages Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const programmingLanguagesModule = require( '../../../../resources/ext.wikilambda.app/store/modules/programmingLanguages.js' ),
	Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' ),
	mockZProgrammingLanguages = [
		{
			Z1K1: Constants.Z_PERSISTENTOBJECT,
			Z2K1: { Z1K1: 'Z6', Z6K1: 'Z600' },
			Z2K2: {
				Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
				Z61K1: 'javascript',
				Z61K2: 'JavaScript'
			}
		},
		{
			Z1K1: Constants.Z_PERSISTENTOBJECT,
			Z2K1: { Z1K1: 'Z6', Z6K1: 'Z610' },
			Z2K2: {
				Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
				Z61K1: 'python',
				Z61K2: 'Python'
			}
		}
	];
let state;

describe( 'Programming Languages Vuex module', () => {
	beforeEach( () => {
		state = JSON.parse( JSON.stringify( programmingLanguagesModule.state ) );
	} );
	describe( 'Getters', () => {
		it( 'Returns empty list if no programming languages are defined in the state', () => {
			expect( programmingLanguagesModule.getters.getAllProgrammingLangs( state ) ).toEqual( [] );
		} );
		it( 'Returns a list of programming languages', () => {
			state.allZProgrammingLangs = mockZProgrammingLanguages;
			expect(
				programmingLanguagesModule.getters.getAllProgrammingLangs( state )
			).toEqual( mockZProgrammingLanguages );
		} );
	} );

	describe( 'Mutations', () => {
		it( 'Updates the state', () => {
			programmingLanguagesModule.mutations.setAllZProgrammingLangs( state, mockZProgrammingLanguages );

			expect( state.allZProgrammingLangs ).toEqual( mockZProgrammingLanguages );
		} );
	} );
} );
