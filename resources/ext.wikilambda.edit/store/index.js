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
	getters = require( './getters.js' ),
	argumentsModule = require( './modules/arguments.js' ),
	zobjectModule = require( './modules/zobject.js' ),
	zKeysModule = require( './modules/zKeys.js' ),
	callZFunctionModule = require( './modules/callZFunction.js' ),
	errorsModule = require( './modules/errors.js' ),
	languagesModule = require( './modules/languages.js' ),
	programmingLanguagesModule = require( './modules/programmingLanguages.js' ),
	zTesterResultsModule = require( './modules/zTesterResults.js' ),
	zTesters = require( './modules/zTesters.js' ),
	zImplementations = require( './modules/zImplementations.js' ),
	zTypedList = require( './modules/zTypedList.js' ),
	router = require( './modules/router.js' ),
	zFunction = require( './modules/zFunction.js' );

module.exports = Vuex.createStore( {
	state: state,
	actions: actions,
	getters: getters,
	modules: {
		argumentsModule: argumentsModule,
		zobjectModule: zobjectModule,
		zKeysModule: zKeysModule,
		callZFunctionModule: callZFunctionModule,
		errorsModule: errorsModule,
		languagesModule: languagesModule,
		programmingLanguagesModule: programmingLanguagesModule,
		zTesterResultsModule: zTesterResultsModule,
		zTesters: zTesters,
		zImplementations: zImplementations,
		zTypedList: zTypedList,
		router: router,
		zFunction: zFunction
	}
} );
