/*!
 * WikiLambda Vue editor: Store module for programming language-related state, actions, mutations and getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../Constants.js' );

module.exports = exports = {
	state: {
		/**
		 * Collection of ZProgrammingLanguages
		 */
		allZProgrammingLangs: []
	},
	getters: {
		/**
		 * Get all programming languages
		 *
		 * @param {Object} state
		 * @return {Array} allZProgrammingLangs
		 */
		getAllProgrammingLangs: function ( state ) {
			return state.allZProgrammingLangs;
		}
	},
	mutations: {
		/**
		 * setAllZProgrammingLangs
		 *
		 * @param {Object} state
		 * @param {Object} allLangs
		 */
		setAllZProgrammingLangs: function ( state, allLangs ) {
			state.allZProgrammingLangs = allLangs;
		}
	},
	actions: {
		/**
		 * Call the mediawiki api to get and store the list of Z61/Programming Languages in the state.
		 * TODO (T296815) - implement API call to backend to get list of Z61.
		 *
		 * @param {Object} context
		 * @return {Object}
		 */
		fetchAllZProgrammingLanguages: function ( context ) {
			// TODO (T296815): Stop using this hard-coded list and fetch them from the API
			const zProgrammingLanguages = [
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
			context.commit( 'setAllZProgrammingLangs', zProgrammingLanguages );
			return zProgrammingLanguages;
		}
	}
};
