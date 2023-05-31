/**
 * WikiLambda Vue editor: portray mixin
 * Mixin with functions to generate HTML that portrays ZObjects,
 * starting from JSON ZObject representation.
 * This HTML is (initially) motivated by the metadata dialog, and is
 * meant to give a compact and readable presentation.
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../Constants.js' );
const getValueFromCanonicalZMap = require( './schemata.js' ).methods.getValueFromCanonicalZMap;
const extractErrorStructure = require( './schemata.js' ).methods.extractErrorStructure;

/**
 * Map from internal key (which appears in the result envelopes returned from backend services)
 * to the internationalization identifier.  We map to an object so as to allow for future
 * inclusion of other attributes.
 */
const knownKeys = new Map( [
	[ 'errors', { i18nId: 'wikilambda-functioncall-metadata-errors-summary' } ],
	[ 'validateErrors', { i18nId: 'wikilambda-functioncall-metadata-validator-errors-summary' } ],
	[ 'actualTestResult', { i18nId: 'wikilambda-functioncall-metadata-actual-result' } ],
	[ 'expectedTestResult', { i18nId: 'wikilambda-functioncall-metadata-expected-result' } ],
	[ 'implementationId', { i18nId: 'wikilambda-functioncall-metadata-implementation-id' } ],
	[ 'implementationType', { i18nId: 'wikilambda-functioncall-metadata-implementation-type' } ],
	[ 'orchestrationStartTime', { i18nId: 'wikilambda-functioncall-metadata-orchestration-start-time' } ],
	[ 'orchestrationEndTime', { i18nId: 'wikilambda-functioncall-metadata-orchestration-end-time' } ],
	[ 'orchestrationDuration', { i18nId: 'wikilambda-functioncall-metadata-orchestration-duration' } ],
	[ 'orchestrationCpuUsage', { i18nId: 'wikilambda-functioncall-metadata-orchestration-cpu-usage' } ],
	[ 'orchestrationMemoryUsage', { i18nId: 'wikilambda-functioncall-metadata-orchestration-memory-usage' } ],
	[ 'orchestrationHostname', { i18nId: 'wikilambda-functioncall-metadata-orchestration-hostname' } ],
	[ 'evaluationStartTime', { i18nId: 'wikilambda-functioncall-metadata-evaluation-start-time' } ],
	[ 'evaluationEndTime', { i18nId: 'wikilambda-functioncall-metadata-evaluation-end-time' } ],
	[ 'evaluationDuration', { i18nId: 'wikilambda-functioncall-metadata-evaluation-duration' } ],
	[ 'evaluationCpuUsage', { i18nId: 'wikilambda-functioncall-metadata-evaluation-cpu-usage' } ],
	[ 'evaluationMemoryUsage', { i18nId: 'wikilambda-functioncall-metadata-evaluation-memory-usage' } ],
	[ 'evaluationHostname', { i18nId: 'wikilambda-functioncall-metadata-evaluation-hostname' } ],
	[ 'executionCpuUsage', { i18nId: 'wikilambda-functioncall-metadata-execution-cpu-usage' } ],
	[ 'executionMemoryUsage', { i18nId: 'wikilambda-functioncall-metadata-execution-memory-usage' } ]
] );

