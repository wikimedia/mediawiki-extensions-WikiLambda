/*!
 * WikiLambda integration test expected API response object for a function call.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../../../resources/ext.wikilambda.app/Constants.js' );

module.exports = {
	[ Constants.Z_OBJECT_TYPE ]: Constants.Z_RESPONSEENVELOPE,
	[ Constants.Z_RESPONSEENVELOPE_VALUE ]: 'the function call result',
	[ Constants.Z_RESPONSEENVELOPE_METADATA ]: {
		[ Constants.Z_OBJECT_TYPE ]: {
			[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
			[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_MAP,
			[ Constants.Z_TYPED_MAP_TYPE1 ]: Constants.Z_STRING,
			[ Constants.Z_TYPED_MAP_TYPE2 ]: Constants.Z_OBJECT
		}, K1: [
			{
				[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
				[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_PAIR,
				[ Constants.Z_TYPED_PAIR_TYPE1 ]: Constants.Z_STRING,
				[ Constants.Z_TYPED_PAIR_TYPE2 ]: Constants.Z_OBJECT
			},
			{
				[ Constants.Z_OBJECT_TYPE ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_PAIR,
					[ Constants.Z_TYPED_PAIR_TYPE1 ]: Constants.Z_STRING,
					[ Constants.Z_TYPED_PAIR_TYPE2 ]: Constants.Z_OBJECT
				},
				K1: 'orchestrationStartTime',
				K2: '2022-11-09T19:56:43Z'
			},
			{
				[ Constants.Z_OBJECT_TYPE ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_PAIR,
					[ Constants.Z_TYPED_PAIR_TYPE1 ]: Constants.Z_STRING,
					[ Constants.Z_TYPED_PAIR_TYPE2 ]: Constants.Z_OBJECT
				},
				K1: 'orchestrationEndTime',
				K2: '2022-11-09T19:56:52Z'
			},
			{
				[ Constants.Z_OBJECT_TYPE ]: {
					[ Constants.Z_OBJECT_TYPE ]: Constants.Z_FUNCTION_CALL,
					[ Constants.Z_FUNCTION_CALL_FUNCTION ]: Constants.Z_TYPED_PAIR,
					[ Constants.Z_TYPED_PAIR_TYPE1 ]: Constants.Z_STRING,
					[ Constants.Z_TYPED_PAIR_TYPE2 ]: Constants.Z_OBJECT
				},
				K1: 'orchestrationDuration',
				K2: '146ms'
			}
		]
	}
};
