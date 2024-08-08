/*!
 * WikiLambda Vue editor: Module for storing, retrieving, and running test runners.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */

const Constants = require( '../../Constants.js' ),
	apiUtils = require( '../../mixins/api.js' ).methods,
	hybridToCanonical = require( '../../mixins/schemata.js' ).methods.hybridToCanonical,
	extractZIDs = require( '../../mixins/schemata.js' ).methods.extractZIDs;

module.exports = exports = {
	state: {
		zTesterResults: {},
		zTesterMetadata: {},
		testResultsPromises: {}
	},
	getters: {
		getZTesterResults: function ( state, getters ) {
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
				const key = zFunctionId + ':' + zTesterId + ':' + zImplementationId;

				const testResultErrors = getters.getErrors( Constants.errorIds.TEST_RESULTS );
				if ( testResultErrors.length > 0 ) {
					return false;
				}

				const result = state.zTesterResults[ key ];
				return result &&
					( result === Constants.Z_BOOLEAN_TRUE ||
						( typeof result === 'object' && result[ Constants.Z_BOOLEAN_IDENTITY ] === Constants.Z_BOOLEAN_TRUE ) );
			};
		},
		getZTesterMetadata: function ( state ) {
			/**
			 * Retrieve metadata (e.g. duration), for a specific test.
			 *
			 * Test are identified by a zFunctionId, zTesterId, and zImplementationId.
			 *
			 * @param {string} zFunctionId
			 * @param {string} zTesterId
			 * @param {string} zImplementationId
			 *
			 * @return {Object|undefined} metadata
			 */
			return function ( zFunctionId, zTesterId, zImplementationId ) {
				const key = zFunctionId + ':' + zTesterId + ':' + zImplementationId;
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
				const results = Object.keys( state.zTesterResults ).filter(
						( key ) => key.includes( zid ) && state.zTesterResults[ key ] !== undefined ),
					total = results.length,
					passing = results.filter( ( key ) => {
						const result = state.zTesterResults[ key ];
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
		},
		/**
		 * Returns the Zids of the passing and connected tests for the given functionZid
		 *
		 * @param {Object} state
		 * @param {Object} getters
		 * @return {Function}
		 */
		getPassingTestZids: function ( state, getters ) {
			/**
			 * @param {string} functionZid
			 * @return {Array}
			 */
			function getPassingTestsForFunction( functionZid ) {
				const connected = getters.getConnectedObjects( functionZid, Constants.Z_FUNCTION_TESTERS );
				const zids = [];

				for ( const key in state.zTesterResults ) {
					const parts = key.split( ':' );
					// Filter out tests for other functions
					if ( parts[ 0 ] === functionZid ) {
						const result = state.zTesterResults[ key ];
						const passing = result && (
							result === Constants.Z_BOOLEAN_TRUE ||
							( typeof result === 'object' && result[ Constants.Z_BOOLEAN_IDENTITY ] === Constants.Z_BOOLEAN_TRUE )
						);
						// If test passes, return zid
						if ( passing && connected.includes( parts[ 1 ] ) ) {
							zids.push( parts[ 1 ] );
						}
					}
				}
				return [ ...new Set( zids ) ];
			}
			return getPassingTestsForFunction;
		}
	},
	mutations: {
		/**
		 * Set or unset the unresolved promise to the testResults API call for a given functionZid.
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {string} payload.functionZid
		 * @param {Promise} payload.promise
		 */
		setTestResultsPromise: function ( state, payload ) {
			if ( 'promise' in payload ) {
				state.testResultsPromises[ payload.functionZid ] = payload.promise;
			} else {
				// Set as a resolved Promise if the tests for this function have been fetched
				state.testResultsPromises[ payload.functionZid ] = Promise.resolve();
			}
		},
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
			state.zTesterResults[ result.key ] = result.result;
			state.zTesterMetadata[ result.key ] = result.metadata;
		},
		/**
		 * Clear all the test results and metadata
		 *
		 * @param {Object} state
		 * @param {string} functionZid
		 */
		clearZTesterResults: function ( state, functionZid ) {
			state.zTesterResults = {};
			state.zTesterMetadata = {};
			// Clear Promise
			delete state.testResultsPromises[ functionZid ];
		}
	},
	actions: {
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
		 * @return {Promise|void}
		 */
		getTestResults: function ( context, payload ) {
			/**
			 * Loop through the given array of ZIDs and if a ZID is for the object currently being edited, or for a new
			 * object, replace it with a JSON representation of the full persistent object (if editing existing object)
			 * or inner object (if new object). This is required to be able to see proper test results while changing
			 * implementations and testers.
			 *
			 * @param {Object} iContext
			 * @param {Array} items - List of implementations or testers
			 * @return {Array}
			 */
			function replaceCurrentObjectWithFullJSONObject( iContext, items ) {
				return ( items || [] ).map( ( item ) => {
					// if the item is the current object replace it
					if ( !iContext.getters.getViewMode && item === iContext.getters.getCurrentZObjectId ) {
						let zobject = iContext.getters.getZObjectAsJson;
						if ( item === Constants.NEW_ZID_PLACEHOLDER ) {
							// If this object is not yet persisted, pass only the inner object to the API, as otherwise
							// the API will complain about the placeholder ID Z0 not existing.
							zobject = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
						}
						return JSON.stringify( hybridToCanonical( JSON.parse( JSON.stringify( zobject ) ) ) );
					}

					return item;
				} ).filter( ( item ) => !!item );
			}

			// If function ZID is empty, exit
			if ( !payload.zFunctionId ) {
				return;
			}

			// Clear previous results and make sure that the call is triggered
			if ( payload.clearPreviousResults ) {
				context.commit( 'clearZTesterResults', payload.zFunctionId );
			}

			// If this API for this functionZid is already running, return promise
			if ( payload.zFunctionId in context.state.testResultsPromises ) {
				return context.state.testResultsPromises[ payload.zFunctionId ];
			}

			context.commit( 'clearErrorsForId', Constants.errorIds.TEST_RESULTS );

			const implementations = replaceCurrentObjectWithFullJSONObject(
				context,
				payload.zImplementations
			).map(
				// (T358089) Encode any '|' characters of ZObjects so that they can be recovered after the API.
				( a ) => a.replace( /\|/g, '🪈' )
			);
			const testers = replaceCurrentObjectWithFullJSONObject(
				context,
				payload.zTesters
			).map(
				// (T358089) Encode any '|' characters of ZObjects so that they can be recovered after the API.
				( a ) => a.replace( /\|/g, '🪈' )
			);

			const testResultsPromise = apiUtils.performTests( {
				functionZid: payload.zFunctionId,
				nocache: payload.nocache,
				implementations,
				testers
			} ).then( ( results ) => {
				const zids = [];
				results.forEach( ( testResult ) => {
					const result = hybridToCanonical( JSON.parse( testResult.validateStatus ) );
					const metadata = hybridToCanonical( JSON.parse( testResult.testMetadata ) );
					const key = ( testResult.zFunctionId || Constants.NEW_ZID_PLACEHOLDER ) + ':' +
						( testResult.zTesterId || Constants.NEW_ZID_PLACEHOLDER ) + ':' +
						( testResult.zImplementationId || Constants.NEW_ZID_PLACEHOLDER );

					// Collect zids
					zids.push( testResult.zTesterId );
					zids.push( testResult.zImplementationId );
					zids.push( ...extractZIDs( status ) );
					zids.push( ...extractZIDs( metadata ) );

					// Store result
					context.commit( 'setZTesterResult', { key, result, metadata } );
				} );

				// Make sure that all returned Zids are in library.js
				context.dispatch( 'fetchZids', { zids: [ ...new Set( zids ) ] } );
				context.commit( 'setTestResultsPromise', { functionZid: payload.zFunctionId } );
			} ).catch( ( /* ApiError */ error ) => {
				context.commit( 'setError', {
					rowId: Constants.errorIds.TEST_RESULTS,
					errorType: Constants.errorTypes.ERROR,
					errorMessage: error.messageOrFallback( Constants.errorCodes.UNKNOWN_TEST_ERROR )
				} );
				context.commit( 'setTestResultsPromise', { functionZid: payload.zFunctionId } );
			} );

			context.commit( 'setTestResultsPromise', {
				functionZid: payload.zFunctionId,
				promise: testResultsPromise
			} );
			return testResultsPromise;
		}
	}
};
