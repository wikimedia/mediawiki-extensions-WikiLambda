/*!
 * WikiLambda Vector 2022 search integration for Abstract Wikipedia mode
 * Searches Wikidata entities (QIDs) via Wikidata wbsearchentities API
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
( function ( mw ) {

	'use strict';

	const utils = require( './utils.js' );

	// Constants
	const WIKIDATA_BASE_URL = 'https://www.wikidata.org';
	const ABSTRACT_SUPPORTING_TEXT = '- AW';
	const QID_PATTERN = /^Q[1-9]\d*$/;
	const DEFAULT_LIMIT = 10;
	const DEFAULT_SHOW_DESCRIPTION = true;

	/**
	 * Search request context derived from configuration and request language.
	 *
	 * @memberof module:ext.wikilambda.search
	 * @typedef {Object} SearchContext
	 * @property {string} namespace Abstract Wikipedia namespace (may be empty)
	 * @property {string} language Request language code
	 * @property {boolean} showDescription Whether descriptions are enabled
	 */

	// Title & URL helpers
	/**
	 * Build a full page title from namespace and QID for the abstract wiki.
	 *
	 * @param {Object} options
	 * @param {string} options.namespace Namespace name
	 * @param {string} options.qid QID (e.g. "Q42")
	 * @return {string} Full title (e.g. "Abstract_Wikipedia:Q42")
	 */
	function buildAbstractWikiTitle( { namespace, qid } ) {
		return namespace ? `${ namespace }:${ qid }` : qid;
	}

	/**
	 * Extract the QID from a page title, including namespaced titles.
	 *
	 * @param {string} title Page title (e.g. "Abstract_Wikipedia:Q42" or "Q42")
	 * @return {string|null} QID if valid, null otherwise
	 */
	function extractQidFromTitle( title ) {
		const parts = String( title || '' ).split( ':' );
		const qid = parts[ parts.length - 1 ];
		return QID_PATTERN.test( qid ) ? qid : null;
	}

	/**
	 * Build the URL for a Wikidata entity (view page or create-abstract special).
	 *
	 * @param {Object} options
	 * @param {string} options.qid Entity QID
	 * @param {boolean} options.hasAbstractContent Whether abstract content exists
	 * @param {SearchContext} options.context Search context
	 * @return {string} URL for the entity
	 */
	function buildEntityUrl( { qid, hasAbstractContent, context } ) {
		if ( hasAbstractContent ) {
			const title = buildAbstractWikiTitle( { namespace: context.namespace, qid } );
			return utils.buildViewUrl( context.language, title );
		}
		return `/wiki/Special:CreateAbstract/${ qid }`;
	}

	/**
	 * @return {mw.ForeignApi}
	 */
	function newWikidataApi() {
		return new mw.ForeignApi( `${ WIKIDATA_BASE_URL }/w/api.php`, { anonymous: true } );
	}

	/**
	 * Run wbsearchentities against Wikidata via mw.ForeignApi (proper origin / auth handling).
	 *
	 * @param {Object} options
	 * @param {string} options.query Search query
	 * @param {string} options.language Language code
	 * @param {number} options.limit Result limit
	 * @param {number|null} [options.offset] Continue offset
	 * @param {AbortSignal} options.signal Abort signal
	 * @return {Promise<{search: Array, searchContinue: number|null}>}
	 */
	function requestWikidataEntitySearch( { query, language, limit, offset, signal } ) {
		const api = newWikidataApi();
		const params = {
			action: 'wbsearchentities',
			format: 'json',
			formatversion: '2',
			language,
			uselang: language,
			search: query,
			type: 'item',
			limit: String( limit ),
			props: 'url|description'
		};
		if ( offset !== null && offset !== undefined ) {
			params.continue = String( offset );
		}
		return api.get( params, { signal } ).then( ( data ) => ( {
			search: data.search || [],
			searchContinue: data[ 'search-continue' ] ? Number( data[ 'search-continue' ] ) : null
		} ) );
	}

	/**
	 * Extract the QID from a single page object in a query response.
	 *
	 * @param {Object} page Page object from action=query&prop=info
	 * @return {string|null}
	 */
	function getQidFromPage( page ) {
		const title = page.title || page.denormalized;
		return extractQidFromTitle( title );
	}

	/**
	 * Extract the set of QIDs that have abstract content from a page-info API response.
	 *
	 * @param {Object} data action=query&prop=info response
	 * @return {Set<string>} QIDs that have abstract content
	 */
	function extractExistingQids( data ) {
		if ( !data.query || !data.query.pages ) {
			return new Set();
		}
		return new Set(
			data.query.pages
				.filter( ( page ) => !page.missing )
				.map( getQidFromPage )
				.filter( ( qid ) => qid !== null )
		);
	}

	/**
	 * Fetch thumbnail URLs for Wikidata entities via action=query&prop=pageimages.
	 *
	 * @param {Object} options
	 * @param {Array<string>} options.qids QIDs to fetch thumbnails for
	 * @param {AbortSignal} options.signal Abort signal
	 * @return {Promise<Map<string, {url: string, width: number, height: number}>>} Map of QID → thumbnail
	 */
	function fetchWikidataThumbnails( { qids, signal } ) {
		const api = newWikidataApi();
		return api.get( {
			action: 'query',
			format: 'json',
			formatversion: '2',
			titles: qids.join( '|' ),
			prop: 'pageimages',
			piprop: 'thumbnail',
			pithumbsize: 50
		}, { signal } ).then( ( data ) => {
			const thumbnailMap = new Map();
			if ( !data.query || !data.query.pages ) {
				return thumbnailMap;
			}
			data.query.pages.forEach( ( page ) => {
				const qid = getQidFromPage( page );
				if ( qid && page.thumbnail && page.thumbnail.source ) {
					thumbnailMap.set( qid, {
						url: page.thumbnail.source,
						width: page.thumbnail.width,
						height: page.thumbnail.height
					} );
				}
			} );
			return thumbnailMap;
		} ).catch( () => new Map() );
	}

	/**
	 * Batch-check which of the given page titles exist via the local API.
	 *
	 * @param {Object} options
	 * @param {Array<string>} options.titles Page titles to check
	 * @param {AbortSignal} options.signal Abort signal
	 * @return {Promise<Set<string>>} QIDs that exist locally
	 */
	function fetchPageExistence( { titles, signal } ) {
		const api = new mw.Api();
		return api.get( {
			action: 'query',
			prop: 'info',
			titles: titles.join( '|' ),
			format: 'json',
			formatversion: '2'
		}, { signal } )
			.then( extractExistingQids )
			.catch( () => new Set() );
	}

	// Result transformation
	/**
	 * Turn a single Wikidata entity into a Vector typeahead result object.
	 *
	 * @param {Object} options
	 * @param {Object} options.entity Wikidata entity from wbsearchentities
	 * @param {Set<string>} options.existingQids QIDs that have abstract content
	 * @param {Map<string, Object>} options.thumbnailMap Map of QID → thumbnail data
	 * @param {SearchContext} options.context Search context
	 * @return {Object} Search result for Vector typeahead
	 */
	function transformEntityToResult( { entity, existingQids, thumbnailMap, context } ) {
		const { id: qid, label, description } = entity;
		const renderedLabel = label || qid;
		const hasAbstractContent = existingQids.has( qid );
		const supportingText = hasAbstractContent ? ABSTRACT_SUPPORTING_TEXT : undefined;
		const thumbnail = thumbnailMap.get( qid );

		return {
			value: utils.formatLabelWithId( renderedLabel, qid ),
			match: undefined,
			description: context.showDescription ? ( description || undefined ) : undefined,
			supportingText,
			thumbnail,
			url: buildEntityUrl( { qid, hasAbstractContent, context } )
		};
	}

	/**
	 * Build the full search result payload from Wikidata data and existence info.
	 *
	 * @param {Object} options
	 * @param {Object} options.wikidataData Parsed wbsearchentities response
	 * @param {Set<string>} options.existingQids QIDs with abstract content
	 * @param {Map<string, Object>} options.thumbnailMap Map of QID → thumbnail data
	 * @param {SearchContext} options.context Search context
	 * @param {string} options.query Original search query
	 * @return {{ query: string, results: Array, searchContinue: number|null }}
	 */
	function buildSearchResults( { wikidataData, existingQids, thumbnailMap, context, query } ) {
		const { search, searchContinue } = wikidataData;
		const transform = ( entity ) => transformEntityToResult( {
			entity,
			existingQids,
			thumbnailMap,
			context
		} );
		return utils.buildSearchResultPayload( query, search, searchContinue, transform );
	}

	/**
	 * Run a Wikidata entity search and check which results have abstract content locally.
	 * Returns a fetch promise and an abort function for cancellation.
	 *
	 * @param {Object} options
	 * @param {string} options.query Search query
	 * @param {number} [options.limit=10] Max results
	 * @param {boolean} [options.showDescription=true] Include descriptions
	 * @param {number|null} [options.offset] Pagination offset
	 * @param {string} [options.language] Request language (default from config)
	 * @return {{ fetch: Promise, abort: Function }}
	 */
	function fetchAbstractResults( {
		query,
		limit = DEFAULT_LIMIT,
		showDescription = DEFAULT_SHOW_DESCRIPTION,
		offset = null,
		language = utils.getRequestLanguage()
	} = {} ) {
		const abortController = new AbortController();
		const context = {
			namespace: mw.config.get( 'wgWikiLambdaAbstractPrimaryNamespace' ),
			language,
			showDescription
		};
		const wikidataPromise = requestWikidataEntitySearch( {
			query,
			language,
			limit,
			offset,
			signal: abortController.signal
		} );

		const searchResponsePromise = wikidataPromise.then( ( wikidataData ) => {
			if ( !wikidataData.search || !wikidataData.search.length ) {
				return { query, results: [] };
			}

			const qids = wikidataData.search.map( ( { id: qid } ) => qid );
			const titles = qids.map( ( qid ) => buildAbstractWikiTitle( {
				namespace: context.namespace,
				qid
			} ) );

			return Promise.all( [
				fetchPageExistence( { titles, signal: abortController.signal } ),
				fetchWikidataThumbnails( { qids, signal: abortController.signal } )
			] ).then( ( [ existingQids, thumbnailMap ] ) => buildSearchResults( {
				wikidataData,
				existingQids,
				thumbnailMap,
				context,
				query
			} ) );
		} );

		return {
			fetch: searchResponsePromise,
			abort: () => abortController.abort()
		};
	}

	const vectorSearchClient = utils.createVectorSearchClient( fetchAbstractResults );

	module.exports = {
		vectorSearchClient
	};

}( mw ) );
