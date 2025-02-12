/*!
 * WikiLambda integration test expected API response object for an implementation through composition.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );

const compositionFunctionOne = 'Z9999';
const functionZid = 'Z12345';
const implementationByCompositionZid = 'Z2222';

module.exports = {
	[ Constants.Z_OBJECT_TYPE ]: Constants.Z_PERSISTENTOBJECT,
	[ Constants.Z_PERSISTENTOBJECT_ID ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
		[ Constants.Z_STRING_VALUE ]: implementationByCompositionZid
	},
	[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_IMPLEMENTATION,
		[ Constants.Z_IMPLEMENTATION_FUNCTION ]: functionZid,
		[ Constants.Z_IMPLEMENTATION_COMPOSITION ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_IMPLEMENTATION,
			[ Constants.Z_IMPLEMENTATION_COMPOSITION ]: {
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
				[ Constants.Z_FUNCTION_CALL_FUNCTION ]: compositionFunctionOne
			}
		}
	},
	[ Constants.Z_PERSISTENTOBJECT_LABEL ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
		[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
			Constants.Z_MONOLINGUALSTRING,
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
				[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
				[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'Implementation by composition, in English'
			},
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
				[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_CHINESE,
				[ Constants.Z_MONOLINGUALSTRINGSET_VALUE ]: 'Implementation by composition, in Chinese'
			}
		]
	},
	[ Constants.Z_PERSISTENTOBJECT_ALIASES ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRINGSET,
		[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ]: [
			Constants.Z_MONOLINGUALSTRINGSET
		]
	}
};
