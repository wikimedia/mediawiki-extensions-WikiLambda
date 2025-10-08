/*!
 * Type utility composable for Vue 3 Composition API.
 * Provides type-related utility functions
 *
 * @module ext.wikilambda.app.composables.useType
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const {
	getScaffolding,
	getZidOfGlobalKey,
	isKeyTypedListType,
	isKeyTypedListItem,
	isLocalKey,
	isValidZidFormat,
	typeToString
} = require( '../utils/typeUtils.js' );

/**
 * Type utility composable
 *
 * @return {Object} Type utility composable API
 */
module.exports = function useType() {
	return {
		getScaffolding,
		getZidOfGlobalKey,
		isKeyTypedListType,
		isKeyTypedListItem,
		isLocalKey,
		isValidZidFormat,
		typeToString
	};
};
