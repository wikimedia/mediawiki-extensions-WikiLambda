/*!
 * WikiLambda Vue editor: Application Vuex store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

var Vuex = require( 'vuex' ),
	actions = require( './actions.js' ),
	getters = require( './getters.js' ),
	zobjectModule = require( './modules/zobject.js' ),
	libraryModule = require( './modules/library.js' ),
	typesModule = require( './modules/types.js' ),
	callZFunctionModule = require( './modules/callZFunction.js' ),
	errorsModule = require( './modules/errors.js' ),
	userModule = require( './modules/user.js' ),
	languagesModule = require( './modules/languages.js' ),
	programmingLanguagesModule = require( './modules/programmingLanguages.js' ),
	zTesterResultsModule = require( './modules/zTesterResults.js' ),
	zTypedList = require( './modules/zTypedList.js' ),
	router = require( './modules/router.js' ),
	zFunction = require( './modules/zFunction.js' );

module.exports = Vuex.createStore( {
	actions: actions,
	getters: getters,
	modules: {
		zobjectModule: zobjectModule,
		libraryModule: libraryModule,
		typesModule: typesModule,
		callZFunctionModule: callZFunctionModule,
		errorsModule: errorsModule,
		userModule: userModule,
		languagesModule: languagesModule,
		programmingLanguagesModule: programmingLanguagesModule,
		zTesterResultsModule: zTesterResultsModule,
		zTypedList: zTypedList,
		router: router,
		zFunction: zFunction
	}
} );
