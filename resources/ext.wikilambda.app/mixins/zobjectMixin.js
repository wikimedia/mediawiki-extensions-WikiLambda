/**
 * WikiLambda Vue editor: ZObject Access Mixin
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

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

module.exports = exports = {
	computed: {
		/**
		 * Returns the immediate key, which is the last in the keyPath.
		 * * All components that use this mixin should have keyPath as
		 *   a required prop.
		 * * keyPath can never be empty, it's always initialized with
		 *   some value, and carried down the tree.
		 *
		 * @return {string|undefined}
		 */
		key: function () {
			if ( !this.keyPath || typeof this.keyPath !== 'string' ) {
				return undefined;
			}
			return this.keyPath.split( '.' ).pop();
		},
		/**
		 * Returns the parent key, which is the previous to last in the keyPath.
		 * * All components that use this mixin should have keyPath as
		 *   a required prop.
		 * * keyPath can never be empty, it's always initialized with
		 *   some value, and carried down the tree.
		 *
		 * @return {string|undefined}
		 */
		parentKey: function () {
			if ( !this.keyPath || typeof this.keyPath !== 'string' ) {
				return undefined;
			}
			const parts = this.keyPath.split( '.' );
			return parts.length > 1 ? parts[ parts.length - 2 ] : undefined;
		},
		/**
		 * Returns the depth of the ZObject, so that
		 * * main.Z2K2 = 1
		 * * levels from 1 to 6
		 *
		 * @return {number}
		 */
		depth: function () {
			if ( !this.keyPath || typeof this.keyPath !== 'string' ) {
				return 0;
			}
			const depth = ( this.keyPath.split( '.' ) || [] ).length - 1;
			return ( depth % Constants.COLOR_NESTING_LEVELS ) + 1;
		}
	},
	methods: {
		// NOTE: Only add into the mixin those methods
		// that need to be accessible from components.
		getZObjectType,
		// Type methods:
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
		// Wikidata methods:
		isWikidataEntity,
		isWikidataLiteral,
		isWikidataFetch,
		isWikidataReference,
		getWikidataEntityId
	}
};
