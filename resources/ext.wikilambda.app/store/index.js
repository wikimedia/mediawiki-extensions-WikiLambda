/*!
 * WikiLambda Vue editor: Application store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { defineStore } = require( 'pinia' );

const currentPageStore = require( './stores/currentPage.js' );
const errorsStore = require( './stores/errors.js' );
const factoryStore = require( './stores/factory.js' );
const functionCallStore = require( './stores/functionCall.js' );
const languagesStore = require( './stores/languages.js' );
const libraryStore = require( './stores/library.js' );
const listItemsStore = require( './stores/listItems.js' );
const programmingLanguagesStore = require( './stores/programmingLanguages.js' );
const queueStore = require( './stores/queue.js' );
const routerStore = require( './stores/router.js' );
const submissionStore = require( './stores/submission.js' );
const testResultsStore = require( './stores/testResults.js' );
const userStore = require( './stores/user.js' );
const visualeditorStore = require( './stores/visualeditor.js' );
const wdEntitiesStore = require( './stores/wikidata/entities.js' );
const wdItemsStore = require( './stores/wikidata/items.js' );
const wdLexemesStore = require( './stores/wikidata/lexemes.js' );
const wdPropertiesStore = require( './stores/wikidata/properties.js' );
const zfunctionStore = require( './stores/zfunction.js' );
const zhtmlStore = require( './stores/zhtml.js' );
const zobjectStore = require( './stores/zobject.js' );
const ztypeStore = require( './stores/ztype.js' );

module.exports = defineStore( 'main', {
	state: () => Object.assign(
		// Router
		routerStore.state,
		// Job Queue
		queueStore.state,
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
		currentPageStore.state,
		factoryStore.state,
		submissionStore.state,
		zobjectStore.state,
		ztypeStore.state,
		zfunctionStore.state,
		zhtmlStore.state,
		// Wikidata
		wdEntitiesStore.state,
		wdLexemesStore.state,
		wdItemsStore.state,
		wdPropertiesStore.state,
		// VisualEditor
		visualeditorStore.state
	),
	getters: Object.assign(
		// Router
		routerStore.getters,
		// Job Queue
		queueStore.getters,
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
		currentPageStore.getters,
		factoryStore.getters,
		submissionStore.getters,
		zobjectStore.getters,
		ztypeStore.getters,
		zfunctionStore.getters,
		zhtmlStore.getters,
		// Wikidata
		wdEntitiesStore.getters,
		wdLexemesStore.getters,
		wdItemsStore.getters,
		wdPropertiesStore.getters,
		// VisualEditor
		visualeditorStore.getters
	),
	actions: Object.assign(
		// Router
		routerStore.actions,
		// Job Queue
		queueStore.actions,
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
		currentPageStore.actions,
		factoryStore.actions,
		submissionStore.actions,
		zobjectStore.actions,
		ztypeStore.actions,
		zfunctionStore.actions,
		zhtmlStore.actions,
		// Wikidata
		wdEntitiesStore.actions,
		wdLexemesStore.actions,
		wdItemsStore.actions,
		wdPropertiesStore.actions,
		// VisualEditor
		visualeditorStore.actions
	)
} );
