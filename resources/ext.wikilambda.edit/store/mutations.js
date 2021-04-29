/*!
 * WikiLambda Vue editor: Application store mutations
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = {
	/**
	 * setZLangs
	 *
	 * @param {Object} state
	 * @param {string[]} zlangs
	 */
	setZLangs: function ( state, zlangs ) {
		state.zLangs = zlangs;
	},

	/**
	 * setAllLangs
	 *
	 * @param {Object} state
	 * @param {Object} allLangs
	 */
	setAllLangs: function ( state, allLangs ) {
		state.allLangs = allLangs;
	},

	/**
	 * setFetchingAllLangs
	 *
	 * @param {Object} state
	 * @param {boolean} fetchingAllLangs
	 */
	setFetchingAllLangs: function ( state, fetchingAllLangs ) {
		state.fetchingAllLangs = fetchingAllLangs;
	},

	/**
	 * setAllZProgrammingLangs
	 *
	 * @param {Object} state
	 * @param {Object} allLangs
	 */
	setAllZProgrammingLangs: function ( state, allLangs ) {
		state.allZProgrammingLangs = allLangs;
	}
};