module.exports = exports = {
	methods: {
		maybeStringify: function ( value ) {
			return typeof value === 'string' ? value : JSON.stringify( value );
		},
		/**
		 * Given a function-call metadata map (produced by WikiFunctions backend services),
		 * produce a string that portrays the metadata map content in a compact,
		 * readable style, using raw HTML markup
		 *
		 * @param {Object} zMap a Z883/Typed map, in canonical form
		 * @param {Array} labels
		 * @return {string}
		 */
		portrayMetadataMap: function ( zMap, labels ) {
			var keysUsed = [];
			let html = '<span><ul>';
			// First, portray the known/expected metadata keys and their values
			// If there's no 'errors' value, keyAndZErrorSummary will display 'None'
			html = html + this.keyAndZErrorSummary( zMap, 'errors', labels, keysUsed );
			// With 'validateErrors', we don't want to display 'None', so check here if there's a value
			if ( getValueFromCanonicalZMap( zMap, 'validateErrors' ) ) {
				html = html + this.keyAndZErrorSummary( zMap, 'validateErrors', labels, keysUsed );
			}
			html = html + this.keyAndArbitraryValue( zMap, 'expectedTestResult', keysUsed );
			html = html + this.keyAndArbitraryValue( zMap, 'actualTestResult', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'implementationType', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'implementationId', keysUsed );
			html = html + this.keyAndDatetimeValue( zMap, 'orchestrationStartTime', keysUsed );
			html = html + this.keyAndDatetimeValue( zMap, 'orchestrationEndTime', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'orchestrationDuration', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'orchestrationCpuUsage', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'orchestrationMemoryUsage', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'orchestrationHostname', keysUsed );
			html = html + this.keyAndDatetimeValue( zMap, 'evaluationStartTime', keysUsed );
			html = html + this.keyAndDatetimeValue( zMap, 'evaluationEndTime', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'evaluationDuration', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'evaluationCpuUsage', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'evaluationMemoryUsage', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'evaluationHostname', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'executionCpuUsage', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'executionMemoryUsage', keysUsed );

			// Now portray any top-level zMap entries that weren't already used above
			const k1Array = zMap[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ];
			// Ignore first item in the canonical form array; this is a string representing the type
			for ( let i = 1; i < k1Array.length; i++ ) {
				const entry = k1Array[ i ];
				let key = entry[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ] || entry[ Constants.Z_TYPED_PAIR_TYPE1 ];
				// Allow for keys that correspond to references
				if ( typeof key === 'object' && key[ Constants.Z_OBJECT_TYPE ] === Constants.Z_STRING_VALUE ) {
					key = key[ Constants.Z_STRING_VALUE ];
				}

				if ( keysUsed.includes( key ) ) {
					continue;
				}
				const keyInfo = knownKeys.get( key );
				// Message keys specified in knownKeys above.
				// eslint-disable-next-line mediawiki/msg-doc
				const displayKey = keyInfo ? this.$i18n( keyInfo.i18nId ).text() : key;
				const value = this.maybeStringify( entry[ Constants.Z_TYPED_OBJECT_ELEMENT_2 ] ||
					entry[ Constants.Z_TYPED_PAIR_TYPE2 ] );
				html = html + '<li><b>' + displayKey + ':</b> ' + value + '</li>';
			}

			return html + '</ul></span>';
		},
		/**
		 * Portray the given key and its zMap value, which should be a Z5 / Error object.  The
		 * resulting string is a cursory, bulleted summary of the given Z5.  Each bullet represents
		 * a suberror (instance of Z50) found in the Z5.  Bullets are indented to reflect the
		 * nesting of the sub-errors.
		 *
		 * @param {Object} zMap a Z883/Typed map, in canonical form
		 * @param {string} key
		 * @param {Array} labels
		 * @param {Array} keysUsed any keys used (or checked) here are added to this array
		 * @return {string}
		 */
		keyAndZErrorSummary: function ( zMap, key, labels, keysUsed ) {
			keysUsed.push( key );
			let suberrors;
			const error = getValueFromCanonicalZMap( zMap, key );
			if ( error === undefined ) {
				suberrors = [];
			} else {
				suberrors = extractErrorStructure( error );
			}
			if ( suberrors.length === 0 ) {
				// Display (for English reader): "Errors: none" or "Validator errors: none"
				const i18nKeyForNoErrors = this.$i18n( 'wikilambda-functioncall-metadata-errors', 0 ).text();
				return '<li><b>' + i18nKeyForNoErrors + ':</b> ' +
					this.$i18n( 'wikilambda-functioncall-metadata-errors-none' ).text() + '</li>';
			}
			// The knownKeys keys display "Error summary: ..." or "Validator error summary: ..."
			// eslint-disable-next-line mediawiki/msg-doc
			const i18nKey = this.$i18n( knownKeys.get( key ).i18nId ).text();
			let html = '<li><b>' + i18nKey + ':</b><br>';
			html = html + this.formatZErrorSummary( suberrors, labels );
			return html + '</li>';
		},
		formatZErrorSummary: function ( suberrors, labels ) {
			let html = '<ul>';
			for ( const suberror of suberrors ) {
				html = html + '<li>' + this.messageForSuberror( suberror, labels ) + '</li>';
				if ( suberror.children.length !== 0 ) {
					html = html + this.formatZErrorSummary( suberror.children, labels );
				}
			}
			return html + '</ul>';
		},
		/**
		 * Construct a message characterizing the given suberror.  The message returned
		 * is plain text, no HTML markup.  See schemata.js::extractErrorStructure for
		 * more about the suberror objects.
		 *
		 * @param {Object} subError
		 * @param {Array} labels
		 * @return {string}
		 */
		messageForSuberror: function ( subError, labels ) {
			let message;
			const errorType = subError.errorType;
			const errorLabel = labels[ errorType ];
			message = '[' + errorType + '/' + errorLabel + ']';
			if ( subError.explanation ) {
				message = message + ' ' + subError.explanation;
			}
			return message;
		},

		/**
		 * Portray the given key and its zMap value, which should be a string containing
		 * a date+time in ISO 8601 format
		 *
		 * @param {Object} zMap a Z883/Typed map, in canonical form
		 * @param {string} key
		 * @param {Array} keysUsed any keys used (or checked) here are added to this array
		 * @return {string}
		 */
		keyAndDatetimeValue: function ( zMap, key, keysUsed ) {

			/**
			 * Attempt to render a relative timestamp given a datetime string in ISO 8601 format
			 *
			 * @param {string} dateTimeString
			 * @return {string}
			 */
			const getDatetimeRelativeValue = function ( dateTimeString ) {
				if ( Intl.RelativeTimeFormat ) {
					const target = Date.parse( dateTimeString );
					const now = Date.now();
					const offset = now - target;

					let relativeTimeFormatter;
					try {
						relativeTimeFormatter = new Intl.RelativeTimeFormat( mw.config.get( 'wgUserLanguage' ) );
					} catch ( error ) {
						// Fall back to English if the MW locale isn't supported
						relativeTimeFormatter = new Intl.RelativeTimeFormat( 'en' );
					}

					let offsetThreshold = 1000;

					// If this was within the last minute, render in seconds.
					if ( offset < offsetThreshold * 60 ) {
						return relativeTimeFormatter.format(
							-Math.floor( offset / offsetThreshold ),
							'second'
						);
					}
					offsetThreshold *= 60;

					// If this was within the last hour, render in minutes.
					if ( offset < offsetThreshold * 60 ) {
						return relativeTimeFormatter.format(
							-Math.floor( offset / offsetThreshold ),
							'minute'
						);
					}
					offsetThreshold *= 60;

					// If this was within the last day, render in hours.
					if ( offset < offsetThreshold * 24 ) {
						return relativeTimeFormatter.format(
							-Math.floor( offset / offsetThreshold ),
							'hour'
						);
					}
					offsetThreshold *= 24;

					// If this was within the last week, render in days.
					if ( offset < offsetThreshold * 7 ) {
						return relativeTimeFormatter.format(
							-Math.floor( offset / offsetThreshold ),
							'hour'
						);
					}
					offsetThreshold *= 7;

					// If this was within the last four weeks, render in weeks.
					if ( offset < offsetThreshold * 4 ) {
						return relativeTimeFormatter.format(
							-Math.floor( offset / offsetThreshold ),
							'hour'
						);
					}
					offsetThreshold *= 4;
				}

				// Fallback for browsers without Intl
				return dateTimeString.replace( 'T', ' ' ).replace( 'Z', ' (UTC)' );
			};

			keysUsed.push( key );
			const value = getValueFromCanonicalZMap( zMap, key );
			if ( value === undefined ) {
				return '';
			}
			// Message keys specified in knownKeys above.
			// eslint-disable-next-line mediawiki/msg-doc
			const i18nKey = this.$i18n( knownKeys.get( key ).i18nId ).text();
			return '<li><b>' + i18nKey + ':</b> ' + getDatetimeRelativeValue( value ) + '</li>';
		},

		/**
		 * Portray the given key and its zMap value, which should be a string
		 * that's already suitable for presentation
		 *
		 * @param {Object} zMap a Z883/Typed map, in canonical form
		 * @param {string} key
		 * @param {Array} keysUsed any keys used (or checked) here are added to this array
		 * @return {string}
		 */
		keyAndStringValue: function ( zMap, key, keysUsed ) {
			keysUsed.push( key );
			let value = getValueFromCanonicalZMap( zMap, key );
			if ( value === undefined ) {
				return '';
			}
			if ( typeof value === 'object' && value[ Constants.Z_OBJECT_TYPE ] === Constants.Z_STRING &&
				value[ Constants.Z_STRING_VALUE ] ) {
				// In canonical form there are cases where the string remains inside a Z6 object;
				// extract it here
				value = value[ Constants.Z_STRING_VALUE ];
			}
			value = this.maybeStringify( value );
			// Message keys specified in knownKeys above.
			// eslint-disable-next-line mediawiki/msg-doc
			const i18nKey = this.$i18n( knownKeys.get( key ).i18nId ).text();
			return '<li><b>' + i18nKey + ':</b> ' + value + '</li>';
		},
		/**
		 * Portray the given key and its zMap value, which should be an arbitrary ZObject
		 * not handled by any of the more specialized methods.
		 *
		 * @param {Object} zMap a Z883/Typed map, in canonical form
		 * @param {string} key
		 * @param {Array} keysUsed any keys used (or checked) here are added to this array
		 * @return {string}
		 */
		keyAndArbitraryValue: function ( zMap, key, keysUsed ) {
			keysUsed.push( key );
			let value = getValueFromCanonicalZMap( zMap, key );
			if ( value === undefined ) {
				return '';
			}
			value = this.maybeStringify( value );
			// Message keys specified in knownKeys above.
			// eslint-disable-next-line mediawiki/msg-doc
			const i18nKey = this.$i18n( knownKeys.get( key ).i18nId ).text();
			return '<li><b>' + i18nKey + ':</b> ' + value + '</li>';
		}
	}
};
