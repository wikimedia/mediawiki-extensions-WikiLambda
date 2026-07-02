/**
 * WikiLambda Vue editor: Event logging utilities for Test Kitchen
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

// Machine-readable name of the instrument registered in Test Kitchen. The
// instrument encapsulates the destination stream and the event schema, so
// neither needs to be specified at the call site.
const INSTRUMENT_NAME = 'wikifunctions-ui-actions';

const eventLogUtils = {
	/**
	 * Create a new object by removing properties with null or undefined values from the original object
	 *
	 * @param {Object} original
	 * @return {Object}
	 */
	removeNullUndefined: function ( original ) {
		const result = {};
		for ( const key in original ) {
			if ( original[ key ] !== null && original[ key ] !== undefined ) {
				result[ key ] = original[ key ];
			}
		}
		return result;
	},

	/**
	 * Submit an interaction event using the Test Kitchen instrument.
	 *
	 * Since the schema specifies each property to be either string or Boolean, we defensively remove
	 * properties with null or undefined values. (Otherwise, a null or undefined property would cause
	 * the event to be dropped from the stream.)
	 *
	 * @param {string} action
	 * @param {Object} interactionData
	 */
	submitInteraction: function ( action, interactionData ) {
		// Test Kitchen is a soft dependency: it loads its own SDK (mw.testKitchen)
		// when installed and enabled, so we simply no-op when it is unavailable.
		if ( mw.testKitchen ) {
			// Ensure zobjecttype (if present) is a string, to avoid event validation error
			if ( interactionData.zobjecttype && typeof interactionData.zobjecttype !== 'string' ) {
				interactionData.zobjecttype = JSON.stringify( interactionData.zobjecttype );
			}
			const instrument = mw.testKitchen.getInstrument( INSTRUMENT_NAME );
			instrument.send( action, eventLogUtils.removeNullUndefined( interactionData ) );
		}
	}
};

module.exports = eventLogUtils;
