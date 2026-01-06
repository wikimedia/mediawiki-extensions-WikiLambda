/*!
 * WikiLambda Vue editor: Abstract Wikipedia Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
const { saveAbstractWikiContent, runAbstractWikiFragment } = require( '../../utils/apiUtils.js' );
const { extractZIDs } = require( '../../utils/schemata.js' );
const { buildAbstractWikiTitle } = require( '../../utils/urlUtils.js' );
const { extractWikidataItemIds } = require( '../../utils/wikidataUtils.js' );
const { canonicalToHybrid, hybridToCanonical } = require( '../../utils/schemata.js' );

const DEBOUNCE_FRAGMENT_DIRTY_TIMEOUT = 2000;

const abstractWikiStore = {
	state: {
		qid: undefined,
		fragments: {}
	},
	getters: {
		/**
		 * FIXME add jsdoc
		 * FIXME we should make naming decisions before starting to write too much code.
		 * For example, how do we refer to (internally) to the the Wikidata Item Qid which
		 * identifies the Abstract Content page being rendered here? Options:
		 * * id
		 * * qid
		 * * abstractWikiId
		 * * pageId
		 * * title
		 * * ...
		 *
		 * @param {Object} state
		 * @return {string}
		 */
		getAbstractWikiId: function ( state ) {
			return state.qid;
		},
		/**
		 * FIXME add jsdoc
		 *
		 * @return {Array|undefined}
		 */
		getAbstractContentSections: function () {
			const sectionsPath = [ Constants.STORED_OBJECTS.ABSTRACT, Constants.ABSTRACT_WIKI_SECTIONS ];
			const sections = this.getZObjectByKeyPath( sectionsPath );
			if ( !sections ) {
				return undefined;
			}

			return Object.keys( sections ).map( ( qid ) => Object.assign( {
				qid,
				isLede: qid === Constants.ABSTRACT_WIKI_SECTION_LEDE,
				labelData: this.getItemLabelData( qid ),
				fragmentsPath: [ ...sectionsPath, qid, Constants.ABSTRACT_WIKI_SECTION_FRAGMENTS ].join( '.' )
			}, sections[ qid ] ) );
		},
		/**
		 * FIXME add jsdoc
		 *
		 * @return {string}
		 */
		getAbstractWikipediaNamespace: function () {
			return mw.config.get( 'wgWikiLambdaAbstractPrimaryNamespace' );
		},
		/**
		 * @param {Object} state
		 * @return {Function}
		 */
		getRenderedFragment: function ( state ) {
			/**
			 * @param {string} keyPath
			 * @return {Object}
			 */
			const storedFragment = ( keyPath ) => state.fragments[ keyPath ];
			return storedFragment;
		}
	},
	actions: {
		/**
		 * Initializes the store for reading or editing an Abstract Content page,
		 * given the values passed down through mw.config.
		 *
		 * The config values we need are:
		 * * Subpage or qid url param: this.getWikilambdaConfig.title
		 * * String with Json content for the AW page: this.getWikilambdaConfig.content
		 *
		 * After storing the data, we gather all Wikifunctions and Wikidata object IDs
		 * and we fetch them from their respective remote services so that we can:
		 * * Labelize the page title and the sections (Wikidata Item Ids)
		 * * Labelize the function calls that generate fragments (Wikifunctions ZObject Ids)
		 *
		 * @return {Promise}
		 */
		initializeAbstractWikiContent: function () {
			const content = JSON.parse( this.getWikilambdaConfig.content );

			// Transform ZObject fragments from canonical to hybrid
			for ( const qid in content[ Constants.ABSTRACT_WIKI_SECTIONS ] ) {
				const section = content[ Constants.ABSTRACT_WIKI_SECTIONS ][ qid ];
				section[ Constants.ABSTRACT_WIKI_SECTION_FRAGMENTS ] = canonicalToHybrid(
					section[ Constants.ABSTRACT_WIKI_SECTION_FRAGMENTS ]
				);
			}

			this.setAbstractWikiId( this.getWikilambdaConfig.title );
			this.setJsonObject( {
				namespace: Constants.STORED_OBJECTS.ABSTRACT,
				zobject: content
			} );

			// Prefetch mentioned zids in content
			const zids = extractZIDs( content );
			this.fetchZids( { zids } );

			// Prefetch mentioned qids in content
			const qids = extractWikidataItemIds( content );
			// Prefetch the title Qid if not null
			if ( this.getWikilambdaConfig.title ) {
				qids.push( this.getWikilambdaConfig.title );
			}
			this.fetchItems( { ids: qids } );

			// Set as initialized
			this.setInitialized( true );

			return Promise.resolve();
		},
		/**
		 * FIXME add jsdoc
		 *
		 * @param {string} qid
		 */
		setAbstractWikiId: function ( qid ) {
			this.qid = qid;
			this.jsonObject[ Constants.STORED_OBJECTS.ABSTRACT ][ Constants.ABSTRACT_WIKI_QID ] = qid;
		},
		/**
		 * FIXME add jsdoc
		 *
		 * @return {boolean}
		 */
		validateAbstractWikiContent: function () {
			return true;
		},
		/**
		 * FIXME add jsdoc
		 *
		 * @param {Object} payload
		 * @param {string} payload.summary
		 * @return {Promise}
		 */
		submitAbstractWikiContent: function ( { summary } ) {
			// Build title with primary namespace and qid
			const title = buildAbstractWikiTitle( this.getAbstractWikipediaNamespace, this.qid );

			// Build content from stored object
			const content = JSON.parse( JSON.stringify(
				this.getZObjectByKeyPath( [ Constants.STORED_OBJECTS.ABSTRACT ] )
			) );

			// Transform ZObject fragments from hybrid to canonical
			for ( const qid in content[ Constants.ABSTRACT_WIKI_SECTIONS ] ) {
				const section = content[ Constants.ABSTRACT_WIKI_SECTIONS ][ qid ];
				section[ Constants.ABSTRACT_WIKI_SECTION_FRAGMENTS ] = hybridToCanonical(
					section[ Constants.ABSTRACT_WIKI_SECTION_FRAGMENTS ]
				);
			}

			return saveAbstractWikiContent( {
				title,
				content,
				summary
			} );
		},
		/**
		 * Call the API to render the Abstract Wiki fragment and
		 * store the response in the state
		 *
		 * @param {Object} payload
		 * @param {string} payload.keyPath
		 */
		renderFragmentPreview: function ( payload ) {
			const { keyPath } = payload;

			// Not initialized yet, set blank object
			if ( !( keyPath in this.fragments ) ) {
				this.fragments[ keyPath ] = { isDirty: true };
			}

			const fragmentStatus = this.fragments[ keyPath ];
			if ( fragmentStatus.isDirty && !fragmentStatus.isLoading ) {
				this.fragments[ keyPath ].isLoading = true;

				runAbstractWikiFragment( payload ).then( ( response ) => {
					this.setRenderedFragment( {
						keyPath,
						fragment: response
					} );
				} ).catch( () => {
					// TODO better handle errors
					this.setRenderedFragment( {
						keyPath,
						error: 'some error happened'
					} );
				} );
			}
		},
		/**
		 * Save fragment rendered output and dirty/loading status in the state
		 *
		 * @param {Object} payload
		 * @param {string} payload.keyPath
		 * @param {Object} payload.fragment
		 * @param {string} payload.error
		 */
		setRenderedFragment: function ( payload ) {
			const { keyPath, fragment, error } = payload;
			if ( !( keyPath in this.fragments ) ) {
				this.fragments[ keyPath ] = { isLoading: true };
			}

			if ( error ) {
				this.fragments[ keyPath ].error = true;
				this.fragments[ keyPath ].isDirty = false;
				// FIXME: what to do when we receive an error?
				this.fragments[ keyPath ].html = error;
			} else {
				this.fragments[ keyPath ].error = false;
				this.fragments[ keyPath ].isDirty = false;
				// FIXME: when do we check that the type is correct?
				this.fragments[ keyPath ].html = fragment.Z89K1;
			}

			this.fragments[ keyPath ].isLoading = false;
		},
		/**
		 * Set fragment data as dirty after DEBOUNCE_FRAGMENT_DIRTY_TIMEOUT ms
		 *
		 * @param {string} keyPath
		 */
		setDirtyFragment: function ( keyPath ) {
			const fragmentPath = keyPath.split( '.' ).slice( 0, 5 ).join( '.' );

			// If fragment is not initialized, do nothing
			if ( !( fragmentPath in this.fragments ) ) {
				return;
			}

			// Debounce setting fragment as dirty to avoid stream of updates
			const fragment = this.fragments[ fragmentPath ];
			if ( fragment.debounce ) {
				clearTimeout( fragment.debounce );
			}

			fragment.debounce = setTimeout( () => {
				fragment.isDirty = true;
				fragment.debounce = undefined;
			}, DEBOUNCE_FRAGMENT_DIRTY_TIMEOUT );
		}
	}
};

module.exports = abstractWikiStore;
