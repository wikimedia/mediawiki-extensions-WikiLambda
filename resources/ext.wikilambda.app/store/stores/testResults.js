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
const { hasPendingMetadata } = require( '../../utils/zobjectUtils.js' );

const MAX_PENDING_RETRIES = 2;
const PENDING_RETRY_DELAY_MS = 1000;

module.exports = {
	state: {
		zTesterResults: {},
		zTesterMetadata: {},
		testResultsPromises: {}
	},

	getters: {
		/**
		 * Retrieves the result of running a given test for an implementation.
		 * The individual test results are stored under keys with the format:
		 * "<function id>:<test id>:<implementation id>"
		 * If the test has not been executed (and hence no result is stored),
		 * it returns undefined.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getZTesterResult: function ( state ) {
			/**
			 * @param {string} zFunctionId
			 * @param {string} zTesterId
			 * @param {string} zImplementationId
			 *
			 * @return {boolean|undefined}
			 */
			const findZTesterResults = ( zFunctionId, zTesterId, zImplementationId ) => {
				const key = `${ zFunctionId }:${ zTesterId }:${ zImplementationId }`;
				const result = state.zTesterResults[ key ];

				// Test wasn't run, return undefined
				if ( !result ) {
					return undefined;
				}

				// Test was run, it willbe be true/Z14 or false/Z42
				return ( result === Constants.Z_BOOLEAN_TRUE ||
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
		},

		/**
		 * Whether any of the flying promises would resolve the given test-implementation pair. For
		 * example, when initializing the function page, the request is made for all tests for
		 * `functionzid:*:*` so every cell in the table would catch this as its flying promise.
		 *
		 * @return {Function}
		 */
		hasFlyingPromise: function () {
			const catchFlyingPromise = ( functionZid, testerZid, implementationZid ) => {
				// Build the keys that would match the requirements
				const implementation = implementationZid || '*';
				const tester = testerZid || '*';
				const keysToCheck = [ ...new Set( [
					`${ functionZid }:*:*`,
					`${ functionZid }:${ tester }:*`,
					`${ functionZid }:*:${ implementation }`,
					`${ functionZid }:${ tester }:${ implementation }`
				] ) ];
				// If the key has a promise, return it's flying property
				return keysToCheck.some( ( key ) => {
					const promise = this.testResultsPromises[ key ];
					return promise && promise.flying;
				} );
			};
			return catchFlyingPromise;
		}
	},

	actions: {
		/**
		 * Triggers a test API call and updates the test results, handles the test pending state
		 * and also define the error state and message if test returns errors
		 *
		 * @param {Object} payload
		 * @param {string} payload.zFunctionId The ZID of the Function we're for which running these
		 * @param {string[]} payload.zTesters The ZIDs (or if unsaved the full ZObject) of the Testers to run
		 * @param {string[]} payload.zImplementations The ZIDs (or if unsaved the full ZObject) of the
		 *   Implementations to run
		 * @param {boolean} payload.clearPreviousResults Whether to clear the previous results from the Pinia store
		 * @param {AbortSignal} payload.signal The AbortSignal to cancel the request
		 * @param {number} retryCount
		 *
		 * @return {Promise}
		 */
		getTestResults: function ( payload, retryCount = 0 ) {
			/**
			 * Filter out empty or falsy items
			 *
			 * @param {string[]} arr
			 * @return {string[]}
			 */
			const removeEmpty = ( arr ) => ( arr || [] ).filter( ( i ) => !!i );

			/**
			 * Loop through the given array of ZIDs and if a ZID is for the object currently being edited
			 * or created, replace it with its literal inner object.
			 *
			 * @param {Array} items - List of implementation or tester zids
			 * @return {Array}
			 */
			const replaceCurrentZidWithLiteral = ( items ) => ( items || [] ).map( ( item ) => {
				if ( item === this.getCurrentZObjectId ) {
					const zobject = this.getJsonObject( Constants.STORED_OBJECTS.MAIN );
					// const inner = zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ];
					// const serialized = JSON.stringify( inner );
					// If new item, send inner object;
					// else send whole persistent object, so that the API can know the zid
					const serialized = JSON.stringify( item === Constants.NEW_ZID_PLACEHOLDER ?
						zobject[ Constants.Z_PERSISTENTOBJECT_VALUE ] : zobject );
						// (T358089) Encode any '|' characters of ZObjects so that they can be recovered after the API.
					return serialized.replace( /\|/g, '🪈' );
				}
				return item;
			} );

			/**
			 * Make a key to store the promise with:
			 * * for all tests for a function `functionzid:*:*`
			 * * for all tests for an implementation `functionzid:*:implementationzid`
			 * * for a test for all its implementations `functionzid:testzid:*`
			 *
			 * NOTE: when creating a new implementation or test, it will have Z0
			 *
			 * @param {string} f
			 * @param {Array} impList
			 * @param {Array} testList
			 * @return {string}
			 */
			const makePromiseKey = ( f, impList, testList ) => {
				const implementationKey = ( impList && impList.length === 1 ) ? impList[ 0 ] : '*';
				const testKey = ( testList && testList.length === 1 ) ? testList[ 0 ] : '*';
				return `${ f }:${ testKey }:${ implementationKey }`;
			};

			// If function ZID is empty, exit
			if ( !payload.zFunctionId ) {
				return Promise.resolve();
			}

			// Clear out possible empty or null items
			let implementations = removeEmpty( payload.zImplementations || [] );
			let testers = removeEmpty( payload.zTesters || [] );

			// Make promise key
			const promiseKey = makePromiseKey( payload.zFunctionId, implementations, testers );

			// Clear previous results and make sure that the call is triggered.
			// True for those user-initiated actions, but false for the tests
			// run in bg (E.g. for renderer component placeholder and examples)
			if ( payload.clearPreviousResults ) {
				this.clearZTesterResults( promiseKey );
			}

			// If this API for this functionZid is already running, return promise
			// Important for renderer-triggered test results, as multiple fields
			// could fire N calls to the same perform_tests api request.
			if ( promiseKey in this.testResultsPromises ) {
				return this.testResultsPromises[ promiseKey ].promise;
			}

			this.clearErrors( Constants.ERROR_IDS.TEST_RESULTS );

			// Only for edit page, replace current zid with its encoded literal
			if ( !this.getViewMode ) {
				implementations = replaceCurrentZidWithLiteral( implementations );
				testers = replaceCurrentZidWithLiteral( testers );
			}

			const testResultsPromise = performTests( {
				functionZid: payload.zFunctionId,
				language: this.getUserLangCode,
				implementations,
				testers,
				signal: payload.signal
			} ).then( ( results ) => {
				const zids = [];
				let hasPending = false;

				results.forEach( ( testResult ) => {
					const currentZid = this.getCurrentZObjectId;
					// When the response id is null, is because we sent a literal.
					// In that case, just replace with the current page Zid, which
					// might be a stored Zid or a the null Z0:
					const testKey = `${ testResult.zTesterId || currentZid }`;
					const implementationKey = `${ testResult.zImplementationId || currentZid }`;
					const key = `${ testResult.zFunctionId }:${ testKey }:${ implementationKey }`;

					const result = hybridToCanonical( JSON.parse( testResult.validateStatus ) );
					const metadata = hybridToCanonical( JSON.parse( testResult.testMetadata ) );

					const isPending = hasPendingMetadata( metadata );
					hasPending = hasPending || isPending;

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

				// We done;
				if ( !this.getViewMode && hasPending && retryCount < MAX_PENDING_RETRIES ) {
					// If we are in an edit page (testing an inline object),
					// retry again if there are values still pending
					const retryPromise = new Promise( ( resolve ) => {
						setTimeout( () => {
							resolve( this.getTestResults( payload, retryCount + 1 ) );
						}, PENDING_RETRY_DELAY_MS );
					} );
					this.setTestResultsPromise( { promiseKey, promise: retryPromise } );
				} else {
					// Else resolve the promise with whatever we have
					this.setTestResultsPromise( { promiseKey } );
				}

			} ).catch( ( error ) => {
				if ( error.code === 'abort' ) {
					this.clearZTesterResults( promiseKey );
					return;
				}

				this.setError( {
					errorId: Constants.ERROR_IDS.TEST_RESULTS,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessage: error.messageOrFallback( 'wikilambda-unknown-test-error-message' )
				} );

				// We also done; resolve stored promise
				this.setTestResultsPromise( { promiseKey } );
			} );

			// Initialize promise with key
			this.setTestResultsPromise( {
				promiseKey,
				promise: testResultsPromise
			} );

			return testResultsPromise;
		},

		/**
		 * Set or unset the promise to the testResults API call for a given functionZid.
		 *
		 * @param {Object} payload
		 * @param {string} payload.promiseKey
		 * @param {Promise} payload.promise
		 */
		setTestResultsPromise: function ( payload ) {
			if ( 'promise' in payload ) {
				// Set as a flying Promise while the request is ongoing
				this.testResultsPromises[ payload.promiseKey ] = {
					flying: true,
					promise: payload.promise
				};
			} else {
				// Set as a resolved Promise if the tests for this function have been fetched
				this.testResultsPromises[ payload.promiseKey ] = {
					flying: false,
					promise: Promise.resolve()
				};
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
		 * Clear all the test results and metadata given
		 * the key used for re-generating results.
		 *
		 * @param {string} promiseKey
		 */
		clearZTesterResults: function ( promiseKey ) {
			const parts = promiseKey.split( ':' );
			const functionZid = parts[ 0 ];
			const testerZid = parts[ 1 ];
			const implementationZid = parts[ 2 ];

			Object.keys( this.zTesterResults ).forEach( ( key ) => {
				const keyParts = key.split( ':' );
				const matchesFunction = keyParts[ 0 ] === functionZid;
				const matchesTester = testerZid === '*' || keyParts[ 1 ] === testerZid;
				const matchesImplementation = implementationZid === '*' || keyParts[ 2 ] === implementationZid;

				if ( matchesFunction && matchesTester && matchesImplementation ) {
					delete this.zTesterResults[ key ];
					delete this.zTesterMetadata[ key ];
				}
			} );

			delete this.testResultsPromises[ promiseKey ];
		}
	}
};
