/*!
 * WikiLambda unit test suite for the programmging Languages Vuex store module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

'use strict';

const { setActivePinia, createPinia } = require( 'pinia' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );
const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );

const mockZProgrammingLanguages = [
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

describe( 'Programming Languages Pinia store', () => {

	let store;

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.allZProgrammingLangs = [];
	} );

	describe( 'Getters', () => {
		it( 'Returns empty list if no programming languages are defined in the state', () => {
			expect( store.getAllProgrammingLangs ).toEqual( [] );
		} );
		it( 'Returns a list of programming languages', () => {
			store.allZProgrammingLangs = mockZProgrammingLanguages;
			expect( store.getAllProgrammingLangs ).toEqual( mockZProgrammingLanguages );
		} );
	} );

	describe( 'Actions', () => {
		it( 'fetchAllZProgrammingLanguages', () => {
			store.fetchAllZProgrammingLanguages();
			expect( store.getAllProgrammingLangs ).toEqual( mockZProgrammingLanguages );
		} );
		it( 'createProgrammingLanguage', () => {
			const zProgrammingLanguage = store.createProgrammingLanguage( 'Z620', 'lua', 'Lua' );
			expect( zProgrammingLanguage ).toEqual( {
				Z1K1: Constants.Z_PERSISTENTOBJECT,
				Z2K1: { Z1K1: 'Z6', Z6K1: 'Z620' },
				Z2K2: {
					Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
					Z61K1: 'lua',
					Z61K2: 'Lua'
				}
			} );
		} );
	} );
} );
