/*!
 * WikiLambda Vue editor: Pinia store for programming language-related state, actions, mutations and getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );

module.exports = {
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
		 * @return {Array} List of programming languages
		 */
		getAllProgrammingLangs: function ( state ) {
			return state.allZProgrammingLangs;
		}
	},

	actions: {
		/**
		 * Call the mediawiki api to get and store the list of Z61/Programming Languages in the state.
		 * TODO (T296815) - implement API call to backend to get list of Z61.
		 *
		 * @return {Array} List of programming languages.
		 */
		fetchAllZProgrammingLanguages: function () {
			// TODO (T296815): Stop using this hard-coded list and fetch them from the API
			const zProgrammingLanguages = [
				this.createProgrammingLanguage( 'Z600', 'javascript', 'JavaScript' ),
				this.createProgrammingLanguage( 'Z610', 'python', 'Python' )
			];
			this.allZProgrammingLangs = zProgrammingLanguages;
			return zProgrammingLanguages;
		},

		/**
		 * Utility function to create a programming language object.
		 *
		 * @param {string} zid ZID of the programming language.
		 * @param {string} code Programming language code.
		 * @param {string} name Programming language name.
		 * @return {Object} Programming language object.
		 */
		createProgrammingLanguage: function ( zid, code, name ) {
			return {
				Z1K1: Constants.Z_PERSISTENTOBJECT,
				Z2K1: { Z1K1: 'Z6', Z6K1: zid },
				Z2K2: {
					Z1K1: Constants.Z_PROGRAMMING_LANGUAGE,
					Z61K1: code,
					Z61K2: name
				}
			};
		}
	}
};
