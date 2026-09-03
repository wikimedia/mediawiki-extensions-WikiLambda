/*!
 * WikiLambda Pinia store: Commons Media module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { searchCommonsMedia, fetchCommonsMediaByIds } = require( '../../../utils/apiUtils.js' );
const storeUtils = require( '../../../utils/storeUtils.js' );

module.exports = {
	state: {
		/**
		 * Cache of Commons media data indexed by M-ID.
		 * Key: M-ID (e.g. "M68960758")
		 * Value: the page object which the API returned
		 *
		 * @type {Object<string, Object>}
		 */
		commonsMedia: {},
		/**
		 * Map of in-flight Commons media requests, written by `storeUtils.doDeduplicatedBatchFetch`.
		 * Key: M-ID (e.g. "M68960758")
		 * Value: Promise of the request which fetches it
		 *
		 * @type {Map<string, Promise>}
		 */
		commonsMediaPromises: new Map()
	},

	getters: {
		/**
		 * Returns the Commons media data for a given M-ID,
		 * or undefined if it has not been fetched yet.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getCommonsMediaData: function ( state ) {
			/**
			 * @param {string} mid M-ID (e.g. "M68960758")
			 * @return {Object|undefined}
			 */
			const findCommonsMediaData = ( mid ) => state.commonsMedia[ mid ];
			return findCommonsMediaData;
		},

		/**
		 * Returns the file title for a given M-ID (e.g. "File:Cat.jpg"),
		 * or undefined if the data hasn't been fetched yet.
		 *
		 * @return {Function}
		 */
		getCommonsMediaTitle: function () {
			/**
			 * @param {string} mid
			 * @return {string|undefined}
			 */
			const findCommonsMediaTitle = ( mid ) => {
				const data = this.getCommonsMediaData( mid );
				return data ? data.title : undefined;
			};
			return findCommonsMediaTitle;
		},

		/**
		 * Returns the thumbnail URL for a given M-ID (250 px, from imageinfo),
		 * or undefined if not yet fetched.
		 *
		 * @return {Function}
		 */
		getCommonsMediaThumb: function () {
			/**
			 * @param {string} mid
			 * @return {string|undefined}
			 */
			const findCommonsMediaThumb = ( mid ) => {
				const data = this.getCommonsMediaData( mid );
				return data && data.imageinfo && data.imageinfo[ 0 ] ?
					data.imageinfo[ 0 ].thumburl :
					undefined;
			};
			return findCommonsMediaThumb;
		},

		/**
		 * Returns the thumbnail dimensions for a given M-ID as { width, height },
		 * or undefined if not yet fetched.
		 *
		 * @return {Function}
		 */
		getCommonsMediaThumbSize: function () {
			/**
			 * @param {string} mid
			 * @return {{ width: number, height: number }|undefined}
			 */
			const findCommonsMediaThumbSize = ( mid ) => {
				const data = this.getCommonsMediaData( mid );
				const imageinfo = data && data.imageinfo && data.imageinfo[ 0 ];
				if ( imageinfo && imageinfo.thumbwidth && imageinfo.thumbheight ) {
					return { width: imageinfo.thumbwidth, height: imageinfo.thumbheight };
				}
				return undefined;
			};
			return findCommonsMediaThumbSize;
		},

		/**
		 * Returns the Commons description page URL for a given M-ID,
		 * or undefined if not yet fetched.
		 *
		 * @return {Function}
		 */
		getCommonsMediaDescriptionUrl: function () {
			/**
			 * @param {string} mid
			 * @return {string|undefined}
			 */
			const findCommonsMediaDescriptionUrl = ( mid ) => {
				const data = this.getCommonsMediaData( mid );
				return data && data.imageinfo && data.imageinfo[ 0 ] ?
					data.imageinfo[ 0 ].descriptionurl :
					undefined;
			};
			return findCommonsMediaDescriptionUrl;
		}
	},

	actions: {
		/**
		 * Stores Commons media data indexed by M-ID.
		 *
		 * @param {Object} payload
		 * @param {string} payload.id M-ID (e.g. "M12345")
		 * @param {Object} payload.data The page object which the API returned
		 */
		setCommonsMediaData: function ( payload ) {
			this.commonsMedia[ payload.id ] = payload.data;
		},

		/**
		 * Fetches Commons media metadata for a list of M-IDs.
		 * Skips IDs that are already cached or being fetched.
		 *
		 * @param {Object} payload
		 * @param {Array<string>} payload.ids Array of M-IDs (e.g. ["M123", "M456"])
		 * @return {Promise}
		 */
		fetchCommonsMedia: function ( { ids } ) {
			return storeUtils.doDeduplicatedBatchFetch( {
				inFlight: this.commonsMediaPromises,
				keys: ids,
				getCached: ( mid ) => this.getCommonsMediaData( mid ),
				setCached: ( mid, data ) => this.setCommonsMediaData( { id: mid, data } ),
				run: ( newIds ) => fetchCommonsMediaByIds( {
					// Strip the "M" prefix for the pageids parameter
					ids: newIds.map( ( mid ) => mid.replace( /^M/i, '' ) ).join( '|' )
				} ).then( ( data ) => {
					const pages = data.query ? data.query.pages : {};
					const pageList = Array.isArray( pages ) ? pages : Object.values( pages );
					const pagesByMid = {};
					pageList.forEach( ( page ) => {
						if ( page.pageid ) {
							pagesByMid[ `M${ page.pageid }` ] = page;
						}
					} );
					// An M-ID which the response leaves out stays out of the
					// cache, so a later call asks for it again
					return pagesByMid;
				} )
					// Nothing waits for this fetch, so a failure must not
					// reject. The helper then has no pages to cache, and a
					// later call asks for these M-IDs again.
					.catch( () => ( {} ) )
			} );
		},

		/**
		 * Searches Commons for media files matching the given term.
		 * Returns normalised page objects suitable for building menu items.
		 *
		 * @param {Object} payload
		 * @param {string} payload.search
		 * @param {number|null} [payload.searchContinue]
		 * @param {AbortSignal} [payload.signal]
		 * @return {Promise}
		 */
		lookupCommonsMedia: function ( payload ) {
			return searchCommonsMedia( payload );
		}
	}
};
