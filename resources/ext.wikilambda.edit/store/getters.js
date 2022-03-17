/*!
 * WikiLambda Vue editor: Application store getters
 *
 * @copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
var Constants = require( '../Constants.js' );

module.exports = exports = {
	getZkeyLiteralType: function ( state, getters ) {

		/**
		 * Retrieve the literal type (actual type) of a specific ZKey. This is mainly used in the modeselector.
		 *
		 * @param {number} parentKey
		 * @return {string} LiteralType
		 */
		return function ( parentKey ) {
			if ( !parentKey ) {
				return;
			}

			var type = parentKey.match( /Z[1-9]\d*/ )[ 0 ],
				keysArray,
				currentKeyLiteralType = null;
			if ( getters.getZkeys[ type ] ) {

				keysArray = getters.getZkeys[ type ][ Constants.Z_PERSISTENTOBJECT_VALUE ][ Constants.Z_TYPE_KEYS ] ||
					[];

				keysArray.forEach( function ( key ) {
					if ( key[ Constants.Z_KEY_ID ] === parentKey ) {
						currentKeyLiteralType = key[ Constants.Z_KEY_TYPE ];
					}
				} );
				return currentKeyLiteralType;
			}

		};
	},

	getViewMode: function () {
		var editingData = mw.config.get( 'wgWikiLambda' );
		return editingData.viewmode;
	},
	isExpertMode: function ( state ) {
		return state.expertMode;
	}
};
