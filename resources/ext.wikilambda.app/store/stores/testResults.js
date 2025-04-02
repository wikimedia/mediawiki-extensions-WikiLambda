/*!
 * WikiLambda Vue editor: Pinia store for storing, retrieving, and running test runners.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
const { performTests } = require( '../../utils/apiUtils.js' );
const { isTruthyOrEqual } = require( '../../utils/typeUtils.js' );
const { extractZIDs, hybridToCanonical } = require( '../../utils/schemata.js' );

module.exports = {
	state: {
		zTesterResults: {},
		zTesterMetadata: {},
		testResultsPromises: {}
	},

	getters: {
		/**
		 * Retrieve the result value zTester a specific set of Function, tester and implementation.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getZTesterResults: function ( state ) {
			/**
			 * @param {string} zFunctionId
			 * @param {string} zTesterId
			 * @param {string} zImplementationId
			 *
			 * @return {boolean}
			 */
			const findZTesterResults = ( zFunctionId, zTesterId, zImplementationId ) => {
				const key = zFunctionId + ':' + zTesterId + ':' + zImplementationId;

				const testResultErrors = this.getErrors( Constants.errorIds.TEST_RESULTS );
				if ( testResultErrors.length > 0 ) {
					return false;
				}

				const result = state.zTesterResults[ key ];
				return result && (
					result === Constants.Z_BOOLEAN_TRUE ||
					( typeof result === 'object' && result[ Constants.Z_BOOLEAN_IDENTITY ] === Constants.Z_BOOLEAN_TRUE )
				);
			};
			return findZTesterResults;
		},

		/**
		 * Retrieve metadata (e.g. duration), for a specific test.
		 *
		 * Test are identified by a zFunctionId, zTesterId, and zImplementationId.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getZTesterMetadata: function ( state ) {
			/**
			 * @param {string} zFunctionId
			 * @param {string} zTesterId
			 * @param {string} zImplementationId
			 *
			 * @return {Object|undefined} metadata
			 */
			const findZTesterMetadata = ( zFunctionId, zTesterId, zImplementationId ) => {
				const key = `${ zFunctionId }:${ zTesterId }:${ zImplementationId }`;
				return state.zTesterMetadata[ key ];
			};
			return findZTesterMetadata;
		},

		/**
		 * Retrieve percentage of test that passed.
		 * This getter takes into consideration all the tests of a specific zId
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getZTesterPercentage: function ( state ) {
			/**
			 * @param {string} zid
			 *
			 * @return {Object}
			 */
			const calculateZTesterPercentage = ( zid ) => {
				const results = Object.keys( state.zTesterResults )
					.filter( ( key ) => key.includes( zid ) && state.zTesterResults[ key ] !== undefined );
				const total = results.length;
				const passing = results.filter( ( key ) => {
					const result = state.zTesterResults[ key ];
					return result && (
						result === Constants.Z_BOOLEAN_TRUE ||
							( typeof result === 'object' && result[ Constants.Z_BOOLEAN_IDENTITY ] === Constants.Z_BOOLEAN_TRUE )
					);
				} ).length;
				const percentage = Math.round( ( passing / total ) * 100 ) || 0;

				return {
					total: total,
					passing: passing,
					percentage: percentage
				};
			};
			return calculateZTesterPercentage;
		},

		/**
		 * Returns the Zids of the passing and connected tests for the given functionZid
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getPassingTestZids: function ( state ) {
			/**
			 * @param {string} functionZid
			 * @return {Array}
			 */
			const findPassingTestZids = ( functionZid ) => {
				const connected = this.getConnectedObjects( functionZid, Constants.Z_FUNCTION_TESTERS );
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
			};
			return findPassingTestZids;
		},

		/**
		 * Filters the passing test ZIDs and returns an array of valid renderer tests.
		 * A valid renderer test is well-formed and has a call to the renderer function
		 * directly under the Test call key/Z20K1.
		 *
		 * @return {Function}
		 */
		getValidRendererTests: function () {
			/**
			 * @param {string} rendererZid
			 * @return {Array}
			 */
			const findValidRendererTests = ( rendererZid ) => {
				const passingTestZids = this.getPassingTestZids( rendererZid );
				return passingTestZids
					.map( ( zid ) => {
						const zobject = this.getStoredObject( zid );
						return {
							zid,
							zobject: zobject ? zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ] : undefined
						};
					} )
					.filter( ( test ) => isTruthyOrEqual( test.zobject, [
						Constants.Z_TESTER_CALL,
						Constants.Z_FUNCTION_CALL_FUNCTION
					], rendererZid ) );
			};
			return findValidRendererTests;
		}
	},

	actions: {
		/**
		 * Triggers a test API call and updates the test results, handles the test pending state
		 * and also define the error state and message if test returns errors
		 *
		 * @param {Object} payload
		 * @param {string} payload.zFunctionId The ZID of the Function we're for which running these
		 * @param {string[]} payload.zTesters The ZIDs (or if unsaved the full ZObjects) of the Testers to run
		 * @param {string[]} payload.zImplementations The ZIDs (or if unsaved the full ZObjects) of the
		 *   Implementations to run
		 * @param {boolean} payload.nocache Whether to tell the Orchestrator to cache these results
		 * @param {boolean} payload.clearPreviousResults Whether to clear the previous results from the Pinia store
		 *
		 * @return {Promise}
		 */
		getTestResults: function ( payload ) {
			/**
			 * Loop through the given array of ZIDs and if a ZID is for the object currently being edited, or for a new
			 * object, replace it with a JSON representation of the full persistent object (if editing existing object)
			 * or inner object (if new object). This is required to be able to see proper test results while changing
			 * implementations and testers.
			 *
			 * @param {Array} items - List of implementations or testers
			 * @return {Array}
			 */
			function replaceCurrentObjectWithFullJSONObject( items ) {
				return ( items || [] ).map( ( item ) => {
					// if the item is the current object replace it
					if ( !this.getViewMode && item === this.getCurrentZObjectId ) {
						let zobject = this.getZObjectAsJson;
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
				return Promise.resolve();
			}

			// Clear previous results and make sure that the call is triggered
			if ( payload.clearPreviousResults ) {
				this.clearZTesterResults( payload.zFunctionId );
			}

			// If this API for this functionZid is already running, return promise
			if ( payload.zFunctionId in this.testResultsPromises ) {
				return this.testResultsPromises[ payload.zFunctionId ];
			}

			this.clearErrors( Constants.errorIds.TEST_RESULTS );

			// (T358089) Encode any '|' characters of ZObjects so that they can be recovered after the API.
			const implementations = replaceCurrentObjectWithFullJSONObject.call( this, payload.zImplementations )
				.map( ( a ) => a.replace( /\|/g, '🪈' ) );
			const testers = replaceCurrentObjectWithFullJSONObject.call( this, payload.zTesters )
				.map( ( a ) => a.replace( /\|/g, '🪈' ) );

			const testResultsPromise = performTests( {
				functionZid: payload.zFunctionId,
				nocache: payload.nocache,
				language: this.getUserLangCode,
				implementations,
				testers
			} ).then( ( results ) => {
				const zids = [];
				results.forEach( ( testResult ) => {
					const result = hybridToCanonical( JSON.parse( testResult.validateStatus ) );
					const metadata = hybridToCanonical( JSON.parse( testResult.testMetadata ) );
					const key = `${ testResult.zFunctionId || Constants.NEW_ZID_PLACEHOLDER }:` +
					`${ testResult.zTesterId || Constants.NEW_ZID_PLACEHOLDER }:` +
					`${ testResult.zImplementationId || Constants.NEW_ZID_PLACEHOLDER }`;

					// Collect zids
					zids.push( testResult.zTesterId );
					zids.push( testResult.zImplementationId );
					zids.push( ...extractZIDs( result ) );
					zids.push( ...extractZIDs( metadata ) );

					// Store result
					this.setZTesterResult( { key, result, metadata } );
				} );

				// Make sure that all returned Zids are in library.js
				this.fetchZids( { zids: [ ...new Set( zids ) ] } );
				this.setTestResultsPromise( { functionZid: payload.zFunctionId } );
			} ).catch( ( error ) => {
				this.setError( {
					rowId: Constants.errorIds.TEST_RESULTS,
					errorType: Constants.errorTypes.ERROR,
					errorMessage: error.messageOrFallback( Constants.errorCodes.UNKNOWN_TEST_ERROR )
				} );
				this.setTestResultsPromise( { functionZid: payload.zFunctionId } );
			} );

			this.setTestResultsPromise( {
				functionZid: payload.zFunctionId,
				promise: testResultsPromise
			} );
			return testResultsPromise;
		},

		/**
		 * Set or unset the unresolved promise to the testResults API call for a given functionZid.
		 *
		 * @param {Object} payload
		 * @param {string} payload.functionZid
		 * @param {Promise} payload.promise
		 */
		setTestResultsPromise: function ( payload ) {
			if ( 'promise' in payload ) {
				this.testResultsPromises[ payload.functionZid ] = payload.promise;
			} else {
				// Set as a resolved Promise if the tests for this function have been fetched
				this.testResultsPromises[ payload.functionZid ] = Promise.resolve();
			}
		},

		/**
		 * Set the result of a specific test
		 *
		 * @param {Object} result
		 * @param {string} result.key
		 * @param {boolean} result.result
		 * @param {Object} result.metadata
		 */
		setZTesterResult: function ( result ) {
			this.zTesterResults[ result.key ] = result.result;
			this.zTesterMetadata[ result.key ] = result.metadata;
		},

		/**
		 * Clear all the test results and metadata
		 *
		 * @param {string} functionZid
		 */
		clearZTesterResults: function ( functionZid ) {
			this.zTesterResults = {};
			this.zTesterMetadata = {};
			// Clear Promise
			delete this.testResultsPromises[ functionZid ];
		}
	}
};
