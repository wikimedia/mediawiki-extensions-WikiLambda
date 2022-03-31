/*!
 * WikiLambda Vue editor: Application Vuex store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Vuex = require( 'vuex' ),
	state = require( './state.js' ),
	actions = require( './actions.js' ),
	mutations = require( './mutations.js' ),
	getters = require( './getters.js' ),
	argumentsModule = require( './modules/arguments.js' ),
	zobjectModule = require( './modules/zobject.js' ),
	zobjectModes = require( './modules/zobjectModes.js' ),
	zKeysModule = require( './modules/zKeys.js' ),
	callZFunctionModule = require( './modules/callZFunction.js' ),
	languagesModule = require( './modules/languages.js' ),
	programmingLanguagesModule = require( './modules/programmingLanguages.js' ),
	zTesterResultsModule = require( './modules/zTesterResults.js' ),
	zTesters = require( './modules/zTesters.js' ),
	zImplementations = require( './modules/zImplementations.js' ),
	zTypedList = require( './modules/zTypedList.js' ),
	router = require( './modules/router.js' );

module.exports = Vuex.createStore( {
	state: state,
	actions: actions,
	mutations: mutations,
	getters: getters,
	modules: {
		argumentsModule: argumentsModule,
		zobjectModule: zobjectModule,
		zobjectModes: zobjectModes,
		zKeysModule: zKeysModule,
		callZFunctionModule: callZFunctionModule,
		languagesModule: languagesModule,
		programmingLanguagesModule: programmingLanguagesModule,
		zTesterResultsModule: zTesterResultsModule,
		zTesters: zTesters,
		zImplementations: zImplementations,
		zTypedList: zTypedList,
		router: router
	}
} );
