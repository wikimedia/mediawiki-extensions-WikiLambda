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
		fetchingTestResults: false,
		errorState: false
	},
	getters: {
		getZTesterResults: function ( state ) {
			return function ( zFunctionId, zTesterId, zImplementationId ) {
				var key = zFunctionId + ':' + zTesterId + ':' + zImplementationId;

				if ( state.errorState ) {
					return false;
				}

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
		},
		setFetchingTestResults: function ( state, fetching ) {
			state.fetchingTestResults = fetching;
		},
		clearZTesterResults: function ( state ) {
			state.zTesterResults = {};
		},
		setErrorState: function ( state, error ) {
			state.errorState = error;
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

				results.forEach( function ( testResult ) {
					var response = canonicalize( testResult.validationResponse ),
						result = response[ Constants.Z_PAIR_FIRST ],
						error = response[ Constants.Z_PAIR_SECOND ],
						key = testResult.zFunctionId + ':' + testResult.zTesterId + ':' + testResult.zImplementationId;

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
								result[ Constants.Z_BOOLEAN_IDENTITY ] ===
									Constants.Z_BOOLEAN_TRUE
						} );
					}
				} );

				context.commit( 'setFetchingTestResults', false );
			} )
				.catch( function ( error ) {
					// eslint-disable-next-line no-console
					console.error( error );
					context.commit( 'setErrorState', true );
					context.commit( 'setFetchingTestResults', false );
				} );
		}
	}
};
