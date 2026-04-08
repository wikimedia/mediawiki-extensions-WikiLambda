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
const { extractWikidataItemIds, isWikidataQid } = require( '../../utils/wikidataUtils.js' );
const { canonicalToHybrid, hybridToCanonical } = require( '../../utils/schemata.js' );
const { isValidZidFormat } = require( '../../utils/typeUtils.js' );

/* Time (ms) from last edit to re-render fragment call */
const DEBOUNCE_FRAGMENT_DIRTY_TIMEOUT = 2000;
/* Time (ms) between processing jobs in the queue */
const FRAGMENT_QUEUE_TIMEOUT = 2000;
/* Initial delay (ms) before the first retry; subsequent retries use exponential backoff */
const INITIAL_RETRY_DELAY = 2000;
/* Multiplier applied to the retry delay between successive retries */
const RETRY_BACKOFF_FACTOR = 2;
/* Maximum times to try each fragment */
const MAX_FRAGMENT_RETRIES = 3;

const abstractWikiStore = {
	state: {
		qid: undefined,
		fragments: {},
		highlight: undefined,
		previewLanguageZid: undefined,
		suggestedHtmlFunctions: [],
		fragmentQueue: [],
		queueRunning: false
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
		 * Returns the language ZID to use for the preview block.
		 *
		 * @param {Object} state
		 * @return {string|undefined}
		 */
		getPreviewLanguageZid: function ( state ) {
			return state.previewLanguageZid || this.getUserLangZid;
		},
		/**
		 * Returns the cached value of the Abstract Wiki Content fragment preview,
		 * given its key path and a language.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getFragmentPreview: function ( state ) {
			/**
			 * @param {string} keyPath
			 * @return {Object|undefined}
			 */
			return ( keyPath ) => {
				const fragment = state.fragments[ keyPath ];
				return fragment ? fragment[ this.getPreviewLanguageZid ] : undefined;
			};
		},
		/**
		 * Returns the keyPath of the highlighted fragment
		 *
		 * @param {Object} state
		 * @return {string}
		 */
		getHighlightedFragment: function ( state ) {
			return state.highlight;
		},
		/**
		 * Returns the array with suggested html functions
		 *
		 * @param {Object} state
		 * @return {Array}
		 */
		getSuggestedHtmlFunctions: function ( state ) {
			return state.suggestedHtmlFunctions;
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

			this.setJsonObject( {
				namespace: Constants.STORED_OBJECTS.ABSTRACT,
				zobject: content
			} );
			this.setAbstractWikiId( this.getWikilambdaConfig.title );

			// Initialize suggested fragment functions (discard any bad entries)
			let suggestedZids = [];
			try {
				const suggested = JSON.parse( mw.msg( 'abstractwiki-suggested-functions.json' ) );
				suggestedZids = suggested.filter( ( item ) => isValidZidFormat( item ) );
				this.setSuggestedHtmlFunctions( suggestedZids );
			} catch ( e ) {
				// do nothing
			}

			// Prefetch mentioned zids in content
			const zids = extractZIDs( content );
			this.fetchZids( { zids: [ ...zids, ...suggestedZids ] } );

			// Prefetch mentioned qids in content and, if creating a new Abstract Article,
			// also the main page qid (title) when the stored qid is the placeholder
			const qids = extractWikidataItemIds( content );

			if (
				isWikidataQid( this.getWikilambdaConfig.title ) &&
				content[ Constants.ABSTRACT_WIKI_QID ] === Constants.ABSTRACT_WIKI_NEW_QID_PLACEHOLDER
			) {
				qids.push( this.getWikilambdaConfig.title );
			}
			this.fetchItems( { ids: qids } );

			// Set page as initialized
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
		 * Adds a new job to the fragment preview request queue,
		 * and resumes the action to process the jobs in the queue.
		 *
		 * @param {Function} job
		 */
		enqueueFragmentPreview: function ( job ) {
			this.fragmentQueue.push( job );
			this.processFragmentQueue();
		},
		/**
		 * Initializes the processing of the fragment rendering
		 * jobs pending in the queue. It runs one job every FRAGMENT_QUEUE_TIMEOUT
		 * miliseconds. Once there are no more jobs in the queue, it sets queueRunning
		 * flag to false.
		 */
		processFragmentQueue() {
			if ( this.queueRunning ) {
				return;
			}
			this.queueRunning = true;

			const processNextJob = () => {
				if ( this.fragmentQueue.length === 0 ) {
					this.queueRunning = false;
					return;
				}
				const nextJob = this.fragmentQueue.shift();
				nextJob();
				setTimeout( processNextJob, FRAGMENT_QUEUE_TIMEOUT );
			};

			processNextJob();
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
		 * @param {boolean} payload.isAsync
		 * @param {Object} payload.fragment
		 */
		renderFragmentPreview: function ( payload ) {
			const { keyPath, language } = payload;

			// Fragment not initialized yet: set blank object for keyPath
			if ( !( keyPath in this.fragments ) ) {
				this.fragments[ keyPath ] = {};
			}

			// Fragment preview for a language not initialized yet: set initial object
			if ( !( language in this.fragments[ keyPath ] ) ) {
				this.fragments[ keyPath ][ language ] = {
					isDirty: true,
					retryCount: 0
				};
			}

			const fragmentStatus = this.fragments[ keyPath ][ language ];

			// If fragment is already generated or request ongoing, exit
			if ( !fragmentStatus.isDirty || fragmentStatus.isLoading ) {
				return;
			}

			// Else, initiate rendering call
			fragmentStatus.isLoading = true;

			// Build request job and enqueue it
			const job = () => this.requestFragmentPreview( payload, job );
			this.enqueueFragmentPreview( job );
		},

		/**
		 * @param {Object} payload
		 * @param {string} payload.keyPath
		 * @param {string} payload.qid
		 * @param {string} payload.language
		 * @param {string} payload.date
		 * @param {boolean} payload.isAsync
		 * @param {Object} payload.fragment
		 * @param {Function} job
		 * @return {Promise}
		 */
		requestFragmentPreview: function ( payload, job ) {
			const { keyPath, language } = payload;

			return runAbstractWikiFragment( {
				qid: payload.qid,
				language: payload.language,
				date: payload.date,
				fragment: payload.fragment,
				isAsync: payload.isAsync
			} ).then( ( data ) => {
				// Received pending fragment: queue retry if possible
				if ( data.pending ) {
					// Increment retry count
					const fragmentStatus = this.fragments[ keyPath ][ language ];
					fragmentStatus.retryCount++;

					// If reached max retries, set error fragment and exit
					if ( fragmentStatus.retryCount >= MAX_FRAGMENT_RETRIES ) {
						const maxRetriesError = {
							type: 'warning',
							retry: true,
							text: mw.message( 'wikilambda-abstract-preview-fragment-max-retries' ).text()
						};
						this.setRenderedFragment( { keyPath, language, error: maxRetriesError } );
						return;
					}

					// Else, queue retry with exponential backoff to avoid stampeding
					// the server. retryCount has just been incremented, so the first
					// retry (retryCount === 1) waits INITIAL_RETRY_DELAY, the second
					// waits INITIAL_RETRY_DELAY * RETRY_BACKOFF_FACTOR, and so on.
					const backoffDelay = INITIAL_RETRY_DELAY *
						Math.pow( RETRY_BACKOFF_FACTOR, fragmentStatus.retryCount - 1 );
					setTimeout( () => {
						this.enqueueFragmentPreview( job );
					}, backoffDelay );

				} else {
					// Received done fragment!
					this.setRenderedFragment( { keyPath, language, fragment: data.value } );
				}
			} ).catch( ( data ) => {
				const error = {};
				const errorData = data.response && data.response.error ?
					data.response.error :
					{ code: 'internal_api_error_' };

				// Show retry CTA when 503/Service unavailable.
				error.retry = data.httpStatus === 500 || data.httpStatus === 503;

				if ( errorData.code === 'wikilambda-zerror' ) {
					this.fetchZids( { zids: [ errorData.zerrorType ] } );
					error.code = errorData.msg;
					error.zid = errorData.zerrorType;
				} else {
					error.text = errorData.code.startsWith( 'internal_api_error_' ) ?
						mw.message( 'apierror-abstractwiki_run_fragment-unknown-error' ).text() :
						errorData.info;
				}
				this.setRenderedFragment( { keyPath, language, error } );
			} );
		},
		/**
		 * Save fragment rendered output and dirty/loading status in the state
		 *
		 * @param {Object} payload
		 * @param {string} payload.keyPath
		 * @param {string} payload.language
		 * @param {string|undefined} payload.fragment
		 * @param {Object|undefined} payload.error
		 * @param {string|null} payload.error.text
		 * @param {string|null} payload.error.code
		 * @param {string|null} payload.error.zid
		 * @param {string|null} payload.error.type
		 */
		setRenderedFragment: function ( payload ) {
			const { keyPath, language, fragment = '', error } = payload;

			// Fragment not initialized yet: set blank object for keyPath
			if ( !( keyPath in this.fragments ) ) {
				this.fragments[ keyPath ] = {};
			}

			// Fragment preview for a language not initialized yet: set initial object
			if ( !( language in this.fragments[ keyPath ] ) ) {
				this.fragments[ keyPath ][ language ] = {
					isLoading: true
				};
			}

			this.fragments[ keyPath ][ language ].isDirty = false;
			this.fragments[ keyPath ][ language ].hasError = !!error;
			this.fragments[ keyPath ][ language ].error = error || null;
			this.fragments[ keyPath ][ language ].html = !error ? fragment : '';

			// Reset loading states:
			this.fragments[ keyPath ][ language ].retryCount = 0;
			this.fragments[ keyPath ][ language ].isLoading = false;
		},
		/**
		 * Set fragment data as dirty after DEBOUNCE_FRAGMENT_DIRTY_TIMEOUT ms
		 * It must set as dirty all languages for the given fragment, as all should
		 * be retried whenever requested.
		 *
		 * @param {string} keyPath
		 * @param {boolean} immediate
		 */
		setDirtyFragment: function ( keyPath, immediate = false ) {
			const fragmentPath = keyPath.split( '.' ).slice( 0, 5 ).join( '.' );

			// If fragment is not initialized, do nothing
			if ( !( fragmentPath in this.fragments ) ) {
				return;
			}

			// If fragment in language is not initialize, do nothing
			// Set all existing languages to dirty:
			Object.keys( this.fragments[ fragmentPath ] ).forEach( ( language ) => {
				const fragment = this.fragments[ fragmentPath ][ language ];

				if ( fragment.debounce ) {
					clearTimeout( fragment.debounce );
				}

				// Debounce setting fragment as dirty to avoid stream of updates
				// unless it's explicitly required using immediate
				fragment.debounce = setTimeout( () => {
					fragment.isDirty = true;
					fragment.debounce = undefined;
				}, immediate ? 0 : DEBOUNCE_FRAGMENT_DIRTY_TIMEOUT );

			} );
		},
		/**
		 * Swap the fragment preview data for two given fragment key paths
		 *
		 * @param {string} keyPath1
		 * @param {string} keyPath2
		 */
		swapFragmentPreviews: function ( keyPath1, keyPath2 ) {
			if ( !( keyPath1 in this.fragments ) ) {
				throw new Error( `Unable to swap fragments: Fragment not found: "${ keyPath1 }"` );
			}

			if ( !( keyPath2 in this.fragments ) ) {
				throw new Error( `Unable to swap fragments: Fragment not found: "${ keyPath2 }"` );
			}

			const temp = this.fragments[ keyPath1 ];
			this.fragments[ keyPath1 ] = this.fragments[ keyPath2 ];
			this.fragments[ keyPath2 ] = temp;
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

			const parts = keyPath.split( '.' );
			const startIndex = Number( parts.pop() );

			if ( !Number.isInteger( startIndex ) ) {
				throw new Error( `Unable to shift fragments: Invalid starting index: "${ startIndex }"` );
			}

			const shiftKeys = Object.keys( this.fragments )
				.filter( ( key ) => {
					// Filter in only the keys that need to be shifted
					const index = Number( key.split( '.' ).slice( -1 )[ 0 ] );
					return index >= startIndex;
				} )
				.sort( ( a, b ) => {
					// Sort in descending order for possitive offset
					// Sort in ascending order for negative offset
					const aIndex = Number( a.split( '.' ).slice( -1 )[ 0 ] );
					const bIndex = Number( b.split( '.' ).slice( -1 )[ 0 ] );
					return offset > 0 ? bIndex - aIndex : aIndex - bIndex;
				} );

			// For each key to be shifted, assign its value on the new
			// key (added offset) and delete the current one.
			for ( const key of shiftKeys ) {
				const thisIndex = Number( key.split( '.' ).slice( -1 )[ 0 ] );
				const newIndex = thisIndex + offset;
				const newKey = [ ...parts, newIndex ].join( '.' );
				this.fragments[ newKey ] = this.fragments[ key ];
				delete this.fragments[ key ];
			}
		},
		/**
		 * Set a given fragment keyPath as highlighted
		 *
		 * @param {string|undefined} keyPath
		 */
		setHighlightedFragment: function ( keyPath ) {
			this.highlight = keyPath;
		},
		/**
		 * Sets a list of zids as suggested functions that return HTML fragments
		 *
		 * @param {Array} zids
		 */
		setSuggestedHtmlFunctions: function ( zids ) {
			this.suggestedHtmlFunctions = zids;
		}
	}
};

module.exports = abstractWikiStore;
