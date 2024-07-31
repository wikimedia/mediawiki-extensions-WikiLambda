/*!
 * WikiLambda Vue editor: Vuex module for advanced type features.
 * Handles parsers and renderers.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' ),
	typeUtils = require( '../../mixins/typeUtils.js' ).methods,
	apiUtils = require( '../../mixins/api.js' ).methods;

module.exports = exports = {
	state: {
		/**
		 * Collection of renderers indexed by type
		 */
		renderers: {},
		/**
		 * Collection of parsers indexed by type
		 */
		parsers: {},
		/**
		 * Collection of renderer examples indexed by
		 * rendererZid and testerZid
		 * {
		 *  <rendererZid>: {
		 *    <testerZid>: <exampleResult>,
		 *    <testerZid>: <exampleResult>
		 *  }
		 * }
		 */
		rendererExamples: {},
		/**
		 * Array of promises of pending running parser
		 * functions
		 */
		parserPromises: []
	},
	getters: {
		/**
		 * Returns the renderer Zid for a given type
		 * or undefined if it does not exist.
		 * TODO: differentiate between "it hasn't been fetched" vs.
		 * "it has been fetched and it doesn't exist"
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getRendererZid: function ( state ) {
			/**
			 * @param {string} type
			 * @return {string | undefined}
			 */
			function findRenderer( type ) {
				return state.renderers[ type ];
			}
			return findRenderer;
		},
		/**
		 * Returns the renderer Zid for a given type
		 * or undefined if it does not exist.
		 * TODO: differentiate between "it hasn't been fetched" vs.
		 * "it has been fetched and it doesn't exist"
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getParserZid: function ( state ) {
			/**
			 * @param {string} type
			 * @return {string | undefined}
			 */
			function findParser( type ) {
				return state.parsers[ type ];
			}
			return findParser;
		},
		/**
		 * Returns whether the given type has a renderer in storage
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		hasRenderer: function ( state ) {
			/**
			 * @param {string} type
			 * @return {boolean}
			 */
			function typeHasRenderer( type ) {
				return ( ( type in state.renderers ) && !!state.renderers[ type ] );
			}
			return typeHasRenderer;
		},
		/**
		 * Returns whether the given type has a parser in storage
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		hasParser: function ( state ) {
			/**
			 * @param {string} type
			 * @return {boolean}
			 */
			function typeHasParser( type ) {
				return ( ( type in state.parsers ) && !!state.parsers[ type ] );
			}
			return typeHasParser;
		},
		/**
		 * Returns an array with the generated examples for a given renderer.
		 * If testZid is present as an argument, filters the results to return only that value.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getRendererExamples: function ( state ) {
			/**
			 * @param {string} rendererZid
			 * @param {string|undefined} testZid
			 * @return {Array}
			 */
			function getExamples( rendererZid, testZid = undefined ) {
				const filteredExamples = [];
				const examples = state.rendererExamples[ rendererZid ];
				if ( examples ) {
					for ( const key of Object.keys( examples ) ) {
						if ( examples[ key ] ) {
							filteredExamples.push( { testZid: key, result: examples[ key ] } );
						}
					}
				}
				return testZid ?
					filteredExamples.filter( ( item ) => item.testZid === testZid ) :
					filteredExamples;
			}
			return getExamples;
		},
		/**
		 * Returns a Promise that will be resolved when all pending
		 * parsers will finish running. Those which run successfully will
		 * be resolved once the parser response is persisted in the state.
		 * The ones which fail will be resolved immediately, as nothing is
		 * persisted in the state.
		 *
		 * @param {Object} state
		 * @return {Promise}
		 */
		waitForRunningParsers: function ( state ) {
			return Promise.all( state.parserPromises );
		}
	},
	mutations: {
		/**
		 * Add a running parser promise into the parserPromises
		 * state array.
		 *
		 * @param {Object} state
		 * @param {Promise} promise
		 */
		addParserPromise: function ( state, promise ) {
			state.parserPromises.push( promise );
		},
		/**
		 * Add renderer to the renderer collection
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {string} payload.type
		 * @param {string} payload.renderer
		 */
		setRenderer: function ( state, payload ) {
			state.renderers[ payload.type ] = payload.renderer;
		},
		/**
		 * Add parser to the parser collection
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {string} payload.type
		 * @param {string} payload.parser
		 */
		setParser: function ( state, payload ) {
			state.parsers[ payload.type ] = payload.parser;
		},
		/**
		 * Sets the value of a renderer example result
		 *
		 * @param {Object} state
		 * @param {Object} payload
		 * @param {string} payload.rendererZid
		 * @param {string} payload.testZid
		 * @param {Promise|string} payload.example
		 */
		setRendererExample: function ( state, payload ) {
			if ( !( payload.rendererZid in state.rendererExamples ) ) {
				state.rendererExamples[ payload.rendererZid ] = {};
			}
			state.rendererExamples[ payload.rendererZid ][ payload.testZid ] = payload.example;
		}
	},
	actions: {
		/**
		 * Given any Object/Z1 and a Language/Z60, it runs
		 * its renderer and returns the resulting Object.
		 * TODO: currently this will return a String/Z6 object,
		 * but in the future this can return other types)
		 *
		 * @param {Object} _context
		 * @param {Object} payload
		 * @param {string} payload.rendererZid
		 * @param {Object|Array|string} payload.zobject
		 * @param {string} payload.zlang
		 * @return {Promise}
		 */
		runRenderer: function ( _context, payload ) {
			// 1. Create a function call
			// {
			//   Z1K1: Z7,
			//   Z7K1: payload.rendererZid,
			//   <rendererZid>K1: payload.zobject,
			//   <rendererZid>K2: payload.zlang
			// }
			const rendererCall = typeUtils.getScaffolding( Constants.Z_FUNCTION_CALL );
			rendererCall[ Constants.Z_FUNCTION_CALL_FUNCTION ] = payload.rendererZid;
			rendererCall[ `${ payload.rendererZid }K1` ] = payload.zobject;
			rendererCall[ `${ payload.rendererZid }K2` ] = payload.zlang;

			// 2. Run this function call by calling wikilambda_function_call_zobject and return
			return apiUtils.performFunctionCall( rendererCall );
		},
		/**
		 * Given any Object/Z1 and a Language/Z60, it runs
		 * its parser and returns the resulting Object.
		 *
		 * Sometimes the response of the parser should be persisted in the
		 * store before other actions (like submission or call function)
		 * take place. The flag wait indicates whether the response of
		 * this parser function should be waited for.
		 *
		 * TODO: currently this will accept a String/Z6 object,
		 * but in the future it may accept other types)
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.parserZid
		 * @param {Object|Array|string} payload.zobject
		 * @param {string} payload.zlang
		 * @param {boolean} payload.wait whether this parser should block API calls
		 * @return {Promise}
		 */
		runParser: function ( context, payload ) {
			// 1. Create a function call
			// {
			//   Z1K1: Z7,
			//   Z7K1: <parserZid>,
			//   <parserZid>K1: payload.zobject,
			//   <parserZid>K2: payload.zlang
			// }
			const parserCall = typeUtils.getScaffolding( Constants.Z_FUNCTION_CALL );
			parserCall[ Constants.Z_FUNCTION_CALL_FUNCTION ] = payload.parserZid;
			parserCall[ `${ payload.parserZid }K1` ] = payload.zobject;
			parserCall[ `${ payload.parserZid }K2` ] = payload.zlang;

			// 2. Add the parser promise to the parserPromises state array
			// and keep the resolver function to be returned back to the caller.
			let resolver;
			const parserPromise = new Promise( ( resolve, reject ) => {
				resolver = { resolve, reject };
			} );
			// If we want this parser to block other API calls, we add to the parserPromise array
			if ( payload.wait ) {
				context.commit( 'addParserPromise', parserPromise );
			}

			// 3. Run this function call by calling wikilambda_function_call_zobject
			// and return the response and the Promise resolver function
			return apiUtils.performFunctionCall( parserCall ).then( ( response ) => {
				response.resolver = resolver;
				return response;
			} ).catch( ( e ) => {
				resolver.resolve();
				throw e;
			} );
		},
		/**
		 * Generates a renderer example by running its test with the
		 * current user language and saves it in the store for other
		 * similar fields to access it without re-running the same functions
		 * multiple times.
		 *
		 * @param {Object} context
		 * @param {Object} payload
		 * @param {string} payload.rendererZid
		 * @param {string} payload.testZid
		 * @param {Object} payload.test
		 * @param {string} payload.zlang
		 * @return {Promise|void}
		 */
		runRendererTest: function ( context, payload ) {
			// 1. If example is already rendered, ignore this
			if ( context.getters.getRendererExamples( payload.rendererZid, payload.testZid ).length > 0 ) {
				return;
			}

			// 2. Build test object with current user lang Zid
			const rendererCall = payload.test[ Constants.Z_TESTER_CALL ];
			rendererCall[ `${ payload.rendererZid }K2` ] = payload.zlang;

			// 3. Save empty value in the store under the rendererZid.testZid
			// to avoid re-running the same example multiple times
			context.commit( 'setRendererExample', {
				rendererZid: payload.rendererZid,
				testZid: payload.testZid,
				example: undefined
			} );

			// 4. Run renderer function
			return apiUtils.performFunctionCall( rendererCall ).then( ( data ) => {
				const response = data.response[ Constants.Z_RESPONSEENVELOPE_VALUE ];
				if (
					( response !== Constants.Z_VOID ) &&
					( typeUtils.getZObjectType( response ) === Constants.Z_STRING )
				) {
					// If rendered value from the test is valid, save in examples
					context.commit( 'setRendererExample', {
						rendererZid: payload.rendererZid,
						testZid: payload.testZid,
						example: response
					} );
				}
			} );
		}
	}
};
