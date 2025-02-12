/*!
 * WikiLambda integration test expected API posted object for a function call.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );
const existingFunctionFromApi = require( './existingFunctionFromApi.js' );

const existingFunctionZid = existingFunctionFromApi[ Constants.Z_PERSISTENTOBJECT_ID ][ Constants.Z_STRING_VALUE ],
	existingFunctionFirstArgumentId =
		existingFunctionFromApi[
			Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ][ 1 ][ Constants.Z_ARGUMENT_KEY ],
	existingFunctionSecondArgumentId =
		existingFunctionFromApi[
			Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_FUNCTION_ARGUMENTS ][ 2 ][ Constants.Z_ARGUMENT_KEY ];

module.exports = {
	[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
	[ Constants.Z_FUNCTION_CALL_FUNCTION ]: existingFunctionZid,
	[ existingFunctionFirstArgumentId ]: 'first argument value',
	[ existingFunctionSecondArgumentId ]: 'second argument value'
};
