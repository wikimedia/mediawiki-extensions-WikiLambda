/**
 * WikiLambda Vue editor: shared utilities for store fetch deduplication
 *
 * Many stores fetch the same remote object from several components at once.
 * Without help, each component starts its own request. These two helpers make
 * a store fetch each key once: the first caller starts the request, later
 * callers wait for that same request, and the result goes into a cache that
 * the store owns.
 *
 * WHAT YOU MUST SUPPLY
 *
 * The helpers never touch your cache directly. You give them two callbacks:
 * `getCached( key )` reads one value, `setCached( key, value )` writes one
 * value. The cache can therefore be any shape you like: a plain object in
 * state, a Map, or a pair of existing store actions. You also supply
 * `inFlight`, a Map that the helper uses to remember which keys have a
 * request running. Declare it in state and do not write to it yourself.
 *
 * HOW TO USE IT IN A STORE
 *
 *     state: {
 *         widgets: {},
 *         widgetPromises: new Map()
 *     },
 *     actions: {
 *         fetchWidget: function ( id ) {
 *             return storeUtils.doDeduplicatedFetch( {
 *                 inFlight: this.widgetPromises,
 *                 key: id,
 *                 getCached: ( key ) => this.widgets[ key ],
 *                 setCached: ( key, value ) => {
 *                     this.widgets[ key ] = value;
 *                 },
 *                 run: () => apiUtils.fetchWidget( { id } )
 *             } );
 *         }
 *     }
 *
 * Use `doDeduplicatedBatchFetch` instead when the API takes many keys at once.
 * It is the same contract, except that `keys` is an array and `run` receives
 * the subset of keys that are neither cached nor already being fetched.
 *
 * THINGS TO KNOW
 *
 * * A rejected fetch does not write to the cache, so the next call retries.
 *   The rejection reaches every caller that is waiting on that fetch.
 * * `undefined` means "not cached". Do not use it as a real value.
 * * In the batch helper, a key missing from the result of `run` is not
 *   cached, so the next call requests it again.
 *
 * TODO (T417384): the stores below still track in-flight requests their own
 * way and should move to these helpers, one patch each:
 * * `library.js` (`requests`), `testResults.js`, `ztype.js`
 *   (`rendererPromises`), `abstractWiki.js` (`fragmentPromises`)
 * * `wikidata/{items,lexemes,properties}.js` and `commons/media.js`, which
 *   put the promise in the same slot as the data and then use
 *   `typeof value.then` to tell them apart. These must be reconciled with
 *   the request window added in T429766, so agree the design first.
 * * `ztype.js` (`parserPromises`) is a plain array used to wait for all
 *   running parsers, not a keyed cache. It does not fit these helpers.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const storeUtils = {
	/**
	 * Fetch the value for one key, at most once at a time.
	 *
	 * Returns the cached value if there is one, else joins the request that is
	 * already running for this key, else starts a new one. On success the
	 * result is written to the cache through `setCached`. On failure nothing
	 * is cached and the rejection is passed on to every waiting caller.
	 *
	 * @param {Object} opts
	 * @param {Map} opts.inFlight Map of key to running promise, owned by the store
	 * @param {string} opts.key Key to fetch and cache under
	 * @param {Function} opts.run `() => Promise` that fetches the value
	 * @param {Function} [opts.getCached] `( key ) => value`, or `undefined` if not cached
	 * @param {Function} [opts.setCached] `( key, value ) => void`, called on success only
	 * @return {Promise} Resolves with the cached or newly fetched value
	 */
	doDeduplicatedFetch: function ( { inFlight, key, run, getCached, setCached } ) {
		if ( getCached ) {
			const cached = getCached( key );
			if ( cached !== undefined ) {
				return Promise.resolve( cached );
			}
		}

		if ( inFlight.has( key ) ) {
			return inFlight.get( key );
		}

		const promise = run().then(
			( result ) => {
				if ( setCached && result !== undefined ) {
					setCached( key, result );
				}
				inFlight.delete( key );
				return result;
			},
			( error ) => {
				inFlight.delete( key );
				throw error;
			}
		);

		inFlight.set( key, promise );
		return promise;
	},

	/**
	 * Fetch the values for many keys in one request, at most once at a time.
	 *
	 * Keys that are cached, or that another request is already fetching, are
	 * left out of the new request. `run` therefore receives only the keys that
	 * nobody is fetching yet.
	 *
	 * What `run` resolves with matters only if you pass `setCached`. In that
	 * case it must be a plain object that maps each of those keys to its value,
	 * and keys it leaves out are not cached. A store that writes its own cache
	 * while it reads the response can leave `setCached` out and resolve with
	 * anything.
	 *
	 * The returned promise resolves once every requested key has settled, both
	 * the ones this call fetched and the ones it waited for. What it resolves
	 * with is not meaningful: read the results back out of the cache.
	 *
	 * Callers wait on this promise before they render, so it does not join
	 * promises it does not have to. One request with nothing else to wait for
	 * is returned as it is, rather than wrapped in `Promise.all`, which would
	 * delay every caller by an extra microtask for no gain.
	 *
	 * @param {Object} opts
	 * @param {Map} opts.inFlight Map of key to running promise, owned by the store
	 * @param {string[]} opts.keys Keys to fetch and cache under
	 * @param {Function} opts.run `( newKeys ) => Promise` resolving to key-value pairs if `setCached` is used
	 * @param {Function} [opts.getCached] `( key ) => value`, or `undefined` if not cached
	 * @param {Function} [opts.setCached] `( key, value ) => void`, called per key on success
	 * @return {Promise} Resolves when every requested key has settled
	 */
	doDeduplicatedBatchFetch: function ( { inFlight, keys, run, getCached, setCached } ) {
		const newKeys = [ ...new Set( keys.filter(
			( key ) => key &&
				( !getCached || getCached( key ) === undefined ) &&
				!inFlight.has( key )
		) ) ];
		const waitingFor = [ ...new Set( keys.filter( ( key ) => inFlight.has( key ) ) ) ]
			.map( ( key ) => inFlight.get( key ) );

		if ( !newKeys.length ) {
			return waitingFor.length === 1 ? waitingFor[ 0 ] : Promise.all( waitingFor );
		}

		const forgetKeys = () => newKeys.forEach( ( key ) => inFlight.delete( key ) );
		const batchPromise = run( newKeys ).then(
			( results ) => {
				if ( setCached && results ) {
					newKeys.forEach( ( key ) => {
						if ( results[ key ] !== undefined ) {
							setCached( key, results[ key ] );
						}
					} );
				}
				forgetKeys();
			},
			( error ) => {
				forgetKeys();
				throw error;
			}
		);

		newKeys.forEach( ( key ) => inFlight.set( key, batchPromise ) );

		if ( !waitingFor.length ) {
			return batchPromise;
		}
		waitingFor.push( batchPromise );
		return Promise.all( waitingFor );
	}
};

module.exports = storeUtils;
