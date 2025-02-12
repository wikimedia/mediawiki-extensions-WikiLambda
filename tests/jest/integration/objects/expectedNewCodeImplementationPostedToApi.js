/*!
 * WikiLambda integration test expected API posted object for a new code implementation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const existingFunctionFromApi = require( './existingFunctionFromApi.js' );

module.exports = {
	[ Constants.Z_OBJECT_TYPE ]: Constants.Z_PERSISTENTOBJECT,
	[ Constants.Z_PERSISTENTOBJECT_ID ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
		[ Constants.Z_STRING_VALUE ]: Constants.NEW_ZID_PLACEHOLDER
	},
	[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_IMPLEMENTATION,
		[ Constants.Z_IMPLEMENTATION_FUNCTION ]:
			existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ],
		[ Constants.Z_IMPLEMENTATION_CODE ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_CODE,
			[ Constants.Z_CODE_LANGUAGE ]: Constants.Z_PROGRAMMING_LANGUAGES.JAVASCRIPT,
			[ Constants.Z_CODE_CODE ]: 'function Z12345( Z12345K1, Z12345K2 ) {\n\n}'
		}
	},
	[ Constants.Z_PERSISTENTOBJECT_LABEL ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
		[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
			Constants.Z_MONOLINGUALSTRING,
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
				[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
				[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'implementation name'
			}
		]
	},
	[ Constants.Z_PERSISTENTOBJECT_ALIASES ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRINGSET,
		[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ]: [ Constants.Z_MONOLINGUALSTRINGSET ]
	},
	[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
		[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [ Constants.Z_MONOLINGUALSTRING ]
	}
};
