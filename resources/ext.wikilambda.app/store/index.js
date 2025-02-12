/*!
 * WikiLambda Vue editor: Application Vuex store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { createStore } = require( 'vuex' ),
	router = require( './modules/router.js' ),
	errorsModule = require( './modules/errors.js' ),
	languagesModule = require( './modules/languages.js' ),
	libraryModule = require( './modules/library.js' ),
	listItemsModule = require( './modules/listItems.js' ),
	programmingLanguagesModule = require( './modules/programmingLanguages.js' ),
	userModule = require( './modules/user.js' ),
	functionCallModule = require( './modules/functionCall.js' ),
	testResultsModule = require( './modules/testResults.js' ),
	zobjectModule = require( './modules/zobject.js' ),
	ztypeModule = require( './modules/ztype.js' ),
	zfunctionModule = require( './modules/zfunction.js' ),
	wdEntitiesModule = require( './modules/wikidata/entities.js' ),
	wdLexemesModule = require( './modules/wikidata/lexemes.js' ),
	wdItemsModule = require( './modules/wikidata/items.js' ),
	wdPropertiesModule = require( './modules/wikidata/properties.js' );

module.exports = createStore( {
	modules: {
		// Router
		router,
		// Utils
		errorsModule,
		languagesModule,
		libraryModule,
		listItemsModule,
		programmingLanguagesModule,
		userModule,
		// Orchestrator requests
		functionCallModule,
		testResultsModule,
		// Main ZObject: general and for some specific types
		zobjectModule,
		ztypeModule,
		zfunctionModule,
		// Wikidata
		wdEntitiesModule,
		wdLexemesModule,
		wdItemsModule,
		wdPropertiesModule
	}
} );
