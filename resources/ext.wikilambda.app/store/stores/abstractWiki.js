/*!
 * WikiLambda Vue editor: Abstract Wikipedia Pinia store
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../../Constants.js' );
const eventLogUtils = require( '../../utils/eventLogUtils.js' );
const { fetchAbstractWikiSection, saveAbstractWikiContent, runAbstractWikiFragment } = require( '../../utils/apiUtils.js' );
const { extractZIDs } = require( '../../utils/schemata.js' );
const { buildAbstractWikiTitle, generateViewUrl } = require( '../../utils/urlUtils.js' );
const { extractWikidataItemIds, isWikidataQid } = require( '../../utils/wikidataUtils.js' );
const { canonicalToHybrid, hybridToCanonical } = require( '../../utils/schemata.js' );
const { isValidZidFormat } = require( '../../utils/typeUtils.js' );
const { createParserCall, hasArgumentReference, walkAndTransformZObject } = require( '../../utils/zobjectUtils.js' );
const { sha256, stabilize } = require( '../../utils/miscUtils.js' );
const storeUtils = require( '../../utils/storeUtils.js' );
const { isUnavailableFragmentFailure } = require( '../../utils/errorUtils.js' );

/* Time (ms) between processing jobs in the queue */
const FRAGMENT_QUEUE_TIMEOUT = 2000;
/* Initial delay (ms) before the first retry; subsequent retries use exponential backoff */
const INITIAL_RETRY_DELAY = 2000;
/* Multiplier applied to the retry delay between successive retries */
const RETRY_BACKOFF_FACTOR = 2;
/* Maximum times to try each fragment */
const MAX_FRAGMENT_RETRIES = 3;
/* Maximum retries of a fragment that failed because the rendering service is busy */
const MAX_UNAVAILABLE_FRAGMENT_RETRIES = 10;

