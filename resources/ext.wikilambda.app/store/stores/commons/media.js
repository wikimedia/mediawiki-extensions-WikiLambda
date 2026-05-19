/*!
 * WikiLambda Pinia store: Commons Media module
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const { searchCommonsMedia, fetchCommonsMediaByIds } = require( '../../../utils/apiUtils.js' );

module.exports = {
	state: {
		commonsMedia: {}
	},

	getters: {
		/**
		 * Returns the Commons media data for a given M-ID,
		 * the fetch Promise if the request is in flight,
		 * or undefined if it hasn't been requested yet.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getCommonsMediaData: function ( state ) {
			/**
			 * @param {string} mid M-ID (e.g. "M68960758")
			 * @return {Object|Promise|undefined}
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
				if ( data && typeof data.then !== 'function' ) {
					return data.title;
				}
				return undefined;
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
				if ( data && typeof data.then !== 'function' ) {
					return data.imageinfo && data.imageinfo[ 0 ] && data.imageinfo[ 0 ].thumburl;
				}
				return undefined;
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
				if ( data && typeof data.then !== 'function' ) {
					const imageinfo = data.imageinfo && data.imageinfo[ 0 ];
					if ( imageinfo && imageinfo.thumbwidth && imageinfo.thumbheight ) {
						return { width: imageinfo.thumbwidth, height: imageinfo.thumbheight };
					}
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
				if ( data && typeof data.then !== 'function' ) {
					return data.imageinfo && data.imageinfo[ 0 ] && data.imageinfo[ 0 ].descriptionurl;
				}
				return undefined;
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
		 * @param {Object|Promise} payload.data Resolved data or in-flight Promise
		 */
		setCommonsMediaData: function ( payload ) {
			this.commonsMedia[ payload.id ] = payload.data;
		},

		/**
		 * Removes the cached data for the given M-IDs.
		 *
		 * @param {Object} payload
		 * @param {Array<string>} payload.ids
		 */
		resetCommonsMediaData: function ( payload ) {
			payload.ids.forEach( ( id ) => delete this.commonsMedia[ id ] );
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
			const filteredIds = ids.filter(
				( id ) => this.getCommonsMediaData( id ) === undefined
			);

			if ( !filteredIds.length ) {
				return Promise.resolve();
			}

			// Strip the "M" prefix for the pageids parameter
			const numericIds = filteredIds.map( ( id ) => id.replace( /^M/i, '' ) ).join( '|' );

			const request = {
				ids: numericIds
			};

			const resultPromise = fetchCommonsMediaByIds( request )
				.then( ( data ) => {
					const pages = data.query ? data.query.pages : {};
					const pageList = Array.isArray( pages ) ? pages : Object.values( pages );
					pageList.forEach( ( page ) => {
						if ( !page.pageid ) {
							return;
						}
						const mid = `M${ page.pageid }`;
						this.setCommonsMediaData( { id: mid, data: page } );
					} );
				} )
				.catch( () => {
					this.resetCommonsMediaData( { ids: filteredIds } );
				} );

			// Mark IDs as in-flight
			filteredIds.forEach( ( id ) => this.setCommonsMediaData( { id, data: resultPromise } ) );
			return resultPromise;
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
