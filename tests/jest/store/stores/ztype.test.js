/*!
 * WikiLambda unit test suite for the types Pinia store, which
 * handles type renderers and parsers.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { setActivePinia, createPinia } = require( 'pinia' );
const useMainStore = require( '../../../../resources/ext.wikilambda.app/store/index.js' );

describe( 'ztype Pinia store', () => {
	let store;
	const typeZid = 'Z30000';
	const rendererZid = 'Z30001';
	const parserZid = 'Z30002';

	beforeEach( () => {
		setActivePinia( createPinia() );
		store = useMainStore();
		store.renderers = {};
		store.parsers = {};
		store.rendererExamples = {};
		store.parserPromises = [];
		store.rendererData = {};
		store.rendererPromises = {};
	} );

	describe( 'Getters', () => {
		describe( 'getRendererZid', () => {
			it( 'returns renderer zid when set', () => {
				store.renderers = {
					[ typeZid ]: rendererZid
				};
				expect( store.getRendererZid( typeZid ) ).toBe( rendererZid );
			} );

			it( 'returns undefined when not set', () => {
				store.renderers = {};
				expect( store.getRendererZid( typeZid ) ).toBe( undefined );
			} );
		} );

		describe( 'getParserZid', () => {
			it( 'returns parser zid when set', () => {
				store.parsers = {
					[ typeZid ]: parserZid
				};
				expect( store.getParserZid( typeZid ) ).toBe( parserZid );
			} );

			it( 'returns undefined when not set', () => {
				store.parsers = {};
				expect( store.getParserZid( typeZid ) ).toBe( undefined );
			} );
		} );

		describe( 'hasRenderer', () => {
			it( 'returns false when renderer is not set', () => {
				expect( store.hasRenderer( typeZid ) ).toBe( false );
			} );

			it( 'returns false when renderer is set but falsy', () => {
				store.renderers = {
					[ typeZid ]: undefined
				};
				expect( store.hasRenderer( typeZid ) ).toBe( false );
			} );

			it( 'returns true when renderer is set', () => {
				store.renderers = {
					[ typeZid ]: rendererZid
				};
				expect( store.hasRenderer( typeZid ) ).toBe( true );
			} );
		} );

		describe( 'hasParser', () => {
			it( 'returns false when parser is not set', () => {
				expect( store.hasParser( typeZid ) ).toBe( false );
			} );

			it( 'returns false when parser is set but falsy', () => {
				store.parsers = {
					[ typeZid ]: undefined
				};
				expect( store.hasParser( typeZid ) ).toBe( false );
			} );

			it( 'returns true when parser is set', () => {
				store.parsers = {
					[ typeZid ]: parserZid
				};
				expect( store.hasParser( typeZid ) ).toBe( true );
			} );
		} );

		describe( 'getRendererExamples', () => {
			it( 'returns empty array when no examples are set', () => {
				const expected = [];
				expect( store.getRendererExamples( rendererZid ) ).toEqual( expected );
			} );

			it( 'returns empty array when no examples are set for the renderer', () => {
				store.rendererExamples = {
					[ rendererZid ]: {}
				};
				const expected = [];
				expect( store.getRendererExamples( rendererZid ) ).toEqual( expected );
			} );

			it( 'returns empty array when examples are undefined', () => {
				store.rendererExamples = {
					[ rendererZid ]: {
						Z30010: undefined,
						Z30011: undefined
					}
				};
				const expected = [];
				expect( store.getRendererExamples( rendererZid ) ).toEqual( expected );
			} );

			it( 'returns array of examples', () => {
				store.rendererExamples = {
					[ rendererZid ]: {
						Z30010: 'one',
						Z30011: 'two'
					}
				};
				const expected = [
					{ testZid: 'Z30010', result: 'one' },
					{ testZid: 'Z30011', result: 'two' }
				];
				expect( store.getRendererExamples( rendererZid ) ).toEqual( expected );
			} );

			it( 'returns example for a given test', () => {
				store.rendererExamples = {
					[ rendererZid ]: {
						Z30010: 'one',
						Z30011: 'two'
					}
				};
				const expected = [
					{ testZid: 'Z30011', result: 'two' }
				];
				expect( store.getRendererExamples( rendererZid, 'Z30011' ) ).toEqual( expected );
			} );
		} );
	} );

	describe( 'Actions', () => {
		let postMock, data;

		beforeEach( () => {
			data = '{ "Z1K1": "Z6", "Z6K1": "some response" }';
			postMock = jest.fn( () => new Promise( ( resolve ) => {
				resolve( {
					wikilambda_function_call: { data }
				} );
			} ) );
			mw.Api = jest.fn( () => ( {
				post: postMock
			} ) );
			// Mock getUserLangCode getter
			Object.defineProperty( store, 'getUserLangCode', {
				get: () => 'en',
				configurable: true
			} );
		} );

		describe( 'setRenderer', () => {
			it( 'sets renderer in the store', () => {
				const payload = {
					type: typeZid,
					renderer: rendererZid
				};
				const expected = {
					[ typeZid ]: rendererZid
				};
				store.setRenderer( payload );
				expect( store.renderers ).toEqual( expected );
			} );
		} );

		describe( 'setParser', () => {
			it( 'sets parser in the store', () => {
				const payload = {
					type: typeZid,
					parser: parserZid
				};
				const expected = {
					[ typeZid ]: parserZid
				};
				store.setParser( payload );
				expect( store.parsers ).toEqual( expected );
			} );
		} );

		describe( 'setRendererExample', () => {
			it( 'sets renderer example when store is empty', () => {
				const payload = {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					example: 'one'
				};
				const expected = {
					[ rendererZid ]: {
						Z30010: 'one'
					}
				};
				store.setRendererExample( payload );
				expect( store.rendererExamples ).toEqual( expected );
			} );

			it( 'sets renderer example when store has more examples', () => {
				store.rendererExamples = {
					[ rendererZid ]: {
						Z30010: 'one'
					}
				};
				const payload = {
					rendererZid: rendererZid,
					testZid: 'Z30011',
					example: 'two'
				};
				const expected = {
					[ rendererZid ]: {
						Z30010: 'one',
						Z30011: 'two'
					}
				};
				store.setRendererExample( payload );
				expect( store.rendererExamples ).toEqual( expected );
			} );
		} );

		describe( 'runRenderer', () => {
			it( 'builds a function call and runs it', () => {
				const payload = {
					rendererZid: rendererZid,
					zobject: { some: 'object' },
					zlang: 'Z1002'
				};
				const functionCall = {
					Z1K1: 'Z7',
					Z7K1: rendererZid,
					[ rendererZid + 'K1' ]: { some: 'object' },
					[ rendererZid + 'K2' ]: 'Z1002'
				};
				store.runRenderer( payload );
				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					format: 'json',
					formatversion: '2',
					wikilambda_function_call_zobject: JSON.stringify( functionCall ),
					uselang: 'en'
				}, { signal: undefined } );
			} );

			it( 'returns cached data immediately if available', async () => {
				const payload = {
					rendererZid: rendererZid,
					zobject: { some: 'object' },
					zlang: 'Z1002'
				};
				const cacheKey = store.getRendererCacheKey( payload );
				const cachedData = {
					response: {
						Z1K1: 'Z22',
						Z22K1: 'cached result',
						Z22K2: {}
					},
					result: 'cached result',
					metadata: {}
				};
				store.setRendererData( { cacheKey, data: cachedData } );

				const result = await store.runRenderer( payload );

				expect( result ).toEqual( cachedData );
				expect( postMock ).not.toHaveBeenCalled();
			} );

			it( 'reuses in-flight promise if request is already running', () => {
				const payload = {
					rendererZid: rendererZid,
					zobject: { some: 'object' },
					zlang: 'Z1002'
				};
				const cacheKey = store.getRendererCacheKey( payload );

				// Start first request
				const promise1 = store.runRenderer( payload );
				expect( postMock ).toHaveBeenCalledTimes( 1 );
				// Verify promise is stored
				expect( cacheKey in store.rendererPromises ).toBe( true );
				expect( store.rendererPromises[ cacheKey ] ).toEqual( promise1 );

				// Start second request before first completes
				const promise2 = store.runRenderer( payload );

				// Both should be the same promise (same reference)
				expect( promise1 ).toEqual( promise2 );
				expect( postMock ).toHaveBeenCalledTimes( 1 );
			} );

			it( 'caches response after successful API call', async () => {
				const payload = {
					rendererZid: rendererZid,
					zobject: { some: 'object' },
					zlang: 'Z1002'
				};
				const cacheKey = store.getRendererCacheKey( payload );

				await store.runRenderer( payload );

				// Verify it was cached
				const cachedData = store.getRendererData( cacheKey );
				expect( cachedData ).toBeDefined();
				expect( cachedData ).toEqual( { metadata: undefined, response: 'some response', result: undefined } );

				// Second call should use cache
				postMock.mockClear();
				const result = await store.runRenderer( payload );
				expect( postMock ).not.toHaveBeenCalled();
				expect( result ).toEqual( { metadata: undefined, response: 'some response', result: undefined } );
			} );

			it( 'clears promise from rendererPromises on success', async () => {
				const payload = {
					rendererZid: rendererZid,
					zobject: { some: 'object' },
					zlang: 'Z1002'
				};
				const cacheKey = store.getRendererCacheKey( payload );

				const promise = store.runRenderer( payload );
				// Verify promise is stored (key exists in rendererPromises)
				expect( cacheKey in store.rendererPromises ).toBe( true );

				await promise;
				// After completion, the promise is deleted from rendererPromises
				expect( cacheKey in store.rendererPromises ).toBe( false );
			} );

			it( 'clears promise from rendererPromises on error', async () => {
				const payload = {
					rendererZid: rendererZid,
					zobject: { some: 'object' },
					zlang: 'Z1002'
				};
				const cacheKey = store.getRendererCacheKey( payload );
				const error = new Error( 'API call failed' );

				// Mock API to reject with an error
				postMock = jest.fn( () => new Promise( ( resolve, reject ) => {
					reject( error );
				} ) );
				mw.Api = jest.fn( () => ( {
					post: postMock
				} ) );

				const promise = store.runRenderer( payload );
				// Verify promise is stored (key exists in rendererPromises)
				expect( cacheKey in store.rendererPromises ).toBe( true );

				// Wait for promise to reject
				await expect( promise ).rejects.toThrow();
				// After error, the promise is deleted from rendererPromises
				expect( cacheKey in store.rendererPromises ).toBe( false );
			} );

		} );

		describe( 'runParser', () => {
			it( 'builds a function call and runs it', () => {
				const payload = {
					parserZid: parserZid,
					zobject: 'some string',
					zlang: 'Z1002'
				};
				const functionCall = {
					Z1K1: 'Z7',
					Z7K1: parserZid,
					[ parserZid + 'K1' ]: 'some string',
					[ parserZid + 'K2' ]: 'Z1002'
				};
				store.runParser( payload );
				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					format: 'json',
					formatversion: '2',
					wikilambda_function_call_zobject: JSON.stringify( functionCall ),
					uselang: 'en'
				}, { signal: undefined } );
			} );

			it( 'builds a function call and runs it, also when blocking', () => {
				const payload = {
					parserZid: parserZid,
					zobject: 'some string',
					zlang: 'Z1002',
					wait: 'wait for me, Henry!'
				};
				const functionCall = {
					Z1K1: 'Z7',
					Z7K1: parserZid,
					[ parserZid + 'K1' ]: 'some string',
					[ parserZid + 'K2' ]: 'Z1002'
				};
				store.runParser( payload );
				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					format: 'json',
					formatversion: '2',
					wikilambda_function_call_zobject: JSON.stringify( functionCall ),
					uselang: 'en'
				}, { signal: undefined } );
			} );

		} );

		describe( 'runRendererTest', () => {
			const testObject = {
				Z1K1: 'Z20',
				Z20K1: rendererZid,
				Z20K2: {
					Z1K1: 'Z7',
					Z7K1: rendererZid,
					[ rendererZid + 'K1' ]: 'some object',
					[ rendererZid + 'K2' ]: 'Z1003'
				},
				Z20K3: {
					Z1K1: 'Z7',
					Z7K1: 'Z866',
					Z866K2: 'rendered result'
				}
			};

			it( 'does not run the test if it has been run', () => {
				store.setRendererExample = jest.fn();
				store.rendererExamples = {
					[ rendererZid ]: {
						Z30010: 'one'
					}
				};
				const payload = {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					test: testObject,
					zlang: 'Z1002'
				};

				store.runRendererTest( payload );
				expect( postMock ).not.toHaveBeenCalled();
				expect( store.setRendererExample ).not.toHaveBeenCalled();
			} );

			it( 'edits and runs the renderer test', () => {
				store.setRendererExample = jest.fn();
				// Empty rendererExamples
				store.rendererExamples = {};

				const payload = {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					test: testObject,
					zlang: 'Z1002'
				};
				const functionCall = {
					Z1K1: 'Z7',
					Z7K1: rendererZid,
					[ rendererZid + 'K1' ]: 'some object',
					[ rendererZid + 'K2' ]: 'Z1002'
				};
				store.runRendererTest( payload );

				expect( postMock ).toHaveBeenCalledWith( {
					action: 'wikilambda_function_call',
					format: 'json',
					formatversion: '2',
					wikilambda_function_call_zobject: JSON.stringify( functionCall ),
					uselang: 'en'
				}, { signal: undefined } );
				expect( store.setRendererExample ).toHaveBeenCalled();
			} );

			it( 'on successful response, set renderer test', async () => {
				store.setRendererExample = jest.fn();
				// Empty rendererExamples
				store.rendererExamples = {};
				// Mock successful response
				const successfulResponse = {
					Z1K1: 'Z22',
					Z22K1: 'example one',
					Z22K2: 'metadata'
				};
				postMock = jest.fn( () => new Promise( ( resolve ) => {
					resolve( {
						wikilambda_function_call: { data: JSON.stringify( successfulResponse ) }
					} );
				} ) );
				mw.Api = jest.fn( () => ( { post: postMock } ) );

				const payload = {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					test: testObject,
					zlang: 'Z1002'
				};
				await store.runRendererTest( payload );

				expect( store.setRendererExample ).toHaveBeenCalledTimes( 2 );
				expect( store.setRendererExample ).toHaveBeenCalledWith( {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					example: undefined
				} );
				expect( store.setRendererExample ).toHaveBeenCalledWith( {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					example: 'example one'
				} );
			} );

			it( 'on failed response, leave renderer test as undefined', async () => {
				store.setRendererExample = jest.fn();
				store.rendererExamples = {};
				const failedResponse = {
					Z1K1: 'Z22',
					Z22K1: 'Z24',
					Z22K2: 'metadata'
				};
				postMock = jest.fn( () => new Promise( ( resolve ) => {
					resolve( {
						wikilambda_function_call: { data: JSON.stringify( failedResponse ) }
					} );
				} ) );
				mw.Api = jest.fn( () => ( { post: postMock } ) );

				const payload = {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					test: testObject,
					zlang: 'Z1002'
				};
				await store.runRendererTest( payload );

				expect( store.setRendererExample ).toHaveBeenCalledTimes( 1 );
				expect( store.setRendererExample ).toHaveBeenCalledWith( {
					rendererZid: rendererZid,
					testZid: 'Z30010',
					example: undefined
				} );
			} );
		} );
	} );
} );
