/**
 * WikiLambda Vue editor: Event logging utils mixin
 * Mixin with util functions to handle component errors
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

const Constants = require( '../Constants.js' );

module.exports = exports = {
	methods: {
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

		// T350497 Update the WikiLambda instrumentation to use core interaction events
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
				if ( interactionData.zobjecttype && ( typeof interactionData.zobjecttype !== 'string' ) ) {
					interactionData.zobjecttype = JSON.stringify( interactionData.zobjecttype );
				}
				mw.eventLog.submitInteraction(
					'mediawiki.product_metrics.wikifunctions_ui',
					'/analytics/mediawiki/product_metrics/wikilambda/ui_actions/1.0.0',
					action,
					this.removeNullUndefined( interactionData ) );
			}
		},
		/**
		 * Returns the event namespace string for particular
		 * actions and important types, else returns generic one
		 *
		 * @param {string|null} type
		 * @param {string} action defaults to 'edit'
		 * @return {string}
		 */
		getNamespace: function ( type = null, action = 'edit' ) {
			switch ( type ) {
				case Constants.Z_FUNCTION:
					return `${ action }Function`;
				case Constants.Z_IMPLEMENTATION:
					return `${ action }Implementation`;
				case Constants.Z_TESTER:
					return `${ action }Tester`;
				case Constants.Z_TYPE:
					return `${ action }Type`;
				default:
					return `${ action }ZObject`;
			}
		}
	}
};
