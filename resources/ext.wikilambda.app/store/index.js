/*!
 * WikiLambda Vue editor: Application Vuex store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { defineStore } = require( 'pinia' ),
	routerStore = require( './stores/router.js' ),
	errorsStore = require( './stores/errors.js' ),
	languagesStore = require( './stores/languages.js' ),
	libraryStore = require( './stores/library.js' ),
	listItemsStore = require( './stores/listItems.js' ),
	programmingLanguagesStore = require( './stores/programmingLanguages.js' ),
	userStore = require( './stores/user.js' ),
	functionCallStore = require( './stores/functionCall.js' ),
	testResultsStore = require( './stores/testResults.js' ),
	zobjectStore = require( './stores/zobject.js' ),
	ztypeStore = require( './stores/ztype.js' ),
	zfunctionStore = require( './stores/zfunction.js' ),
	wdEntitiesStore = require( './stores/wikidata/entities.js' ),
	wdLexemesStore = require( './stores/wikidata/lexemes.js' ),
	wdItemsStore = require( './stores/wikidata/items.js' ),
	wdPropertiesStore = require( './stores/wikidata/properties.js' );

module.exports = defineStore( 'main', {
	state: () => Object.assign(
		// Router
		routerStore.state,
		// Utils
		errorsStore.state,
		languagesStore.state,
		libraryStore.state,
		listItemsStore.state,
		programmingLanguagesStore.state,
		userStore.state,
		// Orchestrator requests
		functionCallStore.state,
		testResultsStore.state,
		// Main ZObject: general and for some specific types
		zobjectStore.state,
		ztypeStore.state,
		zfunctionStore.state,
		// Wikidata
		wdEntitiesStore.state,
		wdLexemesStore.state,
		wdItemsStore.state,
		wdPropertiesStore.state
	),
	getters: Object.assign(
		// Router
		routerStore.getters,
		// Utils
		errorsStore.getters,
		languagesStore.getters,
		libraryStore.getters,
		listItemsStore.getters,
		programmingLanguagesStore.getters,
		userStore.getters,
		// Orchestrator requests
		functionCallStore.getters,
		testResultsStore.getters,
		// Main ZObject: general and for some specific types
		zobjectStore.getters,
		ztypeStore.getters,
		zfunctionStore.getters,
		// Wikidata
		wdEntitiesStore.getters,
		wdLexemesStore.getters,
		wdItemsStore.getters,
		wdPropertiesStore.getters
	),
	actions: Object.assign(
		// Router
		routerStore.actions,
		// Utils
		errorsStore.actions,
		languagesStore.actions,
		libraryStore.actions,
		listItemsStore.actions,
		programmingLanguagesStore.actions,
		userStore.actions,
		// Orchestrator requests
		functionCallStore.actions,
		testResultsStore.actions,
		// Main ZObject: general and for some specific types
		zobjectStore.actions,
		ztypeStore.actions,
		zfunctionStore.actions,
		// Wikidata
		wdEntitiesStore.actions,
		wdLexemesStore.actions,
		wdItemsStore.actions,
		wdPropertiesStore.actions
	)
} );
