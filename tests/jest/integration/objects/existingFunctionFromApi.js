'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.edit/Constants.js' );

const zid = 'Z12345';

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
				[ Constants.Z_ARGUMENT_KEY ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
					[ Constants.Z_STRING_VALUE ]: zid + 'K1'
				},
				[ Constants.Z_ARGUMENT_LABEL ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
					[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
						Constants.Z_MONOLINGUALSTRING,
						{
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
							[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_CHINESE,
							[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'first argument label, in Chinese'
						}
					]
				}
			},
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_ARGUMENT,
				[ Constants.Z_ARGUMENT_TYPE ]: Constants.Z_STRING,
				[ Constants.Z_ARGUMENT_KEY ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
					[ Constants.Z_STRING_VALUE ]: zid + 'K2'
				},
				[ Constants.Z_ARGUMENT_LABEL ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
					[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
						Constants.Z_MONOLINGUALSTRING,
						{
							[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
							[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_CHINESE,
							[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'second argument label, in Chinese'
						}
					]
				}
			}
		],
		[ Constants.Z_FUNCTION_RETURN_TYPE ]: Constants.Z_STRING,
		[ Constants.Z_FUNCTION_TESTERS ]: [ Constants.Z_TESTER ],
		[ Constants.Z_FUNCTION_IMPLEMENTATIONS ]: [ Constants.Z_IMPLEMENTATION ],
		[ Constants.Z_FUNCTION_IDENTITY ]: zid
	},
	[ Constants.Z_PERSISTENTOBJECT_LABEL ]: {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
		[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
			Constants.Z_MONOLINGUALSTRING,
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
				[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_CHINESE,
				[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'function name, in Chinese'
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
					'function alias, in Chinese'
				]
			}
		]
	}
};