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
	[ 'orchestrationStartTime', { i18nId: 'wikilambda-functioncall-metadata-orchestration-start-time' } ],
	[ 'orchestrationEndTime', { i18nId: 'wikilambda-functioncall-metadata-orchestration-end-time' } ],
	[ 'orchestrationDuration', { i18nId: 'wikilambda-functioncall-metadata-orchestration-duration' } ],
	[ 'evaluationStartTime', { i18nId: 'wikilambda-functioncall-metadata-evaluation-start-time' } ],
	[ 'evaluationEndTime', { i18nId: 'wikilambda-functioncall-metadata-evaluation-end-time' } ],
	[ 'evaluationDuration', { i18nId: 'wikilambda-functioncall-metadata-evaluation-duration' } ]
] );

module.exports = exports = {
	methods: {
		maybeStringify: function ( message ) {
			return typeof message === 'string' ? message : JSON.stringify( message );
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
			html = html + this.keyAndErrorValue( zMap, 'errors', keysUsed );
			html = html + this.keyAndDatetimeValue( zMap, 'orchestrationStartTime', keysUsed );
			html = html + this.keyAndDatetimeValue( zMap, 'orchestrationEndTime', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'orchestrationDuration', keysUsed );
			html = html + this.keyAndDatetimeValue( zMap, 'evaluationStartTime', keysUsed );
			html = html + this.keyAndDatetimeValue( zMap, 'evaluationEndTime', keysUsed );
			html = html + this.keyAndStringValue( zMap, 'evaluationDuration', keysUsed );

			// Now portray any top-level zMap entries that weren't already used above
			const k1Array = zMap[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ];
			// With Benjamin arrays, skip over the first array element
			for ( let i = 1; i < k1Array.length; i++ ) {
				const entry = k1Array[ i ];
				let key = entry[ Constants.Z_TYPED_OBJECT_ELEMENT_1 ];
				// Allow for keys that correspond to references
				if ( typeof key === 'object' && key[ Constants.Z_OBJECT_TYPE ] === Constants.Z_STRING_VALUE ) {
					key = key[ Constants.Z_STRING_VALUE ];
				}
				// eslint-disable-next-line no-restricted-syntax
				if ( keysUsed.includes( key ) ) {
					continue;
				}
				const keyInfo = knownKeys.get( key );
				const displayKey = keyInfo ? this.$i18n( keyInfo.i18nId ) : key;
				const value = this.maybeStringify( entry[ Constants.Z_TYPED_OBJECT_ELEMENT_2 ] );
				html = html + '<li><b>' + displayKey + ':</b> ' + value + '</li>';
			}
			return html + '</ul></span>';
		},
		/**
		 * Portray the given key and its content, which should be a Z5 / Error object
		 *
		 * @param {Object} zMap a Z883/Typed map, in canonical form
		 * @param {string} key
		 * @param {Array} keysUsed any keys used (or checked) here are added to this array
		 * @return {string}
		 */
		keyAndErrorValue: function ( zMap, key, keysUsed ) {
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
			const i18nKey = this.$i18n( knownKeys.get( key ).i18nId );
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
		 * FIXME: Needs to do a better job on some error types.  Also, should return
		 * a label for errorType instead of Z5xx.
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
		 * Portray the given key and its content, which should be a string containing
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
		 * Portray the given key and its content, which should be an arbitrary string
		 * that's already suitable for presentation
		 *
		 * @param {Object} zMap a Z883/Typed map, in canonical form
		 * @param {string} key
		 * @param {Array} keysUsed any keys used (or checked) here are added to this array
		 * @return {string}
		 */
		keyAndStringValue: function ( zMap, key, keysUsed ) {
			keysUsed.push( key );
			const value = getValueFromCanonicalZMap( zMap, key );
			if ( value === undefined ) {
				return '';
			}
			const i18nKey = this.$i18n( knownKeys.get( key ).i18nId ).text();
			return '<li><b>' + i18nKey + ':</b> ' + value + '</li>';
		}
	}
};