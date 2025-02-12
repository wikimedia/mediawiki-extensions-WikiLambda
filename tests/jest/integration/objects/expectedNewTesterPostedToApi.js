/*!
 * WikiLambda integration test expected API posted object for a new tester.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const existingFunctionFromApi = require( './existingFunctionFromApi.js' );

const functionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

module.exports = {
	[ Constants.Z_OBJECT_TYPE ]: Constants.Z_PERSISTENTOBJECT,
	[ Constants.Z_PERSISTENTOBJECT_ID ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
		[ Constants.Z_STRING_VALUE ]: Constants.NEW_ZID_PLACEHOLDER
	},
	[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_TESTER,
		[ Constants.Z_TESTER_FUNCTION ]: functionZid,
		[ Constants.Z_TESTER_CALL ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
			[ Constants.Z_FUNCTION_CALL_FUNCTION ]: functionZid,
			[ functionZid + 'K1' ]: 'first argument value',
			[ functionZid + 'K2' ]: 'second argument value'
		},
		[ Constants.Z_TESTER_VALIDATION ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
			[ Constants.Z_FUNCTION_CALL_FUNCTION ]: 'Z866',
			Z866K2: 'expected value'
		}
	},
	[ Constants.Z_PERSISTENTOBJECT_LABEL ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
		[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
			Constants.Z_MONOLINGUALSTRING,
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
				[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
				[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'tester name'
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
