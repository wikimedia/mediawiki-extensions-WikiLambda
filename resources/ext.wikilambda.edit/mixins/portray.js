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

/**
 * Map from internal key (which appears in the result envelopes returned from backend services)
 * to the internationalization identifier.  We map to an object so as to allow for future
 * inclusion of other attributes.
 */
const knownKeys = new Map( [
	[ 'errors', { i18nId: 'wikilambda-functioncall-metadata-errors' } ],
	[ 'validateErrors', { i18nId: 'wikilambda-functioncall-metadata-validator-errors' } ],
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
		 * @return {string}
		 */
		portrayMetadataMap: function ( zMap ) {
			var keysUsed = [];
			let html = '<span><ul>';
			// First, portray the known/expected metadata keys and their values
			// If there's no 'errors' value, keyAndZErrorValue will display 'None'
			html = html + this.keyAndZErrorValue( zMap, 'errors', keysUsed );
			// With 'validateErrors', we don't want to display 'None', so check here if there's a value
			if ( getValueFromCanonicalZMap( zMap, 'validateErrors' ) ) {
				html = html + this.keyAndZErrorValue( zMap, 'validateErrors', keysUsed );
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
				// eslint-disable-next-line no-restricted-syntax
				if ( keysUsed.includes( key ) ) {
					continue;
				}
				const keyInfo = knownKeys.get( key );
				const displayKey = keyInfo ? this.$i18n( keyInfo.i18nId ).text() : key;
				const value = this.maybeStringify( entry[ Constants.Z_TYPED_OBJECT_ELEMENT_2 ] ||
					entry[ Constants.Z_TYPED_PAIR_TYPE2 ] );
				html = html + '<li><b>' + displayKey + ':</b> ' + value + '</li>';
			}

			// TODO (T320669): Construct this more nicely, perhaps with a Codex link component?
			const helpLink = '<a' +
				' class="ext-wikilambda-metadatadialog-helplink"' +
				' href="https://www.mediawiki.org/wiki/Special:MyLanguage/Help:Wikifunctions/Function_call_metadata"' +
				' title="' + this.$i18n( 'wikilambda-helplink-tooltip' ).text() + '"' +
				' target="_blank"' +
				'>' +
				this.$i18n( 'wikilambda-helplink-button' ).text() +
				'</a>';

			return html + '</ul>' + helpLink + '</span>';
		},
		/**
		 * Portray the given key and its zMap value, which should be a Z5 / Error object
		 *
		 * @param {Object} zMap a Z883/Typed map, in canonical form
		 * @param {string} key
		 * @param {Array} keysUsed any keys used (or checked) here are added to this array
		 * @return {string}
		 */
		keyAndZErrorValue: function ( zMap, key, keysUsed ) {
			keysUsed.push( key );
			let messages;
			const error = getValueFromCanonicalZMap( zMap, key );
			if ( error === undefined ) {
				messages = [];
			} else if ( error[ Constants.Z_ERROR_TYPE ] === 'Z509' ) {
				const errors = error[ Constants.Z_ERROR_VALUE ].Z509K1;
				messages = [];
				for ( let i = 1; i < errors.length; i++ ) {
					messages.push( this.messageForError( errors[ i ] ) );
				}
			} else {
				messages = [ this.messageForError( error ) ];
			}
			const i18nKey = this.$i18n( knownKeys.get( key ).i18nId, messages.length ).text();
			if ( messages.length === 0 ) {
				return '<li><b>' + i18nKey + ':</b> ' +
					this.$i18n( 'wikilambda-functioncall-metadata-errors-none' ).text() + '</li>';
			}
			let html = '<li><b>' + i18nKey + ':</b><br><ul>';
			for ( const message of messages ) {
				html = html + '<li>' + message + '</li>';
			}
			return html + '</ul ></li>';
		},
		/**
		 * Extract or construct a message characterizing the given error.  The message returned
		 * is plain text, no HTML markup. (Based on existing code in zTesterResults.js.)
		 *
		 * TODO: (T312611): Do a good job on all error types.  Also, return a label for errorType (as well as Z5xx).
		 *
		 * @param {Object} zError a Z5/Error, in canonical form
		 * @return {string}
		 */
		messageForError: function ( zError ) {
			let message;
			if ( zError[ Constants.Z_ERROR_VALUE ] ) {
				message = zError[ Constants.Z_ERROR_VALUE ];
			} else {
				const errorType = zError[ Constants.Z_ERROR_TYPE ][ Constants.Z_OBJECT_TYPE ];
				const errorValue = zError[ Constants.Z_ERROR_TYPE ][ errorType + 'K1' ];
				if ( errorValue ) {
					message = '[' + errorType + '] ' + errorValue;
				} else {
					message = zError;
				}
			}
			return this.maybeStringify( message );
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
			keysUsed.push( key );
			let value = getValueFromCanonicalZMap( zMap, key );
			if ( value === undefined ) {
				return '';
			}
			value = value.replace( 'T', ' ' ).replace( 'Z', ' (UTC)' );
			const i18nKey = this.$i18n( knownKeys.get( key ).i18nId ).text();
			return '<li><b>' + i18nKey + ':</b> ' + value + '</li>';
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
			const i18nKey = this.$i18n( knownKeys.get( key ).i18nId ).text();
			return '<li><b>' + i18nKey + ':</b> ' + value + '</li>';
		}
	}
};
