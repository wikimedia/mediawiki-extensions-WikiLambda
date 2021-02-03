/*!
 * WikiLambda Vue editor: Application store mutations
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Vue = require( 'vue' );

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
	 * addFetchingZKeys
	 *
	 * @param {Object} state
	 * @param {Array} zids
	 */
	addFetchingZKeys: function ( state, zids ) {
		zids.forEach( function ( zid ) {
			if ( state.fetchingZKeys.indexOf( zid ) === -1 ) {
				state.fetchingZKeys.push( zid );
			}
		} );
	},

	/**
	 * removeFetchingZKey
	 *
	 * @param {Object} state
	 * @param {string} zid
	 */
	removeFetchingZKey: function ( state, zid ) {
		state.fetchingZKeys.splice(
			state.fetchingZKeys.indexOf( zid ),
			1
		);
	},

	/**
	 * Add zid info to the state
	 *
	 * @param {Object} state
	 * @param {Object} payload
	 */
	addZKeyInfo: function ( state, payload ) {
		Vue.set( state.zKeys, payload.zid, payload.info );
	},

	/**
	 * Add zkey label in the user selected language
	 *
	 * @param {Object} state
	 * @param {Object} payload
	 */
	addZKeyLabel: function ( state, payload ) {
		Vue.set( state.zKeyLabels, payload.key, payload.label );
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
	}
};
