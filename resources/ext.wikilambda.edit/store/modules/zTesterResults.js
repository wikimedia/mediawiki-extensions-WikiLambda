/*!
 * WikiLambda Vue editor: Module for storing, retrieving, and running test runners
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

var Vue = require( 'vue' ),
	Constants = require( '../../Constants.js' ),
	canonicalize = require( '../../mixins/schemata.js' ).methods.canonicalizeZObject;

/**
 * Loop through a given array and replace the current Object or the placeholder object with a full object
 * This is required to be able to see proper test result whil changin implementations and testers.
 *
 * @param {Object} context
 * @param {Array} items - List of implementations or testers
 * @param {Object} newItemZObject - Full zObject of the implementation or tester
 * @return {Array}
 */
function replaceCurrentObjectWithFullJSONObject( context, items, newItemZObject ) {
	return ( items || [] ).map( function ( item ) {
		// if the item is the current object replace it
		if ( !context.getters.getViewMode && item === context.getters.getCurrentZObjectId ) {
			return canonicalize(
				JSON.parse( JSON.stringify( context.getters.getZObjectAsJson ) )
			);
		}

		// if the item has a placeholder value, it means that it is a new implementation/tester, replace it
		if ( item === Constants.NEW_ZID_PLACEHOLDER && newItemZObject ) {
			return canonicalize(
				JSON.parse( JSON.stringify( newItemZObject ) )
			);
		}

		return item;
	} ).filter( function ( item ) {
		return !!item;
	} );
}

