/*!
 * WikiLambda integration test expected API posted object for a new function without any labels.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );

module.exports = {
	[ Constants.Z_OBJECT_TYPE ]: Constants.Z_PERSISTENTOBJECT,
	[ Constants.Z_PERSISTENTOBJECT_ID ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
		[ Constants.Z_STRING_VALUE ]: Constants.NEW_ZID_PLACEHOLDER
	},
	[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION,
		[ Constants.Z_FUNCTION_ARGUMENTS ]: [
			Constants.Z_ARGUMENT,
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_ARGUMENT,
				[ Constants.Z_ARGUMENT_TYPE ]: Constants.Z_STRING,
				[ Constants.Z_ARGUMENT_KEY ]: 'Z0K1',
				[ Constants.Z_ARGUMENT_LABEL ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
					[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
						Constants.Z_MONOLINGUALSTRING
					]
				}
			},
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_ARGUMENT,
				[ Constants.Z_ARGUMENT_TYPE ]: Constants.Z_STRING,
				[ Constants.Z_ARGUMENT_KEY ]: 'Z0K2',
				[ Constants.Z_ARGUMENT_LABEL ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
					[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
						Constants.Z_MONOLINGUALSTRING,
						{
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
							[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
							[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'label for second argument, in English'
						}
					]
				}
			},
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_ARGUMENT,
				[ Constants.Z_ARGUMENT_TYPE ]: Constants.Z_STRING,
				[ Constants.Z_ARGUMENT_KEY ]: 'Z0K3',
				[ Constants.Z_ARGUMENT_LABEL ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
					[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
						Constants.Z_MONOLINGUALSTRING
					]
				}
			}
		],
		[ Constants.Z_FUNCTION_RETURN_TYPE ]: Constants.Z_STRING,
		[ Constants.Z_FUNCTION_TESTERS ]: [ Constants.Z_TESTER ],
		[ Constants.Z_FUNCTION_IMPLEMENTATIONS ]: [ Constants.Z_IMPLEMENTATION ],
		[ Constants.Z_FUNCTION_IDENTITY ]: Constants.NEW_ZID_PLACEHOLDER
	},
	[ Constants.Z_PERSISTENTOBJECT_LABEL ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
		[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
			Constants.Z_MONOLINGUALSTRING
		]
	},
	[ Constants.Z_PERSISTENTOBJECT_ALIASES ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRINGSET,
		[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ]: [
			Constants.Z_MONOLINGUALSTRINGSET
		]
	},
	[ Constants.Z_PERSISTENTOBJECT_DESCRIPTION ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
		[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [ Constants.Z_MONOLINGUALSTRING ]
	}
};
