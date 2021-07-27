/*!
 * WikiLambda Vue editor: Module for storing, retrieving, and running test runners
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

var Vue = require( 'vue' ),
	Constants = require( '../../Constants.js' ),
	performFunctionCall = require( '../../mixins/callZFunction.js' ).methods.performFunctionCall,
	canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject;

module.exports = {
	state: {
		zTesterResults: {}
	},
	getters: {
		getZTesterResults: function ( state ) {
			return function ( zFunctionId, zTesterId, zImplementationId ) {
				var key = zFunctionId + ':' + zTesterId + ':' + zImplementationId;

				return state.zTesterResults[ key ];
			};
		},
		getZTesterPercentage: function ( state ) {
			return function ( zid ) {
				var results = Object.keys( state.zTesterResults ).filter( function ( key ) {
						return key.indexOf( zid ) !== -1 && state.zTesterResults[ key ] !== undefined;
					} ),
					total = results.length,
					passing = results.filter( function ( key ) {
						return state.zTesterResults[ key ] === true;
					} ).length,
					percentage = Math.round( ( passing / total ) * 100 ) || 0;

				return {
					total: total,
					passing: passing,
					percentage: percentage
				};
			};
		}
	},
	mutations: {
		setZTesterResult: function ( state, result ) {
			Vue.set( state.zTesterResults, result.key, result.result );
		}
	},
	actions: {
		resetTestResult: function ( context, payload ) {
			var key = payload.zFunctionId + ':' + payload.zTesterId + ':' + payload.zImplementationId;

			context.commit( 'setZTesterResult', {
				key: key,
				result: undefined
			} );
		},
		prepareTest: function ( context, payload ) {
			// If the test has no tester or implementation, skip it
			if ( !payload.zImplementationId || !payload.zTesterId ) {
				return;
			}

			// Reset test results
			context.dispatch( 'resetTestResult', payload );

			var zTesterObject,
				test,
				implementation,
				validatorZid,
				validator;

			// Get the keys for the implementation and tester
			context.dispatch( 'fetchZKeys', [ payload.zImplementationId, payload.zTesterId ] )
				.then( function () {
					// Get the tester object
					if ( payload.zTesterId === context.getters.getCurrentZObjectId ) {
						zTesterObject =
							canonicalize( JSON.parse( JSON.stringify( context.getters.getZObjectAsJson ) ) );
					} else {
						zTesterObject =
							canonicalize( JSON.parse( JSON.stringify(
								context.getters.getZkeys[ payload.zTesterId ]
							) ) );
					}

					// Get the test function call (Z20K1)
					test = zTesterObject[
						Constants.Z_PERSISTENTOBJECT_VALUE ][
						Constants.Z_TESTER_CALL
					];

					// Determine implementation
					if ( payload.zImplementationId === context.getters.getCurrentZObjectId ) {
						implementation = JSON.parse( JSON.stringify( context.getters.getZObjectAsJson ) )[
							Constants.Z_PERSISTENTOBJECT_VALUE
						];
					} else {
						implementation = payload.zImplementationId;
					}

					// Set the function call's function
					if ( this.zTesterId !== context.getters.getCurrentZObjectId ) {
						test[ Constants.Z_FUNCTION_CALL_FUNCTION ] = JSON.parse(
							JSON.stringify( context.getters.getZkeys[
								zTesterObject[
									Constants.Z_PERSISTENTOBJECT_VALUE ][
									Constants.Z_TESTER_CALL
								][
									Constants.Z_FUNCTION_CALL_FUNCTION
								]
							][ Constants.Z_PERSISTENTOBJECT_VALUE ] ) );

						// Set the function call's implementation
						test[ Constants.Z_FUNCTION_CALL_FUNCTION ][
							Constants.Z_FUNCTION_IMPLEMENTATIONS ] = [
							implementation
						];
					} else {
						test[ Constants.Z_FUNCTION_CALL_FUNCTION ] = JSON.parse(
							JSON.stringify( context.getters.getZkeys[
								canonicalize( zTesterObject[
									Constants.Z_PERSISTENTOBJECT_VALUE ][
									Constants.Z_TESTER_CALL
								][
									Constants.Z_FUNCTION_CALL_FUNCTION
								] )
							] ) );

						// Set the function call's implementation
						test[ Constants.Z_FUNCTION_CALL_FUNCTION ][
							Constants.Z_FUNCTION_IMPLEMENTATIONS ] = [
							implementation
						];
					}

					// Get the ZID of the validator
					validatorZid = zTesterObject[
						Constants.Z_PERSISTENTOBJECT_VALUE ][
						Constants.Z_TESTER_VALIDATION
					];

					// Fetch the validator function
					return context.dispatch( 'fetchZKeys', [ validatorZid ] );
				} )
				.then( function () {
					// Get the validator object
					validator = JSON.parse( JSON.stringify( context.getters.getZkeys[ validatorZid ] ) );

					// Perform the test runner
					return context.dispatch( 'performTest', {
						zFunctionId: payload.zFunctionId,
						zTesterId: payload.zTesterId,
						zImplementationId: payload.zImplementationId,
						test: test,
						validator: validator
					} );
				} );
		},
		performTest: function ( context, payload ) {
			var key = payload.zFunctionId + ':' + payload.zTesterId + ':' + payload.zImplementationId;
			// Perform function call (Z20K1)
			performFunctionCall( payload.test )
				.then( function ( response ) {
					// Construct function call for validation (Z20K2 -> Z7)
					var result = response.result,
						// Get the argument keys for the validation function
						validationArgument = payload.validator[
							Constants.Z_PERSISTENTOBJECT_VALUE ][
							Constants.Z_FUNCTION_ARGUMENTS ][
							0 ],
						// Construct a Z7 for the validation function
						validationPayload = {
							Z1K1: Constants.Z_FUNCTION_CALL,
							Z7K1: payload.validator[ Constants.Z_PERSISTENTOBJECT_VALUE ]
						};
					// Set the validation function's argument
					validationPayload[ validationArgument[ Constants.Z_ARGUMENT_KEY ] ] = result[ validationArgument[ Constants.Z_ARGUMENT_TYPE ] + 'K1' ];

					// Perform validation check
					return performFunctionCall( validationPayload );
				} )
				.then( function ( response ) {
					var result = response.result,
						error = response.error;

					// Store result
					if ( result === Constants.Z_NOTHING ) {
						// eslint-disable-next-line no-console
						console.error( error );
						context.commit( 'setZTesterResult', {
							key: key,
							// TODO - Replace with false
							result: false
						} );
					} else {
						context.commit( 'setZTesterResult', {
							key: key,
							result:
								result[ Constants.Z_BOOLEAN_IDENTITY ][ Constants.Z_REFERENCE_ID ] ===
									Constants.Z_BOOLEAN_TRUE
						} );
					}
				} )
				.catch( function () {
					// If any errors, store result as false
					context.commit( 'setZTesterResult', {
						key: key,
						result: false
					} );
				} );
		}
	}
};
