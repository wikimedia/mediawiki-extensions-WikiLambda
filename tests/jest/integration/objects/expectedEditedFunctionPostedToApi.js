/*!
 * WikiLambda integration test expected API posted object for an edited function.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const existingFunctionFromApi = require( './existingFunctionFromApi.js' );
const existingImplementationByCompositionFromApi = require( './existingImplementationByCompositionFromApi.js' );
const existingTesterFromApi = require( './existingTesterFromApi.js' );

const zid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];
const implementationByCompositionZid =
	existingImplementationByCompositionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ];

module.exports = {
	[ Constants.Z_OBJECT_TYPE ]: Constants.Z_PERSISTENTOBJECT,
	[ Constants.Z_PERSISTENTOBJECT_ID ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
		[ Constants.Z_STRING_VALUE ]: zid
	},
	[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION,
		[ Constants.Z_FUNCTION_ARGUMENTS ]: [
			Constants.Z_ARGUMENT,
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_ARGUMENT,
				[ Constants.Z_ARGUMENT_TYPE ]: Constants.Z_STRING,
				[ Constants.Z_ARGUMENT_KEY ]: zid + 'K1',
				[ Constants.Z_ARGUMENT_LABEL ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
					[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
						Constants.Z_MONOLINGUALSTRING,
						{
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
							[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_AFRIKAANS,
							[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'edited first argument label, in Afrikaans'
						},
						{
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
							[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_CHINESE,
							[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'newly added first argument label, in Chinese'
						}
					]
				}
			},
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_ARGUMENT,
				[ Constants.Z_ARGUMENT_TYPE ]: Constants.Z_STRING,
				[ Constants.Z_ARGUMENT_KEY ]: zid + 'K2',
				[ Constants.Z_ARGUMENT_LABEL ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
					[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
						Constants.Z_MONOLINGUALSTRING,
						{
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
							[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_AFRIKAANS,
							[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'second argument label, in Afrikaans'
						}
					]
				}
			}
		],
		[ Constants.Z_FUNCTION_RETURN_TYPE ]: Constants.Z_STRING,
		[ Constants.Z_FUNCTION_TESTERS ]: [ Constants.Z_TESTER, existingTesterFromApi.failedTesterZid ],
		[ Constants.Z_FUNCTION_IMPLEMENTATIONS ]: [ Constants.Z_IMPLEMENTATION, implementationByCompositionZid ],
		[ Constants.Z_FUNCTION_IDENTITY ]: zid
	},
	[ Constants.Z_PERSISTENTOBJECT_LABEL ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
		[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
			Constants.Z_MONOLINGUALSTRING,
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
				[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_CHINESE,
				[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'edited function name, in Chinese'
			},
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
				[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_FRENCH,
				[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'function name, in French'
			}
		]
	},
	[ Constants.Z_PERSISTENTOBJECT_ALIASES ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRINGSET,
		[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ]: [
			Constants.Z_MONOLINGUALSTRINGSET,
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRINGSET,
				[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_CHINESE,
				[ Constants.Z_MONOLINGUALSTRINGSET_VALUE ]: [
					Constants.Z_STRING,
					'function alias, in Chinese',
					'second function alias, in Chinese'
				]
			},
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRINGSET,
				[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_FRENCH,
				[ Constants.Z_MONOLINGUALSTRINGSET_VALUE ]: [
					Constants.Z_STRING,
					'function alias, in French'
				]
			}
		]
	},
	[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
		[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [ Constants.Z_MONOLINGUALSTRING ]
	}
};
