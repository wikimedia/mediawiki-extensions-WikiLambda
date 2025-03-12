/**
 * WikiLambda Vue editor: Type Mixin
 * Mixin with functions to change page titles outside Vue scope
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const {
	isGenericType,
	getZObjectType,
	findKeyInArray,
	isValidZidFormat,
	isGlobalKey,
	getZidOfGlobalKey,
	getKeyFromKeyList,
	getArgFromArgList,
	isKeyTypedListType,
	isKeyTypedListItem,
	typeToString,
	getScaffolding,
	initializePayloadForType,
	isTruthyOrEqual
} = require( '../utils/typeUtils.js' );

module.exports = exports = {
	methods: {
		isGenericType,
		getZObjectType,
		findKeyInArray,
		isValidZidFormat,
		isGlobalKey,
		getZidOfGlobalKey,
		getKeyFromKeyList,
		getArgFromArgList,
		isKeyTypedListType,
		isKeyTypedListItem,
		typeToString,
		getScaffolding,
		initializePayloadForType,
		isTruthyOrEqual
	}
};
