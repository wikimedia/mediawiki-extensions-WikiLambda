/*!
 * WikiLambda integration test expected API response object for an existing tester.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const existingFunctionFromApi = require( './existingFunctionFromApi.js' );

const functionZid = existingFunctionFromApi.zid;
const validationFunctionZid = 'Z45454';

const successTesterZid = 'Z87878';
const failedTesterZid = 'Z12121';

const testerZObject = function ( zid ) {
	return {
		[ Constants.Z_OBJECT_TYPE ]: Constants.Z_PERSISTENTOBJECT,
		[ Constants.Z_PERSISTENTOBJECT_ID ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
			[ Constants.Z_STRING_VALUE ]: zid
		},
		[ Constants.Z_PERSISTENTOBJECT_VALUE ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_TESTER,
			[ Constants.Z_TESTER_FUNCTION ]: functionZid,
			[ Constants.Z_TESTER_CALL ]: {
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
				[ Constants.Z_FUNCTION_CALL_FUNCTION ]: functionZid,
				[ functionZid + 'K1' ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
					[ Constants.Z_STRING_VALUE ]: 'test arg one'
				},
				[ functionZid + 'K2' ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_STRING,
					[ Constants.Z_STRING_VALUE ]: 'test arg two'
				}
			},
			[ Constants.Z_TESTER_VALIDATION ]: {
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
				[ Constants.Z_FUNCTION_CALL_FUNCTION ]: validationFunctionZid,
				[ validationFunctionZid + 'K2' ]: 'validation arg two'
			}
		},
		[ Constants.Z_PERSISTENTOBJECT_LABEL ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRING,
			[ Constants.Z_MULTILINGUALSTRING_VALUE ]: [
				Constants.Z_MONOLINGUALSTRING,
				{
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRING,
					[ Constants.Z_MONOLINGUALSTRING_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
					[ Constants.Z_MONOLINGUALSTRING_VALUE ]: 'Tester name, in English'
				}
			]
		},
		[ Constants.Z_PERSISTENTOBJECT_ALIASES ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MULTILINGUALSTRINGSET,
			[ Constants.Z_MULTILINGUALSTRINGSET_VALUE ]: [
				Constants.Z_MONOLINGUALSTRINGSET,
				{
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_MONOLINGUALSTRINGSET,
					[ Constants.Z_MONOLINGUALSTRINGSET_LANGUAGE ]: Constants.Z_NATURAL_LANGUAGE_ENGLISH,
					[ Constants.Z_MONOLINGUALSTRINGSET_VALUE ]: [
						Constants.Z_STRING,
						'Tester alias, in English'
					]
				}
			]
		}
	};
};

module.exports = exports = {
	testerZObject,
	successTesterZid,
	failedTesterZid
};
