/*!
 * WikiLambda Vector 2022 search integration
 * - Abstract Wikipedia mode: search Wikidata entities (QIDs) via wbsearchentities
 * - Repo mode: search ZObject labels via wikilambdasearch_labels
 */
'use strict';

const wikidataSearch = require( './wikidata.js' );
const zobjectSearch = require( './zobject.js' );
const searchConfig = require( './config.json' );

/**
 * Determine which skin search module to use.
 *
 * @memberof module:ext.wikilambda.search
 * @return {string}
 */
function getSkinSearchModuleName() {
	const skin = mw.config.get( 'skin' );
	return skin === 'vector-2022' ? 'skins.vector.search' : 'skins.minerva.search';
}

/**
 * Determine which WikiLambda search client to use based on RL config.
 * In production, Abstract and Repo modes are configured to be mutually exclusive.
 * If neither mode is enabled, return undefined as a safety fallback
 * (onSkinPageReadyConfig already checks that one mode is enabled).
 *
 * @memberof module:ext.wikilambda.search
 * @return {'abstract'|'repo'|undefined}
 */
function getWikiLambdaSearchMode() {
	if ( searchConfig.WikiLambdaEnableRepoMode ) {
		return 'repo';
	}

	if ( searchConfig.WikiLambdaEnableAbstractMode ) {
		return 'abstract';
	}

	return undefined;
}

/**
 * Initialize Vector 2022 or Minerva search with the appropriate WikiLambda client.
 * Called from mediawiki.page.ready.
 *
 * @memberof module:ext.wikilambda.search
 */
function init() {
	const mode = getWikiLambdaSearchMode();
	const moduleName = getSkinSearchModuleName();

	if ( !mode ) {
		return;
	}

	const client = mode === 'abstract' ?
		wikidataSearch.vectorSearchClient :
		zobjectSearch.vectorSearchClient;

	mw.loader.using( moduleName ).then( () => {
		// eslint-disable-next-line security/detect-non-literal-require
		const searchModule = require( moduleName );
		searchModule.init( client );
	} );
}

module.exports = {
	init,
	vectorSearchClientWikidata: wikidataSearch.vectorSearchClient,
	vectorSearchClientZObject: zobjectSearch.vectorSearchClient
};
