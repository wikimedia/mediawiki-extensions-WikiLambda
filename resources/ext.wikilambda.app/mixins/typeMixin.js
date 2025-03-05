/**
 * WikiLambda Vue editor: Type Mixin
 * Mixin with functions to change page titles outside Vue scope
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const {
	isValidZidFormat,
	getZidOfGlobalKey,
	isKeyTypedListType,
	isKeyTypedListItem,
	typeToString,
	getScaffolding
} = require( '../utils/typeUtils.js' );

module.exports = exports = {
	methods: {
		// NOTE: Only add into the mixin those methods
		// that need to be accessible from components.
		isValidZidFormat,
		getZidOfGlobalKey,
		isKeyTypedListType,
		isKeyTypedListItem,
		typeToString,
		getScaffolding
	}
};
