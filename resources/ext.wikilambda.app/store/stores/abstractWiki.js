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
const { getFragmentCacheKey } = require( '../../utils/abstractUtils.js' );

const DEBOUNCE_FRAGMENT_DIRTY_TIMEOUT = 2000;

const abstractWikiStore = {
	state: {
		qid: undefined,
		fragments: {},
		highlight: undefined,
		previewLanguageZid: undefined
	},
	getters: {
		/**
		 * Returns the Abstract Wiki content Id
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
		 * Returns the name of the Abstract Wiki Content primary namespace
		 *
		 * @return {string}
		 */
		getAbstractWikipediaNamespace: function () {
			return mw.config.get( 'wgWikiLambdaAbstractPrimaryNamespace' );
		},
		/**
		 * Returns the preview language Zid (defaults to user/page language).
		 *
		 * @param {Object} state
		 * @return {string}
		 */
		getPreviewLanguageZid: function ( state ) {
			return state.previewLanguageZid || this.getUserLangZid;
		},
		/**
		 * Returns the cached value of the Abstract Wiki Content fragment preview,
		 * given its key path. Cache is keyed by keyPath and current preview language.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getFragmentPreview: function ( state ) {
			/**
			 * @param {string} keyPath
			 * @return {Object|undefined}
			 */
			return ( keyPath ) => state.fragments[ getFragmentCacheKey( keyPath, this.getPreviewLanguageZid ) ];
		},
		/**
		 * FIXME add jsdoc
		 *
		 * @param {Object} state
		 * @return {boolean}
		 */
		getHighlightedFragment: function ( state ) {
			return state.highlight;
		}
	},
	actions: {
		/**
		 * Sets the Abstract Wiki content Id in the store and inside the Abstract Content json
		 *
		 * @param {string} qid
		 */
		setAbstractWikiId: function ( qid ) {
			this.qid = qid;
			this.jsonObject[ Constants.STORED_OBJECTS.ABSTRACT ][ Constants.ABSTRACT_WIKI_QID ] = qid;
		},
		/**
		 * Sets the language Zid used for rendering the Abstract preview.
		 *
		 * @param {string} zid
		 */
		setPreviewLanguageZid: function ( zid ) {
			this.previewLanguageZid = zid;
		},
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
			this.fetchItems( { ids: qids } );

			// Set as initialized
			this.setInitialized( true );

			return Promise.resolve();
		},
		/**
		 * FIXME add jsdoc
		 *
		 * @return {boolean}
		 */
		validateAbstractWikiContent: function () {
			// TODO
			return true;
		},
		/**
		 * Submits a valid Abstract Wiki Content object for creation/edit
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
		 * @param {string} payload.qid
		 * @param {string} payload.language
		 * @param {string} payload.date
		 * @param {Object} payload.fragment
		 * @return {Promise}
		 */
		renderFragmentPreview: function ( payload ) {
			const { keyPath, language } = payload;
			const cacheKey = getFragmentCacheKey( keyPath, language );

			// Not initialized yet, set blank object
			if ( !( cacheKey in this.fragments ) ) {
				this.fragments[ cacheKey ] = { isDirty: true };
			}

			const fragmentStatus = this.fragments[ cacheKey ];

			// If fragment is already generated or request ongoing, resolve
			if ( !fragmentStatus.isDirty || fragmentStatus.isLoading ) {
				return Promise.resolve();
			}

			// Else, initiate rendering call
			this.fragments[ cacheKey ].isLoading = true;
			return runAbstractWikiFragment( payload )
				.then( ( fragment ) => {
					this.setRenderedFragment( { keyPath, language, fragment } );
				} )
				.catch( () => {
					// FIXME i18n, detailed error info, etc
					const error = 'Unable to render fragment';
					this.setRenderedFragment( { keyPath, language, error } );
				} );
		},
		/**
		 * Save fragment rendered output and dirty/loading status in the state
		 *
		 * @param {Object} payload
		 * @param {string} payload.keyPath
		 * @param {string} payload.language
		 * @param {Object} payload.fragment
		 * @param {string} payload.error
		 */
		setRenderedFragment: function ( payload ) {
			const { keyPath, language, fragment, error } = payload;
			const cacheKey = getFragmentCacheKey( keyPath, language );
			if ( !( cacheKey in this.fragments ) ) {
				this.fragments[ cacheKey ] = { isLoading: true };
			}

			if ( error ) {
				this.fragments[ cacheKey ].error = true;
				this.fragments[ cacheKey ].isDirty = false;
				this.fragments[ cacheKey ].html = error;
			} else {
				this.fragments[ cacheKey ].error = false;
				this.fragments[ cacheKey ].isDirty = false;
				this.fragments[ cacheKey ].html = fragment;
			}

			this.fragments[ cacheKey ].isLoading = false;
		},
		/**
		 * Set fragment data as dirty after DEBOUNCE_FRAGMENT_DIRTY_TIMEOUT ms
		 *
		 * @param {string} keyPath
		 */
		setDirtyFragment: function ( keyPath ) {
			const fragmentPath = keyPath.split( '.' ).slice( 0, 5 ).join( '.' );
			const cacheKey = getFragmentCacheKey( fragmentPath, this.getPreviewLanguageZid );

			// If fragment is not initialized, do nothing
			if ( !( cacheKey in this.fragments ) ) {
				return;
			}

			// Debounce setting fragment as dirty to avoid stream of updates
			const fragment = this.fragments[ cacheKey ];
			if ( fragment.debounce ) {
				clearTimeout( fragment.debounce );
			}

			fragment.debounce = setTimeout( () => {
				fragment.isDirty = true;
				fragment.debounce = undefined;
			}, DEBOUNCE_FRAGMENT_DIRTY_TIMEOUT );
		},
		/**
		 * Swap the fragment preview data for two given fragment key paths
		 *
		 * @param {string} keyPath1
		 * @param {string} keyPath2
		 */
		swapFragmentPreviews: function ( keyPath1, keyPath2 ) {
			const lang = this.getPreviewLanguageZid;
			const cacheKey1 = getFragmentCacheKey( keyPath1, lang );
			const cacheKey2 = getFragmentCacheKey( keyPath2, lang );

			if ( !( cacheKey1 in this.fragments ) ) {
				throw new Error( `Unable to swap fragments: Fragment not found: "${ keyPath1 }"` );
			}

			if ( !( cacheKey2 in this.fragments ) ) {
				throw new Error( `Unable to swap fragments: Fragment not found: "${ keyPath2 }"` );
			}

			const temp = this.fragments[ cacheKey1 ];
			this.fragments[ cacheKey1 ] = this.fragments[ cacheKey2 ];
			this.fragments[ cacheKey2 ] = temp;
		},
		/**
		 * Shift all fragments, starting from keyPath, a number of
		 * positions given an offset (negative or positive)
		 *
		 * @param {string} keyPath
		 * @param {number} offset
		 */
		shiftFragmentPreviews: function ( keyPath, offset ) {
			if ( !offset || !Number.isInteger( offset ) ) {
				throw new Error( `Unable to shift fragments: Invalid offset: "${ offset }"` );
			}

			const lang = this.getPreviewLanguageZid;
			const pathParts = keyPath.split( '.' );
			const startIndex = Number( pathParts.pop() );
			const sectionPathPrefix = pathParts.join( '.' );

			if ( !Number.isInteger( startIndex ) ) {
				throw new Error( `Unable to shift fragments: Invalid starting index: "${ startIndex }"` );
			}

			const langSuffix = `|${ lang }`;

			function keyPathFromCacheKey( cacheKey ) {
				return cacheKey.slice( 0, -langSuffix.length );
			}
			function indexFromKeyPath( path ) {
				return Number( path.split( '.' ).slice( -1 )[ 0 ] );
			}
			function isInSectionAndAtOrAfterStart( cacheKey ) {
				const path = keyPathFromCacheKey( cacheKey );
				const index = indexFromKeyPath( path );
				return path.startsWith( sectionPathPrefix ) && index >= startIndex;
			}

			const cacheKeysToShift = Object.keys( this.fragments )
				.filter( ( cacheKey ) => cacheKey.endsWith( langSuffix ) && isInSectionAndAtOrAfterStart( cacheKey ) )
				.sort( ( cacheKeyA, cacheKeyB ) => {
					const indexA = indexFromKeyPath( keyPathFromCacheKey( cacheKeyA ) );
					const indexB = indexFromKeyPath( keyPathFromCacheKey( cacheKeyB ) );
					return offset > 0 ? indexB - indexA : indexA - indexB;
				} );

			for ( const oldCacheKey of cacheKeysToShift ) {
				const oldKeyPath = keyPathFromCacheKey( oldCacheKey );
				const oldKeyPathParts = oldKeyPath.split( '.' );
				const oldIndex = Number( oldKeyPathParts.slice( -1 )[ 0 ] );
				const newIndex = oldIndex + offset;
				const newKeyPath = [ ...oldKeyPathParts.slice( 0, -1 ), newIndex ].join( '.' );
				const newCacheKey = getFragmentCacheKey( newKeyPath, lang );

				this.fragments[ newCacheKey ] = this.fragments[ oldCacheKey ];
				delete this.fragments[ oldCacheKey ];
			}
		},
		/**
		 * Set a given fragment keyPath as highlighted
		 *
		 * @param {string|undefined} keyPath
		 */
		setHighlightedFragment: function ( keyPath ) {
			this.highlight = keyPath;
		}
	}
};

module.exports = abstractWikiStore;
