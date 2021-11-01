/* eslint-disable camelcase */
/*!
 * WikiLambda Vue editor: Module for storing, retrieving, and running test runners
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */

var Vue = require( 'vue' ),
	Constants = require( '../../Constants.js' ),
	canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject;

module.exports = {
	state: {
		zTesterResults: {},
		zTesterMetadata: {},
		fetchingTestResults: false,
		errorState: false,
		errorMessage: ''
	},
	getters: {
		getZTesterResults: function ( state ) {
			return function ( zFunctionId, zTesterId, zImplementationId ) {
				var key = zFunctionId + ':' + zTesterId + ':' + zImplementationId;

				if ( state.errorState ) {
					return false;
				}

				var result = state.zTesterResults[ key ];
				return result &&
					result[ Constants.Z_PAIR_FIRST ] !== Constants.Z_NOTHING &&
					result[ Constants.Z_PAIR_FIRST ][ Constants.Z_BOOLEAN_IDENTITY ] === Constants.Z_BOOLEAN_TRUE;
			};
		},
		getZTesterFailReason: function ( state ) {
			return function ( zFunctionId, zTesterId, zImplementationId ) {
				var key = zFunctionId + ':' + zTesterId + ':' + zImplementationId;

				if ( state.errorState ) {
					return state.errorMessage;
				}

				var result = state.zTesterResults[ key ];
				if ( !result || result[ Constants.Z_PAIR_SECOND ] === Constants.Z_NOTHING ) {
					return null;
				}

				return result[ Constants.Z_PAIR_SECOND ].Z5K2;
			};
		},
		getZTesterMetadata: function ( state ) {
			return function ( zFunctionId, zTesterId, zImplementationId ) {
				var key = zFunctionId + ':' + zTesterId + ':' + zImplementationId;

				if ( state.errorState ) {
					return {
						duration: 0
					};
				}

				return state.zTesterMetadata[ key ];
			};
		},
		getZTesterPercentage: function ( state ) {
			return function ( zid ) {
				var results = Object.keys( state.zTesterResults ).filter( function ( key ) {
						return key.indexOf( zid ) !== -1 && state.zTesterResults[ key ] !== undefined;
					} ),
					total = results.length,
					passing = results.filter( function ( key ) {
						var result = state.zTesterResults[ key ];
						return result &&
						result[ Constants.Z_PAIR_FIRST ] !== Constants.Z_NOTHING &&
						result[ Constants.Z_PAIR_FIRST ][ Constants.Z_BOOLEAN_IDENTITY ] === Constants.Z_BOOLEAN_TRUE;
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
			Vue.set( state.zTesterMetadata, result.key, result.metadata );
		},
		setFetchingTestResults: function ( state, fetching ) {
			state.fetchingTestResults = fetching;
		},
		clearZTesterResults: function ( state ) {
			state.zTesterResults = {};
			state.zTesterMetadata = {};
		},
		setErrorState: function ( state, error ) {
			state.errorState = !!error;
			state.errorMessage = error.toString();
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
		getTestResults: function ( context, payload ) {
			var api = new mw.Api();

			if ( context.state.fetchingTestResults ) {
				return;
			}

			context.commit( 'setFetchingTestResults', true );
			context.commit( 'setErrorState', false );
			if ( payload.clearPreviousResults ) {
				context.commit( 'clearZTesterResults' );
			}

			return api.post( {
				action: 'wikilambda_perform_test',
				wikilambda_perform_test_zfunction:
					!context.getters.getViewMode && payload.zFunctionId === context.getters.getCurrentZObjectId ?
						JSON.stringify( context.getters.getZkeys[ payload.zFunctionId ] ) :
						payload.zFunctionId,
				wikilambda_perform_test_zimplementations: JSON.stringify(
					( payload.zImplementations || [] ).map( function ( impl ) {
						if ( !context.getters.getViewMode && impl === context.getters.getCurrentZObjectId ) {
							return canonicalize(
								JSON.parse( JSON.stringify( context.getters.getZObjectAsJson ) )
							);
						}

						if ( impl === Constants.NEW_ZID_PLACEHOLDER ) {
							return canonicalize(
								JSON.parse( JSON.stringify( context.getters.getZObjectAsJsonByZID( impl ) ) )
							);
						}

						return impl;
					} ).filter( function ( item ) {
						return !!item;
					} ) ),
				wikilambda_perform_test_ztesters: JSON.stringify(
					( payload.zTesters || [] ).map( function ( tester ) {
						if ( !context.getters.getViewMode && tester === context.getters.getCurrentZObjectId ) {
							return canonicalize(
								JSON.parse( JSON.stringify( context.getters.getZObjectAsJson ) )
							);
						}

						return tester;
					} ).filter( function ( item ) {
						return !!item;
					} ) ),
				wikilambda_perform_test_nocache: payload.nocache || false
			} ).then( function ( data ) {
				var results = JSON.parse( data.query.wikilambda_perform_test.Tested.data );

				if ( !Array.isArray( results ) && results.Z22K2 !== Constants.Z_NOTHING ) {
					throw new Error( results.Z22K2.Z5K2.Z6K1 );
				}

				results.forEach( function ( testResult ) {
					var metadata = testResult,
						response = canonicalize( testResult.validationResponse ),
						key = ( testResult.zFunctionId || Constants.NEW_ZID_PLACEHOLDER ) + ':' + ( testResult.zTesterId || Constants.NEW_ZID_PLACEHOLDER ) + ':' + ( testResult.zImplementationId || Constants.NEW_ZID_PLACEHOLDER );

					delete metadata.validationResponse;

					// Store result
					context.commit( 'setZTesterResult', {
						key: key,
						result: response,
						metadata: testResult
					} );
				} );

				context.commit( 'setFetchingTestResults', false );
			} )
				.catch( function ( error, message ) {
					mw.log.error( 'Tester API call was nothing: ' + error );

					var errorMessage = error;
					if ( message && message.error && message.error.info ) {
						errorMessage = message.error.info;
					}

					context.commit( 'setErrorState', errorMessage );
					context.commit( 'setFetchingTestResults', false );
				} );
		}
	}
};