module.exports = exports = {
	state: {
		zTesterResults: {},
		zTesterMetadata: {},
		fetchingTestResults: false,
		errorState: false,
		errorMessage: ''
	},
	getters: {
		getZTesterResults: function ( state ) {
			/**
			 * Retrieve the result value zTester a specific set of Function, tester and implementation.
			 *
			 * @param {string} zFunctionId
			 * @param {string} zTesterId
			 * @param {string} zImplementationId
			 *
			 * @return {boolean}
			 */
			return function ( zFunctionId, zTesterId, zImplementationId ) {
				var key = zFunctionId + ':' + zTesterId + ':' + zImplementationId;

				if ( state.errorState ) {
					return false;
				}

				var result = state.zTesterResults[ key ];
				return result &&
					( result === Constants.Z_BOOLEAN_TRUE ||
						( typeof result === 'object' && result[ Constants.Z_BOOLEAN_IDENTITY ] === Constants.Z_BOOLEAN_TRUE ) );
			};
		},
		getZTesterMetadata: function ( state ) {
			/**
			 * Retrieve metadata ( eg. duration ), for a specific test.
			 * Test are identified by a zFunctionId, zTesterId, and zImplementationId.
			 *
			 * @param {string} zFunctionId
			 * @param {string} zTesterId
			 * @param {string} zImplementationId
			 *
			 * @return {Object} metadata
			 */
			return function ( zFunctionId, zTesterId, zImplementationId ) {
				var key = zFunctionId + ':' + zTesterId + ':' + zImplementationId;

				// TODO(T314267): Check for and handle state.errorState = true

				return state.zTesterMetadata[ key ];
			};
		},
		getZTesterPercentage: function ( state ) {
			/**
			 * Retrieve percentage of test that passed.
			 * This getter takes into consideration all the tests of a specific zId
			 *
			 * @param {string} zid
			 *
			 * @return {Object}
			 */
			return function ( zid ) {
				var results = Object.keys( state.zTesterResults ).filter( function ( key ) {
						return key.indexOf( zid ) !== -1 && state.zTesterResults[ key ] !== undefined;
					} ),
					total = results.length,
					passing = results.filter( function ( key ) {
						var result = state.zTesterResults[ key ];
						return result &&
							( result === Constants.Z_BOOLEAN_TRUE ||
								( typeof result === 'object' && result[ Constants.Z_BOOLEAN_IDENTITY ] === Constants.Z_BOOLEAN_TRUE ) );
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
		/**
		 * Set the result of a specific test
		 *
		 * @param {Object} state
		 * @param {Object} result
		 * @param {string} result.key
		 * @param {boolean} result.result
		 * @param {Object} result.metadata
		 */
		setZTesterResult: function ( state, result ) {
			Vue.set( state.zTesterResults, result.key, result.result );
			Vue.set( state.zTesterMetadata, result.key, result.metadata );
		},
		/**
		 * Set the fetching state of the test results
		 *
		 * @param {Object} state
		 * @param {boolean} fetching
		 */
		setFetchingTestResults: function ( state, fetching ) {
			state.fetchingTestResults = fetching;
		},
		/**
		 * Clear all the test results and metadata
		 *
		 * @param {Object} state
		 */
		clearZTesterResults: function ( state ) {
			state.zTesterResults = {};
			state.zTesterMetadata = {};
		},
		/**
		 * Set the error state and message
		 *
		 * @param {Object} state
		 * @param {Object} error
		 */
		setErrorState: function ( state, error ) {
			state.errorState = !!error;
			state.errorMessage = error.toString();
		}
	},
	actions: {
		/**
		 * Reset the test results, using payload to create the required test keys
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.zFunctionId
		 * @param {string} payload.zTesterId
		 * @param {string} payload.zImplementationId
		 */
		resetTestResult: function ( context, payload ) {
			var key = payload.zFunctionId + ':' + payload.zTesterId + ':' + payload.zImplementationId;

			context.commit( 'setZTesterResult', {
				key: key,
				result: undefined
			} );
		},
		/**
		 * Triggers a test API call and updates the test results, handles the test pending state
		 * and also define the error state and meessage if test returns errors
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.zFunctionId The ZID of the Function we're for which running these
		 * @param {string[]} payload.zTesters The ZIDs (or if unsaved the full ZObjects) of the Testers to run
		 * @param {string[]} payload.zImplementations The ZIDs (or if unsaved the full ZObjects) of the
		 *   Implementations to run
		 * @param {boolean} payload.nocache Whether to tell the Orchestrator to cache these results
		 * @param {boolean} payload.clearPreviousResults Whether to clear the previous results from the Vuex store
		 *
		 * @return {Promise}
		 */
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

			var implementations = replaceCurrentObjectWithFullJSONObject(
				context,
				payload.zImplementations
			);
			var testers = replaceCurrentObjectWithFullJSONObject(
				context,
				payload.zTesters,
				context.getters.getNewTesterZObjects
			);

			return api.get( {
				action: 'wikilambda_perform_test',
				wikilambda_perform_test_zfunction:
					!context.getters.getViewMode && payload.zFunctionId === context.getters.getCurrentZObjectId ?
						JSON.stringify( context.getters.getZkeys[ payload.zFunctionId ] ) :
						payload.zFunctionId,
				wikilambda_perform_test_zimplementations: implementations.join( '|' ),
				wikilambda_perform_test_ztesters: testers.join( '|' ),
				wikilambda_perform_test_nocache: payload.nocache || false
			} ).then( function ( data ) {
				var results = data.query.wikilambda_perform_test;
				if ( !Array.isArray( results ) &&
						results[ Constants.Z_RESPONSEENVELOPE_METADATA ] !== Constants.Z_NOTHING ) {
					throw new Error(
						results[
							Constants.Z_RESPONSEENVELOPE_METADATA
						][
							Constants.Z_ERROR_VALUE
						][
							Constants.Z_STRING_VALUE
						]
					);
				}

				results.forEach( function ( testResult ) {
					var status = canonicalize( JSON.parse( testResult.validateStatus ) ),
						metadata = canonicalize( JSON.parse( testResult.testMetadata ) ),
						key = ( testResult.zFunctionId || Constants.NEW_ZID_PLACEHOLDER ) + ':' + ( testResult.zTesterId || Constants.NEW_ZID_PLACEHOLDER ) + ':' + ( testResult.zImplementationId || Constants.NEW_ZID_PLACEHOLDER );

					// Store result
					context.commit( 'setZTesterResult', {
						key: key,
						result: status,
						metadata: metadata
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
