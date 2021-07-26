/*!
 * WikiLambda Vue editor: Application Vuex store
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Vue = require( 'vue' ),
	Vuex = require( 'vuex' ),
	state = require( './state.js' ),
	actions = require( './actions.js' ),
	mutations = require( './mutations.js' ),
	getters = require( './getters.js' ),
	zobjectModule = require( './modules/zobject.js' ),
	zobjectModes = require( './modules/zobjectModes.js' ),
	zKeysModule = require( './modules/zKeys.js' ),
	callZFunctionModule = require( './modules/callZFunction.js' ),
	languagesModule = require( './modules/languages.js' ),
	programmingLanguagesModule = require( './modules/programmingLanguages.js' ),
	zTesterResultsModule = require( './modules/zTesterResults.js' );

Vue.use( Vuex );

module.exports = new Vuex.Store( {
	state: state,
	actions: actions, /* Empty */
	mutations: mutations, /* Empty */
	getters: getters,
	modules: {
		zobjectModule: zobjectModule,
		zobjectModes: zobjectModes,
		zKeysModule: zKeysModule,
		callZFunctionModule: callZFunctionModule,
		languagesModule: languagesModule,
		programmingLanguagesModule: programmingLanguagesModule,
		zTesterResultsModule: zTesterResultsModule
	}
} );
