/**
 * WikiLambda Vue editor: Event logging utils mixin
 * Mixin with util functions to handle component errors
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';

module.exports = exports = {
	methods: {
		dispatchEvent: function ( name, data ) {
			if ( mw.eventLog ) {
				mw.eventLog.dispatch( name, data );
			}
		}
	}
};
