/*!
 * ZObject Access composable for Vue 3 Composition API.
 * Provides ZObject access and manipulation functions
 *
 * @module ext.wikilambda.app.composables.useZObject
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { computed } = require( 'vue' );
const Constants = require( '../Constants.js' );
const {
	getZObjectType,
	getZStringTerminalValue,
	getZReferenceTerminalValue,
	getZMonolingualTextValue,
	getZMonolingualLangValue,
	getZMonolingualItemForLang,
	getZMultilingualValues,
	getZMultilingualLangs,
	getZLangTerminalValue,
	getZBooleanValue,
	getZFunctionCallFunctionId,
	getZFunctionCallArgumentKeys,
	getZArgumentReferenceTerminalValue,
	getZTesterFunctionZid,
	getZImplementationFunctionZid,
	getZImplementationContentType,
	getZCodeString,
	getZCodeProgrammingLanguageId,
	getZHTMLFragmentTerminalValue,
	getZKeyIsIdentity,
	isWikidataEntity,
	isWikidataLiteral,
	isWikidataFetch,
	isWikidataReference,
	getWikidataEntityId
} = require( '../utils/zobjectUtils.js' );

/**
 * ZObject access composable
 *
 * @param {Object} options - Options object
 * @param {Object} [options.keyPath] - The keyPath ref from the component (optional)
 * @return {Object} ZObject composable API
 */
module.exports = function useZObject( { keyPath } = {} ) {
	/**
	 * Returns the immediate key, which is the last in the keyPath.
	 * * All components that use this composable should have keyPath as
	 *   a required prop.
	 * * keyPath can never be empty, it's always initialized with
	 *   some value, and carried down the tree.
	 *
	 * @return {string|undefined}
	 */
	const key = computed( () => {
		if ( !keyPath || typeof keyPath !== 'string' ) {
			return undefined;
		}
		return keyPath.split( '.' ).pop();
	} );

	/**
	 * Returns the parent key, which is the previous to last in the keyPath.
	 * * All components that use this composable should have keyPath as
	 *   a required prop.
	 * * keyPath can never be empty, it's always initialized with
	 *   some value, and carried down the tree.
	 *
	 * @return {string|undefined}
	 */
	const parentKey = computed( () => {
		if ( !keyPath || typeof keyPath !== 'string' ) {
			return undefined;
		}
		const parts = keyPath.split( '.' );
		return parts.length > 1 ? parts[ parts.length - 2 ] : undefined;
	} );

	/**
	 * Returns the depth of the ZObject, so that
	 * * main.Z2K2 = 1
	 * * levels from 1 to 6
	 *
	 * @return {number}
	 */
	const depth = computed( () => {
		if ( !keyPath || typeof keyPath !== 'string' ) {
			return 0;
		}
		const depthValue = ( keyPath.split( '.' ) || [] ).length - 1;
		return ( depthValue % Constants.COLOR_NESTING_LEVELS ) + 1;
	} );

	return {
		key,
		parentKey,
		depth,
		// ZObject utility methods
		getZObjectType,
		getZStringTerminalValue,
		getZReferenceTerminalValue,
		getZMonolingualTextValue,
		getZMonolingualLangValue,
		getZMonolingualItemForLang,
		getZMultilingualValues,
		getZMultilingualLangs,
		getZLangTerminalValue,
		getZBooleanValue,
		getZFunctionCallFunctionId,
		getZFunctionCallArgumentKeys,
		getZArgumentReferenceTerminalValue,
		getZTesterFunctionZid,
		getZImplementationFunctionZid,
		getZImplementationContentType,
		getZCodeString,
		getZCodeProgrammingLanguageId,
		getZHTMLFragmentTerminalValue,
		getZKeyIsIdentity,
		// Wikidata methods
		isWikidataEntity,
		isWikidataLiteral,
		isWikidataFetch,
		isWikidataReference,
		getWikidataEntityId
	};
};
