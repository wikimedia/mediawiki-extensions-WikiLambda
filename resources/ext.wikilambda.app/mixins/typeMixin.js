/**
 * WikiLambda Vue editor: Type Mixin
 * Mixin with functions to change page titles outside Vue scope
 *
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

module.exports = exports = {
	methods: {
		// NOTE: Only add into the mixin those methods
		// that need to be accessible from components.
		getScaffolding,
		getZidOfGlobalKey,
		isKeyTypedListType,
		isKeyTypedListItem,
		isLocalKey,
		isValidZidFormat,
		typeToString
	}
};
