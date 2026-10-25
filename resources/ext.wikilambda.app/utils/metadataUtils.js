/**
 * WikiLambda Vue editor: Metadata dialog configuration and value transform utilities
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../Constants.js' );
const { isWikidataEntityId } = require( './wikidataUtils.js' );
const DateFormatter = require( 'mediawiki.DateFormatter' );

const metadataUtils = {
	/**
	 * Metadata keys configuration for the Metadata Dialog component.
	 * Defines how the information should be structured and transformed.
	 */
	metadataKeys: {
		errors: {
			title: 'wikilambda-functioncall-metadata-errors',
			description: 'getErrorSummary',
			open: true,
			keys: [
				{ key: 'errors', title: 'wikilambda-functioncall-metadata-errors-summary', transform: 'getErrorType' },
				{ key: 'errors', title: 'wikilambda-functioncall-metadata-errors-message', transform: 'getErrorMessage' },
				{ key: 'errors', title: 'wikilambda-functioncall-metadata-errors-args', transform: 'getErrorStringArgs' },
				{ key: 'errors', title: 'wikilambda-functioncall-metadata-errors-children', transform: 'getErrorChildren' },
				{ key: 'validateErrors', title: 'wikilambda-functioncall-metadata-validator-errors-summary', transform: 'getErrorType' },
				{ key: 'expectedTestResult', title: 'wikilambda-functioncall-metadata-expected-result', transform: 'getTestResultValue' },
				{ key: 'actualTestResult', title: 'wikilambda-functioncall-metadata-actual-result', transform: 'getTestResultValue' },
				{ key: 'executorDebugLogs', title: 'wikilambda-functioncall-metadata-execution-debug-logs', transform: 'getDebugLogs' }
			]
		},
		warnings: {
			title: 'wikilambda-functioncall-metadata-warnings',
			description: 'getWarningsSummary',
			open: true,
			keys: [
				{ key: 'warnings', title: 'wikilambda-functioncall-metadata-warnings-list', transform: 'getWarningsList' }
			]
		},
		implementation: {
			title: 'wikilambda-functioncall-metadata-implementation',
			description: 'getImplementationSummary',
			keys: [
				{ key: 'implementationId', title: 'wikilambda-functioncall-metadata-implementation-name', transform: 'getImplementationLink' },
				{ key: 'implementationId', title: 'wikilambda-functioncall-metadata-implementation-id', transform: 'getStringValue' },
				{ key: 'implementationType', title: 'wikilambda-functioncall-metadata-implementation-type' }
			],
			link: 'getImplementationHelpLink'
		},
		functionCalls: {
			title: 'wikilambda-functioncall-metadata-function-calls',
			description: 'getFunctionCallsSummary',
			keys: [
				{ key: 'functionCallCounts', title: 'wikilambda-functioncall-metadata-function-calls-most-called', transform: 'getDebugLogs' },
				{ key: 'functionCallPairCounts', title: 'wikilambda-functioncall-metadata-function-calls-pairs', transform: 'getDebugLogs' },
				{ key: 'functionCallTotal', title: 'wikilambda-functioncall-metadata-function-calls-total' },
				{ key: 'functionCallDistinctFunctions', title: 'wikilambda-functioncall-metadata-function-calls-distinct-functions' }
			]
		},
		caching: {
			title: 'wikilambda-functioncall-metadata-caching',
			description: 'getCachingSummary',
			keys: [
				{ key: 'functionCallCachedOn', title: 'wikilambda-functioncall-metadata-cache-stored', transform: 'toRelativeTime' },
				{ key: 'functionCallFreshResult', title: 'wikilambda-functioncall-metadata-cache-fresh', transform: 'toRelativeTime' },
				{ key: 'testCallCachedOn', title: 'wikilambda-functioncall-metadata-cache-test-call-stored', transform: 'toRelativeTime' },
				{ key: 'validationCallCachedOn', title: 'wikilambda-functioncall-metadata-cache-test-validation-stored', transform: 'toRelativeTime' },
				{ key: 'testResultCachedOn', title: 'wikilambda-functioncall-metadata-cache-test-result-stored', transform: 'toRelativeTime' },
				{ key: 'testResultCacheKey', title: 'wikilambda-functioncall-metadata-cache-test-result-key', transform: 'getLinksOfTestKey' },
				{ key: 'cachedWikidataEntities', title: 'wikilambda-functioncall-metadata-cache-wikidata-entities', transform: 'getListOfWikidataIds' }
			],
			action: 'getFreshenResultButton',
			link: 'getFreshenHelpLink'
		},
		duration: {
			title: 'wikilambda-functioncall-metadata-duration',
			description: 'getDurationSummary',
			sections: [ {
				title: 'wikilambda-functioncall-metadata-orchestration',
				keys: [
					{ key: 'orchestrationDuration', title: 'wikilambda-functioncall-metadata-duration' },
					{ key: 'orchestrationStartTime', title: 'wikilambda-functioncall-metadata-start-time', transform: 'toRelativeTime' },
					{ key: 'orchestrationEndTime', title: 'wikilambda-functioncall-metadata-end-time', transform: 'toRelativeTime' }
				]
			}, {
				title: 'wikilambda-functioncall-metadata-evaluation',
				keys: [
					{ key: 'evaluationDuration', title: 'wikilambda-functioncall-metadata-duration' },
					{ key: 'evaluationStartTime', title: 'wikilambda-functioncall-metadata-start-time', transform: 'toRelativeTime' },
					{ key: 'evaluationEndTime', title: 'wikilambda-functioncall-metadata-end-time', transform: 'toRelativeTime' }
				]
			} ]
		},
		cpu: {
			title: 'wikilambda-functioncall-metadata-cpu-usage',
			description: 'getCpuUsageSummary',
			keys: [
				{ key: 'orchestrationCpuUsage', title: 'wikilambda-functioncall-metadata-orchestration' },
				{ key: 'evaluationCpuUsage', title: 'wikilambda-functioncall-metadata-evaluation' },
				{ key: 'executionCpuUsage', title: 'wikilambda-functioncall-metadata-execution' }
			]
		},
		memory: {
			title: 'wikilambda-functioncall-metadata-memory-usage',
			description: 'getMemoryUsageSummary',
			keys: [
				{ key: 'orchestrationMemoryUsage', title: 'wikilambda-functioncall-metadata-orchestration' },
				{ key: 'evaluationMemoryUsage', title: 'wikilambda-functioncall-metadata-evaluation' },
				{ key: 'executionMemoryUsage', title: 'wikilambda-functioncall-metadata-execution' }
			]
		},
		server: {
			title: 'wikilambda-functioncall-metadata-hostname',
			keys: [
				{ key: 'orchestrationHostname', title: 'wikilambda-functioncall-metadata-orchestration' },
				{ key: 'evaluationHostname', title: 'wikilambda-functioncall-metadata-evaluation' }
			]
		},
		programmingLanguage: {
			title: 'wikilambda-functioncall-metadata-programming-language',
			keys: [
				{ key: 'programmingLanguageVersion', title: 'wikilambda-functioncall-metadata-programming-language-version' }
			]
		}
	},

	// Transform functions
	// ===================
	// Shared by the metadata dialog and other displays of metadata values.

	/**
	 * Transform method.
	 * Given a mixed type value returns a string
	 * either by returning its Z6K1, or strigifying it
	 *
	 * @param {Mixed} value
	 * @return {string}
	 */
	getStringValue: function ( value ) {
		if ( typeof value === 'string' ) {
			return value;
		}
		if ( ( typeof value === 'object' ) && ( value[ Constants.Z_STRING_VALUE ] ) ) {
			return value[ Constants.Z_STRING_VALUE ];
		}
		return JSON.stringify( value );
	},

	/**
	 * Transform method.
	 * Attempts to render a relative timestamp given a
	 * datetime string in ISO 8601 format
	 *
	 * @param {string} input
	 * @return {Object}
	 */
	toRelativeTime: function ( input ) {
		const date = new Date( input );
		const isValidDate = !Number.isNaN( date.getTime() );
		const value = isValidDate ?
			DateFormatter.formatRelativeTimeOrDate( date ) :
			input;

		return {
			type: Constants.METADATA_CONTENT_TYPE.TEXT,
			value
		};
	},

	/**
	 * Transform method.
	 * Returns a list of Wikidata item Qids.
	 *
	 * The URL builders are passed in by the caller (usually the store's
	 * getItemUrl, getLexemeUrl, getPropertyUrl, getLexemeFormUrl and
	 * getLexemeSenseUrl), keyed by the first letter of each part of an ID:
	 * Q, L, P, LF (e.g. L1-F2) and LS (e.g. L1-S2).
	 *
	 * @param {Array} value
	 * @param {Object.<string, Function>} urlGetters
	 * @return {Object|string}
	 */
	getListOfIds: function ( value, urlGetters ) {
		if ( !Array.isArray( value ) ) {
			return metadataUtils.getStringValue( value );
		}
		// Remove benjamin item and make sure all items are Wikidata entities
		const qids = value.slice( 1 ).filter( ( id ) => isWikidataEntityId( id ) );
		// Convert items to links
		const links = qids.map( ( id ) => {
			// Key by the first letter of each part of the ID (e.g. L1-F2 url getter keyed by LF)
			const buildUrlFor = urlGetters[ id.split( '-' ).map( ( part ) => part[ 0 ] ).join( '' ) ];
			const href = buildUrlFor ? buildUrlFor( id ) : null;
			return href ?
				`<a href="${ href }" target="_blank">${ id }</a>` :
				`<span>${ id }</span>`;
		} );
		return {
			type: Constants.METADATA_CONTENT_TYPE.HTML,
			value: `<span>${ links.join( ', ' ) }</span>`
		};
	}
};

module.exports = metadataUtils;