const abstractWikiStore = {
	state: {
		/**
		 * State of the fragment preview, indexed by a hashed
		 * representation of the fragment and the render language.
		 *
		 * Contains properties that describe the status of the render:
		 *
		 * fragments[ `${ sha256(fragment) }:${ langZid }` ] = {
		 *   "isLoading":false,
		 *   "isPending":false,
		 *   "isDirty":false,
		 *   "hasError":false,
		 *   "error":null,
		 *   "html":"<p>Rendered fragment.</p>",
		 *   "retryCount":0,
		 *   "isUnavailable":false,
		 *   "unavailableRetryCount":0
		 * }
		 *
		 * isUnavailable is true while the fragment waits for a busy rendering service;
		 * unavailableRetryCount counts the requests for it while it waits.
		 */
		fragments: {},
		/**
		 * Map of the fragment keys which a section request is fetching, written by
		 *`storeUtils.doDeduplicatedBatchFetch`. It stops `renderFragmentPreview` from asking for
		 * a fragment on its own while a section request is already getting it.
		 * Key: `${ sha256(fragment) }:${ langZid }`
		 * Value: Promise of the section request
		 *
		 * @type {Map<string, Promise>}
		 */
		fragmentPromises: new Map(),
		sectionHashes: {},
		qid: undefined,
		/**
		 * Revision ID of the displayed Abstract Wiki content, only set when it is
		 * not the latest revision (e.g. ?oldid=X or a diff page). Lets view mode
		 * fetch the persisted fragments of that revision (not default to latest one)
		 */
		revisionId: undefined,
		highlight: undefined,
		/**
		 * KeyPath of the fragment that the user selected. Unlike `highlight`,
		 * which follows the pointer, this stays set until the user selects
		 * another fragment or clears the selection.
		 */
		selection: undefined,
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
		 * Returns the revision ID of the displayed Abstract Wiki content, or
		 * undefined if the displayed content is the latest revision
		 *
		 * @param {Object} state
		 * @return {number|undefined}
		 */
		getAbstractWikiRevisionId: function ( state ) {
			return state.revisionId;
		},
		/**
		 * Returns the Abstract Wiki sections with UI metadata.
		 *
		 * Each section includes:
		 * - `qid`: section Wikidata QID
		 * - `isLede`: whether it is the lede section
		 * - `labelData`: local label payload for display
		 * - `fragmentsPath`: dot-path to the section's fragments in the stored object
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
		 * Returns the list of fragment hashes for a given section,
		 * or empty array if not initialized.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getAbstractSectionHashes: function ( state ) {
			/**
			 * @param {string} sectionQid
			 * @return {Array}
			 */
			return ( sectionQid ) => state.sectionHashes[ sectionQid ] || [];
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
			 * @param {string} fragmentHash
			 * @param {string} langZid
			 * @return {Object|undefined}
			 */
			return ( fragmentHash, langZid ) => {
				const fragmentKey = `${ fragmentHash }:${ langZid }`;
				return state.fragments[ fragmentKey ];
			};
		},
		/**
		 * Returns a link to the function page on Wikifunctions that runs the
		 * function call at the key path, with its inputs filled in. The function
		 * call can be a fragment, or a function call at a lower level in a fragment.
		 *
		 * The link uses the current editor state, so it includes the unsaved
		 * changes. The article context exists only on Abstract Wikipedia, so
		 * the link replaces the arguments of the render function (Z825):
		 * * Z825K1 (topic) becomes a Wikidata item reference to the article QID,
		 * * Z825K2 (language) becomes the preview language,
		 * * Z825K3 (date) becomes a call to the date parser with the date of today.
		 *
		 * The getter returns null when:
		 * * the object at the key path is not a function call,
		 * * the function is not a valid function reference, for example when
		 *   the editor did not choose a function yet,
		 * * an argument reference stays that Wikifunctions cannot resolve,
		 *   for example an empty argument reference,
		 * * the link is longer than Constants.URL_CHARS_MAX, because the servers
		 *   reject it (T439078).
		 *
		 * The components decide where to show the link.
		 *
		 * @return {Function}
		 */
		getFunctionCallLink: function () {
			/**
			 * @param {string} keyPath
			 * @return {string|null}
			 */
			return ( keyPath ) => {
				let call = hybridToCanonical( this.getZObjectByKeyPath( keyPath.split( '.' ) ) );
				if (
					!call ||
					typeof call !== 'object' ||
					call[ Constants.Z_OBJECT_TYPE ] !== Constants.Z_FUNCTION_CALL
				) {
					return null;
				}

				// The link opens the function page, so the function must be a reference.
				// An empty reference means that the editor did not choose a function yet.
				const functionZid = call[ Constants.Z_FUNCTION_CALL_FUNCTION ];
				if ( typeof functionZid !== 'string' || !isValidZidFormat( functionZid ) ) {
					return null;
				}

				const isArgReference = ( node, key ) => (
					( Constants.Z_ARGUMENT_REFERENCE_KEY in node ) &&
					( node[ Constants.Z_ARGUMENT_REFERENCE_KEY ] === key )
				);

				// Replace Z18(Z825K1) with a Wikidata item reference to the article QID
				call = walkAndTransformZObject(
					call,
					( node ) => isArgReference( node, Constants.Z_ABSTRACT_RENDER_FUNCTION_QID ),
					() => ( {
						[ Constants.Z_OBJECT_TYPE ]: Constants.Z_WIKIDATA_REFERENCE_ITEM,
						[ Constants.Z_WIKIDATA_REFERENCE_ITEM_ID ]: this.getAbstractWikiId
					} )
				);

				// Replace Z18(Z825K2) with the preview language
				call = walkAndTransformZObject(
					call,
					( node ) => isArgReference( node, Constants.Z_ABSTRACT_RENDER_FUNCTION_LANGUAGE ),
					() => this.getPreviewLanguageZid
				);

				// Replace Z18(Z825K3) with a call to the date parser with the date of today
				const today = new Date().toISOString().slice( 0, 10 );
				call = walkAndTransformZObject(
					call,
					( node ) => isArgReference( node, Constants.Z_ABSTRACT_RENDER_FUNCTION_DATE ),
					() => createParserCall( {
						parserZid: Constants.Z_DATE_PARSER,
						zobject: today,
						zlang: this.getPreviewLanguageZid
					} )
				);

				// Wikifunctions cannot resolve the argument references that stay,
				// for example an empty one or one to a key other than Z825K1-K3.
				if ( hasArgumentReference( call ) ) {
					return null;
				}

				const url = generateViewUrl( {
					langCode: this.getUserLangCode,
					zid: functionZid,
					params: { call: JSON.stringify( call ) }
				} );

				// The servers reject URLs that are too long (T439078)
				return url.length <= Constants.URL_CHARS_MAX ? url : null;
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
		 * Returns the keyPath of the selected fragment
		 *
		 * @param {Object} state
		 * @return {string|undefined}
		 */
		getSelectedFragment: function ( state ) {
			return state.selection;
		},
		/**
		 * Returns the array with suggested html functions
		 *
		 * @param {Object} state
		 * @return {Array}
		 */
		getSuggestedHtmlFunctions: function ( state ) {
			return state.suggestedHtmlFunctions;
		},
		/**
		 * Given a section Qid and a language Zid, returns how many fragments
		 * are either missing or returned a pending state.
		 *
		 * @param {Object} state
		 * @return {Function}
		 */
		getPendingCount: function ( state ) {
			/**
			 * @param {string} sectionQid
			 * @param {string} language
			 * @return {number}
			 */
			return ( sectionQid, language ) => {
				const hashes = state.sectionHashes[ sectionQid ] || [];

				// No fragments, not pending
				if ( hashes.length === 0 ) {
					return false;
				}

				// Filter pending (or missing) fragments
				const pending = hashes.filter( ( hash ) => {
					const fragmentKey = `${ hash }:${ language }`;
					const fragment = state.fragments[ fragmentKey ];
					return !fragment || fragment.isPending;
				} );

				return pending.length;
			};
		},
		/**
		 * Given a section Qid and a language Zid, returns true if any of the
		 * section fragments is either missing or returned a pending state.
		 *
		 * @return {Function}
		 */
		isSectionPending: function () {
			/**
			 * @param {string} sectionQid
			 * @param {string} language
			 * @return {boolean}
			 */
			return ( sectionQid, language ) => this.getPendingCount( sectionQid, language ) > 0;
		},
		/**
		 * @param {Object} state
		 * @return {Function}
		 */
		isLanguageSeen: function ( state ) {
			/**
			 * @param {string} language
			 * @return {boolean}
			 */
			return ( language ) => Object.keys( state.fragments )
				.some( ( key ) => key.split( ':' )[ 1 ] === language );
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
		 * Sets the revision Id of the displayed Abstract Wiki content
		 *
		 * @param {number|undefined} revisionId
		 */
		setAbstractWikiRevisionId: function ( revisionId ) {
			this.revisionId = revisionId;
		},
		/**
		 * @param {string} sectionQid
		 * @param {Array} sectionHashes
		 */
		setAbstractSectionHashes: function ( sectionQid, sectionHashes ) {
			this.sectionHashes[ sectionQid ] = sectionHashes;
		},
		/**
		 * Targetted setter for sectionQid,hashIndex with the new fragmentHash
		 *
		 * @param {string} sectionQid
		 * @param {number} hashIndex
		 * @param {string} fragmentHash
		 */
		setAbstractFragmentHash: function ( sectionQid, hashIndex, fragmentHash ) {
			if ( !this.sectionHashes[ sectionQid ] ) {
				this.sectionHashes[ sectionQid ] = [];
			}
			this.sectionHashes[ sectionQid ][ hashIndex ] = fragmentHash;
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
			const { content: wikilambdaContent, title } = this.getWikilambdaConfig;
			const content = JSON.parse( wikilambdaContent );

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
			this.setAbstractWikiId( title );

			const displayedRevision = mw.config.get( 'wgRevisionId' );
			const currentRevision = mw.config.get( 'wgCurRevisionId' );
			this.setAbstractWikiRevisionId(
				( displayedRevision && displayedRevision !== currentRevision ) ? displayedRevision : undefined
			);

			// Initialize hashes for all fragments for all sections
			const hashPromises = [];
			for ( const qid in content[ Constants.ABSTRACT_WIKI_SECTIONS ] ) {
				const section = content[ Constants.ABSTRACT_WIKI_SECTIONS ][ qid ];
				const fragments = section[ Constants.ABSTRACT_WIKI_SECTION_FRAGMENTS ].slice( 1 );
				const fragmentHashPromises = fragments.map( ( fragment ) => (
					sha256( JSON.stringify( stabilize( fragment ) ) ) ) );
				const sectionHashPromise = Promise.all( fragmentHashPromises ).then( ( hashes ) => {
					this.setAbstractSectionHashes( qid, hashes );
				} );
				hashPromises.push( sectionHashPromise );
			}

			// Initialize suggested fragment functions. Configured via CommunityConfiguration
			// (see MediaWiki:AbstractWikiSuggestedWikifunctions.json; T394410) and exposed
			// server-side in onMakeGlobalVariablesScript. The schema pattern-validates each
			// entry at save time; the filter here is defence in depth.
			const suggestedZids = ( mw.config.get( 'wgWikiLambdaAbstractSuggestions' ) || [] )
				.filter( ( item ) => isValidZidFormat( item ) );
			this.setSuggestedHtmlFunctions( suggestedZids );

			// Prefetch mentioned zids in content (async)
			const zids = extractZIDs( content );
			this.fetchZids( { zids: [ ...zids, ...suggestedZids ] } );

			// Prefetch mentioned qids in content (async);
			// if creating a new Abstract Article, also the page title qid
			const qids = extractWikidataItemIds( content );
			if ( isWikidataQid( title ) ) {
				qids.push( title );
			}
			this.fetchItems( { ids: [ ... new Set( qids ) ] } );

			// Set page as initialized when all the hashing is done
			return Promise.all( hashPromises ).then( () => {
				this.setInitialized( true );
			} );
		},
		/**
		 * Validates the current Abstract Wiki content before submission.
		 * Does not stop publish, but shows error states for empty references,
		 * giving the editor the chance of fixing them, but allowing publish
		 * in case the issues are unrelated to the current changes.
		 *
		 * Checks:
		 * * Abstract content does not have any empty references
		 *
		 * @return {boolean}
		 */
		validateAbstractWikiContent: function () {
			// Check for empty Z9K1 references, display as error, fail validation
			const emptyReferences = this.getEmptyReferencesKeyPaths( Constants.STORED_OBJECTS.ABSTRACT );
			emptyReferences.forEach( ( keyPath ) => {
				this.setError( {
					errorId: keyPath,
					errorMessageKey: 'wikilambda-empty-reference-warning',
					errorType: Constants.ERROR_TYPES.ERROR
				} );
			} );

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

		// Section processing
		// ==================

		/**
		 * Returns the subset of fragment keys and fragments that still need
		 * to be requested. In view mode, returns all keys with no fragments
		 * (the server uses persisted data). In edit mode, skips fragments
		 * that are already fully retrieved.
		 *
		 * @param {Array} keys
		 * @param {Array} fragments
		 * @param {string} language
		 * @return {Array} tuple of [ neededKeys, neededFragments ]
		 */
		onlyNeededFragments: function ( keys, fragments, language ) {
			// For view mode, we query without fragments and keep all
			// original keys
			if ( this.getViewMode ) {
				return [ keys, undefined ];
			}

			// For edit mode, if the language was never seen, we return everything (canonicalized)
			if ( !this.isLanguageSeen( language ) ) {
				return [ keys, fragments.map( ( f ) => hybridToCanonical( f ) ) ];
			}

			const neededKeys = [];
			const neededFragments = [];

			// For every key, if the fragment doesnt exist or is pending, mark it as needed
			keys.forEach( ( key, index ) => {
				if ( !this.fragments[ key ] || this.fragments[ key ].isPending ) {
					neededKeys.push( key );
					neededFragments.push( hybridToCanonical( fragments[ index ] ) );
				}
			} );

			return [ neededKeys, neededFragments ];
		},
		/**
		 * Fetches all the fragments for a given topic/section/language in their current
		 * stored state (success, failure, or pending).
		 *
		 * @param {Object} payload
		 * @param {string} payload.topic
		 * @param {string} payload.section
		 * @param {string} payload.sectionPath
		 * @param {Array} payload.fragments
		 * @param {Object} payload.fragmentHashes
		 * @param {string} payload.language
		 * @return {Promise}
		 */
		fetchSectionPreview: async function ( payload ) {
			const { section, language, fragments = [], fragmentHashes = [] } = payload;

			// If we are in view mode and the language is already fully fetched, do nothing
			if ( this.getViewMode &&
				this.isLanguageSeen( language ) &&
				!this.isSectionPending( section, language )
			) {
				return;
			}

			// Get only the stuff we need to get
			const fragmentKeys = fragmentHashes.map( ( hash ) => `${ hash }:${ language }` );
			const [ neededKeys, neededFragments ] = this.onlyNeededFragments( fragmentKeys, fragments, language );

			// If after the filtering we are down to nothing, exit early
			if ( neededKeys.length === 0 ) {
				return;
			}

			// The API takes the fragments in the same order as the keys, so keep
			// the pair together: the helper decides which keys the request sends.
			const fragmentByKey = new Map();
			neededKeys.forEach( ( key, index ) => {
				fragmentByKey.set( key, neededFragments ? neededFragments[ index ] : undefined );
			} );

			return storeUtils.doDeduplicatedBatchFetch( {
				inFlight: this.fragmentPromises,
				keys: neededKeys,
				// No `getCached`: `onlyNeededFragments` has already left out the
				// fragments which need no request. No `setCached` either: the
				// response goes to `processFragmentResponse`, which keeps the
				// state of each fragment, not one value per key.
				run: ( keysToFetch ) => this.requestSectionPreview( {
					topic: payload.topic,
					section,
					sectionPath: payload.sectionPath,
					language,
					// View mode sends no fragments and gets all of the section back,
					// so the keys must match all of them.
					keys: neededFragments ? keysToFetch : neededKeys,
					fragments: neededFragments ?
						keysToFetch.map( ( key ) => fragmentByKey.get( key ) ) :
						undefined
				} )
			} );
		},

		/**
		 * Asks the API for one set of section fragments and stores what comes
		 * back. Call `fetchSectionPreview`, not this action: this one does not
		 * remove the duplicate requests.
		 *
		 * @param {Object} payload
		 * @param {string} payload.topic
		 * @param {string} payload.section
		 * @param {string} payload.sectionPath
		 * @param {string} payload.language
		 * @param {Array} payload.keys Fragment keys to request
		 * @param {Array|undefined} payload.fragments Fragments to request, in the order of `keys`
		 * @return {Promise}
		 */
		requestSectionPreview: function ( payload ) {
			const { section, keys } = payload;

			// Set fragments as loading, without overwriting whatever data is available
			keys.forEach( ( key ) => {
				if ( !this.fragments[ key ] ) {
					this.fragments[ key ] = { isLoading: true, unavailableRetryCount: 0 };
				} else if ( this.fragments[ key ].isPending ) {
					this.fragments[ key ].isLoading = true;
				}
			} );

			// One event for each section render that reaches the API. It is the
			// denominator for the rate of fragment failures below.
			eventLogUtils.submitInteraction( 'preview', this.getInteractionData, 'section_render' );

			return fetchAbstractWikiSection( {
				topic: payload.topic,
				section,
				language: payload.language,
				fragments: payload.fragments ? JSON.stringify( payload.fragments ) : undefined,
				revision: payload.fragments ? undefined : this.getAbstractWikiRevisionId
			} ).then( ( data ) => {
				// renderedFragments must have the same length as fragments
				const renderedFragments = data[ section ] || [];
				if ( keys.length !== renderedFragments.length ) {
					this.setError( {
						errorId: payload.sectionPath,
						errorType: Constants.ERROR_TYPES.ERROR,
						errorMessageKey: 'apierror-abstractwiki_fetch_section-bad-fragments'
					} );
					return;
				}

				// Iterate over all fragment calls and send to processFragmentResponse
				keys.forEach( ( fragmentKey, index ) => {
					this.processFragmentResponse( fragmentKey, renderedFragments[ index ] );
				} );

			} ).catch( ( /* ApiError */ error ) => {
				this.setError( {
					errorId: payload.sectionPath,
					errorType: Constants.ERROR_TYPES.ERROR,
					errorMessage: error.message
				} );

			} ).finally( () => {
				// Unset all isLoading (if any was left due to api error)
				keys.forEach( ( fragmentKey ) => {
					this.fragments[ fragmentKey ].isLoading = false;
				} );
			} );
		},

		/**
		 * Processes all the possible fragment values received from both the
		 * abstractwiki_fetch_section and abstractwiki_run_fragment APIs.
		 * The possible fragment values are:
		 * * Success:
		 *   - success: true
		 *   - value: html blob
		 * * Pending:
		 *   - success: true
		 *   - pending: true
		 *   - value: pending html blob
		 * * Error:
		 *   - success: false
		 *   - value:
		 *     - msg: apierror-abstractwiki_run_fragment-returned-zerror
		 *     - httpStatusCode: 400
		 *     - zerror: { ... }
		 *     - params: [ 'Z528' ]
		 *
		 * An error because the rendering service is busy (HTTP 429 or 503) shows a
		 * notice instead, and the fragment component requests the fragment again later,
		 * until the server has rendered it. The error shows only when no retries are left.
		 *
		 * @param {string} fragmentKey
		 * @param {Object} result
		 * @param {Function} job
		 */
		processFragmentResponse: function ( fragmentKey, result, job = null ) {
			// Extract language from fragmentKey (hash:language)
			const language = fragmentKey.split( ':' )[ 1 ];

			// Initialize payload for the setter
			const fragmentPayload = { language };

			const fragmentStatus = this.fragments[ fragmentKey ];

			// A fragment waits for a busy rendering service (e.g. rate limits) when it failed for
			// that reason, or when it is still pending after that (the server job is not done yet).
			const isUnavailableFragmentPending = !!result &&
				!!result.pending &&
				!!fragmentStatus &&
				!!fragmentStatus.isUnavailable;
			const isWaitingForService = isUnavailableFragmentFailure( result ) || isUnavailableFragmentPending;
			// If reached max retries, the branches below show the result
			const noUnavailableRetry = !fragmentStatus ||
				fragmentStatus.unavailableRetryCount === undefined ||
				fragmentStatus.unavailableRetryCount >= MAX_UNAVAILABLE_FRAGMENT_RETRIES;

			if ( isWaitingForService && !noUnavailableRetry ) {
				// Handle fragment that waits for a busy rendering service:
				// ========================================================
				// Show a notice. The fragment component requests the fragment again later.
				fragmentPayload.isUnavailable = true;
				fragmentPayload.error = {
					type: Constants.ERROR_TYPES.NOTICE,
					code: 'wikilambda-abstract-preview-fragment-unavailable',
					params: [ mw.language.convertNumber( Constants.UNAVAILABLE_FRAGMENT_RETRY_MINUTES ) ],
					retry: false
				};

			} else if ( result && result.pending ) {
				// Handle pending fragment:
				// ========================
				// Queue retry if possible

				// If reached max retries or no job to queue, set fragment as pending and stop trying.
				// A fragment that waits for a busy service is at its retry limit here: no back-off.
				const noRetry = !job || !fragmentStatus || fragmentStatus.retryCount === undefined ||
					!!fragmentStatus.isUnavailable;
				if ( noRetry || ++fragmentStatus.retryCount >= MAX_FRAGMENT_RETRIES ) {
					fragmentPayload.isPending = true;
					eventLogUtils.submitInteraction( 'preview', this.getInteractionData, 'fragment_pending' );
				} else {
					// Else, queue retry with exponential backoff to avoid stampeding
					// the server. retryCount has just been incremented, so the first
					// retry (retryCount === 1) waits INITIAL_RETRY_DELAY, the second
					// waits INITIAL_RETRY_DELAY * RETRY_BACKOFF_FACTOR, and so on.
					const backoffDelay = INITIAL_RETRY_DELAY *
						Math.pow( RETRY_BACKOFF_FACTOR, fragmentStatus.retryCount - 1 );

					setTimeout( () => {
						this.enqueueFragmentPreview( job );
					}, backoffDelay );
					// After retry is queued, we exit without running the setter
					return;
				}

			} else if ( result && result.success ) {
				// Handle successful fragment:
				// ==========================
				fragmentPayload.html = result.value;
				fragmentPayload.isPending = false;

			} else {
				// Handle failed fragment:
				// =======================
				// This handler a fragment with success=false and stored failure information.
				// In case the error comes from a different layer (e.g. API failure), it should
				// be handled in the request catch blocks.
				const error = { type: Constants.ERROR_TYPES.ERROR, retry: false };

				if ( result && result.value && result.value.msg ) {
					// Predictable fragment failure information contains msg and params with zid
					error.code = result.value.msg;
					error.zerror = result.value.zerror;
					error.zid = ( Array.isArray( result.value.params ) && result.value.params[ 0 ] ) ?
						result.value.params[ 0 ] : '';
					// Fetch in case it's a zid;
					// fetchZids discards the item if not valid, so no need to guard here
					this.fetchZids( { zids: [ error.zid ] } );
				} else {
					// Undefined error message if no msg provided:
					error.text = mw.message( 'apierror-abstractwiki_run_fragment-unknown-error' ).text();
				}

				fragmentPayload.error = error;

				const interactionData = Object.assign( {}, this.getInteractionData, {
					selectedfunctionzid: error.zid || null
				} );
				eventLogUtils.submitInteraction( 'preview', interactionData, 'fragment_failure' );
			}

			// Set final rendered fragment
			this.setRenderedFragment( fragmentKey, fragmentPayload );
		},

		// Fragment processing
		// ===================

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
		 * @param {string} payload.fragmentHash
		 * @param {string} payload.qid
		 * @param {string} payload.language
		 * @param {Object} payload.fragment
		 */
		renderFragmentPreview: function ( payload ) {
			const fragmentKey = `${ payload.fragmentHash }:${ payload.language }`;

			// A section request is already getting this fragment, exit
			if ( this.fragmentPromises.has( fragmentKey ) ) {
				return;
			}

			// Fragment not initialized yet: set initial object for key
			if ( !( fragmentKey in this.fragments ) ) {
				this.fragments[ fragmentKey ] = { retryCount: 0, unavailableRetryCount: 0 };
			}

			const fragmentStatus = this.fragments[ fragmentKey ];

			// If fragment is already generated or request ongoing, exit
			if ( fragmentStatus.isLoading ) {
				return;
			}

			// Else, initiate rendering call
			fragmentStatus.isLoading = true;

			// The user asks for this render with the Retry button, or a changed
			// fragment hash asks for it. The two are not separable here.
			eventLogUtils.submitInteraction( 'preview', this.getInteractionData, 'fragment_render' );

			// Build request job and enqueue it
			const job = () => this.requestFragmentPreview( payload, job );
			this.enqueueFragmentPreview( job );
		},
		/**
		 * @param {Object} payload
		 * @param {string} payload.fragmentHash
		 * @param {string} payload.qid
		 * @param {string} payload.language
		 * @param {Object} payload.fragment
		 * @param {Function} job
		 * @return {Promise}
		 */
		requestFragmentPreview: function ( payload, job ) {
			const { language } = payload;
			const fragmentKey = `${ payload.fragmentHash }:${ language }`;

			// While the fragment waits for a busy service, only read the stored value
			// (async): the server job renders it, and we do not add to the load.
			// Each of these requests is one retry of the fragment.
			const fragmentStatus = this.fragments[ fragmentKey ];
			const isUnavailable = !!fragmentStatus && !!fragmentStatus.isUnavailable;
			if ( isUnavailable ) {
				fragmentStatus.unavailableRetryCount++;
			}

			return runAbstractWikiFragment( {
				language,
				qid: payload.qid,
				fragment: payload.fragment,
				async: isUnavailable
			} ).then( ( data ) => {
				// Processes both successful and failed fragments
				this.processFragmentResponse( fragmentKey, data, job );
			} ).catch( ( /* ApiError */ error ) => {
				const errorPayload = {
					type: Constants.ERROR_TYPES.ERROR,
					retry: ( error.httpStatus === 500 || error.httpStatus === 503 ),
					text: error.messageOrFallback( 'apierror-abstractwiki_run_fragment-unknown-error' )
				};
				this.setRenderedFragment( fragmentKey, { error: errorPayload } );
			} );
		},

		/**
		 * Save fragment rendered output and dirty/loading status in the state
		 *
		 * @param {string} key
		 * @param {Object} payload
		 * @param {string|undefined} payload.html
		 * @param {boolean|undefined} payload.isPending
		 * @param {boolean|undefined} payload.isLoading
		 * @param {boolean|undefined} payload.isUnavailable
		 * @param {Object|undefined} payload.error
		 * @param {string|null} payload.error.text
		 * @param {string|null} payload.error.code
		 * @param {Array|undefined} payload.error.params i18n message parameters for the code
		 * @param {string|null} payload.error.zid
		 * @param {string|null} payload.error.type
		 */
		setRenderedFragment: function ( key, payload ) {
			const { html = '', error, isLoading = false, isPending = false, isUnavailable = false } = payload;

			// Initialize payload if it doesn't exist
			if ( !( key in this.fragments ) ) {
				this.fragments[ key ] = { retryCount: 0, unavailableRetryCount: 0 };
			}

			this.fragments[ key ].error = error || null;
			this.fragments[ key ].html = !error ? html : '';

			this.fragments[ key ].isPending = isPending;
			this.fragments[ key ].isLoading = isLoading;
			this.fragments[ key ].hasError = !!error;
			this.fragments[ key ].isUnavailable = isUnavailable;
		},
		/**
		 * Inserts a blank or given hash into the sectionHashes structure
		 * for a given fragment keyPath. The fragment index in the path is
		 * padded by the benjamin item, while the elements in the hash array
		 * aren't; so the fragment with the path ended in `fragments.2`
		 * corresponds to the second fragment, and hence second hash in the list
		 * (index=1).
		 *
		 * E.g. When given the keyPath `abstractwiki.sections.Q1.fragments.2`
		 * It will insert a given or blank element at sectionHashes[ 'Q1' ][ 1 ]
		 *
		 * @param {string} keyPath
		 * @param {string|undefined} hash
		 */
		insertHashAtKeyPath: function ( keyPath, hash = null ) {
			const parts = keyPath.split( '.' );
			const sectionQid = parts[ 2 ];
			// index in the path is benjamin-padded, decrement for the hash index:
			const index = parseInt( parts[ parts.length - 1 ] ) - 1;

			// Initialize hashes for this section if they don't exist
			if ( !this.sectionHashes[ sectionQid ] ) {
				this.sectionHashes[ sectionQid ] = [];
			}
			this.sectionHashes[ sectionQid ].splice( index, 0, hash );
		},
		/**
		 * Removes a hash from the sectionHashes structure for a given fragment keyPath.
		 *
		 * E.g. When given the keyPath `abstractwiki.sections.Q1.fragments.2`
		 * It will remove the element at sectionHashes[ 'Q1' ][ 1 ] and shift
		 *
		 * @param {string} keyPath
		 */
		deleteHashAtKeyPath: function ( keyPath ) {
			const parts = keyPath.split( '.' );
			const sectionQid = parts[ 2 ];
			const index = parseInt( parts[ parts.length - 1 ] ) - 1;

			if ( !this.sectionHashes[ sectionQid ] ) {
				return;
			}
			this.sectionHashes[ sectionQid ].splice( index, 1 );
		},
		/**
		 * Swaps a hash in the sectionHashes structure with the adjacent
		 * element at the given offset.
		 *
		 * E.g. When given the keyPath `abstractwiki.sections.Q1.fragments.2`
		 * and offset -1, it will swap sectionHashes[ 'Q1' ][ 1 ] with [ 0 ]
		 *
		 * @param {string} keyPath
		 * @param {number} offset -1 or 1
		 */
		swapHashAtKeyPath: function ( keyPath, offset ) {
			const parts = keyPath.split( '.' );
			const sectionQid = parts[ 2 ];
			const index = parseInt( parts[ parts.length - 1 ] ) - 1;
			const hashes = this.sectionHashes[ sectionQid ];

			if ( !hashes ) {
				return;
			}

			const swapIndex = index + offset;
			if ( swapIndex < 0 || swapIndex >= hashes.length ) {
				return;
			}

			[ hashes[ index ], hashes[ swapIndex ] ] = [ hashes[ swapIndex ], hashes[ index ] ];
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
		 * Set a given fragment keyPath as selected. Pass undefined to clear
		 * the selection.
		 *
		 * @param {string|undefined} keyPath
		 */
		setSelectedFragment: function ( keyPath ) {
			this.selection = keyPath;
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
