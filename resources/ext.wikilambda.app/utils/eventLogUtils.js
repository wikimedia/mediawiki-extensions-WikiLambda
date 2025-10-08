/**
 * WikiLambda Vue editor: Event logging utilities for Metrics Platform
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

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
	 * Submit an interaction event using Metrics Platform
	 *
	 * Since the schema specifies each property to be either string or Boolean, we defensively remove
	 * properties with null or undefined values. (Otherwise, a null or undefined property would cause
	 * the event to be dropped from the stream.)
	 *
	 * @param {string} action
	 * @param {Object} interactionData
	 */
	submitInteraction: function ( action, interactionData ) {
		if ( mw.eventLog ) {
			// Ensure zobjecttype (if present) is a string, to avoid event validation error
			if ( interactionData.zobjecttype && typeof interactionData.zobjecttype !== 'string' ) {
				interactionData.zobjecttype = JSON.stringify( interactionData.zobjecttype );
			}
			mw.eventLog.submitInteraction(
				'mediawiki.product_metrics.wikifunctions_ui',
				'/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0',
				action,
				eventLogUtils.removeNullUndefined( interactionData )
			);
		}
	}
};

module.exports = eventLogUtils;
