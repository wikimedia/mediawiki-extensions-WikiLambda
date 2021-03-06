/*!
 * WikiLambda Vue editor: Application store getters
 *
 * @copyright 2020–2021 WikiLambda team; see AUTHORS.txt
 * @license MIT
 */
'use strict';
var Constants = require( '../Constants.js' );

module.exports = {
	getZkeyLiteralType: function ( state, getters ) {
		return function ( parentKey ) {
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
	}
};
