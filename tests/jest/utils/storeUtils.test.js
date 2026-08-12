/*!
 * WikiLambda unit test suite for the storeUtils util
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const {
	doDeduplicatedFetch,
	doDeduplicatedBatchFetch
} = require( '../../../resources/ext.wikilambda.app/utils/storeUtils.js' );

/**
 * Build a cache backed by a plain object, along with the callbacks that the
 * helpers use to read and write it.
 *
 * @param {Object} [initial] Values the cache starts with
 * @return {Object} `{ cache, getCached, setCached }`
 */
const makeCache = ( initial = {} ) => {
	const cache = Object.assign( {}, initial );
	return {
		cache,
		getCached: ( key ) => cache[ key ],
		setCached: ( key, value ) => {
			cache[ key ] = value;
		}
	};
};

/**
 * Build a promise whose resolve and reject callbacks can be called later.
 *
 * @return {Object} `{ promise, resolve, reject }`
 */
const makeDeferred = () => {
	let resolve;
	let reject;
	const promise = new Promise( ( res, rej ) => {
		resolve = res;
		reject = rej;
	} );
	return { promise, resolve, reject };
};

describe( 'storeUtils', () => {
	describe( 'doDeduplicatedFetch', () => {
		it( 'runs the fetch and caches the result when nothing is cached', async () => {
			const { cache, getCached, setCached } = makeCache();
			const inFlight = new Map();
			const run = jest.fn().mockResolvedValue( 'value' );

			const result = await doDeduplicatedFetch( { inFlight, key: 'a', run, getCached, setCached } );

			expect( result ).toBe( 'value' );
			expect( run ).toHaveBeenCalledTimes( 1 );
			expect( cache.a ).toBe( 'value' );
			expect( inFlight.size ).toBe( 0 );
		} );

		it( 'returns the cached value without running the fetch', async () => {
			const { getCached, setCached } = makeCache( { a: 'cached' } );
			const inFlight = new Map();
			const run = jest.fn();

			const result = await doDeduplicatedFetch( { inFlight, key: 'a', run, getCached, setCached } );

			expect( result ).toBe( 'cached' );
			expect( run ).not.toHaveBeenCalled();
		} );

		it( 'treats a falsy cached value as cached', async () => {
			const { getCached, setCached } = makeCache( { a: '' } );
			const inFlight = new Map();
			const run = jest.fn();

			const result = await doDeduplicatedFetch( { inFlight, key: 'a', run, getCached, setCached } );

			expect( result ).toBe( '' );
			expect( run ).not.toHaveBeenCalled();
		} );

		it( 'shares one fetch between callers asking for the same key', async () => {
			const { cache, getCached, setCached } = makeCache();
			const inFlight = new Map();
			const deferred = makeDeferred();
			const run = jest.fn( () => deferred.promise );

			const first = doDeduplicatedFetch( { inFlight, key: 'a', run, getCached, setCached } );
			const second = doDeduplicatedFetch( { inFlight, key: 'a', run, getCached, setCached } );

			expect( run ).toHaveBeenCalledTimes( 1 );
			expect( inFlight.size ).toBe( 1 );

			deferred.resolve( 'value' );

			expect( await first ).toBe( 'value' );
			expect( await second ).toBe( 'value' );
			expect( cache.a ).toBe( 'value' );
		} );

		it( 'runs one fetch per key', async () => {
			const { cache, getCached, setCached } = makeCache();
			const inFlight = new Map();
			const run = jest.fn( () => Promise.resolve( 'value' ) );

			await Promise.all( [
				doDeduplicatedFetch( { inFlight, key: 'a', run, getCached, setCached } ),
				doDeduplicatedFetch( { inFlight, key: 'b', run, getCached, setCached } )
			] );

			expect( run ).toHaveBeenCalledTimes( 2 );
			expect( cache ).toEqual( { a: 'value', b: 'value' } );
		} );

		it( 'does not cache a rejection, and retries on the next call', async () => {
			const { cache, getCached, setCached } = makeCache();
			const inFlight = new Map();
			const run = jest.fn()
				.mockRejectedValueOnce( new Error( 'network' ) )
				.mockResolvedValueOnce( 'value' );

			await expect( doDeduplicatedFetch( { inFlight, key: 'a', run, getCached, setCached } ) )
				.rejects.toThrow( 'network' );
			expect( cache.a ).toBeUndefined();
			expect( inFlight.size ).toBe( 0 );

			const result = await doDeduplicatedFetch( { inFlight, key: 'a', run, getCached, setCached } );

			expect( result ).toBe( 'value' );
			expect( run ).toHaveBeenCalledTimes( 2 );
		} );

		it( 'passes the rejection to every caller waiting on the same fetch', async () => {
			const { getCached, setCached } = makeCache();
			const inFlight = new Map();
			const deferred = makeDeferred();
			const run = jest.fn( () => deferred.promise );

			const first = doDeduplicatedFetch( { inFlight, key: 'a', run, getCached, setCached } );
			const second = doDeduplicatedFetch( { inFlight, key: 'a', run, getCached, setCached } );

			deferred.reject( new Error( 'network' ) );

			await expect( first ).rejects.toThrow( 'network' );
			await expect( second ).rejects.toThrow( 'network' );
		} );

		it( 'does not cache an undefined result', async () => {
			const { cache, getCached, setCached } = makeCache();
			const inFlight = new Map();
			const run = jest.fn().mockResolvedValue( undefined );

			await doDeduplicatedFetch( { inFlight, key: 'a', run, getCached, setCached } );

			expect( 'a' in cache ).toBe( false );
		} );

		it( 'works without getCached and setCached', async () => {
			const inFlight = new Map();
			const run = jest.fn().mockResolvedValue( 'value' );

			const result = await doDeduplicatedFetch( { inFlight, key: 'a', run } );

			expect( result ).toBe( 'value' );
			expect( inFlight.size ).toBe( 0 );
		} );
	} );

	describe( 'doDeduplicatedBatchFetch', () => {
		it( 'requests every key and caches the results', async () => {
			const { cache, getCached, setCached } = makeCache();
			const inFlight = new Map();
			const run = jest.fn().mockResolvedValue( { a: 1, b: 2 } );

			await doDeduplicatedBatchFetch( { inFlight, keys: [ 'a', 'b' ], run, getCached, setCached } );

			expect( run ).toHaveBeenCalledWith( [ 'a', 'b' ] );
			expect( cache ).toEqual( { a: 1, b: 2 } );
			expect( inFlight.size ).toBe( 0 );
		} );

		it( 'drops duplicate and empty keys before requesting', async () => {
			const { getCached, setCached } = makeCache();
			const inFlight = new Map();
			const run = jest.fn().mockResolvedValue( { a: 1, b: 2 } );

			await doDeduplicatedBatchFetch( {
				inFlight, keys: [ 'a', 'a', '', 'b', 'a' ], run, getCached, setCached
			} );

			expect( run ).toHaveBeenCalledWith( [ 'a', 'b' ] );
		} );

		it( 'leaves out keys that are already cached', async () => {
			const { getCached, setCached } = makeCache( { a: 1 } );
			const inFlight = new Map();
			const run = jest.fn().mockResolvedValue( { b: 2 } );

			await doDeduplicatedBatchFetch( { inFlight, keys: [ 'a', 'b' ], run, getCached, setCached } );

			expect( run ).toHaveBeenCalledWith( [ 'b' ] );
		} );

		it( 'skips the request entirely when every key is cached', async () => {
			const { getCached, setCached } = makeCache( { a: 1, b: 2 } );
			const inFlight = new Map();
			const run = jest.fn();

			await doDeduplicatedBatchFetch( { inFlight, keys: [ 'a', 'b' ], run, getCached, setCached } );

			expect( run ).not.toHaveBeenCalled();
		} );

		it( 'requests only the keys no other batch is fetching, and waits for both', async () => {
			const { cache, getCached, setCached } = makeCache();
			const inFlight = new Map();
			const first = makeDeferred();
			const second = makeDeferred();
			const run = jest.fn()
				.mockReturnValueOnce( first.promise )
				.mockReturnValueOnce( second.promise );

			const firstCall = doDeduplicatedBatchFetch( {
				inFlight, keys: [ 'a' ], run, getCached, setCached
			} );
			const secondCall = doDeduplicatedBatchFetch( {
				inFlight, keys: [ 'a', 'b' ], run, getCached, setCached
			} );

			// The second call asks only for 'b'; 'a' is already being fetched
			expect( run ).toHaveBeenNthCalledWith( 1, [ 'a' ] );
			expect( run ).toHaveBeenNthCalledWith( 2, [ 'b' ] );

			second.resolve( { b: 2 } );
			// The second call must not resolve until 'a' has settled too
			let secondSettled = false;
			secondCall.then( () => {
				secondSettled = true;
			} );
			await Promise.resolve();
			expect( secondSettled ).toBe( false );

			first.resolve( { a: 1 } );
			await firstCall;
			await secondCall;

			expect( cache ).toEqual( { a: 1, b: 2 } );
			expect( inFlight.size ).toBe( 0 );
		} );

		it( 'does not cache keys that the result leaves out', async () => {
			const { cache, getCached, setCached } = makeCache();
			const inFlight = new Map();
			const run = jest.fn().mockResolvedValue( { a: 1 } );

			await doDeduplicatedBatchFetch( { inFlight, keys: [ 'a', 'b' ], run, getCached, setCached } );

			expect( cache ).toEqual( { a: 1 } );
			expect( inFlight.size ).toBe( 0 );
		} );

		it( 'does not cache a rejection, and retries on the next call', async () => {
			const { cache, getCached, setCached } = makeCache();
			const inFlight = new Map();
			const run = jest.fn()
				.mockRejectedValueOnce( new Error( 'network' ) )
				.mockResolvedValueOnce( { a: 1 } );

			await expect( doDeduplicatedBatchFetch( {
				inFlight, keys: [ 'a' ], run, getCached, setCached
			} ) ).rejects.toThrow( 'network' );
			expect( cache ).toEqual( {} );
			expect( inFlight.size ).toBe( 0 );

			await doDeduplicatedBatchFetch( { inFlight, keys: [ 'a' ], run, getCached, setCached } );

			expect( cache ).toEqual( { a: 1 } );
		} );

		it( 'returns the request as it is when there is nothing else to wait for', async () => {
			const { getCached, setCached } = makeCache();
			const inFlight = new Map();
			const deferred = makeDeferred();
			const run = jest.fn( () => deferred.promise );

			const call = doDeduplicatedBatchFetch( {
				inFlight, keys: [ 'a' ], run, getCached, setCached
			} );

			// The one in-flight promise is handed back unwrapped, so callers
			// are not delayed by a Promise.all that has nothing to combine
			expect( call ).toBe( inFlight.get( 'a' ) );

			deferred.resolve( { a: 1 } );
			await call;
		} );

		it( 'returns the running request as it is when every key is already being fetched', async () => {
			const { getCached, setCached } = makeCache();
			const inFlight = new Map();
			const deferred = makeDeferred();
			const run = jest.fn( () => deferred.promise );

			const first = doDeduplicatedBatchFetch( {
				inFlight, keys: [ 'a' ], run, getCached, setCached
			} );
			const second = doDeduplicatedBatchFetch( {
				inFlight, keys: [ 'a' ], run, getCached, setCached
			} );

			expect( run ).toHaveBeenCalledTimes( 1 );
			expect( second ).toBe( first );

			deferred.resolve( { a: 1 } );
			await second;
		} );

		it( 'resolves when there is nothing at all to do', async () => {
			const { getCached, setCached } = makeCache( { a: 1 } );
			const inFlight = new Map();
			const run = jest.fn();

			await doDeduplicatedBatchFetch( { inFlight, keys: [ 'a' ], run, getCached, setCached } );

			expect( run ).not.toHaveBeenCalled();
		} );

		it( 'works without getCached and setCached', async () => {
			const inFlight = new Map();
			const run = jest.fn().mockResolvedValue( { a: 1 } );

			await doDeduplicatedBatchFetch( { inFlight, keys: [ 'a' ], run } );

			expect( run ).toHaveBeenCalledWith( [ 'a' ] );
			expect( inFlight.size ).toBe( 0 );
		} );
	} );
} );
