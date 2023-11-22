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
		 * Dispatches the event with name and payload data
		 * using the mw.eventLog service
		 *
		 * @param {string} name
		 * @param {Object} data
		 */
		dispatchEvent: function ( name, data ) {
			if ( mw.eventLog ) {
				mw.eventLog.dispatch( name, data );
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
