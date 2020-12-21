/*!
 * WikiLambda Vue editor: Application Vuex store
 *
 * @copyright 2020 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Vue = require( 'vue' ),
	Vuex = require( 'vuex' ),
	state = require( './state.js' ),
	actions = require( './actions.js' ),
	mutations = require( './mutations.js' ),
	getters = require( './getters.js' );

Vue.use( Vuex );

module.exports = new Vuex.Store( {
	state: state,
	actions: actions,
	mutations: mutations,
	getters: getters
} );
